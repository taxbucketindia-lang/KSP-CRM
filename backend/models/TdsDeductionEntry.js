import mongoose from 'mongoose';

const tdsDeductionEntrySchema = new mongoose.Schema({
  tdsReturnId: { type: mongoose.Schema.Types.ObjectId, ref: 'TdsReturn', required: true },
  tdsDeducteeId: { type: mongoose.Schema.Types.ObjectId, ref: 'TdsDeductee', required: true },
  tdsChallanId: { type: mongoose.Schema.Types.ObjectId, ref: 'TdsChallan', required: true },

  sectionCode: { type: String, required: true },
  paymentDate: { type: Date, required: true },
  deductionDate: { type: Date, required: true },
  
  amountPaid: { type: Number, required: true },
  tdsRate: { type: Number, required: true },
  tdsDeducted: { type: Number, required: true },
  
  surcharge: { type: Number, default: 0 },
  cess: { type: Number, default: 0 },
  tdsDeposited: { type: Number, required: true }, // Exact mapping to challan

  lowerDeductionCertNo: { type: String },
  reasonCode: { 
    type: String, 
    enum: ['Lower deduction (Sec 197)', 'No deduction - threshold', 'No deduction - other', 'Higher deduction (no PAN)', 'Short deduction', 'Normal']
  },

  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

export default mongoose.model('TdsDeductionEntry', tdsDeductionEntrySchema);