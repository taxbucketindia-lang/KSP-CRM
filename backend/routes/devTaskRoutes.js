import express from 'express';
import { createDevTask, getDevTasks, addRemark, updateDevTask,updateTaskDetails,deleteDevTask } from '../controllers/devTaskController.js';
import { protect } from '../middleware/authMiddleware.js'; 

const router = express.Router();

router.route('/')
  .post(protect, createDevTask)
  .get(protect, getDevTasks);

// Remark ke liye update route (Yeh naya add karna hai)
router.put('/:id', protect, updateDevTask);

// Puraana wala rakha hai backup ke liye
router.post('/:id/remarks', protect, addRemark);

router.route('/:id/edit').put(protect, updateTaskDetails);
router.route('/:id').delete(protect, deleteDevTask);

export default router;