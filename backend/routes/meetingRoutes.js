import express from 'express';
import { getMeetings, createMeeting, updateMeeting, deleteMeeting } from '../controllers/meetingController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(protect, getMeetings)
  .post(protect, createMeeting);

router.route('/:id')
  .put(protect, updateMeeting)
  .delete(protect, deleteMeeting);

export default router;
