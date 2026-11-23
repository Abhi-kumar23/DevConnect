import express from "express";
import {
  validate,
  commentValidation,
  idValidation,
  paginationValidation,
} from "../middlewares/validationMiddleware.js";

import {
  getPostComments,
  addComment,
  updateComment,
  deleteComment,
  addReply,
} from "../controllers/commentController.js";

import { verifyJWT } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(verifyJWT);

router
  .route("/:postId")
  .get(
    idValidation.postId,
    ...paginationValidation(),
    validate,
    getPostComments
  )
  .post(
    idValidation.postId,
    commentValidation.add,
    validate,
    addComment
  );

router
  .route("/:commentId")
  .put(
    idValidation.commentId,
    commentValidation.update,
    validate,
    updateComment
  )
  .delete(
    idValidation.commentId,
    validate,
    deleteComment
  );

router.post(
  "/:commentId/reply",
  idValidation.commentId,
  commentValidation.add,
  validate,
  addReply
);

export default router;