import mongoose from 'mongoose';

const todoSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: { type: String },
  dueDate: { type: Date, required: true }, // Ise aap Start ya Due Date maan sakte hain
  endDate: { type: Date, required: true }, // 🔴 NAYA: Task End Date
  priority: { type: String, enum: ['High', 'Medium', 'Low'], default: 'Medium' },
  status: { type: String, enum: ['Pending', 'Completed'], default: 'Pending' }
}, { timestamps: true });

export default mongoose.model('Todo', todoSchema);