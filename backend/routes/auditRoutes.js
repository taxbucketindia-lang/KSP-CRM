import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
    updateAuditClient,
  getAuditors,
  createAuditor,
  updateAuditor,
  deleteAuditor,
  getAllAudits,
  getClientAudits,
  createAuditEngagement,
  updateAuditEngagement,
  deleteAuditEngagement,
  getAuditAuditors, assignAuditor, updateAuditAuditor, removeAuditorLink,
  getAuditUdins, createUdin, updateUdin, deleteUdin,
  getAuditFilings, createFiling, updateFiling,
  getChecklist, addChecklistItem, updateChecklistItem,
  getDueDates, setDueDate, deleteFiling, deleteChecklistItem,
} from '../controllers/auditController.js';

const router = express.Router();

router.route('/clients/:id').put(protect, updateAuditClient);

// 🏢 Auditor Master (A2) Routes
router.route('/auditors')
  .get(protect, getAuditors)
  .post(protect, createAuditor);

router.route('/auditors/:id')
  .put(protect, updateAuditor)
  .delete(protect, deleteAuditor);

// 📄 Audit Engagement (A1) Routes
router.route('/engagements')
  .get(protect, getAllAudits)
  .post(protect, createAuditEngagement);

router.route('/engagements/client/:clientId')
  .get(protect, getClientAudits);

router.route('/engagements/:id')
  .put(protect, updateAuditEngagement)
  .delete(protect, deleteAuditEngagement);


// A3: Audit-Auditor Links
router.route('/links/audit/:auditId').get(protect, getAuditAuditors);
router.route('/links').post(protect, assignAuditor);
router.route('/links/:id').put(protect, updateAuditAuditor).delete(protect, removeAuditorLink);

// A4: UDINs
router.route('/udins/audit/:auditId').get(protect, getAuditUdins);
router.route('/udins').post(protect, createUdin);
router.route('/udins/:id').put(protect, updateUdin).delete(protect, deleteUdin);

// A5: Filings
router.route('/filings/audit/:auditId').get(protect, getAuditFilings);
router.route('/filings').post(protect, createFiling);
router.route('/filings/:id').put(protect, updateFiling)
                            .delete(protect, deleteFiling);;

// A6: Checklists
router.route('/checklists/audit/:auditId').get(protect, getChecklist);
router.route('/checklists').post(protect, addChecklistItem);
router.route('/checklists/:id').put(protect, updateChecklistItem)
                                .delete(protect, deleteChecklistItem);

// A7: Due Date Master
router.route('/due-dates').get(protect, getDueDates).post(protect, setDueDate);

export default router;