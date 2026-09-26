import express from 'express';
import { getClients, createClient, updateClient, deleteClient } from '../controllers/clientMasterController.js';
import { protect } from '../middleware/authMiddleware.js'; // Ensure only logged-in users access this

const router = express.Router();

router.get('/', protect, getClients);
router.post('/', protect, createClient);
router.put('/:id', protect, updateClient);
router.delete('/:id', protect, deleteClient);

export default router;