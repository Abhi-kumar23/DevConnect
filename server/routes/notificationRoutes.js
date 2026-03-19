const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");

const {
  getNotifications,
  markAsRead,
  getUnreadCount,
  clearNotifications,
} = require("../controllers/notificationController");

router.get("/", protect, getNotifications);
router.put("/:id/read", protect, markAsRead);
router.delete("/", protect, clearNotifications);
router.get("/unread/count", protect, getUnreadCount);

module.exports = router;