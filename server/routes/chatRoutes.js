import express from "express";
import { verifyJWT } from "../middleware/authMiddleware.js";

import {
  createOrGetChat,
  getUserChats,
  sendMessage,
  getMessages,
  markAsRead
} from "../controllers/chatController.js";

const router = express.Router();

router.use(verifyJWT);

router.route('/')
    .get(getUserChats)
    .post(createOrGetChat);

router.post('/message', sendMessage);
router.get('/:chatId/messages', getMessages);
router.put('/:chatId/read', markAsRead);

export default router;