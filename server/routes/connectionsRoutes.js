import express from "express";
import { verifyJWT } from "../middleware/authMiddleware.js";

const router = express.Router();

import {
  sendRequest,
  acceptRequest,
  rejectRequest,
  getConnections,
  getPendingRequests,
  getSuggestions
} from "../controllers/connectionsController.js";

router.use(verifyJWT);

router.post("/connect/:userId", sendRequest);  
router.post("/accept/:userId", acceptRequest); 
router.post("/reject/:userId", rejectRequest); 
router.get('/pending', getPendingRequests);

router.get("/", getConnections);
router.get("/suggestions", getSuggestions);

export default router;