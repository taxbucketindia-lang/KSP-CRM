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

// Director structure
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

// 🔴 NAYA: Compliance & Form Filings Structure
const complianceFilingSchema = new mongoose.Schema({
  formName: { type: String, required: true },
  dueDate: { type: Date },
  filingDate: { type: Date },
  normalFee: { type: Number, default: 0 },
  additionalFee: { type: Number, default: 0 },
  authorName: { type: String }
});


const rocWorkspaceSchema = new mongoose.Schema({
  clientMasterId: { type: mongoose.Schema.Types.ObjectId, ref: 'ClientMaster', required: true, unique: true },

  companyName: { type: String },
  pan: { type: String, uppercase: true },
  clientType: { type: String },
  
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

  // Arrays (Sub-documents)
  shareholders: [shareholderSchema],
  directors: [directorSubSchema],
  
  // 🔴 NAYA FIELD: Form Filings Tracking Array
  complianceFilings: [complianceFilingSchema],

  relationshipManager: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, enum: ['Active', 'Strike Off', 'Under Process'], default: 'Active' }
  
}, { timestamps: true });

export default mongoose.model('RocWorkspace', rocWorkspaceSchema);