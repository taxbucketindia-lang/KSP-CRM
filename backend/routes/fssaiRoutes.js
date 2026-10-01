import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { 
  getFssaiWorkspaces, createFssaiWorkspace, 
  updateFssaiWorkspace, deleteFssaiWorkspace,
  importFssaiWorkspaces, bulkDeleteFssaiWorkspaces
} from '../controllers/fssaiController.js';

const router = express.Router();

router.post('/import', protect, importFssaiWorkspaces); 
router.post('/bulk-delete', protect, bulkDeleteFssaiWorkspaces);

router.route('/')
  .get(protect, getFssaiWorkspaces)
  .post(protect, createFssaiWorkspace);

router.route('/:id')
  .put(protect, updateFssaiWorkspace)
  .delete(protect, deleteFssaiWorkspace);

export default router;