import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { isCeo } from '../utils/roles.js';
import {
  getOverview,
  createAccount, updateAccount, deleteAccount,
  createCategory, updateCategory, deleteCategory,
  getTransactions, getTransactionHistory, createTransaction, updateTransaction, deleteTransaction,
  getReports, getAccountLedger
} from '../controllers/personalFinanceController.js';

const router = express.Router();

// 🔴 Personal Cash Flow sirf owner (CEO) ke liye: Admin ya kisi employee ko yeh API nahi milti.
// Data bhi har CEO ka apna alag hai (controller me har query owner se bandhi hai).
const ownerOnly = (req, res, next) => {
  if (!isCeo(req.user)) return res.status(403).json({ message: 'Personal Cash Flow is available to the owner only' });
  next();
};

router.use(protect, ownerOnly);

router.get('/overview', getOverview);

router.post('/accounts', createAccount);
router.route('/accounts/:id').put(updateAccount).delete(deleteAccount);

router.post('/categories', createCategory);
router.route('/categories/:id').put(updateCategory).delete(deleteCategory);

router.route('/transactions').get(getTransactions).post(createTransaction);
router.get('/transactions/:id/history', getTransactionHistory);
router.route('/transactions/:id').put(updateTransaction).delete(deleteTransaction);

router.get('/reports', getReports);
router.get('/ledger', getAccountLedger);

export default router;
