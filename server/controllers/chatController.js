// controllers/chatController.js
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import  Chat  from "../models/Chat.js";
import Message from "../models/Message.js";
import User  from "../models/User.js";
import  Notification  from "../models/Notification.js";

const createOrGetChat = asyncHandler(async (req, res) => {
    const { userId } = req.body;

    if (!userId) {
        throw new ApiError(400, "User ID is required");
    }

    let chat = await Chat.findOne({
        participants: { $all: [req.user._id, userId] },
        isGroupChat: false
    }).populate("participants", "firstName lastName avatar");

    if (!chat) {
        chat = await Chat.findOne({
            participants: { $in: [req.user._id, userId] },
            $and: [
                { participants: req.user._id },
                { participants: userId }
            ],
            isGroupChat: false
        });
        
        if (!chat) {
            chat = await Chat.create({
                participants: [req.user._id, userId],
                isGroupChat: false
            });
            await chat.populate("participants", "firstName lastName avatar");
        }
    }

    return res.status(200).json(
        new ApiResponse(200, chat, "Chat fetched successfully")
    );
});

const getUserChats = asyncHandler(async (req, res) => {
    const chats = await Chat.find({
        participants: req.user._id
    })
    .populate("participants", "firstName lastName avatar")
    .populate("lastMessage")
    .sort({ updatedAt: -1 });

    return res.status(200).json(
        new ApiResponse(200, chats, "Chats fetched successfully")
    );
});

// Send Message
const sendMessage = asyncHandler(async (req, res) => {
    const { chatId, text } = req.body;

    if (!chatId || !text) {
        throw new ApiError(400, "Chat ID and message text are required");
    }

    const chat = await Chat.findById(chatId);
    if (!chat) {
        throw new ApiError(404, "Chat not found");
    }

    const message = await Message.create({
        chat: chatId,
        sender: req.user._id,
        content: text
    });

    // Update chat last message
    chat.lastMessage = message._id;
    chat.lastMessageAt = new Date();
    await chat.save();

    await message.populate("sender", "firstName lastName avatar");

    // Get recipient
    const recipient = chat.participants.find(
        p => p.toString() !== req.user._id.toString()
    );

    // Create notification
    await Notification.create({
        recipient,
        sender: req.user._id,
        type: "message",
        title: "New Message", 
        message: `${req.user.firstName}: ${text.substring(0, 50)}${text.length > 50 ? "..." : ""}`,
        data: { chatId: chat._id }
    });

    return res.status(201).json(
        new ApiResponse(201, message, "Message sent successfully")
    );
});

// Get Messages
const getMessages = asyncHandler(async (req, res) => {
    const { chatId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const skip = (page - 1) * limit;

    const messages = await Message.find({ chat: chatId })
        .populate("sender", "firstName lastName avatar")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

    return res.status(200).json(
        new ApiResponse(200, messages.reverse(), "Messages fetched successfully")
    );
});

// Mark Messages as Read
const markAsRead = asyncHandler(async (req, res) => {
    const { chatId } = req.params;

    await Message.updateMany(
        {
            chat: chatId,
            sender: { $ne: req.user._id },
            "readBy.user": { $ne: req.user._id }
        },
        {
            $push: { readBy: { user: req.user._id, readAt: new Date() } }
        }
    );

    return res.status(200).json(
        new ApiResponse(200, null, "Messages marked as read")
    );
});

export { createOrGetChat, getUserChats, sendMessage, getMessages, markAsRead };