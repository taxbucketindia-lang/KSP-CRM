import express from 'express';
import { createLead, getLeads, updateLead, deleteLead, importLeads } from '../controllers/leadController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// 'protect' ensure karega ki token valid hai
// 'authorize' ensure karega ki sirf authorized roles hi data access karein

// Routes for /api/leads
router.route('/')
  // Koi bhi logged-in employee lead create kar sakta hai
  .post(protect, createLead)
  // 🔴 FIX: Yahan se authorize hata diya hai. Ab Developer, HR, ya koi bhi authenticated user leads fetch kar payega.
  .get(protect, getLeads);

// Import bulk data sirf Admin aur Manager kar sakte hain
router.route('/import')
  .post(protect, authorize('Admin', 'Manager'), importLeads);
  
// Routes for /api/leads/:id (Specific Lead operations like Update/Delete)
router.route('/:id')
  // 🔴 FIX: Update se bhi authorize hata diya taaki Shiva jaise employees remarks add ya status update kar sakein
  .put(protect, updateLead)
  // Delete karne ki power sirf Admin/Manager ke paas rahegi
  .delete(protect, authorize('Admin', 'Manager'), deleteLead);

export default router;