import mongoose from 'mongoose';

const auditChecklistSchema = new mongoose.Schema({
  audit_id: { type: mongoose.Schema.Types.ObjectId, ref: 'AuditEngagement', required: true },
  
  item: { 
    type: String, 
    required: true,
    enum: [
      'Trial balance', 'Financial statements (draft)', 'Bank statements', 
      'Fixed asset register', 'Stock statement', 'Loan confirmations', 
      'Sales / purchase registers', 'TDS / TCS reconciliation', 
      'GST reconciliation', 'Form 26AS / AIS', 'Previous year audit report', 
      'Management representation letter', 'Engagement letter'
    ]
  },
  
  status: { 
    type: String, 
    required: true,
    enum: ['Pending', 'Received', 'Not applicable'],
    default: 'Pending'
  },
  
  received_date: { type: Date },
  file: { type: String }, // Optional document upload
  remarks: { type: String, maxlength: 300 },
  
  is_active: { type: Boolean, required: true, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

export default mongoose.model('AuditChecklist', auditChecklistSchema);