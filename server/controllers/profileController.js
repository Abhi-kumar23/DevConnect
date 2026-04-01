// controllers/profileController.js
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import Profile from "../models/Profile.js";
import User from "../models/User.js";
import { uploadOnCloudinary, deleteFromCloudinary, getPublicIdFromUrl } from "../utils/cloudinary.js";

// Create or Update Profile
// Create or Update Profile
const createOrUpdateProfile = asyncHandler(async (req, res) => {
    console.log("=== CREATE/UPDATE PROFILE HIT ===");
    console.log("Request body:", req.body);
    
    const { bio, skills, github, linkedin, twitter, portfolio, location, title, headline } = req.body;

    // Validate bio length
    if (bio && bio.length > 500) {
        throw new ApiError(400, "Bio cannot exceed 500 characters");
    }

    // Process skills - handle both string and array
    let processedSkills = [];
    if (skills) {
        if (Array.isArray(skills)) {
            processedSkills = skills;
        } else if (typeof skills === 'string') {
            processedSkills = skills.split(",").map((s) => s.trim()).filter(s => s);
        }
    }

    // Use headline first, fallback to title
    const finalHeadline = headline || title || "";

    const profileFields = {
        user: req.user._id,
        bio: bio || "",
        headline: finalHeadline,
        location: location || "",
        social: {
            github: github || "",
            linkedin: linkedin || "",
            twitter: twitter || "",
            portfolio: portfolio || ""
        },
        skills: processedSkills,
    };

    console.log("Processed profile fields:", profileFields);

    // Find existing profile
    let profile = await Profile.findOne({ user: req.user._id });

    if (profile) {
        console.log("Updating existing profile...");
        // Update existing profile
        profile = await Profile.findOneAndUpdate(
            { user: req.user._id },
            { $set: profileFields },
            { new: true, runValidators: true }
        );
        console.log("Profile updated successfully");
    } else {
        console.log("Creating new profile...");
        // Create new profile
        profile = await Profile.create(profileFields);
        console.log("New profile created successfully");
    }

    await profile.populate("user", "firstName lastName email avatar");

    return res.status(200).json(
        new ApiResponse(200, profile, "Profile saved successfully")
    );
});

// Get My Profile (auto-creates if not exists)
const getMyProfile = asyncHandler(async (req, res) => {
    console.log("=== GET MY PROFILE HIT ===");

    // Try to find profile
    let profile = await Profile.findOne({ user: req.user._id })
        .populate("user", "firstName lastName email avatar");

    // If no profile exists, create one automatically
    if (!profile) {
        console.log("No profile found, creating one automatically...");
        
        profile = await Profile.create({
            user: req.user._id,
            bio: "",
            headline: "",
            skills: [],
            location: "",
            social: {
                github: "",
                linkedin: "",
                twitter: "",
                portfolio: ""
            }
        });
        
        // Populate user data
        await profile.populate("user", "firstName lastName email avatar");
        console.log("Profile created automatically");
    }

    // Increment profile views
    profile.profileViews += 1;
    await profile.save();

    // Add completion percentage
    const profileData = profile.toObject();
    profileData.completionPercentage = profile.getCompletionPercentage();

    return res.status(200).json(
        new ApiResponse(200, profileData, "Profile fetched successfully")
    );
});

// Upload Profile Picture (Avatar)
const uploadProfilePic = asyncHandler(async (req, res) => {
    if (!req.file) {
        throw new ApiError(400, "No file uploaded");
    }

    // Get current user
    const currentUser = await User.findById(req.user._id);
    
    // Delete old avatar from Cloudinary if exists
    if (currentUser.avatar) {
        const oldPublicId = getPublicIdFromUrl(currentUser.avatar);
        if (oldPublicId) {
            await deleteFromCloudinary(oldPublicId);
        }
    }

    // Upload new avatar to Cloudinary
    const avatar = await uploadOnCloudinary(req.file.path);
    
    if (!avatar || !avatar.url) {
        throw new ApiError(400, "Error uploading profile picture");
    }

    // Update user with new avatar
    const user = await User.findByIdAndUpdate(
        req.user._id,
        { $set: { avatar: avatar.url, profilePicture: avatar.url } },
        { new: true }
    ).select("-password -refreshToken");

    return res.status(200).json(
        new ApiResponse(200, { avatar: user.avatar }, "Profile picture uploaded successfully")
    );
});

// Delete Profile
const deleteProfile = asyncHandler(async (req, res) => {
    const profile = await Profile.findOne({ user: req.user._id });
    
    if (!profile) {
        throw new ApiError(404, "Profile not found");
    }

    await profile.deleteOne();

    return res.status(200).json(
        new ApiResponse(200, null, "Profile deleted successfully")
    );
});

// Get Profile by User ID
const getProfileByUserId = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    let profile = await Profile.findOne({ user: userId })
        .populate("user", "firstName lastName email avatar");

    if (!profile) {
        // Return empty profile structure if not found
        const user = await User.findById(userId).select("firstName lastName email avatar");
        if (!user) {
            throw new ApiError(404, "User not found");
        }
        
        return res.status(200).json(
            new ApiResponse(200, {
                user,
                bio: "",
                headline: "",
                skills: [],
                location: "",
                completionPercentage: 0
            }, "Profile not found")
        );
    }

    const profileData = profile.toObject();
    profileData.completionPercentage = profile.getCompletionPercentage();

    return res.status(200).json(
        new ApiResponse(200, profileData, "Profile fetched successfully")
    );
});

// Get All Profiles (with pagination)
const getAllProfiles = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const profiles = await Profile.find()
        .populate("user", "firstName lastName email avatar")
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 });

    const total = await Profile.countDocuments();

    return res.status(200).json(
        new ApiResponse(200, {
            profiles,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        }, "Profiles fetched successfully")
    );
});

// Search Users
const searchUsers = asyncHandler(async (req, res) => {
    const { q, skill, location } = req.query;
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    let searchQuery = {};

    if (q) {
        searchQuery.$or = [
            { bio: { $regex: q, $options: "i" } },
            { skills: { $in: [new RegExp(q, "i")] } },
            { headline: { $regex: q, $options: "i" } },
            { location: { $regex: q, $options: "i" } }
        ];
    }

    if (skill) {
        searchQuery.skills = { $in: [new RegExp(skill, "i")] };
    }

    if (location) {
        searchQuery.location = { $regex: location, $options: "i" };
    }

    const profiles = await Profile.find(searchQuery)
        .populate("user", "firstName lastName email avatar")
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 });

    const total = await Profile.countDocuments(searchQuery);

    return res.status(200).json(
        new ApiResponse(200, {
            profiles,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        }, "Search results fetched successfully")
    );
});

export {
    createOrUpdateProfile,
    getMyProfile,
    uploadProfilePic,
    deleteProfile,
    getProfileByUserId,
    getAllProfiles,
    searchUsers,
};