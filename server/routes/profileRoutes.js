const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");

const {
  createOrUpdateProfile,
  getMyProfile,
  deleteProfile,
  getProfileByUserId,
  getAllProfiles,
  uploadProfilePic,
  searchUsers
} = require("../controllers/profileController");

const multer = require("multer");

// Configure multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/"); // make sure this folder exists
  },
  filename: function (req, file, cb) {
    cb(null, `${req.user._id}_${Date.now()}_${file.originalname}`);
  }
});
const upload = multer({ storage });


// PRIVATE routes
router.post("/", protect, createOrUpdateProfile);
router.get("/me", protect, getMyProfile);
router.delete("/", protect, deleteProfile);
router.post("/picture", protect, upload.single("profilePic"), uploadProfilePic);

// PUBLIC routes
router.get("/:userId", getProfileByUserId);
router.get("/", getAllProfiles);
router.get("/search", searchUsers);

module.exports = router;