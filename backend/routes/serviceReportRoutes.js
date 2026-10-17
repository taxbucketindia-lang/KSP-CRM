import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { can } from '../utils/permissions.js';
import { getServiceReport, getServiceReportDetails } from '../controllers/serviceReportController.js';

const router = express.Router();

// 🔴 Service Report (Executive): jinke paas "Service Report" ka right hai (CEO ko hamesha)
const allowed = (req, res, next) => (can(req.user, 'SERVICE_REPORT') ? next() : res.status(403).json({ message: 'You do not have access to the Service Report' }));

router.use(protect, allowed);
router.get('/', getServiceReport);
router.get('/details', getServiceReportDetails);

export default router;
