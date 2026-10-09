import mongoose from 'mongoose';

// Remarks ke liye sub-schema (Employee Name, ID, Date, Msg)
const remarkSchema = new mongoose.Schema({
  employeeName: { type: String, required: true },
  employeeId: { type: String, required: true },
  message: { type: String, required: true },
  status: { type: String, default: '' }, // Is update ke waqt task ka status (CEO activity feed ke liye)
  date: { type: Date, default: Date.now }
});

const devTaskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  taskType: { 
    type: String, 
    enum: ['Bug Fix', 'New Feature', 'UI Improvement', 'Database Optimization', 'Other'], 
    default: 'New Feature' 
  },
  priority: { 
    type: String, 
    enum: ['Urgent', 'High', 'Medium', 'Low'], 
    default: 'Medium' 
  },
  module: { type: String, required: true }, // e.g., ITR, GST, Invoice, HR
  description: { type: String, required: true },
  attachmentUrl: { type: String, default: '' }, // Screenshot/Image URL
  assignedTo: { type: String, required: true },
  // 🔴 Kisne assign kiya (CEO Dashboard ke leaderboard / activity feed ke liye)
  assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assignedByName: { type: String, default: '' },
  startDate: { type: Date },
  dueDate: { type: Date },
  estimatedHours: { type: Number, default: 0 },
  status: { 
    type: String, 
    enum: ['Backlog', 'Start', 'In Progress', 'Testing / Review', 'Completed'], 
    default: 'Backlog' 
  },
  remarks: [remarkSchema]
}, { timestamps: true });

const DevTask = mongoose.model('DevTask', devTaskSchema);
export default DevTask;