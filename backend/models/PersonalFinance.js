import mongoose from 'mongoose';

// 🔴 PERSONAL CASH FLOW (CEO / owner ka personal hisaab): company accounts aur client records se bilkul alag.
// Paisa hamesha paise (integer) me save hota hai taaki decimal ki gadbad na ho: Rs. 10.50 = 1050.
// Date 'YYYY-MM-DD' (India ka din) string me hai taaki timezone se din na badle.

export const ACCOUNT_TYPES = ['CASH', 'BANK', 'CREDIT_CARD', 'OTHER'];
export const TRANSACTION_TYPES = ['Income', 'Expense', 'Transfer', 'Card Purchase', 'Card Settlement', 'Refund'];
export const PAYMENT_MODES = ['Cash', 'Bank', 'Credit Card', 'UPI'];
export const CATEGORY_TYPES = ['INCOME', 'EXPENSE'];

const accountSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true },
  type: { type: String, enum: ACCOUNT_TYPES, required: true },
  institution: { type: String, default: '', trim: true },
  // Opening balance sirf shuruaati position hai (income / expense nahi). Credit card me yeh opening bakaya hai.
  openingPaise: { type: Number, default: 0 },
  openingDate: { type: String, required: true },
  currency: { type: String, default: 'INR' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

const categorySchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true, trim: true },
  type: { type: String, enum: CATEGORY_TYPES, required: true },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });
categorySchema.index({ owner: 1, type: 1, name: 1 }, { unique: true });

const historySchema = new mongoose.Schema({
  at: { type: Date, default: Date.now },
  byName: { type: String, default: '' },
  action: { type: String, enum: ['Created', 'Edited', 'Deleted'] },
  changes: { type: mongoose.Schema.Types.Mixed } // { Field: { old, new } }
}, { _id: false });

const transactionSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true },
  particulars: { type: String, required: true, trim: true, maxlength: 200 },
  type: { type: String, enum: TRANSACTION_TYPES, required: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'PfCategory', default: null },
  categoryName: { type: String, default: '' },
  mode: { type: String, enum: PAYMENT_MODES, required: true },
  // Ek hi record me dono side: transfer ka ek hissa save ho aur doosra na ho, aisa ho hi nahi sakta
  fromAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'PfAccount', default: null },
  toAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'PfAccount', default: null },
  amountPaise: { type: Number, required: true, min: 1 },
  linkedTransaction: { type: mongoose.Schema.Types.ObjectId, ref: 'PfTransaction', default: null },
  notes: { type: String, default: '', maxlength: 500 },
  // Form se aane wali ID: ek hi form do baar submit ho jaye toh do entry na bane
  requestId: { type: String },
  createdByName: { type: String, default: '' },
  updatedByName: { type: String, default: '' },
  // Delete karne par record mitta nahi, bas hisaab se bahar ho jata hai (audit ke liye rehta hai)
  deletedAt: { type: Date, default: null },
  deletedByName: { type: String, default: '' },
  history: [historySchema]
}, { timestamps: true });

transactionSchema.index({ owner: 1, date: -1 });
transactionSchema.index({ owner: 1, fromAccount: 1 });
transactionSchema.index({ owner: 1, toAccount: 1 });
transactionSchema.index({ owner: 1, requestId: 1 }, { unique: true, partialFilterExpression: { requestId: { $type: 'string' } } });

export const PfAccount = mongoose.model('PfAccount', accountSchema);
export const PfCategory = mongoose.model('PfCategory', categorySchema);
export const PfTransaction = mongoose.model('PfTransaction', transactionSchema);
