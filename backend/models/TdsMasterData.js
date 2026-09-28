import mongoose from 'mongoose';

// 6.1 Section Master
const tdsSectionSchema = new mongoose.Schema({
  sectionCode: { type: String, required: true }, // e.g. 194C
  description: { type: String, required: true },
  payeeType: { type: String, enum: ['Individual/HUF', 'Others', 'All', 'Employee'], required: true },
  ratePercentage: { type: Number, required: true },
  thresholdAmount: { type: Number, required: true },
  formType: { type: String, required: true }, // 26Q, 24Q etc.
  effectiveFrom: { type: Date },
  effectiveTo: { type: Date }
});

export const TdsSection = mongoose.model('TdsSection', tdsSectionSchema);

// 6.2 Due Date Master
const tdsDueDateSchema = new mongoose.Schema({
  financialYear: { type: String, required: true },
  quarter: { type: String, required: true },
  quarterPeriod: { type: String, required: true }, // e.g. 'Apr-Jun'
  returnDueDate: { type: Date, required: true },
  formType: { type: String, default: 'All' }
});

export const TdsDueDate = mongoose.model('TdsDueDate', tdsDueDateSchema);