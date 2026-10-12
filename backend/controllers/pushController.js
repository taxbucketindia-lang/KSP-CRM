import PushSubscription from '../models/PushSubscription.js';
import { getPublicKey, sendPushToUser, getPushStatus } from '../utils/pushService.js';

// @route   GET /api/push/public-key   (browser ko subscribe karne ke liye chahiye)
export const getPushPublicKey = (req, res) => {
  const publicKey = getPublicKey();
  if (!publicKey) return res.status(503).json({ message: `Phone notifications are not set up on the server. ${getPushStatus().problem}` });
  res.json({ publicKey });
};

// @route   GET /api/push/status   (bina login: server par push taiyaar hai ya nahi. Sirf haan / na, koi key nahi dikhti)
export const getPushSetupStatus = (req, res) => res.json(getPushStatus());

// @route   POST /api/push/subscribe   (is device par notification chalu)
export const subscribePush = async (req, res) => {
  try {
    const { endpoint, keys } = req.body?.subscription || {};
    if (!endpoint || typeof endpoint !== 'string' || !/^https:\/\//.test(endpoint) || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ message: 'Invalid push subscription.' });
    }

    // Wahi device kisi aur login se juda tha toh ab is user ka ho jata hai (ek phone = ek login)
    await PushSubscription.findOneAndUpdate(
      { endpoint },
      { user: req.user._id, endpoint, keys: { p256dh: String(keys.p256dh), auth: String(keys.auth) }, userAgent: String(req.headers['user-agent'] || '').slice(0, 300) },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.status(201).json({ message: 'Notifications enabled on this device.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route   POST /api/push/unsubscribe   (is device par band; logout par bhi)
export const unsubscribePush = async (req, res) => {
  try {
    const endpoint = req.body?.endpoint;
    if (endpoint) await PushSubscription.deleteOne({ endpoint, user: req.user._id });
    res.json({ message: 'Notifications turned off on this device.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route   POST /api/push/test   (apne hi devices par ek test notification)
export const sendTestPush = async (req, res) => {
  try {
    const sent = await sendPushToUser(req.user._id, {
      title: 'TaxBucket CRM',
      body: `Test notification for ${req.user.name}. Phone alerts are working.`,
      url: '/',
      tag: `test-${Date.now()}`
    });
    if (sent === 0) return res.status(400).json({ message: 'No device is enabled for your login yet.' });
    res.json({ message: `Test sent to ${sent} device${sent === 1 ? '' : 's'}.`, sent });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
