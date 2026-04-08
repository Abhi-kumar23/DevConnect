import express from 'express';
import { verifyJWT } from '../middleware/authMiddleware.js';
import {
    createProject,
    getAllProjects,
    getProjectById,
    sendJoinRequest,
    acceptJoinRequest,
    rejectJoinRequest,
    getProjectChat,
    sendProjectMessage
} from '../controllers/projectController.js';

const router = express.Router();

router.use(verifyJWT);

router.route('/')
    .get(getAllProjects)
    .post(createProject);

router.get('/:projectId', getProjectById);
router.post('/:projectId/join', sendJoinRequest);
router.post('/:projectId/accept/:userId', acceptJoinRequest);
router.post('/:projectId/reject/:userId', rejectJoinRequest);
router.get('/:projectId/chat', getProjectChat);
router.post('/:projectId/chat', sendProjectMessage);

export default router;