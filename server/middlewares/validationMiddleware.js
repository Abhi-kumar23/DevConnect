import { validationResult, param, query, body } from "express-validator";
import { ApiError } from "../utils/ApiError.js";

export const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (errors.isEmpty()) {
    return next();
  }

  return next(
    new ApiError(
      422,
      "Request validation failed",
      errors.array().map(({ path, msg }) => ({ [path]: msg }))
    )
  );
};

export const idValidation = {
  postId: param("postId").isMongoId().withMessage("Invalid post ID"),
  commentId: param("commentId").isMongoId().withMessage("Invalid comment ID"),
  replyId: param("replyId").isMongoId().withMessage("Invalid reply ID"),
  userId: param("userId").isMongoId().withMessage("Invalid user ID"),
  projectId: param("projectId").isMongoId().withMessage("Invalid project ID"),
  chatId: param("chatId").isMongoId().withMessage("Invalid chat ID"),
  notificationId: param("id").isMongoId().withMessage("Invalid notification ID"),
};

export const paginationValidation = (maxLimit = 50) => [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("page must be at least 1")
    .toInt(),

  query("limit")
    .optional()
    .isInt({ min: 1, max: maxLimit })
    .withMessage(`limit must be between 1 and ${maxLimit}`)
    .toInt(),
];

export const commentValidation = {
  add: body("content")
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage("Comment must be between 1 and 2000 characters"),

  update: body("content")
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage("Comment must be between 1 and 2000 characters"),
};