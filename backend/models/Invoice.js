import mongoose from 'mongoose';

const invoiceSchema = new mongoose.Schema({
  invoiceNo: { type: String, required: true },
  invoiceDate: { type: String, required: true },

  amountReceived: { type: Number, default: 0 },
paymentStatus: { type: String, enum: ['Pending', 'Partially Paid', 'Paid'], default: 'Pending' },
  
  companyDetails: {
    name: String,
    phone: String,
    email: String,
    website: String,
    cin: String,
    udyam: String,
    gstin: String
  },
  showQr: { type: Boolean, default: true },
  isProforma: { type: Boolean, default: false },
  dailyAlert: { type: Boolean, default: false },


  customer: {
    name: { type: String, required: true },
    address: String,
    phone: String,
    email: String,
    gstin: String,
    pan: String,
    placeOfSupply: String
  },
  items: [{
    description: String,
    hsn: String,
    qty: Number,
    rate: Number,
    gstRate: Number
  }],
  bank: {
    bankName: String,
    branch: String,
    accNo: String,
    ifsc: String,
    upiId: String
  },
  taxableAmount: { type: Number, required: true },
  totalGstAmount: { type: Number, required: true },
  totalAmountAfterTax: { type: Number, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  isGstEnabled: {
    type: Boolean,
    default: true 
  },

  taxes: {
    igst: { type: Boolean, default: true },
    cgst: { type: Boolean, default: false },
    sgst: { type: Boolean, default: false }
  },
  
  // 🔴 NEW: Logs history for sent invoices
  sendLogs: [{
    method: String,
    contact: String,
    sentBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    sentAt: Date
  }]
}, { timestamps: true });

export default mongoose.model('Invoice', invoiceSchema);