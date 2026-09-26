import mongoose from 'mongoose';

// Shareholder structure (Embed for fast access)
const shareholderSchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: { type: String },
  state: { type: String },
  pinCode: { type: String },
  sharePercentage: { type: Number },
  faceValue: { type: Number },
  noOfShares: { type: Number },
  totalValue: { type: Number },
  remarks: { type: String }
});

// 🔴 NAYA: Director structure (Seedha Workspace ke andar save karne ke liye)
const directorSubSchema = new mongoose.Schema({
  name: { type: String, required: true },
  dinOrDpin: { type: String },
  pan: { type: String, uppercase: true },
  dob: { type: Date },
  mobile: { type: String },
  email: { type: String, lowercase: true },
  appointmentDate: { type: Date },
  resigningDate: { type: Date },
  dscStatus: { type: String, enum: ['Valid', 'Expired', 'Not Available'], default: 'Not Available' },
  dscValidUpto: { type: Date }
});

const rocWorkspaceSchema = new mongoose.Schema({
  clientMasterId: { type: mongoose.Schema.Types.ObjectId, ref: 'ClientMaster', required: true, unique: true },
  
  // Basic Details
  cinOrLlpIn: { type: String, unique: true, sparse: true, uppercase: true },
  tan: { type: String, uppercase: true },               
  udyamNumber: { type: String, uppercase: true },       
  importExportCode: { type: String, uppercase: true },  
  dateOfIncorporation: { type: Date },
  
  // Capital Structure
  authorizedCapital: { type: Number, default: 0 },
  paidUpCapital: { type: Number, default: 0 },
  
  // Statutory Auditors
  auditorName: { type: String },
  auditorMembershipNo: { type: String },
  auditorFrn: { type: String },                         
  auditorPlace: { type: String },                       
  auditorAppointmentDate: { type: Date },
  auditorTenureEndDate: { type: Date },

  // Startup India Recognition
  startupIndia: {
    isRegistered: { type: Boolean, default: false },
    dpiitNumber: { type: String },
    certificateNo: { type: String },
    recognitionDate: { type: Date },
    status: { type: String, enum: ['Active', 'Expired', 'N/A'], default: 'N/A' }
  },

  // List of Shareholders
  shareholders: [shareholderSchema],
  
  // 🔴 NAYA FIELD: List of Directors (Frontend se direct save hoga)
  directors: [directorSubSchema],

  relationshipManager: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, enum: ['Active', 'Strike Off', 'Under Process'], default: 'Active' }
  
}, { timestamps: true });

export default mongoose.model('RocWorkspace', rocWorkspaceSchema);