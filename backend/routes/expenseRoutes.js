import express from 'express';
import { protect } from '../middleware/authMiddleware.js'; // Ensure path is correct
import { getExpenses, createExpense } from '../controllers/expenseController.js';

const router = express.Router();

router.route('/')
  .get(protect, getExpenses)
  .post(protect, createExpense);

export default router;