import mongoose from 'mongoose';

const auditDueDateSchema = new mongoose.Schema({
  financial_year: { type: String, required: true, maxlength: 7 }, // e.g. 2026-27
  
  audit_type: { 
    type: String, 
    required: true,
    enum: ['Tax Audit', 'Statutory Audit', 'LLP Audit', 'GST Audit / Reconciliation', 'Internal Audit', 'Stock Audit', 'Concurrent Audit', 'Other']
  },
  
  due_date_type: { type: String, required: true }, // e.g. "Report to be furnished"
  due_date: { type: Date, required: true }, // The actual verified deadline
  source_note: { type: String }, // e.g. "Income Tax Act, 2025"
  
  is_active: { type: Boolean, required: true, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Ek FY, Type aur Due date type ka combination unique hona chahiye
auditDueDateSchema.index({ financial_year: 1, audit_type: 1, due_date_type: 1 }, { unique: true });

export default mongoose.model('AuditDueDate', auditDueDateSchema);