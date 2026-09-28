import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  getTdsWorkspaces, createTdsWorkspace,
  getTdsReturns, createTdsReturn, updateTdsReturnStatus,
  getDeductees, addDeductee,
  getChallans, addChallan,
  getDeductionEntries, addDeductionEntry,
  getTdsSections, updateTdsWorkspace, deleteTdsReturn, deleteTdsWorkspace,
} from '../controllers/tdsController.js';

const router = express.Router();

// M1: Workspaces
router.route('/workspaces').get(protect, getTdsWorkspaces).post(protect, createTdsWorkspace);

router.route('/workspaces/:id').put(protect, updateTdsWorkspace).delete(protect, deleteTdsWorkspace);

router.route('/workspaces/:id').put(protect, updateTdsWorkspace);
router.route('/returns/:id').delete(protect, deleteTdsReturn);

// M2: Returns
router.route('/workspaces/:workspaceId/returns').get(protect, getTdsReturns);
router.route('/returns').post(protect, createTdsReturn);
router.route('/returns/:id/status').put(protect, updateTdsReturnStatus);

// M3 & M4: Deductees and Challans (Workspace level)
router.route('/workspaces/:workspaceId/deductees').get(protect, getDeductees).post(protect, addDeductee);
router.route('/workspaces/:workspaceId/challans').get(protect, getChallans).post(protect, addChallan);

// M5: Deduction Entries (Return level)
router.route('/returns/:returnId/entries').get(protect, getDeductionEntries).post(protect, addDeductionEntry);

// M6: Master Data
router.route('/masters/sections').get(protect, getTdsSections);




export default router;