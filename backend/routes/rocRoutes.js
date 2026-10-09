import express from 'express';
import { protect } from '../middleware/authMiddleware.js'; // Ensure user is logged in
import { 
  getRocWorkspaces, 
  createRocWorkspace, 
  addDirector, 
  getCompanyDirectors, 
  addComplianceTask, 
  getComplianceTasks,
  updateRocWorkspace,
  deleteRocWorkspace,
  importRocWorkspaces, bulkDeleteRocWorkspaces,
} from '../controllers/rocController.js';

import { requirePermission } from '../utils/permissions.js';

// 🔴 Data delete sirf wahi kar sakta hai jiske paas "Delete Records" ka right hai (CEO, Admin, ya jise Admin ne diya)
const canDelete = requirePermission('DELETE_RECORDS');

const router = express.Router();

// Workspace Routes
router.route('/workspaces')
  .get(protect, getRocWorkspaces)
  .post(protect, createRocWorkspace);

router.route('/workspaces/:id')
  .put(protect, updateRocWorkspace)
  .delete(protect, canDelete, deleteRocWorkspace);

// Directors & DSC Routes
router.post('/directors', protect, addDirector);
router.get('/directors/:workspaceId', protect, getCompanyDirectors);

// Compliance & Filing Routes
router.post('/compliance', protect, addComplianceTask);
router.get('/compliance/:workspaceId', protect, getComplianceTasks);
router.post('/workspaces/import', protect, importRocWorkspaces);
router.post('/workspaces/bulk-delete', protect, canDelete, bulkDeleteRocWorkspaces);

export default router;