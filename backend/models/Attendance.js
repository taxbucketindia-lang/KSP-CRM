import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  companyName: { type: String, required: true },
  date: { type: Date, required: true },
  inTime: { type: String }, // Format: "09:30"
  outTime: { type: String }, // Format: "18:30"
  totalHours: { type: String }, // Auto Calculate In & Out time difference
  status: { 
    type: String, 
    enum: ['Present', 'Absent', 'Half Day', 'Leave', 'WFH', 'Holiday', 'Weekly Off'],
    required: true
  },
  remarks: { type: String }
}, { timestamps: true });

export default mongoose.model('Attendance', attendanceSchema);