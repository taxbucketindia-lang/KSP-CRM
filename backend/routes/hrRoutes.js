import express from 'express';
import { 
  createEmployee, getEmployees, 
  markAttendance, getAttendance, 
  generateSalary, getSalaries , updateEmployee, updateSalaryPayment,
  deleteEmployee,
} from '../controllers/hrController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Employees
router.route('/employees').post(protect, createEmployee).get(protect, getEmployees);

router.route('/employees/:id')
  .put(protect, updateEmployee)
  .delete(protect, deleteEmployee);

// Attendance
router.route('/attendance').post(protect, markAttendance).get(protect, getAttendance);

// Salary
router.route('/salary').post(protect, generateSalary).get(protect, getSalaries);
router.put('/salary/:id/payment', protect, updateSalaryPayment);

export default router;