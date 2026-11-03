import express from "express";
import { verifyJWT } from "../middlewares/authMiddleware.js";

const router = express.Router();

import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  clearNotifications,
} from "../controllers/notificationController.js";

router.use(verifyJWT);

router.get("/", getNotifications);
router.put("/read-all", markAllAsRead);
router.put("/:id/read", markAsRead);
router.delete("/", clearNotifications);
router.get("/unread/count", getUnreadCount);

export default router;
