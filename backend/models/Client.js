// models/Client.js
import mongoose from 'mongoose';

const clientSchema = new mongoose.Schema({
  clientId: { type: String, unique: true },
  assesseeName: { type: String, required: true },
  dob: { type: Date },
  pan: { 
    type: String, 
    required: true, 
    unique: true, 
    uppercase: true,
    match: [/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN format'] 
  },
  district: { type: String },
  state: { type: String },
  pinCode: { type: String },
  email: { type: String },
  service: { type: String },
  mobile: { 
    type: Number, 
    required: true,
    unique: true 
  },
  isItrWorkspace: { type: Boolean, default: false },
  itrFiledUpToAY: { type: String },
  itrStatus: { 
    type: String, 
    enum: ['Documents Pending', 'Processing', 'Filed', 'E-Verified', 'Refund Issued'],
    default: 'Documents Pending' 
  },
  portalPassword: { type: String, default: '' },
  feeStatus: { type: String, enum: ['Paid', 'FOC', 'Dues'], default: 'Dues' },
  feeAmount: { type: Number, default: 0 },
  amountReceived: { type: Number, default: 0 },
  balanceDue: { type: Number, default: 0 },
  remarks: { type: String },
  
  // 🔴 BANK DETAILS
  bankName: { type: String, default: '' },
  accountNo: { type: String, default: '' },
  ifscCode: { type: String, default: '', uppercase: true },

  // 🔴 DATES & TRACKING
  filingDate: { type: Date },
  nextReminderDate: { type: Date },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  
  // 🔴 ITR SPECIFIC FIELDS
  totalIncome: { type: Number, default: 0 },
  incomeTax: { type: Number, default: 0 },
  tds: { type: Number, default: 0 },
  tcs: { type: Number, default: 0 },
  selfAdvTax: { type: Number, default: 0 },
  refund: { type: Number, default: 0 }, 
  verificationMethod: { 
    type: String, 
    enum: ['Pending', 'Aadhaar OTP', 'Net Banking / EVC', 'Sent to CPC (Physical)'],
    default: 'Pending' 
  },
  itrProcessedStatus: { 
    type: String, 
    enum: ['Pending', 'Successfully E-verified', 'Processing', 'Processed', 'Processed with Refund', 'Defective'],
    default: 'Pending' 
  },

  // 🔴 NEW ITR FIELDS
  itrFiledBy: { type: String, default: '' },
  regime: { type: String, enum: ['New', 'Old'], default: 'New' },
  formNo: { 
    type: String, 
    enum: ['ITR-1', 'ITR-2', 'ITR-3', 'ITR-4', 'ITR-5', 'ITR-6', 'ITR-7'],
    default: 'ITR-1' 
  },

  // --- LEAD ACQUISITION SOURCES ---
  leadSource: { type: String, default: 'Manual Entry' }, 
  referredByBA: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'BA',
    default: null
  },
  referenceName: { type: String, default: '' },
  otherSourceName: { type: String, default: '' }

}, { timestamps: true });

// Auto-calculate Balance Due, Refund & generate Client ID
clientSchema.pre('save', async function() {
  this.balanceDue = (this.feeAmount || 0) - (this.amountReceived || 0);
  this.refund = (this.incomeTax || 0) - (this.tds || 0) - (this.tcs || 0) - (this.selfAdvTax || 0);
  
  if (!this.clientId) {
    const lastClient = await mongoose.model('Client').findOne().sort({ createdAt: -1 });
    
    if (lastClient && lastClient.clientId) {
      const lastIdNumber = parseInt(lastClient.clientId.replace('C-', ''), 10);
      this.clientId = `C-${lastIdNumber + 1}`;
    } else {
      this.clientId = 'C-1001';
    }
  }

  if (this.filingDate && !this.nextReminderDate) {
    const dateObj = new Date(this.filingDate);
    if (this.service === 'ITR Filing') {
      dateObj.setFullYear(dateObj.getFullYear() + 1); 
    } else {
      dateObj.setMonth(dateObj.getMonth() + 1); 
    }
    this.nextReminderDate = dateObj;
  }
});

clientSchema.post('save', async function(doc) {
  if (doc.leadSource === 'BA' && doc.referredByBA) {
    await mongoose.model('BA').findByIdAndUpdate(
      doc.referredByBA,
      { $addToSet: { convertedClients: doc._id } }
    );
  }
});

export default mongoose.model('Client', clientSchema);