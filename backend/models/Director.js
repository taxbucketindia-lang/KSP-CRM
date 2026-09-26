import mongoose from 'mongoose';

const directorSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  dinOrDpin: { type: String, unique: true, sparse: true },
  pan: { type: String, uppercase: true },
  email: { type: String, lowercase: true },
  mobile: { type: String },
  
  // Data Privacy Rule: Store only Last 4 digits for Aadhaar
  aadhaarLast4: { type: String, maxlength: 4 },

  // Multiple Company Associations
  associatedCompanies: [{
    rocWorkspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'RocWorkspace' },
    designation: { type: String, enum: ['Director', 'Managing Director', 'Partner', 'Designated Partner'] },
    appointmentDate: { type: Date },
    cessationDate: { type: Date },
    shareholdingPercent: { type: Number }
  }],

  // DSC Tracking (Digital Signature)
  dscDetails: {
    hasDsc: { type: Boolean, default: false },
    dscClass: { type: String, enum: ['Class 2', 'Class 3'] },
    certifyingAuthority: { type: String }, 
    issueDate: { type: Date },
    expiryDate: { type: Date }, // 🔴 "DSC Valid Upto"
    status: { type: String, enum: ['Valid', 'Expired', 'Not Available'], default: 'Not Available' } // 🔴 Updated enum
  }

}, { timestamps: true });

export default mongoose.model('Director', directorSchema);