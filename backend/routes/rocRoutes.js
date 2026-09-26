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
} from '../controllers/rocController.js';

const router = express.Router();

// Workspace Routes
router.route('/workspaces')
  .get(protect, getRocWorkspaces)
  .post(protect, createRocWorkspace);

router.route('/workspaces/:id')
  .put(protect, updateRocWorkspace)
  .delete(protect, deleteRocWorkspace);

// Directors & DSC Routes
router.post('/directors', protect, addDirector);
router.get('/directors/:workspaceId', protect, getCompanyDirectors);

// Compliance & Filing Routes
router.post('/compliance', protect, addComplianceTask);
router.get('/compliance/:workspaceId', protect, getComplianceTasks);

export default router;