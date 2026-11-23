import express from "express";
import { verifyJWT } from "../middlewares/authMiddleware.js";
import {
  validate,
  idValidation,
} from "../middlewares/validationMiddleware.js";
import {
  sendRequest,
  acceptRequest,
  rejectRequest,
  getConnections,
  getPendingRequests,
  getSuggestions,
} from "../controllers/connectionsController.js";

const router = express.Router();

router.use(verifyJWT);

router.post("/connect/:userId", idValidation.userId, validate, sendRequest);
router.post("/accept/:userId", idValidation.userId, validate, acceptRequest);
router.post("/reject/:userId", idValidation.userId, validate, rejectRequest);

router.get("/pending", getPendingRequests);
router.get("/", getConnections);
router.get("/suggestions", getSuggestions);

export default router;