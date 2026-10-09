import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { getNotifications, markAsRead, markAllAsRead, clearRead } from '../controllers/notificationController.js';

const router = express.Router();

router.route('/').get(protect, getNotifications);
router.route('/read-all').put(protect, markAllAsRead);
router.route('/clear-read').delete(protect, clearRead);
router.route('/:id/read').put(protect, markAsRead);

export default router;