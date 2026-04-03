// routes/profileRoutes.js
import express from 'express';
import { verifyJWT } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/uploadMiddleware.js';
import {
    createOrUpdateProfile,
    getMyProfile,
    uploadProfilePic,
    deleteProfile,
    getProfileByUserId,
    getAllProfiles,
    searchUsers,
} from '../controllers/profileController.js';

const router = express.Router();

// Public routes
router.get('/all', getAllProfiles);
router.get('/search', searchUsers);
router.get('/user/:userId', getProfileByUserId);

router.use(verifyJWT);

router.route('/')
    .get(getMyProfile)
    .post(createOrUpdateProfile)
    .put(createOrUpdateProfile);

router.post("/avatar", upload.single("avatar"), uploadProfilePic); 
router.delete("/", deleteProfile); 

export default router;