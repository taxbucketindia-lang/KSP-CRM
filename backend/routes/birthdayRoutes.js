import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { getBirthdayDashboard, sendManualWish } from '../controllers/birthdayController.js';

const router = express.Router();

router.route('/dashboard').get(protect, getBirthdayDashboard);
router.route('/send-manual').post(protect, sendManualWish);

export default router;