import User from "../models/User.js";
import Profile from "../models/Profile.js";
import Post from "../models/Post.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const globalSearch = async (req, res, next) => {
  try {
    const q = String(req.query.q || "").trim();
    const type = req.query.type;
    if (!q) return res.status(400).json({ message: "Search query is required" });
    if (type && !["users", "profiles", "posts"].includes(type)) {
      return res.status(400).json({ message: "Search type must be users, profiles, or posts" });
    }

    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "i");
    const results = {};

    if (!type || type === "users") {
      results.users = await User.find({
        $or: [{ firstName: regex }, { lastName: regex }, { email: regex }],
      }).select("firstName lastName profilePicture").limit(10);
    }
    if (!type || type === "profiles") {
      results.profiles = await Profile.find({
        $or: [{ bio: regex }, { skills: regex }, { headline: regex }, { location: regex }],
      }).populate("user", "firstName lastName profilePicture").limit(10);
    }
    if (!type || type === "posts") {
      results.posts = await Post.find({ content: regex, visibility: "public" })
        .populate("user", "firstName lastName profilePicture")
        .sort({ createdAt: -1 })
        .limit(20);
    }
    return res.status(200).json(new ApiResponse(200, results, "Search completed"));
  } catch (error) {
    next(error);
  }
};

export { globalSearch };
