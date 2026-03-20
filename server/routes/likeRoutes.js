const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { validate, idValidation } = require('../middleware/validationMiddleware');
const {
    togglePostLike,
    toggleCommentLike,
    getLikedPosts,
    getLikeStatus,
    getPostLikers
} = require('../controllers/likeController');

// All routes require authentication
router.use(protect);

// Toggle likes
router.post('/post/:postId',
    idValidation.paramId,
    validate,
    togglePostLike
);

router.post('/comment/:commentId',
    idValidation.paramId,
    validate,
    toggleCommentLike
);

router.get('/posts', getLikedPosts);

router.post('/status',getLikeStatus);

// Get users who liked a post
router.get('/post/:postId/users',
    idValidation.paramId,
    validate,
    getPostLikers
);

module.exports = router;