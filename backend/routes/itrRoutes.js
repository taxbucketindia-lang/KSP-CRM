// File: backend/routes/itrRoutes.js
import express from 'express';
import { 
  getItrReturns, 
  createItrReturn, 
  updateItrReturn, 
  deleteItrReturn, 
  importItrReturns,
  bulkDeleteItrReturns 
} from '../controllers/itrController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// 🔴 FIX: Naya Import route add kiya gaya (Ye sabse upar hona chahiye)
router.route('/import').post(protect, importItrReturns);


router.route('/bulk-delete').post(protect, bulkDeleteItrReturns);
router.route('/').get(protect, getItrReturns).post(protect, createItrReturn);

router.route('/:id')
  .put(protect, updateItrReturn)
  .delete(protect, deleteItrReturn);

export default router;