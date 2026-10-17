import mongoose from 'mongoose';

// 🔴 BUSINESS MIS (company ka mahine ka hisaab: Cash Flow, P&L, Expense Budget, Billing & Collection).
// Ek mahine ka ek record. Tum jo bharte ho (budget, actual, remark) wahi yahan; jo khali hai woh CRM se apne aap aata hai.
const businessMisSchema = new mongoose.Schema({
  month: { type: String, required: true, unique: true, match: /^\d{4}-(0[1-9]|1[0-2])$/ }, // "YYYY-MM"
  // { cashflow: { opening, cells: { row: { w1..w5 } }, remarks: { row: text } },
  //   pl: { row: { budget, actual } }, expenses: [{ key, head, category, budget, actual, reason, action }],
  //   billing: { row: { target, actual } } }   (null = khali / CRM se)
  data: { type: mongoose.Schema.Types.Mixed, default: {} },
  // Agle mahine ke liye: is mahine ka closing bank balance (agle mahine ka opening ban jata hai)
  closingCash: { type: Number, default: null },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedByName: { type: String, default: '' }
}, { timestamps: true, minimize: false });

export default mongoose.model('BusinessMis', businessMisSchema);
