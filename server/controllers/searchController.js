import User from "../models/User.js";
import Profile from "../models/Profile.js";
import Post from "../models/Post.js";

const globalSearch = async (req, res) => {
  try {
    const { q, type } = req.query;

    if (!q) {
      return res.status(400).json({ message: "Search query required" });
    }

    const regex = new RegExp(q, "i");
    let result = {};

    // USERS
    if (!type || type === "users") {
      result.users = await User.find({
        $or: [{ name: regex }, { email: regex }]
      }).select("name email");
    }

    // PROFILES
    if (!type || type === "profiles") {
      result.profiles = await Profile.find({
        $or: [{ bio: regex }, { skills: { $in: [regex] } }]
      }).populate("user", "name email");
    }

    // POSTS
    if (!type || type === "posts") {
      result.posts = await Post.find({ text: regex })
        .populate("user", "name email")
        .sort({ createdAt: -1 })
        .limit(20);
    }

    res.json(result);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export {globalSearch};