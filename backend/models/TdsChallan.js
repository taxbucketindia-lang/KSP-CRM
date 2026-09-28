import mongoose from 'mongoose';

const tdsChallanSchema = new mongoose.Schema({
  tdsWorkspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'TdsWorkspace', required: true },
  tdsReturnId: { type: mongoose.Schema.Types.ObjectId, ref: 'TdsReturn' }, // Optional till mapped

  challanSerialNo: { type: String, required: true }, // 5 digits (String to keep leading zeros)
  bsrCode: { type: String, required: true }, // 7 digits
  depositDate: { type: Date, required: true },
  
  tdsAmount: { type: Number, required: true, default: 0 },
  interestAmount: { type: Number, default: 0 },
  lateFeeAmount: { type: Number, default: 0 },
  otherAmount: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true, default: 0 },

  depositMode: { type: String, enum: ['Book entry', 'Online'], required: true },
  sectionCode: { type: String, required: true }, // e.g. 194C
  quarter: { type: String, enum: ['Q1', 'Q2', 'Q3', 'Q4'], required: true },
  financialYear: { type: String, required: true },

  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Auto-calculate Total Amount before saving
tdsChallanSchema.pre('save', function() {
  this.totalAmount = Number(this.tdsAmount || 0) + 
                     Number(this.interestAmount || 0) + 
                     Number(this.lateFeeAmount || 0) + 
                     Number(this.otherAmount || 0);
});

export default mongoose.model('TdsChallan', tdsChallanSchema);