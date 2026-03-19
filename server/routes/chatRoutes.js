const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");

const {
  createChat,
  getUserChats,
  sendMessage,
  getMessages
} = require("../controllers/chatController");


router.post("/", protect, createChat);
router.get("/", protect, getUserChats);
router.post("/message", protect, sendMessage);
router.get("/message/:chatId", protect, getMessages);

module.exports = router;