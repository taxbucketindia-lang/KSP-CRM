import mongoose from 'mongoose';

const taskHandoverSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Jisne kaam diya
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Jisko kaam mila (dusra employee)
  clientMasterId: { type: mongoose.Schema.Types.ObjectId, ref: 'ClientMaster', default: null }, // Optional client link
  priority: { type: String, enum: ['Low', 'Medium', 'High', 'Urgent'], default: 'Medium' },
  status: { type: String, enum: ['Pending', 'In Progress', 'Resolved'], default: 'Pending' },
  updates: [{
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    message: String,
    date: { type: Date, default: Date.now }
  }],

  // 🔴 HOURLY REMINDER: jab tak assignee koi update nahi deta, har ghante notification jayega
  awaitingResponse: { type: Boolean, default: true },
  lastReminderAt: { type: Date },
  reminderCount: { type: Number, default: 0 }
}, { timestamps: true });

export default mongoose.model('TaskHandover', taskHandoverSchema);