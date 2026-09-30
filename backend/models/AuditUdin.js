import mongoose from 'mongoose';

const auditUdinSchema = new mongoose.Schema({
  udinId: { type: String, unique: true }, // Custom ID (e.g. UD-0001)
  
  audit_id: { type: mongoose.Schema.Types.ObjectId, ref: 'AuditEngagement', required: true },
  auditor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Auditor', required: true },
  
  document_type: { 
    type: String, 
    required: true,
    enum: ['Tax Audit Report', 'Statutory Audit Report', 'Certificate', 'Other attestation', 'Other']
  },
  document_date: { type: Date, required: true },
  
  udin_no: { type: String, required: true, unique: true, minlength: 18, maxlength: 18, uppercase: true },
  udin_generated_date: { type: Date, required: true },
  
  udin_status: { 
    type: String, 
    required: true,
    enum: ['Pending', 'Generated', 'Revoked'],
    default: 'Generated'
  },
  
  signed_copy_file: { type: String }, // File upload URL (PDF Only rule will be handled in controller)
  remarks: { type: String, maxlength: 300 },
  
  is_active: { type: Boolean, required: true, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

export default mongoose.model('AuditUdin', auditUdinSchema);