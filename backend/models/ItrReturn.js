import mongoose from 'mongoose';

const itrReturnSchema = new mongoose.Schema({
  // 1. Link to Original CRM Client (Taaki pata rahe kahan se import hua)
  crmClientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', default: null },

  // 2. Primary Information
  clientMasterId: { type: mongoose.Schema.Types.ObjectId, ref: 'ClientMaster' },
  clientId: { type: String, unique: true },
  assesseeName: { type: String, required: true },
  pan: { type: String, required: true, uppercase: true },
  dob: { type: Date },
  mobile: { type: Number, required: true },
  email: { type: String },
  district: { type: String },
  state: { type: String },
  pinCode: { type: String },

  // 3. Workflow & Portal Details
  itrStatus: { 
    type: String, 
    enum: ['Documents Pending', 'Processing', 'Filed', 'E-Verified', 'Refund Issued'],
    default: 'Documents Pending' 
  },
  portalPassword: { type: String, default: '' },
  itrFiledUpToAY: { type: String, default: 'AY 2025-26' },
  filingDate: { type: Date },
  nextReminderDate: { type: Date },

  // 4. Tax Computation & Bank Details
  totalIncome: { type: Number, default: 0 },
  incomeTax: { type: Number, default: 0 },
  tds: { type: Number, default: 0 },
  tcs: { type: Number, default: 0 },
  selfAdvTax: { type: Number, default: 0 },
  refund: { type: Number, default: 0 },
  verificationMethod: { type: String, default: 'Pending' },
  itrProcessedStatus: { type: String, default: 'Pending' },
  itrFiledBy: { type: String, default: '' },
  regime: { type: String, default: 'New' },
  formNo: { type: String, default: 'ITR-1' },
  bankName: { type: String, default: '' },
  accountNo: { type: String, default: '' },
  ifscCode: { type: String, default: '' },

  acknowledgementNo: { type: String, default: '' },
  returnType: { type: String, enum: ['Original', 'Revised', 'Updated'], default: 'Original' },

  // 5. Fees & Remarks
  feeStatus: { type: String, enum: ['Paid', 'FOC', 'Dues'], default: 'Dues' },
  feeAmount: { type: Number, default: 0 },
  amountReceived: { type: Number, default: 0 },
  balanceDue: { type: Number, default: 0 },
  remarks: { type: String, default: '' },

  // Tracking
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

}, { timestamps: true });

// 🔴 FIX: Removed 'next' completely. Modern Mongoose automatically handles this.
itrReturnSchema.pre('save', function() {
  this.balanceDue = Number(this.feeAmount || 0) - Number(this.amountReceived || 0);
});

export default mongoose.model('ItrReturn', itrReturnSchema);