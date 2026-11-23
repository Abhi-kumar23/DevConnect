import express from "express";
import {
  validate,
  idValidation,
  paginationValidation,
} from "../middlewares/validationMiddleware.js";
import { verifyJWT } from "../middlewares/authMiddleware.js";
import {
  togglePostLike,
  toggleCommentLike,
  toggleReplyLike,
  getLikedPosts,
  getLikeStatus,
  getPostLikers,
} from "../controllers/likeController.js";

const router = express.Router();

router.use(verifyJWT);

router.post(
  "/post/:postId",
  idValidation.postId,
  validate,
  togglePostLike
);

router.post(
  "/comment/:commentId",
  idValidation.commentId,
  validate,
  toggleCommentLike
);

router.post(
  "/comment/:commentId/reply/:replyId",
  idValidation.commentId,
  idValidation.replyId,
  validate,
  toggleReplyLike
);

router.get(
  "/posts",
  ...paginationValidation(),
  validate,
  getLikedPosts
);

router.post("/status", getLikeStatus);

router.get(
  "/post/:postId/users",
  idValidation.postId,
  ...paginationValidation(),
  validate,
  getPostLikers
);

export default router;