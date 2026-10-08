import express from 'express';
import { createTaskHandover, getMyHandovers, updateTaskStatusOrAddRemark } from '../controllers/taskHandoverController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/handovers')
  .post(protect, createTaskHandover)
  .get(protect, getMyHandovers);

router.route('/handovers/:id')
  .put(protect, updateTaskStatusOrAddRemark);

export default router;