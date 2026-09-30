import mongoose from 'mongoose';

const auditEngagementSchema = new mongoose.Schema({
  auditId: { type: String, unique: true }, // Auto-generate (e.g. AUD-2026-0001)
  
  client_id: { type: mongoose.Schema.Types.ObjectId, ref: 'ClientMaster', required: true },
  
  audit_type: { 
    type: String, 
    required: true,
    enum: ['Tax Audit', 'Statutory Audit', 'LLP Audit', 'GST Audit / Reconciliation', 'Internal Audit', 'Stock Audit', 'Concurrent Audit', 'Other']
  },
  
  financial_year: { type: String, required: true, maxlength: 7 }, // e.g. 2026-27
  assessment_year: { type: String, required: true, maxlength: 7 }, // Auto derived
  
  books_period_from: { type: Date, required: true }, // Usually 01-04
  books_period_to: { type: Date, required: true }, // Usually 31-03
  
  applicability_reason: { 
    type: String, 
    required: true,
    enum: ['Turnover above limit', 'Profit below presumptive limit', 'Companies Act requirement', 'LLP Act requirement', 'Trust / Society requirement', 'Voluntary', 'Other']
  },
  applicable_section: { type: String, maxlength: 50 }, // Free text, verified by Admin
  
  turnover_gross_receipts: { type: mongoose.Schema.Types.Decimal128 }, // Amount DECIMAL(15,2)
  engagement_letter_date: { type: Date },
  
  engagement_status: { 
    type: String, 
    required: true,
    enum: ['Data pending', 'Data received', 'Audit in progress', 'Queries with client', 'Draft report ready', 'Client approved', 'Report signed (UDIN done)', 'Filed', 'Closed'],
    default: 'Data pending'
  },
  
  data_received_date: { type: Date },
  audit_start_date: { type: Date },
  draft_report_date: { type: Date },
  report_signing_date: { type: Date },
  
  due_date: { type: Date }, // Will be auto-fetched from A7 DueDate Master, editable by Admin only
  
  audit_fee: { type: mongoose.Schema.Types.Decimal128 }, // Amount DECIMAL(15,2)
  fee_status: { 
    type: String, 
    enum: ['Pending', 'Partly received', 'Received'],
    default: 'Pending'
  },
  
  assigned_executive_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Internal TB Executive
  
  previous_year_audit_id: { type: mongoose.Schema.Types.ObjectId, ref: 'AuditEngagement' }, // For rollover feature
  
  // 🔴 Sequence number to uniquely identify audits of the same type in the same FY for a client
  sequence_no: { type: Number, default: 1 }, 
  
  remarks: { type: String, maxlength: 1000 },
  
  is_active: { type: Boolean, required: true, default: true }, // Soft delete flag
  
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Ensure one combination of Client + FY + Audit Type + Sequence is unique (PDF Rule)
auditEngagementSchema.index({ client_id: 1, financial_year: 1, audit_type: 1, sequence_no: 1 }, { unique: true });

export default mongoose.model('AuditEngagement', auditEngagementSchema);