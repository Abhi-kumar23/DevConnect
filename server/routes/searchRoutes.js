import express from "express";
import { globalSearch } from "../controllers/searchController.js";
import { verifyJWT } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(verifyJWT);

router.get("/", globalSearch);

export default router;