import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  link: { type: String } // Click karne par kahan bhejna hai (e.g., '/tasks')
}, { timestamps: true });

export default mongoose.model('Notification', notificationSchema);