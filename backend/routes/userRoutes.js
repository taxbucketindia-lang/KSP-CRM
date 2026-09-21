import express from 'express';
import { 
  getEmployees, createEmployee, updateEmployeeStatus, 
  resetEmployeePassword, deleteEmployee, updateEmployeePermissions,
  getMe
} from '../controllers/userController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/me').get(protect, getMe);

// --- EMPLOYEE MANAGEMENT ROUTES (Admin Only) ---
// Fetch all employees
router.route('/employees').get(protect, authorize('Admin'), getEmployees);

// Add new employee
router.route('/create-employee').post(protect, authorize('Admin'), createEmployee);

// Toggle status (Active / Inactive)
router.route('/:id/status').put(protect, authorize('Admin'), updateEmployeeStatus);

// Admin forced password reset
router.route('/:id/reset-password').put(protect, authorize('Admin'), resetEmployeePassword);

// 🔴 NAYA ROUTE: Update employee access permissions
router.route('/:id/permissions').put(protect, authorize('Admin'), updateEmployeePermissions);

// Delete employee
router.route('/:id').delete(protect, authorize('Admin'), deleteEmployee);

export default router;