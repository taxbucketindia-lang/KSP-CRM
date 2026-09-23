import mongoose from 'mongoose';

const employeeSchema = new mongoose.Schema({
  empId: { type: String, unique: true, required: true }, // Auto-generate karenge jaise TB-EMP-001
  companyName: { type: String, required: true },
  name: { type: String, required: true },
  mobile: { type: String, required: true },
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
    default: '09:30' // Har employee ka alag aane ka time yahan save hoga
  },
  joiningDate: { type: Date },
  probationPeriod: { type: String },
  confirmationDate: { type: Date },
  salaryType: { type: String, enum: ['Salary', 'Stipend'], default: 'Salary' },
  
  // Current Salary Structure
  salaryStructure: {
    basic: { type: Number, default: 0 },
    hra: { type: Number, default: 0 },
    otherAllowance: { type: Number, default: 0 },
    gross: { type: Number, default: 0 } // Auto calculate: basic + hra + other
  },

  pan: { type: String },
  uanEsi: { type: String },
  reportingManager: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { 
    type: String, 
    enum: ['Active', 'Resigned', 'Inactive'],
    default: 'Active'
  },
  resignationDate: { type: Date },
  lastWorkingDate: { type: Date },
  remarks: { type: String }
}, { timestamps: true });

export default mongoose.model('Employee', employeeSchema);