import axios from 'axios';

// 🔴 PHONE / BROWSER PUSH NOTIFICATION (Web Push)
// CRM band ho tab bhi zaroori notification phone ke notification bar me aaye, uske liye is device ko register karna.

const api = `${import.meta.env.VITE_API_URL}/push`;
const auth = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isInstalled = () => window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
const supported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

// VAPID public key (base64url) -> browser ko jis shakal me chahiye
const toKeyBytes = (base64) => {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(padded);
  return Uint8Array.from([...raw].map(char => char.charCodeAt(0)));
};

// Service worker register (app khulte hi). Push na chale toh bhi app par koi asar nahi.
export const registerPushWorker = () => {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
};

const currentSubscription = async () => {
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
};

// Is device ki haalat:
// 'unsupported' = browser me yeh suvidha nahi | 'ios-install' = iPhone par pehle "Add to Home Screen" karna hoga
// 'blocked' = user ne Block kiya hai | 'on' = chalu | 'off' = abhi chalu nahi kiya
export const getPushState = async () => {
  try {
    if (!supported()) return isIos() && !isInstalled() ? 'ios-install' : 'unsupported';
    if (Notification.permission === 'denied') return 'blocked';
    if (Notification.permission !== 'granted') return 'off';
    return (await currentSubscription()) ? 'on' : 'off';
  } catch {
    return 'unsupported';
  }
};

const saveOnServer = (subscription, token) => axios.post(`${api}/subscribe`, { subscription: subscription.toJSON() }, auth(token));

// "Enable" button: permission maango, device register karo
export const enablePush = async (token) => {
  if (!supported()) throw new Error('This browser does not support phone notifications.');
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error(permission === 'denied' ? 'Notifications are blocked. Allow them in your browser / phone settings.' : 'Permission was not given.');

  const { data } = await axios.get(`${api}/public-key`, auth(token));
  const registration = await navigator.serviceWorker.ready;
  const subscription = (await registration.pushManager.getSubscription())
    || await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toKeyBytes(data.publicKey) });
  await saveOnServer(subscription, token);
};

// Login ke baad: device par pehle se chalu hai toh use isi login se jod do (phone par user badla ho toh sahi vyakti ko jaye)
export const syncPush = async (token) => {
  try {
    if (!supported() || Notification.permission !== 'granted') return;
    const subscription = await currentSubscription();
    if (subscription) await saveOnServer(subscription, token);
  } catch { /* push ka sync fail ho toh bhi app chalta rahe */ }
};

// "Turn off" button: is device par poori tarah band
export const disablePush = async (token) => {
  const subscription = await currentSubscription();
  if (!subscription) return;
  await axios.post(`${api}/unsubscribe`, { endpoint: subscription.endpoint }, auth(token)).catch(() => {});
  await subscription.unsubscribe().catch(() => {});
};

// Logout: is login ke notification is phone par na aayein (agla login apne aap dobara jod leta hai)
export const detachPush = async (token) => {
  try {
    if (!supported() || !token) return;
    const subscription = await currentSubscription();
    if (subscription) await axios.post(`${api}/unsubscribe`, { endpoint: subscription.endpoint }, auth(token));
  } catch { /* logout ko mat roko */ }
};

export const sendTestPush = (token) => axios.post(`${api}/test`, {}, auth(token));
