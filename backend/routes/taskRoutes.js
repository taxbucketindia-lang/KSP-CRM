import express from 'express';
import { getTasks, createTask, updateTaskStatus, updateTaskDetails, getAllEmployees, submitEod, getEods, deleteTask, getPaginatedTasks } from '../controllers/taskController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// 🔴 FIX: /employees route pehle hona chahiye, warna /:id se conflict hoga
router.route('/employees').get(protect, getAllEmployees);
router.get('/paginated', protect, getPaginatedTasks);

router.route('/:id').put(protect, updateTaskDetails).delete(protect, deleteTask);

router.route('/eod')
  .get(protect, getEods)
  .post(protect, submitEod);

router.route('/')
  .get(protect, getTasks)
  .post(protect, createTask);

router.route('/:id/status')
  .put(protect, updateTaskStatus);

router.route('/:id').put(protect, updateTaskDetails);

export default router;