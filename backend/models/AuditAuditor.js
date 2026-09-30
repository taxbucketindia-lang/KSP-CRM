import mongoose from 'mongoose';

const auditAuditorSchema = new mongoose.Schema({
  audit_id: { type: mongoose.Schema.Types.ObjectId, ref: 'AuditEngagement', required: true },
  auditor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Auditor', required: true },
  
  role: { 
    type: String, 
    required: true,
    enum: ['Signing', 'Joint', 'Previous', 'Predecessor']
  },
  
  appointment_date: { type: Date },
  appointment_mode: { 
    type: String, 
    enum: ['AGM', 'Board (casual vacancy)', 'Engagement letter', 'Other']
  },
  appointment_form_srn: { type: String, maxlength: 30 },
  
  tenure_from: { type: Date },
  tenure_to: { type: Date },
  resignation_date: { type: Date },
  
  remuneration: { type: mongoose.Schema.Types.Decimal128 },
  
  is_current: { type: Boolean, required: true, default: true }, // Logic: Only 1 current signing auditor
  
  is_active: { type: Boolean, required: true, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

export default mongoose.model('AuditAuditor', auditAuditorSchema);