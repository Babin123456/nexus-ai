import express from 'express';
import { uploadAndAnalyzeResume, getLatestResume, getResumeHistory, deleteResume } from '../controllers/resume.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { uploadResume } from '../middleware/upload.middleware.js';

const router = express.Router();

router.use(protect);

router.post('/upload', uploadResume.single('resume'), uploadAndAnalyzeResume);
router.get('/latest', getLatestResume);
router.get('/history', getResumeHistory);
router.delete('/:id', deleteResume);

export default router;
