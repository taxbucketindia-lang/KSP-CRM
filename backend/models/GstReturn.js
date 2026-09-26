import mongoose from 'mongoose';

const gstReturnSchema = new mongoose.Schema({

  clientMasterId: { type: mongoose.Schema.Types.ObjectId, ref: 'ClientMaster' },
  pan: { type: String, uppercase: true },

  clientId: { type: String, unique: true, sparse: true },
  crmClientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', default: null },

  assesseeName: { type: String, required: true },
  tradeName: { type: String, default: '' },
  gstin: { type: String, required: true, uppercase: true },
  taxpayerType: { type: String, enum: ['Regular', 'IFF', 'Composition'], default: 'Regular' },
  aadhaarKycStatus: { type: String, enum: ['Yes', 'No'], default: 'No' },
  
  gstr1FilingDate: { type: Date },
  gstr1NextDueDate: { type: Date },
  gstr3bFilingDate: { type: Date },
  gstr3bNextDueDate: { type: Date },

  mobile: { type: Number, required: true },
  email: { type: String },
  state: { type: String },
  authorisedPersonName: { type: String, default: '' },
  registrationDate: { type: Date },

  gstStatus: { 
    type: String, 
    enum: ['Documents Pending', 'Processing', 'Challan Generated', 'Filed', 'Error/Mismatch'],
    default: 'Documents Pending' 
  },
  bankLinkedStatus: { type: String, enum: ['Updated', 'Not Updated'], default: 'Not Updated' },
  portalUsername: { type: String, default: '' },
  portalPassword: { type: String, default: '' },
  filingDate: { type: Date },
  nextReminderDate: { type: Date },

  // 🔴 UPDATED: Naye Fee Status allow kar diye gaye hain
  feeStatus: { 
    type: String, 
    enum: ['Paid', 'Monthly', 'Quarterly', 'Half-Yearly', 'Yearly', 'FOC', 'Dues'], 
    default: 'Dues' 
  },
  feeAmount: { type: Number, default: 0 },
  amountReceived: { type: Number, default: 0 },
  balanceDue: { type: Number, default: 0 },
  // 🔴 NEW: Payment Date field added
  paymentDate: { type: Date },
  
  remarks: { type: String, default: '' },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

}, { timestamps: true });

gstReturnSchema.pre('save', function() {
  this.balanceDue = Number(this.feeAmount || 0) - Number(this.amountReceived || 0);
});

export default mongoose.model('GstReturn', gstReturnSchema);