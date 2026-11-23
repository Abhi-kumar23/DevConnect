import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import Chat from "../models/Chat.js";
import Message from "../models/Message.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";

const userFields = "firstName lastName profilePicture";

const ensureParticipant = async (chatId, userId) => {
  const chat = await Chat.findOne({ _id: chatId, participants: userId });
  if (!chat) throw new ApiError(404, "Chat not found or you do not have access to it");
  return chat;
};

const createOrGetChat = asyncHandler(async (req, res) => {
  const userId = String(req.body?.userId || "");
  if (!userId) throw new ApiError(400, "User ID is required");
  if (userId === req.user._id.toString()) throw new ApiError(400, "You cannot message yourself");

  const recipient = await User.findById(userId).select("_id isActive");
  if (!recipient || !recipient.isActive) throw new ApiError(404, "Recipient not found");

  let chat = await Chat.findOne({
    participants: { $all: [req.user._id, userId], $size: 2 },
    isGroupChat: false,
  }).populate("participants", userFields);

  if (!chat) {
    chat = await Chat.create({ participants: [req.user._id, userId], isGroupChat: false });
    await chat.populate("participants", userFields);
  }
  return res.status(200).json(new ApiResponse(200, chat, "Chat ready"));
});

const getUserChats = asyncHandler(async (req, res) => {
  const chats = await Chat.find({ participants: req.user._id, isActive: true, deletedFor: { $ne: req.user._id } })
    .populate("participants", userFields)
    .populate("lastMessage")
    .sort({ lastMessageAt: -1, updatedAt: -1 });
  return res.status(200).json(new ApiResponse(200, chats, "Chats fetched successfully"));
});

const sendMessage = asyncHandler(async (req, res) => {
  const chatId = String(req.body?.chatId || "");
  const text = String(req.body?.text || "").trim();
  if (!chatId || !text) throw new ApiError(400, "Chat ID and message text are required");
  if (text.length > 5000) throw new ApiError(400, "Message cannot exceed 5000 characters");

  const chat = await ensureParticipant(chatId, req.user._id);
  const message = await Message.create({ chat: chat._id, sender: req.user._id, content: text, readBy: [{ user: req.user._id }] });
  chat.lastMessage = message._id;
  chat.lastMessageAt = new Date();
  await chat.incrementUnreadCount(chat.participants.find((id) => id.toString() !== req.user._id.toString()));

  await message.populate("sender", userFields);
  const recipient = chat.participants.find((id) => id.toString() !== req.user._id.toString());
  await Notification.upsertNotification({
    recipient,
    sender: req.user._id,
    dedupeKey: `message:${chat._id}:${recipient}`,
    type: "message",
    title: "New message",
    message: `${req.user.firstName}: ${text.slice(0, 50)}${text.length > 50 ? "…" : ""}`,
    data: { chatId: chat._id },
    actionUrl: `/chat/${chat._id}`,
});

  const io = req.app.get("io");
  // The sender already receives the message in the HTTP response. Broadcasting
  // it back to the sender races that response and produces duplicate messages.
  io?.to(`user:${recipient}`).emit("receiveMessage", message);
  io?.to(`user:${recipient}`).emit("chatUpdated", { chatId: chat._id });
  return res.status(201).json(new ApiResponse(201, message, "Message sent successfully"));
});

const getMessages = asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  await ensureParticipant(chatId, req.user._id);
  const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 50, 1), 100);
  const messages = await Message.find({ chat: chatId, deletedFor: { $ne: req.user._id } })
    .populate("sender", userFields)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);
  return res.status(200).json(new ApiResponse(200, messages.reverse(), "Messages fetched successfully"));
});

const markAsRead = asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  const chat = await ensureParticipant(chatId, req.user._id);
  await Message.updateMany(
    { chat: chatId, sender: { $ne: req.user._id }, "readBy.user": { $ne: req.user._id } },
    { $push: { readBy: { user: req.user._id, readAt: new Date() } } },
  );
  await chat.resetUnreadCount(req.user._id);
  return res.status(200).json(new ApiResponse(200, null, "Messages marked as read"));
});

export { createOrGetChat, getUserChats, sendMessage, getMessages, markAsRead };
