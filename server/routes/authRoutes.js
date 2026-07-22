import express from 'express';

import { verifyJWT } from '../middleware/authMiddleware.js';
import {
    registerUser,
    sendOTP,
    verifyOTP,
    resendOTP,
    loginUser,
    googleLogin,
    refreshAccessToken,
    logoutUser,
    getCurrentUser
} from '../controllers/authController.js';

import { createRateLimiter } from '../utils/rateLimit.js';

const router = express.Router();

const otpLimiter = createRateLimiter({
    prefix: 'rl:otp:',
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: 'Too many OTP requests. Please try again later.'
});

const verifyLimiter = createRateLimiter({
    prefix: 'rl:verify:',
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: 'Too many verification attempts. Please try again later.'
});



router.post('/register', registerUser);

router.post('/send-otp', otpLimiter, sendOTP);

router.post('/verify-otp', verifyLimiter, verifyOTP);

router.post('/resend-otp', otpLimiter, resendOTP);

router.post('/login', loginUser);

router.post('/google', googleLogin);

// Protected routes
router.get('/profile', verifyJWT, getCurrentUser);

router.post("/refresh-token", refreshAccessToken);
router.post("/logout", verifyJWT, logoutUser);


export default router;