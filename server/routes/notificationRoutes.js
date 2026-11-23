import express from "express";
import { verifyJWT } from "../middlewares/authMiddleware.js";
import {
  validate,
  idValidation,
} from "../middlewares/validationMiddleware.js";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  clearNotifications,
} from "../controllers/notificationController.js";

const router = express.Router();

router.use(verifyJWT);

router.get("/", getNotifications);
router.get("/unread/count", getUnreadCount);
router.put("/read-all", markAllAsRead);

router.put(
  "/:id/read",
  idValidation.notificationId,
  validate,
  markAsRead
);

router.delete("/", clearNotifications);

export default router;