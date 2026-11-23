import { validationResult, param, body } from "express-validator";
import mongoose from "mongoose";
import { ApiError } from "../utils/ApiError.js";

export const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (errors.isEmpty()) {
    return next();
  }

  const extractedErrors = errors.array().map((err) => ({
    [err.path]: err.msg,
  }));

  return next(
    new ApiError(422, "Request validation failed", extractedErrors)
  );
};

// Validate MongoDB ObjectId route parameters.
export const idValidation = {
  paramId: param(["postId", "commentId"])
    .custom((value) => mongoose.isValidObjectId(value))
    .withMessage("Invalid resource ID"),
};

// Comment validation rules.
export const commentValidation = {
  add: [
    body("content")
      .trim()
      .notEmpty()
      .withMessage("Comment cannot be empty")
      .bail()
      .isLength({ max: 2000 })
      .withMessage("Comment cannot exceed 2000 characters"),
  ],

  update: [
    body("content")
      .trim()
      .notEmpty()
      .withMessage("Comment cannot be empty")
      .bail()
      .isLength({ max: 2000 })
      .withMessage("Comment cannot exceed 2000 characters"),
  ],
};
