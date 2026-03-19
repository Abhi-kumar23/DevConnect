const Profile = require("../models/Profile");

const createOrUpdateProfile = async (req, res) => {
    try {
        const { bio, skills, github, linkedin } = req.body;

        if (bio && bio.length > 200) return res.status(400).json({ message: "Bio too long" });

        const profileFields = {
            user: req.user._id,
            bio: bio || "",
            github: github || "",
            linkedin: linkedin || "",
            skills: skills
                ? skills.split(",").map((s) => s.trim())
                : [],
        };

        let profile = await Profile.findOne({ user: req.user._id });

        // UPDATE
        if (profile) {
            profile = await Profile.findOneAndUpdate(
                { user: req.user._id },
                { $set: profileFields },
                { new: true }
            );

            return res.json(profile);
        }

        // CREATE
        profile = await Profile.create(profileFields);

        res.status(201).json(profile);

    } catch (error) {
        res.status(500).json({
            message: "Server Error",
            error: error.message,
        });
    }
};

const getMyProfile = async (req, res) => {
    try {
        const profile = await Profile.findOne({ user: req.user._id })
            .populate("user", "name email");

        if (!profile) {
            return res.status(404).json({
                message: "Profile not found",
            });
        }

        res.json(profile);

    } catch (error) {
        res.status(500).json({
            message: "Server Error",
            error: error.message,
        });
    }
};

const uploadProfilePic = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: "No file uploaded" });

        const profile = await Profile.findOne({ user: req.user._id });
        if (!profile) return res.status(404).json({ message: "Profile not found" });

        profile.profilePic = req.file.path; // save the file path in DB
        await profile.save();

        res.json({ message: "Profile picture uploaded", profile });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const deleteProfile = async (req, res) => {
    try {
        await Profile.findOneAndDelete({ user: req.user._id });

        res.json({ message: "Profile deleted successfully" });

    } catch (error) {
        res.status(500).json({
            message: "Server Error",
            error: error.message,
        });
    }
};

const getProfileByUserId = async (req, res) => {
    try {
        const profile = await Profile.findOne({
            user: req.params.userId,
        }).populate("user", "name email");

        if (!profile) {
            return res.status(404).json({
                message: "Profile not found",
            });
        }

        res.json(profile);

    } catch (error) {
        res.status(500).json({
            message: "Server Error",
            error: error.message,
        });
    }
};

const getAllProfiles = async (req, res) => {
    try {
        const profiles = await Profile.find()
            .populate("user", "name email");

        res.json(profiles);

    } catch (error) {
        res.status(500).json({
            message: "Server Error",
            error: error.message,
        });
    }
};

const searchUsers = async (req, res) => {
  try {
    const keyword = req.query.q
      ? {
          $or: [
            { bio: { $regex: req.query.q, $options: "i" } },
            { skills: { $regex: req.query.q, $options: "i" } }
          ],
        }
      : {};

    const profiles = await Profile.find(keyword)
      .populate("user", "name email");

    res.json(profiles);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
    createOrUpdateProfile,
    getMyProfile,
    deleteProfile,
    getProfileByUserId,
    getAllProfiles,
    uploadProfilePic,
    searchUsers
};