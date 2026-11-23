import express from 'express';
import { verifyJWT } from '../middlewares/authMiddleware.js';
import { upload } from '../middlewares/uploadMiddleware.js';
import {
    createPost,
    getFeed,
    deletePost,
    getUserPosts
} from '../controllers/postController.js';

const router = express.Router();

router.use(verifyJWT);

router.post('/', upload.single('image'), createPost);

router.get('/feed', getFeed);
router.get("/user/:userId", getUserPosts);
router.delete('/:postId', deletePost);

export default router;