import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { del, list } from '@vercel/blob';
import { ChatMessage } from '../models/Chat.js';

// 🔴 CHAT KI FILES (photo, video, PDF): 24 ghante baad apne aap hat jaati hain (storage se bhi aur database se bhi).
// Ek file 50 MB se badi nahi ho sakti. Do jagah rakh sakte hain:
//   - 'local': BLOB_READ_WRITE_TOKEN nahi hai toh isi computer par backend/uploads/chat me (local kaam ke liye)
//   - 'blob' : token hai toh Vercel Blob me (live server ke liye; wahan disk par file nahi rakh sakte)

export const MAX_FILE_BYTES = 50 * 1024 * 1024;
export const FILE_LIFETIME_MS = 24 * 60 * 60 * 1000;
export const ALLOWED_TYPES = ['image/*', 'video/*', 'application/pdf'];

export const isAllowedType = (type) => /^image\//.test(type || '') || /^video\//.test(type || '') || type === 'application/pdf';
export const fileKind = (type) => (/^image\//.test(type || '') ? 'image' : /^video\//.test(type || '') ? 'video' : type === 'application/pdf' ? 'pdf' : 'file');
// Vercel Blob token: BLOB_READ_WRITE_TOKEN, ya connect karte waqt koi aur prefix rakha ho (XYZ_READ_WRITE_TOKEN) toh bhi mil jaye.
// Aage-peeche ke quotes / space hata dete hain (dashboard me galti se lag jaate hain).
const clean = (value) => String(value || '').trim().replace(/^['"]|['"]$/g, '').trim();
export const blobToken = () => {
  const direct = clean(process.env.BLOB_READ_WRITE_TOKEN);
  if (direct) return direct;
  const key = Object.keys(process.env).find(k => /_READ_WRITE_TOKEN$/.test(k) && clean(process.env[k]).startsWith('vercel_blob_rw_'));
  return key ? clean(process.env[key]) : '';
};
export const blobTokenName = () => (clean(process.env.BLOB_READ_WRITE_TOKEN) ? 'BLOB_READ_WRITE_TOKEN'
  : Object.keys(process.env).find(k => /_READ_WRITE_TOKEN$/.test(k) && clean(process.env[k]).startsWith('vercel_blob_rw_')) || '');
export const storageReady = () => !!blobToken();

// Kaunsi jagah: token = blob; Vercel par bina token = kuch nahi (wahan disk read-only hai); warna local
export const storageMode = () => (storageReady() ? 'blob' : process.env.VERCEL ? 'none' : 'local');

// Local files yahan: backend/uploads/chat/<chatId>/<random>-<naam>
const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const LOCAL_ROOT = path.join(__dirname, '..', 'uploads', 'chat');

// Sirf hamare Blob store ka link maana jata hai (koi bahar ka link file bata kar na bheje)
export const isBlobUrl = (url) => {
  try {
    const { protocol, hostname } = new URL(String(url));
    return protocol === 'https:' && hostname.endsWith('.blob.vercel-storage.com');
  } catch {
    return false;
  }
};

// Local file ka naam (pathname 'local/chat/<chatId>/<file>') se disk ka rasta. Bahar ke folder me jaane ki koshish = null
export const localFilePath = (pathname) => {
  const match = /^local\/chat\/([a-f0-9]{24})\/([\w.-]{1,140})$/i.exec(String(pathname || ''));
  if (!match) return null;
  return path.join(LOCAL_ROOT, match[1], match[2]);
};

// Local upload: file disk par likho, uska naam lautao
export const saveLocalFile = async (chatId, originalName, buffer) => {
  const safe = String(originalName || 'file').replace(/[^\w.-]+/g, '_').slice(-80) || 'file';
  const fileName = `${crypto.randomBytes(8).toString('hex')}-${safe}`;
  const dir = path.join(LOCAL_ROOT, String(chatId));
  await fs.promises.mkdir(dir, { recursive: true });
  await fs.promises.writeFile(path.join(dir, fileName), buffer);
  return `local/chat/${chatId}/${fileName}`;
};

// Chat list me dikhne wali ek line
export const filePreviewText = (attachment, caption) => {
  const label = { image: '📷 Photo', video: '🎥 Video', pdf: `📄 ${attachment.name || 'PDF'}`, file: `📎 ${attachment.name || 'File'}` }[attachment.kind] || '📎 File';
  return caption ? `${label}: ${caption}` : label;
};

export const deleteChatFile = async (attachment) => {
  if (!attachment?.url) return;
  try {
    const local = localFilePath(attachment.pathname);
    if (local) await fs.promises.rm(local, { force: true });
    else if (isBlobUrl(attachment.url) && storageReady()) await del(attachment.url, { token: blobToken() });
  } catch (error) {
    console.error('[CHAT FILES] delete failed:', error.message);
  }
};

// Local folder me 24 ghante se purani files (aur khali folder) hatao
const cleanupLocalFolder = async (cutoff) => {
  let chats = [];
  try { chats = await fs.promises.readdir(LOCAL_ROOT); } catch { return; }
  for (const chat of chats) {
    const dir = path.join(LOCAL_ROOT, chat);
    try {
      const names = await fs.promises.readdir(dir);
      for (const name of names) {
        const file = path.join(dir, name);
        const stat = await fs.promises.stat(file);
        if (stat.mtime < cutoff) await fs.promises.rm(file, { force: true });
      }
      if ((await fs.promises.readdir(dir)).length === 0) await fs.promises.rmdir(dir);
    } catch { /* agli baar */ }
  }
};

// Safai: 24 ghante se purani saari chat files (bheji hui, aur jo upload hui par bheji nahi gayi) + unka database record.
// Har request par nahi: ek server par 10 minute me ek baar se zyada nahi chalti.
let lastCleanup = 0;
export const cleanupExpiredChatFiles = async ({ force = false } = {}) => {
  if (!force && Date.now() - lastCleanup < 10 * 60 * 1000) return;
  lastCleanup = Date.now();
  const cutoff = new Date(Date.now() - FILE_LIFETIME_MS);

  // 1. Storage: Vercel Blob ke 'chat/' me aur is computer ke uploads/chat me 24 ghante se purani har file
  if (storageReady()) {
    try {
      let cursor;
      do {
        const page = await list({ prefix: 'chat/', limit: 500, cursor, token: blobToken() });
        const old = page.blobs.filter(blob => new Date(blob.uploadedAt) < cutoff).map(blob => blob.url);
        if (old.length) await del(old, { token: blobToken() });
        cursor = page.hasMore ? page.cursor : undefined;
      } while (cursor);
    } catch (error) {
      console.error('[CHAT FILES] storage cleanup failed:', error.message);
    }
  }
  if (!process.env.VERCEL) await cleanupLocalFolder(cutoff);

  // 2. Database: file wale message jinka samay khatam. Sirf file thi toh poora message hatao, caption tha toh sirf file.
  try {
    const expired = await ChatMessage.find({ expiresAt: { $lte: new Date() }, 'attachment.url': { $exists: true } }).select('_id text attachment').limit(500).lean();
    await Promise.all(expired.map(m => deleteChatFile(m.attachment)));
    const fileOnly = expired.filter(m => !String(m.text || '').trim()).map(m => m._id);
    const withCaption = expired.filter(m => String(m.text || '').trim()).map(m => m._id);
    if (fileOnly.length) await ChatMessage.deleteMany({ _id: { $in: fileOnly } });
    if (withCaption.length) await ChatMessage.updateMany({ _id: { $in: withCaption } }, { $unset: { attachment: '', expiresAt: '' } });
  } catch (error) {
    console.error('[CHAT FILES] database cleanup failed:', error.message);
  }
};
