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
let problem = '';      // set up na ho paye toh wajah (status link aur error message me dikhti hai)

// Hosting ke dashboard me value chipkate waqt aksar quotes ya space saath aa jaate hain: unhe hata do
const envValue = (name) => String(process.env[name] || '').trim().replace(/^["']|["']$/g, '').trim();

const isConfigured = () => {
  if (configured !== null) return configured;
  const publicKey = envValue('VAPID_PUBLIC_KEY');
  const privateKey = envValue('VAPID_PRIVATE_KEY');
  const missing = [!publicKey && 'VAPID_PUBLIC_KEY', !privateKey && 'VAPID_PRIVATE_KEY'].filter(Boolean);
  if (missing.length > 0) {
    problem = `Missing on the server: ${missing.join(', ')}. Add it in the hosting environment variables and redeploy.`;
    console.warn('[PUSH]', problem);
    configured = false;
    return false;
  }
  try {
    // Subject me sirf email likh diya ho toh "mailto:" khud laga do
    let subject = envValue('VAPID_SUBJECT') || 'mailto:admin@example.com';
    if (!/^(mailto:|https?:\/\/)/i.test(subject)) subject = `mailto:${subject}`;
    webpush.setVapidDetails(subject, publicKey, privateKey);
    configured = true;
    problem = '';
  } catch (error) {
    problem = `The keys are present but not valid: ${error.message}`;
    console.error('[PUSH]', problem);
    configured = false;
  }
  return configured;
};

export const getPublicKey = () => (isConfigured() ? envValue('VAPID_PUBLIC_KEY') : null);

// Jaanch ke liye: kaun si key server tak pahunchi (sirf haan / na, key ki value kabhi nahi)
export const getPushStatus = () => {
  const ready = isConfigured();
  return {
    ready,
    VAPID_PUBLIC_KEY: !!envValue('VAPID_PUBLIC_KEY'),
    VAPID_PRIVATE_KEY: !!envValue('VAPID_PRIVATE_KEY'),
    VAPID_SUBJECT: !!envValue('VAPID_SUBJECT'),
    problem: ready ? '' : problem
  };
};

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
