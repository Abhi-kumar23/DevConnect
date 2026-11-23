// controllers/connectionController.js
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import Profile from "../models/Profile.js";

const hasUserId = (ids, userId) => ids.some((id) => id.toString() === userId.toString());

// Send Connection Request
const sendRequest = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    if (!userId) {
        throw new ApiError(400, "User ID is required");
    }

    if (userId === req.user._id.toString()) {
        throw new ApiError(400, "Cannot connect to yourself");
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
        throw new ApiError(404, "User not found");
    }

    // Get current user with connections
    const currentUser = await User.findById(req.user._id);

    // Check if already connected (bidirectional check)
    if (hasUserId(targetUser.connections, req.user._id) ||
        hasUserId(currentUser.connections, targetUser._id)) {
        throw new ApiError(400, "Already connected");
    }

    // Check if request already sent
    if (hasUserId(targetUser.pendingRequests, req.user._id)) {
        throw new ApiError(400, "Request already sent");
    }

    // Check if user already sent a request to you
    if (hasUserId(currentUser.pendingRequests, targetUser._id)) {
        throw new ApiError(400, "You already have a pending request from this user");
    }

    // Add to pending requests
    targetUser.pendingRequests.push(req.user._id);
    await targetUser.save();

    // Create notification
    await Notification.upsertNotification({
        recipient: recipientId,
        sender: req.user._id,
        dedupeKey: `connection-request:${req.user._id}:${recipientId}`,
        type: "connection_request",
        title: "New Connection Request",
        message: `${req.user.firstName} ${req.user.lastName} sent you a connection request`,
        data: { senderId: req.user._id },
        actionUrl: `/profile/${req.user._id}`,
    });

    return res.status(200).json(
        new ApiResponse(200, null, "Connection request sent successfully")
    );
});

// Accept Connection Request
const acceptRequest = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    const currentUser = await User.findById(req.user._id);

    if (!hasUserId(currentUser.pendingRequests, userId)) {
        throw new ApiError(400, "No pending request from this user");
    }

    // Add to connections for current user
    currentUser.connections.push(userId);
    currentUser.pendingRequests = currentUser.pendingRequests.filter(
        id => id.toString() !== userId
    );
    await currentUser.save();

    // Also add to the other user's connections
    const requester = await User.findById(userId);
    if (requester) {
        if (!hasUserId(requester.connections, req.user._id)) {
            requester.connections.push(req.user._id);
            await requester.save();
        }
    }

    // Create notification for the requester
    await Notification.upsertNotification({
        recipient: requesterId,
        sender: req.user._id,
        dedupeKey: `connection-accepted:${req.user._id}:${requesterId}`,
        type: "connection_accepted",
        title: "Connection Request Accepted",
        message: `${req.user.firstName} ${req.user.lastName} accepted your connection request`,
        data: { userId: req.user._id },
        actionUrl: `/profile/${req.user._id}`,
    });

    return res.status(200).json(
        new ApiResponse(200, null, "Connection request accepted successfully")
    );
});

// Reject Connection Request
const rejectRequest = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    const user = await User.findById(req.user._id);

    if (!hasUserId(user.pendingRequests, userId)) {
        throw new ApiError(400, "No pending request from this user");
    }

    user.pendingRequests = user.pendingRequests.filter(
        id => id.toString() !== userId
    );
    await user.save();

    return res.status(200).json(
        new ApiResponse(200, null, "Connection request rejected")
    );
});

// Get All Connections
const getConnections = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate("connections", "firstName lastName profilePicture")
    .lean();

  const connections = (user?.connections || []).filter(Boolean);
  const connectionIds = connections.map((connection) => connection._id);

  const profiles = await Profile.find({
    user: { $in: connectionIds },
  })
    .select("user headline skills")
    .lean();

  const profileByUserId = new Map(
    profiles.map((profile) => [String(profile.user), profile])
  );

  const data = connections.map((connection) => {
    const profile = profileByUserId.get(String(connection._id));

    return {
      ...connection,
      headline: profile?.headline || "",
      skills: profile?.skills || [],
    };
  });

  return res.status(200).json(
    new ApiResponse(200, data, "Connections fetched successfully")
  );
});

// Get Pending Requests
const getPendingRequests = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id)
        .populate("pendingRequests", "firstName lastName profilePicture");

    return res.status(200).json(
        new ApiResponse(200, user.pendingRequests, "Pending requests fetched successfully")
    );
});

// Get Connection Suggestions (Improved)
const getSuggestions = asyncHandler(async (req, res) => {
    const currentUser = await User.findById(req.user._id);

    // Get all user IDs to exclude
    const excludedIds = [
        req.user._id,
        ...currentUser.connections.map(id => id.toString()),
        ...currentUser.pendingRequests.map(id => id.toString())
    ];

    // Also exclude users who have sent requests to current user
    const usersWithRequestsToMe = await User.find({
        pendingRequests: { $in: [req.user._id] }
    }).select('_id');

    usersWithRequestsToMe.forEach(user => {
        excludedIds.push(user._id.toString());
    });

    // Get unique IDs
    const uniqueExcludedIds = [...new Set(excludedIds)];

    // Find users not in excluded list
    const suggestions = await User.find({
        _id: { $nin: uniqueExcludedIds }
    })
        .select("firstName lastName profilePicture")
        .limit(10);

    // Get profile information for suggestions
    const suggestionsWithProfiles = await Promise.all(
        suggestions.map(async (user) => {
            const profile = await Profile.findOne({ user: user._id });
            return {
                _id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                profilePicture: user.profilePicture,
                headline: profile?.headline || profile?.title || "Developer",
                skills: profile?.skills || []
            };
        })
    );

    return res.status(200).json(
        new ApiResponse(200, suggestionsWithProfiles, "Suggestions fetched successfully")
    );
});

export {
    sendRequest,
    acceptRequest,
    rejectRequest,
    getConnections,
    getPendingRequests,
    getSuggestions
};
