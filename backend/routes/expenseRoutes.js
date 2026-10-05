import express from 'express';
import { protect } from '../middleware/authMiddleware.js'; // Ensure path is correct
import { getExpenses, createExpense, updateExpense, deleteExpense } from '../controllers/expenseController.js';

const router = express.Router();

router.route('/')
  .get(protect, getExpenses)
  .post(protect, createExpense);

router.route('/:id')
  .put(protect, updateExpense)
  .delete(protect, deleteExpense);

export default router;