import mongoose from 'mongoose';

const tdsWorkspaceSchema = new mongoose.Schema({
  // Link to Global CRM Master
  clientMasterId: { type: mongoose.Schema.Types.ObjectId, ref: 'ClientMaster', required: true },
  
  // 🔴 SNAPSHOT FIELDS (Safe Data)
  companyName: { type: String, required: true },
  pan: { type: String, uppercase: true, required: true },
  tan: { type: String, uppercase: true, required: true }, // TAN is mandatory for TDS

  // Deductor Classification
  deductorCategory: { 
    type: String, 
    enum: ['Company', 'Firm', 'Individual', 'HUF', 'AOP/BOI', 'Trust', 'Local Authority', 'Central Govt', 'State Govt', 'Other'],
    default: 'Company'
  },
  deductorTypeCode: { 
    type: String, 
    enum: ['Central Govt', 'State Govt', 'Statutory Body', 'Company', 'Other than Company', 'Non-resident'],
    default: 'Company'
  },

  // Responsible Person Details
  responsiblePerson: {
    name: { type: String },
    designation: { type: String },
    pan: { type: String, uppercase: true }
  },

  // Contact Info (Snapshot)
  address: { type: String },
  city: { type: String },
  state: { type: String },
  pinCode: { type: String },
  email: { type: String, lowercase: true },
  mobile: { type: String },

  // Portals Credentials[cite: 9]
  tracesLogin: {
    userId: { type: String },
    password: { type: String } // Will be encrypted in controller before saving
  },
  efilingLogin: {
    userId: { type: String },
    password: { type: String } // Will be encrypted in controller before saving
  },

  // Billing & Assignment[cite: 9]
  serviceFee: { type: Number, default: 0 },
  billingCycle: { 
    type: String, 
    enum: ['Monthly', 'Quarterly', 'Yearly', 'One-time'], 
    default: 'Quarterly' 
  },
  assignedExecutiveId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  // Global Rules (Soft Delete & Audit)[cite: 9]
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }

}, { timestamps: true });

export default mongoose.model('TdsWorkspace', tdsWorkspaceSchema);