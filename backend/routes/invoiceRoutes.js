import express from 'express';
import { 
  createInvoice, 
  getInvoices, 
  getInvoiceById, 
  updateInvoice, 
  deleteInvoice ,
  sendInvoice
} from '../controllers/invoiceController.js';
import { protect } from '../middleware/authMiddleware.js';

import { requirePermission } from '../utils/permissions.js';

// 🔴 Data delete sirf wahi kar sakta hai jiske paas "Delete Records" ka right hai (CEO, Admin, ya jise Admin ne diya)
const canDelete = requirePermission('DELETE_RECORDS');

const router = express.Router();

router.route('/')
  .post(protect, createInvoice)
  .get(protect, getInvoices);

router.route('/:id')
  .get(protect, getInvoiceById)
  .put(protect, updateInvoice)
  .delete(protect, canDelete, deleteInvoice);

router.route('/:id/send').post(protect, sendInvoice);

export default router;