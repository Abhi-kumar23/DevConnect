import express from 'express';
import { validate, idValidation } from '../middleware/validationMiddleware.js';
import {
    togglePostLike,
    toggleCommentLike,
    getLikedPosts,
    getLikeStatus,
    getPostLikers
} from '../controllers/likeController.js';

const router = express.Router();


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

export default router;