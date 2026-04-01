// routes/authRoutes.js
import express from 'express';
import { registerUser, loginUser, getCurrentUser, logoutUser, refreshAccessToken, googleLogin} from '../controllers/authController.js';
import { verifyJWT } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.post('/register', registerUser);
router.post('/login', loginUser);

// Protected routes
router.get('/profile', verifyJWT, getCurrentUser);

router.post("/refresh-token", refreshAccessToken);
router.post("/logout", verifyJWT, logoutUser);
router.post('/google', googleLogin);


export default router;