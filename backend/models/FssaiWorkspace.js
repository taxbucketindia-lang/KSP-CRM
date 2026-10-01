import mongoose from 'mongoose';

const fssaiWorkspaceSchema = new mongoose.Schema({
  // 1. Primary & Master Linkage
  clientMasterId: { type: mongoose.Schema.Types.ObjectId, ref: 'ClientMaster' },
  pan: { type: String, uppercase: true }, // For searching / matching

  // 2. Core FSSAI Identity
  assesseeName: { type: String, required: true, trim: true },
  fssaiLicenseNo: { type: String, required: true, unique: true, uppercase: true }, // 14-Digit Number
  licenseType: { 
    type: String, 
    enum: ['Basic Registration', 'State License', 'Central License'], 
    default: 'Basic Registration' 
  },
  kindOfBusiness: { type: String, default: '' }, // e.g. Retailer, Manufacturer
  
  // 3. Contact & Location
  mobile: { type: String },
  email: { type: String, lowercase: true, trim: true },
  state: { type: String },
  address: { type: String },
  pinCode: { type: String },

  // 4. Validity Dates
  issueDate: { type: Date },
  expiryDate: { type: Date }, // 🔴 Critical for renewal tracking

  // 5. Portal Logins (FoSCoS)
  foscosUserId: { type: String, default: '' },
  foscosPassword: { type: String, default: '' },

  // 6. Return Tracking
  financialYear: { type: String, default: '2026-27' },
  returnType: { 
    type: String, 
    enum: ['Annual Return (Form D-1)', 'Half-Yearly Return', 'Not Applicable'], 
    default: 'Annual Return (Form D-1)' 
  },
  fssaiStatus: { 
    type: String, 
    enum: ['Documents Pending', 'Processing', 'Filed', 'Error/Mismatch', 'License Expired'], 
    default: 'Documents Pending' 
  },
  dueDate: { type: Date }, // Normally 31st May
  filingDate: { type: Date },
  acknowledgementNo: { type: String, default: '' },

  // 7. Fees & Payment Ledger
  feeStatus: { 
    type: String, 
    enum: ['Paid', 'Monthly', 'Quarterly', 'Half-Yearly', 'Yearly', 'FOC', 'Dues'], 
    default: 'Dues' 
  },
  feeAmount: { type: Number, default: 0 },
  amountReceived: { type: Number, default: 0 },
  balanceDue: { type: Number, default: 0 },
  paymentDate: { type: Date },

  // 8. General Notes
  remarks: { type: String, default: '' },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Auto calculate Balance Due before saving
fssaiWorkspaceSchema.pre('save', function() {
  this.balanceDue = Number(this.feeAmount || 0) - Number(this.amountReceived || 0);
});

export default mongoose.model('FssaiWorkspace', fssaiWorkspaceSchema);