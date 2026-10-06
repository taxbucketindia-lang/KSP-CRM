import express from 'express';
import { createDevTask, getDevTasks, addRemark } from '../controllers/devTaskController.js';
import { protect } from '../middleware/authMiddleware.js'; // Ensure karo ki path aur .js extension sahi ho

const router = express.Router();

router.route('/')
  .post(protect, createDevTask)
  .get(protect, getDevTasks);

// Remark add karne ke liye special route
router.post('/:id/remarks', protect, addRemark);

export default router;