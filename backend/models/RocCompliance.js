import mongoose from 'mongoose';

const rocComplianceSchema = new mongoose.Schema({
  rocWorkspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'RocWorkspace', required: true },
  
  // 🔴 Saare forms as per your notebook
  formName: { 
    type: String, 
    required: true,
    enum: [
      'MGT-7', 'AOC-4', 'DIR-3 KYC', 'Form-8', 'Form-11', 
      'Form-3', 'ADT-1', 'DPT-3', 'MSME-1', 'Other Form'
    ]
  }, 
  financialYear: { type: String }, // e.g., "2025-26", "2026-27"
  
  dueDate: { type: Date, required: true },
  filedDate: { type: Date },
  srnNumber: { type: String },
  
  status: { 
    type: String, 
    enum: ['Pending', 'Filed', 'Overdue', 'In Preparation'], 
    default: 'Pending' 
  },
  
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  remarks: { type: String }

}, { timestamps: true });

export default mongoose.model('RocCompliance', rocComplianceSchema);