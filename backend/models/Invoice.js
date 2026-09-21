import mongoose from 'mongoose';

const invoiceSchema = new mongoose.Schema({
  invoiceNo: { type: String, required: true },
  invoiceDate: { type: String, required: true },
  
  // 🔴 NAYA: Company/Biller Details (Ab dynamic hongi)
  companyDetails: {
    name: String,
    phone: String,
    email: String,
    website: String,
    cin: String,
    udyam: String,
    gstin: String
  },
  showQr: { type: Boolean, default: true }, // 🔴 NAYA: QR Code dikhana hai ya nahi
  isProforma: { type: Boolean, default: false },

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
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

export default mongoose.model('Invoice', invoiceSchema);