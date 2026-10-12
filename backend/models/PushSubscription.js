import mongoose from 'mongoose';

// 🔴 PHONE / BROWSER PUSH: har user ke har device ka push address.
// Ek user ke kai device ho sakte hain (phone + laptop); ek device (endpoint) ek hi user ka hota hai.
const pushSubscriptionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  endpoint: { type: String, required: true, unique: true },
  keys: {
    p256dh: { type: String, required: true },
    auth: { type: String, required: true }
  },
  userAgent: { type: String, default: '' }
}, { timestamps: true });

export default mongoose.model('PushSubscription', pushSubscriptionSchema);
