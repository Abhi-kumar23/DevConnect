import express from 'express';
import { validate, commentValidation, idValidation } from '../middleware/validationMiddleware.js';
import {
    getPostComments,
    addComment,
    updateComment,
    deleteComment,
    toggleCommentLike,
    addReply
} from '../controllers/commentController.js';

const router = express.Router();


// Get comments for a post and add comment
router.route('/:postId')
    .get(
        idValidation.paramId,
        validate,
        getPostComments
    )
    .post(
        idValidation.paramId,
        commentValidation.add,
        validate,
        addComment
    );

// Update and delete comment
router.route('/:commentId')
    .put(
        idValidation.paramId,
        commentValidation.update,
        validate,
        updateComment
    )
    .delete(
        idValidation.paramId,
        validate,
        deleteComment
    );

// Like/unlike comment
router.post('/:commentId/like',
    idValidation.paramId,
    validate,
    toggleCommentLike
);

// Add reply to comment
router.post('/:commentId/reply',
    idValidation.paramId,
    commentValidation.add,
    validate,
    addReply
);

export default router;