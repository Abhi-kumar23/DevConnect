const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");

const {
  sendRequest,
  acceptRequest,
  rejectRequest,
  getConnections,
  getSuggestions
} = require("../controllers/connectionsController");

router.post("/connect/:id", protect, sendRequest);
router.post("/accept/:id", protect, acceptRequest);
router.post("/reject/:id", protect, rejectRequest);

router.get("/", protect, getConnections);
router.get("/suggestions", protect, getSuggestions);

module.exports = router;