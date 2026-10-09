import express from 'express';
import { getClients, createClient, updateClient, deleteClient, getClientWorkspaces } from '../controllers/clientMasterController.js';
import { protect } from '../middleware/authMiddleware.js'; // Ensure only logged-in users access this

import { requirePermission } from '../utils/permissions.js';

// 🔴 Data delete sirf wahi kar sakta hai jiske paas "Delete Records" ka right hai (CEO, Admin, ya jise Admin ne diya)
const canDelete = requirePermission('DELETE_RECORDS');

const router = express.Router();

router.get('/', protect, getClients);
router.post('/', protect, createClient);
router.get('/:id/workspaces', protect, getClientWorkspaces);
router.put('/:id', protect, updateClient);
router.delete('/:id', protect, canDelete, deleteClient);

export default router;
