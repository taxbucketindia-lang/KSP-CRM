import express from 'express';
import { runGstHealthScan } from '../controllers/gstScanController.js';

const router = express.Router();

router.route('/').post(runGstHealthScan);

export default router;