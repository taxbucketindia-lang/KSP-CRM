import mongoose from 'mongoose';

const tdsDeducteeSchema = new mongoose.Schema({
  tdsWorkspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'TdsWorkspace', required: true },
  
  deducteeName: { type: String, required: true, trim: true },
  pan: { type: String, required: true, uppercase: true }, // Format or 'PANNOTAVBL'
  panStatus: { 
    type: String, 
    enum: ['Valid', 'Invalid', 'Not available', 'Applied for'], 
    required: true 
  },
  deducteeType: { 
    type: String, 
    enum: ['Company', 'Non-company', 'Non-resident'], 
    required: true 
  },
  residentialStatus: { 
    type: String, 
    enum: ['Resident', 'Non-resident'], 
    required: true 
  },
  
  email: { type: String, lowercase: true },
  mobile: { type: String },
  address: { type: String },
  
  // Only for Non-residents
  country: { type: String },
  tin: { type: String },

  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

export default mongoose.model('TdsDeductee', tdsDeducteeSchema);