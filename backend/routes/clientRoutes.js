// import express from 'express';
// import { getClients, convertLeadToClient } from '../controllers/clientController.js';
// import { protect, authorize } from '../middleware/authMiddleware.js';

// const router = express.Router();

// router.route('/')
//   .get(protect, getClients);

// // This route handles the Lead -> Client conversion[cite: 1]
// router.route('/convert/:leadId')
//   .post(protect, authorize('Admin', 'Manager', 'Sales/Executive'), convertLeadToClient);

// export default router;






import express from 'express';
import { getClients, createClient, convertLeadToClient, deleteClient, updateClient, importClients } from '../controllers/clientController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(protect, getClients)
  .post(protect, authorize('Admin', 'Manager', 'Sales/Executive'), createClient);

router.post('/import', protect, authorize('Admin', 'Manager'), importClients);

// This route handles the Lead -> Client conversion[cite: 1]
router.route('/convert/:leadId')
  .post(protect, authorize('Admin', 'Manager', 'Sales/Executive'), convertLeadToClient);

router.route('/:id')
  .put(protect, authorize('Admin', 'Manager', 'Sales/Executive'), updateClient)
  .delete(protect, authorize('Admin', 'Manager'), deleteClient);

export default router;