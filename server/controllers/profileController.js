import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import Profile from "../models/Profile.js";
import User from "../models/User.js";
import { deleteFromCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js";

const publicUserFields = "firstName lastName profilePicture coverPhoto createdAt";

const normaliseStringList = (value, maxItems = 30) => {
  const values = Array.isArray(value) ? value : String(value || "").split(",");
  return [...new Set(values.map((item) => String(item).trim()).filter(Boolean))].slice(0, maxItems);
};

const profileWithUser = (query) => query.populate("user", publicUserFields);

const serialiseProfile = (profile) => {
  const data = profile.toObject ? profile.toObject() : profile;
  data.completionPercentage = profile.getCompletionPercentage?.() ?? 0;
  if (Array.isArray(data.user?.connections)) data.connectionCount = data.user.connections.length;
  return data;
};

const createOrUpdateProfile = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const profile = (await Profile.findOne({ user: req.user._id })) || new Profile({ user: req.user._id });

  const stringFields = ["bio", "headline", "location", "availability"];
  for (const field of stringFields) {
    if (Object.hasOwn(body, field)) profile[field] = String(body[field] || "").trim();
  }

  if (profile.bio?.length > 500) throw new ApiError(400, "Bio cannot exceed 500 characters");
  if (profile.headline?.length > 100) throw new ApiError(400, "Headline cannot exceed 100 characters");

  if (Object.hasOwn(body, "skills")) profile.skills = normaliseStringList(body.skills);
  if (Object.hasOwn(body, "preferredRoles")) profile.preferredRoles = normaliseStringList(body.preferredRoles);
  if (Object.hasOwn(body, "preferredLocations")) profile.preferredLocations = normaliseStringList(body.preferredLocations);

  if (Object.hasOwn(body, "yearsOfExperience")) {
    const years = body.yearsOfExperience === "" ? undefined : Number(body.yearsOfExperience);
    if (years !== undefined && (!Number.isFinite(years) || years < 0 || years > 50)) {
      throw new ApiError(400, "Years of experience must be between 0 and 50");
    }
    profile.yearsOfExperience = years;
  }

  for (const field of ["openToWork", "openToCollaborate"]) {
    if (Object.hasOwn(body, field)) profile[field] = body[field] === true || body[field] === "true";
  }

  const socialFields = ["github", "linkedin", "twitter", "portfolio"];
  if (body.social && typeof body.social === "object") {
    for (const field of socialFields) {
      if (Object.hasOwn(body.social, field)) {
        const value = String(body.social[field] || "").trim();
        profile.social[field] = value || undefined;
      }
    }
  }
  for (const field of socialFields) {
    if (Object.hasOwn(body, field)) {
      const value = String(body[field] || "").trim();
      profile.social[field] = value || undefined;
    }
  }

  await profile.save();
  await profile.populate("user", publicUserFields);

  return res.status(200).json(new ApiResponse(200, serialiseProfile(profile), "Profile saved successfully"));
});

const getMyProfile = asyncHandler(async (req, res) => {
  let profile = await Profile.findOne({ user: req.user._id }).populate("user", `${publicUserFields} connections`);
  if (!profile) {
    profile = await Profile.create({ user: req.user._id });
    await profile.populate("user", `${publicUserFields} connections`);
  }
  return res.status(200).json(new ApiResponse(200, serialiseProfile(profile), "Profile fetched successfully"));
});

const replaceUserImage = async ({ req, res, field, publicIdField, folder, label }) => {
  if (!req.file) throw new ApiError(400, `Choose an image to upload as your ${label}`);

  const uploaded = await uploadOnCloudinary(req.file.path, folder);
  if (!uploaded?.secure_url) throw new ApiError(502, `Unable to upload ${label}. Check the Cloudinary configuration and try again.`);

  const user = await User.findById(req.user._id).select(`+${publicIdField}`);
  if (!user) throw new ApiError(404, "User not found");

  const previousPublicId = user[publicIdField];
  user[field] = uploaded.secure_url;
  user[publicIdField] = uploaded.public_id;
  await user.save({ validateBeforeSave: false });

  if (previousPublicId) await deleteFromCloudinary(previousPublicId);

  return res.status(200).json(
    new ApiResponse(200, { [field]: user[field] }, `${label[0].toUpperCase()}${label.slice(1)} uploaded successfully`)
  );
};

const uploadProfilePic = asyncHandler((req, res) => replaceUserImage({
  req, res, field: "profilePicture", publicIdField: "profilePicturePublicId", folder: "devconnect/avatars", label: "profile picture",
}));

const uploadCoverPhoto = asyncHandler((req, res) => replaceUserImage({
  req, res, field: "coverPhoto", publicIdField: "coverPhotoPublicId", folder: "devconnect/covers", label: "cover photo",
}));

const deleteProfile = asyncHandler(async (req, res) => {
  const profile = await Profile.findOneAndDelete({ user: req.user._id });
  if (!profile) throw new ApiError(404, "Profile not found");
  return res.status(200).json(new ApiResponse(200, null, "Profile deleted successfully"));
});

const getProfileByUserId = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const profile = await profileWithUser(Profile.findOne({ user: userId }));
  if (!profile) {
    const user = await User.findById(userId).select(publicUserFields);
    if (!user) throw new ApiError(404, "User not found");
    return res.status(200).json(new ApiResponse(200, { user, bio: "", headline: "", skills: [], social: {} }, "Profile fetched successfully"));
  }

  if (profile.user?._id.toString() !== req.user?._id?.toString()) {
    await Profile.updateOne({ _id: profile._id }, { $inc: { profileViews: 1 } });
  }
  return res.status(200).json(new ApiResponse(200, serialiseProfile(profile), "Profile fetched successfully"));
});

const getAllProfiles = asyncHandler(async (req, res) => {
  const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 10, 1), 50);
  const [profiles, total] = await Promise.all([
    profileWithUser(Profile.find()).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Profile.countDocuments(),
  ]);
  return res.status(200).json(new ApiResponse(200, {
    profiles: profiles.map(serialiseProfile),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  }, "Profiles fetched successfully"));
});

const searchUsers = asyncHandler(async (req, res) => {
  const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 10, 1), 50);
  const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const query = {};
  const q = String(req.query.q || "").trim();

  if (q) {
    const regex = new RegExp(escapeRegex(q), "i");
    query.$or = [{ bio: regex }, { skills: regex }, { headline: regex }, { location: regex }];
  }
  if (req.query.skill) query.skills = new RegExp(escapeRegex(String(req.query.skill)), "i");
  if (req.query.location) query.location = new RegExp(escapeRegex(String(req.query.location)), "i");

  const [profiles, total] = await Promise.all([
    profileWithUser(Profile.find(query)).sort({ updatedAt: -1 }).skip((page - 1) * limit).limit(limit),
    Profile.countDocuments(query),
  ]);
  return res.status(200).json(new ApiResponse(200, {
    profiles: profiles.map(serialiseProfile),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  }, "Search results fetched successfully"));
});

export {
  createOrUpdateProfile,
  getMyProfile,
  uploadProfilePic,
  uploadCoverPhoto,
  deleteProfile,
  getProfileByUserId,
  getAllProfiles,
  searchUsers,
};
