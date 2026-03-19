const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");

const {
  createPost,
  getFeed,
  likePost,
  commentPost,
} = require("../controllers/postController");

router.post("/", protect, createPost);
router.get("/", protect, getFeed);
router.post("/like/:id", protect, likePost);
router.post("/comment/:id", protect, commentPost);

module.exports = router;