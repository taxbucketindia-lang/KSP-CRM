import webpush from 'web-push';
import PushSubscription from '../models/PushSubscription.js';
import User from '../models/User.js';

// 🔴 PHONE / BROWSER PUSH NOTIFICATION (Web Push)
// CRM band ho ya phone lock ho, zaroori notification phone ke notification bar me aata hai.

// Sirf in notifications par phone bajta hai. Baar-baar aane wale reminder (to-do, invoice, handover ka
// har ghante wala) jaan-boojh kar bahar rakhe hain, warna log notification hi band kar denge.
// Kuch aur jodna / hatana ho toh bas yeh list badlo.
export const PUSH_KINDS = ['task-assigned', 'devtask', 'handover-new', 'meeting-reminder'];

let configured = null; // null = abhi check nahi kiya

const isConfigured = () => {
  if (configured !== null) return configured;
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn('[PUSH] VAPID keys missing in .env: phone notifications are off.');
    configured = false;
    return false;
  }
  try {
    webpush.setVapidDetails(VAPID_SUBJECT || 'mailto:admin@example.com', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    configured = true;
  } catch (error) {
    console.error('[PUSH] Invalid VAPID keys:', error.message);
    configured = false;
  }
  return configured;
};

export const getPublicKey = () => (isConfigured() ? process.env.VAPID_PUBLIC_KEY : null);

// Ek user ke saare devices par push bhejna. Kitne devices par gaya wo lautata hai.
export const sendPushToUser = async (userId, payload) => {
  if (!isConfigured() || !userId) return 0;
  const subscriptions = await PushSubscription.find({ user: userId }).lean();
  if (subscriptions.length === 0) return 0;

  const body = JSON.stringify(payload);
  let sent = 0;
  await Promise.all(subscriptions.map(async (subscription) => {
    try {
      await webpush.sendNotification({ endpoint: subscription.endpoint, keys: subscription.keys }, body, { TTL: 60 * 60 * 12 });
      sent++;
    } catch (error) {
      // 404 / 410 = us device ne notification band kar diya ya app hata diya: address hata do
      if (error.statusCode === 404 || error.statusCode === 410) {
        await PushSubscription.deleteOne({ _id: subscription._id });
      } else {
        console.error('[PUSH] Send failed:', error.statusCode || '', error.body || error.message);
      }
    }
  }));
  return sent;
};

// Naya notification save hote hi (models/Notification.js se) yeh chalta hai
export const pushForNotification = async (notification) => {
  try {
    if (!PUSH_KINDS.includes(notification.kind) || !isConfigured()) return;

    // Click karne par kahan khule: employee ka calendar My Portal me hai (CEO ka CEO Dashboard me)
    let url = notification.link || '/';
    if (notification.kind === 'meeting-reminder') {
      const recipient = await User.findById(notification.recipient).select('role').lean();
      if (recipient?.role !== 'CEO') url = '/my-portal#my-calendar';
    }

    await sendPushToUser(notification.recipient, {
      title: notification.title,
      body: notification.message,
      url,
      tag: String(notification._id)
    });
  } catch (error) {
    console.error('[PUSH] pushForNotification failed:', error.message);
  }
};
