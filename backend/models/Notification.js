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
  // kind = notification kahan se aaya (task-assigned, handover-reminder, meeting-reminder, todo-reminder, invoice-reminder, devtask...)
  kind: { type: String },
  // Jis record ka reminder hai uski ID: naya reminder aane par purana hata dete hain taaki list na bhare
  refId: { type: String }
}, { timestamps: true });

// Har user ki latest list jaldi nikle aur purane notification ki safai halki rahe
notificationSchema.index({ recipient: 1, createdAt: -1 });

// 🔴 PHONE PUSH: naya notification bante hi (kahin se bhi) zaroori wale phone ke notification bar me bhi jaate hain.
// Kaun se "zaroori" hain wo utils/pushService.js ki PUSH_KINDS list me hai. Push fail ho toh bhi notification save rehta hai.
notificationSchema.pre('save', function () { this.$locals.wasNew = this.isNew; });
// Push ke poora hone ka intezaar karte hain: live server (Vercel) jawab bhejte hi ruk jata hai,
// isliye bina intezaar ke bheja hua push beech me hi kat sakta hai. Push fail ho toh bhi save nahi rukta.
notificationSchema.post('save', async function (doc) {
  if (!doc.$locals.wasNew) return;
  try {
    const { pushForNotification } = await import('../utils/pushService.js');
    await pushForNotification(doc);
  } catch (error) {
    console.error('[PUSH] hook failed:', error.message);
  }
});

export default mongoose.model('Notification', notificationSchema);