import express from 'express';
import { verifyJWT } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/uploadMiddleware.js';
import {
    createPost,
    getFeed,
    toggleLike,
    addComment,
    deletePost
} from '../controllers/postController.js';

const router = express.Router();

router.use(verifyJWT);

router.post('/', upload.single('image'), createPost);

router.get('/feed', getFeed);
router.post('/:postId/like', toggleLike);
router.post('/:postId/comment', addComment);
router.delete('/:postId', deletePost);

export default router;