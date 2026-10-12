import mongoose from 'mongoose';

// Taiyaar categories. "Other" chunne par user apna naam bhi likh sakta hai, isliye category fixed list tak seemit nahi hai.
export const VENDOR_CATEGORIES = ['CA', 'CS', 'Advocate', 'CMA', 'Tax Consultant', 'Notary', 'Valuer', 'Trademark Agent', 'DSC Vendor', 'Licence Agent', 'Labour Law Consultant', 'Other'];
export const VENDOR_WORK_STATUSES = ['Pending', 'In Progress', 'Completed'];
export const VENDOR_PAYMENT_MODES = ['Cash', 'Bank', 'UPI', 'Cheque'];

// 🔴 VENDOR (Finance): bahar ke CA / CS / Advocate jinse kaam karwate hain.
// Har vendor ke saath uske kaam ki list aur use diye gaye payment rehte hain.
// Total = saare kaam ki rakam, Paid = saare payment, Balance = Total - Paid (teeno apne aap bante hain).

const workSchema = new mongoose.Schema({
  date: { type: String, required: true },            // 'YYYY-MM-DD'
  description: { type: String, required: true, trim: true },
  clientName: { type: String, default: '', trim: true }, // kis client ka kaam tha (optional)
  amount: { type: Number, default: 0, min: 0 },
  status: { type: String, enum: VENDOR_WORK_STATUSES, default: 'Pending' }
});

const paymentSchema = new mongoose.Schema({
  date: { type: String, required: true },            // 'YYYY-MM-DD'
  amount: { type: Number, required: true, min: 0 },
  mode: { type: String, enum: VENDOR_PAYMENT_MODES, default: 'Bank' },
  note: { type: String, default: '', trim: true }
});

const vendorSchema = new mongoose.Schema({
  vendorId: { type: String, unique: true, sparse: true }, // V-1001
  partyName: { type: String, required: true, trim: true },
  category: { type: String, required: true, trim: true, maxlength: 40 }, // list wali ya khud likhi hui
  state: { type: String, default: '', trim: true },
  reference: { type: String, default: '', trim: true },  // kiske through mile
  mobile: { type: String, default: '', trim: true },
  email: { type: String, default: '', trim: true },
  works: [workSchema],
  payments: [paymentSchema],
  totalAmount: { type: Number, default: 0 },
  paidAmount: { type: Number, default: 0 },
  balanceAmount: { type: Number, default: 0 },
  remarks: { type: String, default: '' },
  // 🔴 REMARKS: alag se jode gaye notes (kisne, kab). Form edit kiye bina seedha add hote hain.
  remarkLog: [{
    text: { type: String, required: true, trim: true },
    byName: { type: String, default: '' },
    at: { type: Date, default: Date.now }
  }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Total / Paid / Balance hamesha list se hi bante hain (haath se galat na ho)
vendorSchema.pre('save', function () {
  const round = (value) => Math.round(value * 100) / 100;
  this.totalAmount = round(this.works.reduce((sum, work) => sum + Number(work.amount || 0), 0));
  this.paidAmount = round(this.payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0));
  this.balanceAmount = round(this.totalAmount - this.paidAmount);
});

vendorSchema.index({ partyName: 1 });

export default mongoose.model('Vendor', vendorSchema);
