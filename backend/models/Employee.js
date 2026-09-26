import mongoose from 'mongoose';

const employeeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, 

  empId: { type: String, unique: true, required: true },
  companyName: { type: String, required: true },
  name: { type: String, required: true },
  mobile: { type: String, required: true },
  role: { type: String, default: 'Sales/Executive' },
  email: { type: String },
  designation: { type: String },
  department: { type: String },
  employmentType: { 
    type: String, 
    enum: ['Full Time', 'Part Time', 'Intern', 'Freelancer'],
    default: 'Full Time'
  },
  shiftStartTime: { 
    type: String, 
    default: '09:30'
  },
  joiningDate: { type: Date },
  probationPeriod: { type: String },
  confirmationDate: { type: Date },
  salaryType: { type: String, enum: ['Salary', 'Stipend'], default: 'Salary' },
  
  salaryStructure: {
    basic: { type: Number, default: 0 },
    hra: { type: Number, default: 0 },
    otherAllowance: { type: Number, default: 0 },
    gross: { type: Number, default: 0 }
  },

  pan: { type: String },
  uanEsi: { type: String },
  
  bankName: { type: String },
  accountNo: { type: String },
  ifscCode: { type: String },
  upiId: { type: String },

  reportingManager: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  
  // 🔴 NAYA UPDATE: Offboarding & Exit Management
  status: { 
    type: String, 
    enum: ['Active', 'Notice Period', 'Resigned', 'Terminated', 'Absconded'],
    default: 'Active'
  },
  resignationDate: { type: Date },
  lastWorkingDate: { type: Date },
  noticePeriod: { type: String },
  handoverStatus: { 
    type: String, 
    enum: ['Pending', 'Completed', 'Not Applicable'], 
    default: 'Not Applicable' 
  },
  reasonForLeaving: { type: String }, // proper remark ki kyu chhorda
  
  remarks: { type: String } // General internal notes
}, { timestamps: true });

export default mongoose.model('Employee', employeeSchema);