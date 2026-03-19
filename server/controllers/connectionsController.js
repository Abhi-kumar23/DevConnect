const User = require("../models/User");
const Profile = require("../models/Profile");
const Notification = require("../models/Notification");

const sendRequest = async (req, res) => {
  try {
    const targetId = req.params.id;

    if (req.user._id.toString() === targetId) {
      return res.status(400).json({ message: "Cannot connect to yourself" });
    }

    const targetUser = await User.findById(targetId);
    if (!targetUser)
      return res.status(404).json({ message: "User not found" });

    // Already connected?
    if (targetUser.connections.includes(req.user._id)) {
      return res.status(400).json({ message: "Already connected" });
    }

    // Already sent request?
    if (targetUser.pendingRequests.includes(req.user._id)) {
      return res.status(400).json({ message: "Request already sent" });
    }

    targetUser.pendingRequests.push(req.user._id);
    await targetUser.save();

    // Create notification
    await Notification.create({
      recipient: targetId,
      sender: req.user._id,
      type: "connection_request",
      message: "sent you a connection request",
    });

    res.json({ message: "Connection request sent" });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const acceptRequest = async (req, res) => {
  try {
    const requesterId = req.params.id;
    const user = await User.findById(req.user._id);

    if (!user.pendingRequests.includes(requesterId)) {
      return res.status(400).json({ message: "No such pending request" });
    }

    // Add to connections
    user.connections.push(requesterId);
    user.pendingRequests = user.pendingRequests.filter(
      id => id.toString() !== requesterId
    );
    await user.save();

    const requester = await User.findById(requesterId);

    if (!requester.connections.includes(user._id)) {
      requester.connections.push(user._id);
      await requester.save();
    }

    // Notification
    await Notification.create({
      recipient: requesterId,
      sender: req.user._id,
      type: "connection_accept",
      message: "accepted your connection request",
    });

    res.json({ message: "Connection accepted" });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const rejectRequest = async (req, res) => {
  try {
    const requesterId = req.params.id;
    const user = await User.findById(req.user._id);

    user.pendingRequests = user.pendingRequests.filter(
      id => id.toString() !== requesterId
    );

    await user.save();

    res.json({ message: "Connection request rejected" });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


const getConnections = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate("connections", "name email");

    res.json(user.connections);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getSuggestions = async (req, res) => {
  try {
    const userId = req.user._id;

    const currentUser = await User.findById(userId);

    const myProfile = await Profile.findOne({ user: userId });
    const mySkills = myProfile?.skills || [];

    const users = await User.find({
      _id: {
        $ne: userId,
        $nin: [
          ...currentUser.connections,
          ...currentUser.pendingRequests
        ]
      }
    });

    const profiles = await Profile.find({
      user: { $in: users.map(u => u._id) }
    }).populate("user", "name email");

    const suggestions = profiles.map(profile => {
      const commonSkills = profile.skills.filter(skill =>
        mySkills.includes(skill)
      );

      return {
        userId: profile.user._id,
        name: profile.user.name,
        email: profile.user.email,
        skills: profile.skills,
        matchScore: commonSkills.length
      };
    });

    suggestions.sort((a, b) => b.matchScore - a.matchScore);

    res.json(suggestions.slice(0, 10));

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


module.exports = {
  sendRequest,
  acceptRequest,
  rejectRequest,
  getConnections,
  getSuggestions
};