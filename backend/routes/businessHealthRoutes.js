import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  requireView, requireEdit, requireAdmin,
  getClients,
  getMonthly, createMonthly, updateMonthly, setMonthlyStatus, deleteMonthly,
  getKpis, getDashboard, getTrends,
  getSettings, updateSettings,
  getActions, createAction, updateAction, deleteAction
} from '../controllers/businessHealthController.js';

const router = express.Router();

// Client companies (jinki report banani hai / ban chuki hai)
router.get('/clients', protect, requireView, getClients);

// Monthly inputs (client + month)
router.route('/monthly')
  .get(protect, requireView, getMonthly)
  .post(protect, requireEdit, createMonthly);
router.route('/monthly/:id')
  .put(protect, requireEdit, updateMonthly)
  .delete(protect, requireAdmin, deleteMonthly);
router.put('/monthly/:id/approve', protect, requireAdmin, setMonthlyStatus('Approved'));
router.put('/monthly/:id/reopen', protect, requireAdmin, setMonthlyStatus('Draft'));

// KPI engine / dashboard
router.get('/kpis', protect, requireView, getKpis);
router.get('/dashboard', protect, requireView, getDashboard);
router.get('/trends', protect, requireView, getTrends);

// Recommendations / action plan (client ke liye sujhav)
router.route('/actions')
  .get(protect, requireView, getActions)
  .post(protect, requireEdit, createAction);
router.route('/actions/:id')
  .put(protect, requireEdit, updateAction)
  .delete(protect, requireEdit, deleteAction);

// Thresholds + weights
router.route('/settings')
  .get(protect, requireView, getSettings)
  .put(protect, requireAdmin, updateSettings);

export default router;
