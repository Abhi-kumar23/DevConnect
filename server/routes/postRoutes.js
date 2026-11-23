import express from "express";
import { verifyJWT } from "../middlewares/authMiddleware.js";
import { upload } from "../middlewares/uploadMiddleware.js";
import {
  validate,
  idValidation,
  paginationValidation,
} from "../middlewares/validationMiddleware.js";
import {
  createPost,
  getFeed,
  deletePost,
  getUserPosts,
} from "../controllers/postController.js";

const router = express.Router();

router.use(verifyJWT);

router.post("/", upload.single("image"), createPost);

router.get(
  "/feed",
  ...paginationValidation(),
  validate,
  getFeed
);

router.get(
  "/user/:userId",
  idValidation.userId,
  ...paginationValidation(),
  validate,
  getUserPosts
);

router.delete(
  "/:postId",
  idValidation.postId,
  validate,
  deletePost
);

export default router;