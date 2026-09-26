import mongoose from 'mongoose';

const salarySchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  companyName: { type: String, required: true },
  monthYear: { type: String, required: true }, // e.g., "09-2026"

  // 🔴 IMPORTANT: Snapshot from Employee Master
  salarySnapshot: {
    basic: { type: Number, default: 0 },
    hra: { type: Number, default: 0 },
    otherAllowance: { type: Number, default: 0 },
    gross: { type: Number, default: 0 }
  },

  // Auto-fetched from Attendance DB
  attendanceSummary: {
    totalDays: { type: Number, default: 0 },
    paidDays: { type: Number, default: 0 },
    lopDays: { type: Number, default: 0 }
  },

  // Adjustments & Deductions
  adjustments: {
    lopDeduction: { type: Number, default: 0 },
    otherDeduction: { type: Number, default: 0 },
    incentiveBonus: { type: Number, default: 0 },
    reimbursement: { type: Number, default: 0 },
    latesForgiven: { type: Number, default: 0 }
  },

  // Final Auto Calculated
  netPayable: { type: Number, required: true },
  status: { type: String, enum: ['Draft', 'Finalized', 'Paid'], default: 'Draft' }
}, { timestamps: true });

export default mongoose.model('Salary', salarySchema);