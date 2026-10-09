import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  link: { type: String }, // Click karne par kahan bhejna hai (e.g., '/tasks')

  // Task Handover se judi notification (purane reminder hatane ke liye)
  handover: { type: mongoose.Schema.Types.ObjectId, ref: 'TaskHandover' },
  meeting: { type: mongoose.Schema.Types.ObjectId, ref: 'Meeting' }, // Calendar meeting ka reminder
  kind: { type: String }
}, { timestamps: true });

export default mongoose.model('Notification', notificationSchema);