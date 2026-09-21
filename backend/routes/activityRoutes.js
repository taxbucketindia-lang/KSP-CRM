import express from 'express';
import { addFollowUp, getHistory } from '../controllers/activityController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/followup', protect, addFollowUp);
router.get('/followup/:model/:id', protect, getHistory);

export default router;