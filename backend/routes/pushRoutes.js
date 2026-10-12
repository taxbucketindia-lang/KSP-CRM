import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { getPushPublicKey, subscribePush, unsubscribePush, sendTestPush, getPushSetupStatus } from '../controllers/pushController.js';

const router = express.Router();

router.get('/status', getPushSetupStatus);
router.get('/public-key', protect, getPushPublicKey);
router.post('/subscribe', protect, subscribePush);
router.post('/unsubscribe', protect, unsubscribePush);
router.post('/test', protect, sendTestPush);

export default router;
