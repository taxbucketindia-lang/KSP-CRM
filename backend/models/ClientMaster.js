import mongoose from 'mongoose';

const clientMasterSchema = new mongoose.Schema({
  clientId: { 
    type: String, 
    unique: true, 
    uppercase: true,
    trim: true 
  },
  pan: { 
    type: String, 
    required: true, 
    unique: true, 
    uppercase: true, 
    trim: true 
  },
  name: { type: String, required: true, trim: true },
  tradeName: { type: String, trim: true },
  
  gstin: { type: String, uppercase: true },
  aadhaar: { type: String, maxlength: 12 }, 
  dob: { type: Date },
  fatherName: { type: String },
  
  // Contact Details
  mobile: { type: String },
  email: { type: String, lowercase: true, trim: true },
  
  // ==========================================
  // 🟢 NAYA UPDATE (Birthday Wishes Module)
  // ==========================================
  contactPerson: { type: String, trim: true }, // Agar company hai toh owner ka naam
  birthdayWishConsent: { type: Boolean, default: true }, // Message bhejna hai ya nahi
  assignedRM: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Relationship Manager
  // ==========================================

  clientType: { 
    type: String, 
    enum: ['Individual', 'Proprietorship', 'Partnership Firm', 'LLP', 'Private Limited', 'Public Limited', 'HUF', 'Trust', 'Other'],
    default: 'Individual'
  },
  
  // (Audit Fields...)
  constitution: { 
    type: String, 
    enum: ['Private Limited Company', 'Public Limited Company', 'LLP', 'Partnership Firm', 'Proprietorship', 'HUF', 'Trust', 'Society', 'AOP/BOI', 'Other']
  },
  cin_llpin: { type: String, maxlength: 21, uppercase: true },
  date_of_incorporation: { type: Date },
  nature_of_business: { type: String, maxlength: 200 },
  registered_office_address: { type: String, maxlength: 250 },
  books_kept_at: { type: String, maxlength: 200 },
  accounting_method: { type: String, enum: ['Mercantile', 'Cash'] },


  openingBalance: { type: Number, default: 0 },

  // Basic Details
  address: { type: String },
  state: { type: String },
  pinCode: { type: String },

  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  remarks: { type: String }
  
}, { timestamps: true });

export default mongoose.model('ClientMaster', clientMasterSchema);