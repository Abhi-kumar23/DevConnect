const Chat = require("../models/Chat");
const Message = require("../models/Message");

const createChat = async (req, res) => {
  try {
    const newChat = await Chat.create({
      members: [req.user._id, req.body.receiverId]
    });

    res.status(201).json(newChat);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getUserChats = async (req, res) => {
  try {
    const chats = await Chat.find({
      members: { $in: [req.user._id] }
    }).populate("members", "name email");

    res.json(chats);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


const sendMessage = async (req, res) => {
  try {
    const message = await Message.create({
      chatId: req.body.chatId,
      sender: req.user._id,
      text: req.body.text
    });

    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


const getMessages = async (req, res) => {
  try {
    const messages = await Message.find({
      chatId: req.params.chatId
    }).sort({ createdAt: 1 });

    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


module.exports = {
  createChat,
  getUserChats,
  sendMessage,
  getMessages
};