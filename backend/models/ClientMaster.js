import mongoose from 'mongoose';

const clientMasterSchema = new mongoose.Schema({
    clientId: { 
    type: String, 
    unique: true, 
    uppercase: true,
    trim: true 
  },
  // 🔴 PAN Number is the Unique Identity of the Client
  pan: { 
    type: String, 
    required: true, 
    unique: true, 
    uppercase: true, // Hamesha capital letters mein save hoga
    trim: true 
  },
  name: { type: String, required: true, trim: true },
  gstin: { type: String, uppercase: true },
  aadhaar: { type: String, maxlength: 12 }, 
  dob: { type: Date },
  fatherName: { type: String },
  
  // Contact Details
  mobile: { type: String },
  email: { type: String, lowercase: true, trim: true },
  
  // Client Classification
  clientType: { 
    type: String, 
    enum: ['Individual', 'Proprietorship', 'Partnership Firm', 'LLP', 'Private Limited', 'Public Limited', 'HUF', 'Trust', 'Other'],
    default: 'Individual'
  },
  
  // Basic Details
  address: { type: String },
  state: { type: String },
  pinCode: { type: String },

  // Status for CRM tracking
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  
  // General Notes
  remarks: { type: String }
  
}, { timestamps: true });

export default mongoose.model('ClientMaster', clientMasterSchema);