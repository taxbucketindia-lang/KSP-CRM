import express from 'express';
import { getGstReturns, createGstReturn, updateGstReturn, deleteGstReturn, importGstReturns, bulkDeleteGstReturns } from '../controllers/gstController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/import').post(protect, importGstReturns);
router.route('/bulk-delete').post(protect, bulkDeleteGstReturns);
router.route('/').get(protect, getGstReturns).post(protect, createGstReturn);
router.route('/:id').put(protect, updateGstReturn).delete(protect, deleteGstReturn);

export default router;