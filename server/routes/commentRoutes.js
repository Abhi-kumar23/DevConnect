const express = require('express');
const router = express.Router({ mergeParams: true });
const { protect } = require('../middleware/authMiddleware');
const { validate, commentValidation, idValidation } = require('../middleware/validationMiddleware');
const {
    getPostComments,
    addComment,
    updateComment,
    deleteComment,
    toggleCommentLike,
    addReply
} = require('../controllers/commentController');

// All routes require authentication
router.use(protect);

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

module.exports = router;