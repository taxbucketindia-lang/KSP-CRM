// import express from 'express';
// import { createLead, getLeads } from '../controllers/leadController.js';
// import { protect, authorize } from '../middleware/authMiddleware.js';

// const router = express.Router();

// // 'protect' ensure karega ki token valid hai
// // 'authorize' ensure karega ki sirf authorized roles hi data access karein
// router.route('/')
//   .post(protect, createLead)
//   .get(protect, authorize('Admin', 'Manager', 'Sales/Executive'), getLeads);

// export default router;







import express from 'express';
import { createLead, getLeads, updateLead, deleteLead, importLeads } from '../controllers/leadController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// 'protect' ensure karega ki token valid hai
// 'authorize' ensure karega ki sirf authorized roles hi data access karein

// Routes for /api/leads
router.route('/')
  .post(protect, createLead)
  .get(protect, authorize('Admin', 'Manager', 'Sales/Executive'), getLeads);


router.route('/import').post(protect, authorize('Admin', 'Manager'), importLeads);
  

// Routes for /api/leads/:id (Specific Lead operations like Update/Delete)
router.route('/:id')
  .put(protect, authorize('Admin', 'Manager', 'Sales/Executive'), updateLead)
  .delete(protect, authorize('Admin', 'Manager'), deleteLead);

export default router;