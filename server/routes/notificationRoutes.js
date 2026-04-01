import express from "express";
import { verifyJWT } from "../middleware/authMiddleware.js";

const router = express.Router();

import {
  getNotifications,
  markAsRead,
  getUnreadCount,
  clearNotifications,
} from "../controllers/notificationController.js";

router.use(verifyJWT);

router.get("/", getNotifications);
router.put("/:id/read", markAsRead);
router.delete("/", clearNotifications);
router.get("/unread/count", getUnreadCount);

export default router;