import mongoose from 'mongoose';

const auditFilingSchema = new mongoose.Schema({
  filingId: { type: String, unique: true }, // Custom ID (e.g. FL-0001)
  
  audit_id: { type: mongoose.Schema.Types.ObjectId, ref: 'AuditEngagement', required: true },
  
  form_name: { 
    type: String, 
    required: true,
    enum: ['Tax audit report', 'Tax audit annexure', 'Financial statements filing', 'Annual return', 'Other']
  },
  filing_portal: { 
    type: String, 
    required: true,
    enum: ['Income Tax portal', 'MCA', 'GST portal', 'Other']
  },
  
  uploaded_by_auditor_date: { type: Date },
  client_approval_date: { type: Date },
  filed_date: { type: Date },
  
  acknowledgement_srn_no: { type: String, maxlength: 30 },
  
  filing_status: { 
    type: String, 
    required: true,
    enum: ['Pending', 'Uploaded', 'Filed', 'Rejected'],
    default: 'Pending'
  },
  
  late_fee: { type: mongoose.Schema.Types.Decimal128 },
  proof_file: { type: String }, // Uploaded Acknowledgement URL
  remarks: { type: String, maxlength: 300 },
  
  is_active: { type: Boolean, required: true, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

export default mongoose.model('AuditFiling', auditFilingSchema);