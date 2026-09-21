import mongoose from 'mongoose';

const taskActivitySchema = new mongoose.Schema({
  task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  oldStatus: { type: String, required: true },
  newStatus: { type: String, required: true },
  remark: { type: String, default: '' },
}, { timestamps: true });

export default mongoose.model('TaskActivity', taskActivitySchema);