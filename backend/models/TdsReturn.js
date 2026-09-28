import mongoose from 'mongoose';

const tdsReturnSchema = new mongoose.Schema({
  // Unique Identifier (e.g., TR-2026-0001)[cite: 9]
  returnId: { type: String, unique: true, sparse: true },
  
  // Link to TDS Workspace (M1)[cite: 9]
  tdsWorkspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'TdsWorkspace', required: true },

  // Return Filing Period & Form[cite: 9]
  financialYear: { type: String, required: true }, // e.g., "2026-27"
  quarter: { type: String, enum: ['Q1', 'Q2', 'Q3', 'Q4'], required: true },
  formType: { type: String, enum: ['24Q', '26Q', '27Q', '27EQ'], required: true },
  
  // Type of Return[cite: 9]
  returnType: { type: String, enum: ['Original', 'Correction'], default: 'Original' },
  correctionNo: { type: Number, default: 0 },
  previousTokenNo: { type: String }, // Mandatory if returnType is Correction

  // Filing Timeline[cite: 9]
  dueDate: { type: Date }, // Will auto-fetch from M6 Master later
  filedDate: { type: Date },
  
  // Acknowledgements[cite: 9]
  tokenNoRrr: { type: String }, // 15 Digit Provisional Receipt
  acknowledgementNo: { type: String }, // TRACES Ack No

  // Workflow Status[cite: 9]
  status: { 
    type: String, 
    enum: [
      'Data pending', 
      'Data received', 
      'Prepared', 
      'FVU validated', 
      'Filed', 
      'Processed', 
      'Default / notice', 
      'Closed'
    ], 
    default: 'Data pending' 
  },

  // Financials & Notes[cite: 9]
  lateFeePaid: { type: Number, default: 0 }, // Sec 234E
  remarks: { type: String },

  // Global Rules (Soft Delete & Audit)[cite: 9]
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }

}, { timestamps: true });

// Ensure Uniqueness: One Return = One Client + FY + Quarter + Form + Type[cite: 9]
tdsReturnSchema.index({ tdsWorkspaceId: 1, financialYear: 1, quarter: 1, formType: 1, returnType: 1 }, { unique: true });

export default mongoose.model('TdsReturn', tdsReturnSchema);