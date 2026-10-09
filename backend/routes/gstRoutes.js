import express from 'express';
import { getGstReturns, createGstReturn, updateGstReturn, deleteGstReturn, importGstReturns, bulkDeleteGstReturns } from '../controllers/gstController.js';
import { protect } from '../middleware/authMiddleware.js';

import { requirePermission } from '../utils/permissions.js';

// 🔴 Data delete sirf wahi kar sakta hai jiske paas "Delete Records" ka right hai (CEO, Admin, ya jise Admin ne diya)
const canDelete = requirePermission('DELETE_RECORDS');

const router = express.Router();

router.route('/import').post(protect, importGstReturns);
router.route('/bulk-delete').post(protect, canDelete, bulkDeleteGstReturns);
router.route('/').get(protect, getGstReturns).post(protect, createGstReturn);
router.route('/:id').put(protect, updateGstReturn).delete(protect, canDelete, deleteGstReturn);

export default router;