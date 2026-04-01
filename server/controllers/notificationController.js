// controllers/notificationController.js
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import Notification from "../models/Notification.js";

// Get all notifications for current user
const getNotifications = asyncHandler(async (req, res) => {
    const notifications = await Notification.find({
        recipient: req.user._id,
    })
    .populate("sender", "firstName lastName avatar")
    .sort({ createdAt: -1 })
    .limit(50);

    return res.status(200).json(
        new ApiResponse(200, notifications, "Notifications fetched successfully")
    );
});

// Mark a single notification as read
const markAsRead = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const notification = await Notification.findOne({
        _id: id,
        recipient: req.user._id,
    });

    if (!notification) {
        throw new ApiError(404, "Notification not found");
    }

    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();

    return res.status(200).json(
        new ApiResponse(200, notification, "Notification marked as read")
    );
});

// Get unread count
const getUnreadCount = asyncHandler(async (req, res) => {
    const count = await Notification.countDocuments({
        recipient: req.user._id,
        isRead: false,
    });

    return res.status(200).json(
        new ApiResponse(200, { count }, "Unread count fetched successfully")
    );
});

// Clear all notifications for current user
const clearNotifications = asyncHandler(async (req, res) => {
    await Notification.deleteMany({ recipient: req.user._id });

    return res.status(200).json(
        new ApiResponse(200, null, "All notifications cleared")
    );
});

export {
    getNotifications,
    markAsRead,
    getUnreadCount,
    clearNotifications,
};