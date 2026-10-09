import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { 
  getFssaiWorkspaces, createFssaiWorkspace, 
  updateFssaiWorkspace, deleteFssaiWorkspace,
  importFssaiWorkspaces, bulkDeleteFssaiWorkspaces
} from '../controllers/fssaiController.js';

import { requirePermission } from '../utils/permissions.js';

// 🔴 Data delete sirf wahi kar sakta hai jiske paas "Delete Records" ka right hai (CEO, Admin, ya jise Admin ne diya)
const canDelete = requirePermission('DELETE_RECORDS');

const router = express.Router();

router.post('/import', protect, importFssaiWorkspaces); 
router.post('/bulk-delete', protect, canDelete, bulkDeleteFssaiWorkspaces);

router.route('/')
  .get(protect, getFssaiWorkspaces)
  .post(protect, createFssaiWorkspace);

router.route('/:id')
  .put(protect, updateFssaiWorkspace)
  .delete(protect, canDelete, deleteFssaiWorkspace);

export default router;