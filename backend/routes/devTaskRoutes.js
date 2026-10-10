import express from 'express';
import { createDevTask, getDevTasks, addRemark, updateDevTask, updateTaskDetails, deleteDevTask, toggleChecklistItem } from '../controllers/devTaskController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .post(protect, createDevTask)
  .get(protect, getDevTasks);

// Progress update (status, ghante, branch / PR, blocker)
router.put('/:id', protect, updateDevTask);

// Sirf comment (status nahi badalta)
router.post('/:id/remarks', protect, addRemark);

// Checklist ka ek point tick / untick
router.put('/:id/checklist/:itemId', protect, toggleChecklistItem);

router.route('/:id/edit').put(protect, updateTaskDetails);
router.route('/:id').delete(protect, deleteDevTask);

export default router;
