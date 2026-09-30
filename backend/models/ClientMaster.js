// import mongoose from 'mongoose';

// const clientMasterSchema = new mongoose.Schema({
//     clientId: { 
//     type: String, 
//     unique: true, 
//     uppercase: true,
//     trim: true 
//   },
//   // 🔴 PAN Number is the Unique Identity of the Client
//   pan: { 
//     type: String, 
//     required: true, 
//     unique: true, 
//     uppercase: true, // Hamesha capital letters mein save hoga
//     trim: true 
//   },
//   name: { type: String, required: true, trim: true },
//   gstin: { type: String, uppercase: true },
//   aadhaar: { type: String, maxlength: 12 }, 
//   dob: { type: Date },
//   fatherName: { type: String },
  
//   // Contact Details
//   mobile: { type: String },
//   email: { type: String, lowercase: true, trim: true },
  
//   // Client Classification
//   clientType: { 
//     type: String, 
//     enum: ['Individual', 'Proprietorship', 'Partnership Firm', 'LLP', 'Private Limited', 'Public Limited', 'HUF', 'Trust', 'Other'],
//     default: 'Individual'
//   },
  
//   // Basic Details
//   address: { type: String },
//   state: { type: String },
//   pinCode: { type: String },

//   // Status for CRM tracking
//   status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  
//   // General Notes
//   remarks: { type: String }
  
// }, { timestamps: true });

// export default mongoose.model('ClientMaster', clientMasterSchema);







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
  
  // 🔴 NAYA AUDIT UPDATE: GSTIN yahan pehle se tha, usay rehne diya.
  gstin: { type: String, uppercase: true },
  aadhaar: { type: String, maxlength: 12 }, 
  dob: { type: Date },
  fatherName: { type: String },
  
  // Contact Details
  mobile: { type: String },
  email: { type: String, lowercase: true, trim: true },
  
  // 🔴 NAYA AUDIT UPDATE: 'clientType' ko as-is rakha hai (Purana CRM wala). 
  // Naya field 'constitution' joda gaya hai jo strictly Audit Master ke hisaab se hoga.
  clientType: { 
    type: String, 
    enum: ['Individual', 'Proprietorship', 'Partnership Firm', 'LLP', 'Private Limited', 'Public Limited', 'HUF', 'Trust', 'Other'],
    default: 'Individual'
  },
  
  // ==========================================
  // 🟢 NAYA AUDIT UPDATE (A0: Extra Fields for Audit)
  // ==========================================
  constitution: { 
    type: String, 
    enum: ['Private Limited Company', 'Public Limited Company', 'LLP', 'Partnership Firm', 'Proprietorship', 'HUF', 'Trust', 'Society', 'AOP/BOI', 'Other']
    // PDF Rule: Yes (Required), par DB me false rakha hai taaki purane clients form save kar sakein. UI me isay mandatory karenge.
  },
  cin_llpin: { type: String, maxlength: 21, uppercase: true }, // Mandatory for Company/LLP
  date_of_incorporation: { type: Date }, // Or commencement of business
  nature_of_business: { type: String, maxlength: 200 },
  registered_office_address: { type: String, maxlength: 250 },
  books_kept_at: { type: String, maxlength: 200 },
  accounting_method: { type: String, enum: ['Mercantile', 'Cash'] },
  // ==========================================

  // Basic Details (Purana)
  address: { type: String },
  state: { type: String },
  pinCode: { type: String },

  // Status for CRM tracking
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  
  // General Notes
  remarks: { type: String }
  
}, { timestamps: true });

export default mongoose.model('ClientMaster', clientMasterSchema);