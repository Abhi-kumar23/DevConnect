// routes/profileRoutes.js
import express from 'express';
import { verifyJWT } from '../middlewares/authMiddleware.js';
import { upload } from '../middlewares/uploadMiddleware.js';
import {
    createOrUpdateProfile,
    getMyProfile,
    uploadProfilePic,
    uploadCoverPhoto,
    deleteProfile,
    getProfileByUserId,
    getAllProfiles,
    searchUsers,
} from '../controllers/profileController.js';

const router = express.Router();

router.use(verifyJWT);

// Public routes
router.get('/all', getAllProfiles);
router.get('/search', searchUsers);
router.get('/user/:userId', getProfileByUserId);


router.route('/')
    .get(getMyProfile)
    .post(createOrUpdateProfile)
    .put(createOrUpdateProfile);

router.post("/avatar", upload.single("avatar"), uploadProfilePic); 
router.post("/cover", upload.single("cover"), uploadCoverPhoto);
router.delete("/", deleteProfile); 

export default router;
