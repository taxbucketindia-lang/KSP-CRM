import mongoose from 'mongoose';
import { Conversation, ChatMessage, ChatPresence } from '../models/Chat.js';
import User from '../models/User.js';
import { sendPushToUser } from '../utils/pushService.js';
import { handleUpload } from '@vercel/blob/client';
import fs from 'fs';
import {
  MAX_FILE_BYTES, FILE_LIFETIME_MS, ALLOWED_TYPES, isAllowedType, fileKind, isBlobUrl, storageReady, storageMode, blobToken, blobTokenName,
  localFilePath, saveLocalFile, filePreviewText, deleteChatFile, cleanupExpiredChatFiles
} from '../utils/chatFiles.js';

// Local file ka poora link (isi backend se khulta hai: /uploads/chat/...)
const localFileUrl = (req, pathname) => `${req.protocol}://${req.get('host')}/uploads/${String(pathname).replace(/^local\//, '')}`;

// 🔴 TEAM CHAT. Live server (Vercel) par hamesha khula connection (socket) nahi chalta,
// isliye app thodi-thodi der me sirf NAYE message poochta hai (halki query, server par bojh kam).

const ONLINE_WINDOW_MS = 60 * 1000;      // itni der me dikha ho toh "Online"
const VIEWING_FRESH_MS = 15 * 1000;     // chat khuli hai toh har 3 sec poochti hai; 15 sec se chup = chat band / tab chhupi

const fail = (message, status = 400) => { const error = new Error(message); error.status = status; throw error; };
const run = (handler) => async (req, res) => {
  try { await handler(req, res); } catch (error) { res.status(error.status || 500).json({ message: error.message }); }
};
const validId = (value) => mongoose.Types.ObjectId.isValid(String(value || ''));
const same = (a, b) => String(a) === String(b);

// User chat me hai: presence taaza (har minute me ek baar se zyada nahi likhte)
const touchPresence = async (userId) => {
  const cutoff = new Date(Date.now() - 30 * 1000);
  await ChatPresence.updateOne({ user: userId, seenAt: { $lt: cutoff } }, { $set: { seenAt: new Date() } }).then(async (r) => {
    if (r.matchedCount === 0) await ChatPresence.updateOne({ user: userId }, { $setOnInsert: { seenAt: new Date() } }, { upsert: true }).catch(() => {});
  });
};

const touchViewing = async (userId, conversationId) => {
  const cutoff = new Date(Date.now() - 10 * 1000);
  await ChatPresence.updateOne(
    { user: userId, $or: [{ viewing: { $ne: conversationId } }, { viewingAt: null }, { viewingAt: { $lt: cutoff } }] },
    { $set: { viewing: conversationId, viewingAt: new Date(), seenAt: new Date() } }
  );
};

const presenceMap = async (userIds) => {
  const rows = await ChatPresence.find({ user: { $in: userIds } }).lean();
  return Object.fromEntries(rows.map(r => [String(r.user), r.seenAt]));
};

// Chat jisme user member hai (warna 404)
const loadConversation = async (id, userId) => {
  if (!validId(id)) fail('Chat not found', 404);
  const conversation = await Conversation.findOne({ _id: id, members: userId });
  if (!conversation) fail('Chat not found', 404);
  return conversation;
};

const readAtOf = (conversation, userId) => conversation.reads?.find(r => same(r.user, userId))?.at || null;
const clearedAtOf = (conversation, userId) => conversation.clears?.find(c => same(c.user, userId))?.at || null;
const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

// Frontend ke liye chat ki shakal
const conversationView = (conversation, me, usersById, unread, presence) => {
  const memberList = conversation.members.map(id => usersById[String(id)]).filter(Boolean);
  const other = conversation.type === 'direct' ? memberList.find(m => !same(m._id, me)) : null;
  const seenAt = other ? presence[String(other._id)] : null;
  return {
    _id: conversation._id,
    type: conversation.type,
    name: conversation.type === 'group' ? conversation.name : (other?.name || 'Unknown'),
    other: other ? { _id: other._id, name: other.name, role: other.role, empId: other.empId, seenAt, online: !!seenAt && Date.now() - new Date(seenAt).getTime() < ONLINE_WINDOW_MS } : null,
    members: memberList.map(m => ({ _id: m._id, name: m.name, role: m.role })),
    admins: conversation.admins || [],
    isAdmin: (conversation.admins || []).some(a => same(a, me)),
    lastMessage: conversation.lastMessage?.at ? conversation.lastMessage : null,
    unread,
    updatedAt: conversation.updatedAt
  };
};

const usersMap = async (ids) => {
  const users = await User.find({ _id: { $in: ids } }).select('name role empId').lean();
  return Object.fromEntries(users.map(u => [String(u._id), u]));
};

// @route GET /api/chat/users  (kisse baat kar sakte hain: saare active log, client nahi)
export const getChatUsers = run(async (req, res) => {
  const users = await User.find({ _id: { $ne: req.user._id }, role: { $ne: 'Client' }, status: { $ne: 'Inactive' } })
    .select('name role empId').sort({ name: 1 }).lean();
  const presence = await presenceMap(users.map(u => u._id));
  res.json(users.map(u => ({ ...u, seenAt: presence[String(u._id)] || null, online: !!presence[String(u._id)] && Date.now() - new Date(presence[String(u._id)]).getTime() < ONLINE_WINDOW_MS })));
});

// @route GET /api/chat/conversations  (meri saari chats + har ek ke unread; badge ke liye totalUnread)
export const getConversations = run(async (req, res) => {
  const me = req.user._id;
  touchPresence(me).catch(() => {});
  await cleanupExpiredChatFiles();

  const conversations = (await Conversation.find({ members: me }).sort({ 'lastMessage.at': -1, updatedAt: -1 }).limit(200))
    // "Delete chat" ki hui chat list me tab tak nahi jab tak naya message na aaye ya user khud "New chat" se dobara na khole
    .filter(c => { const entry = c.clears?.find(x => same(x.user, me)); return !entry || entry.hidden === false || (c.lastMessage?.at && c.lastMessage.at > entry.at); });
  const memberIds = [...new Set(conversations.flatMap(c => c.members.map(String)))];
  const [usersById, presence, unreadCounts] = await Promise.all([
    usersMap(memberIds),
    presenceMap(memberIds),
    Promise.all(conversations.map(c => {
      const cleared = clearedAtOf(c, me);
      const readAt = [readAtOf(c, me), cleared].filter(Boolean).sort((a, b) => b - a)[0] || null;
      if (!c.lastMessage?.at || (readAt && c.lastMessage.at <= readAt)) return 0;
      return ChatMessage.countDocuments({ conversation: c._id, sender: { $ne: me }, deletedAt: null, ...(readAt ? { createdAt: { $gt: readAt } } : {}) });
    }))
  ]);

  const list = conversations.map((c, i) => conversationView(c, me, usersById, unreadCounts[i], presence));
  res.json({ conversations: list, totalUnread: unreadCounts.reduce((s, n) => s + n, 0) });
});

// @route POST /api/chat/conversations/direct  { userId }  (do logon ki chat: ho toh wahi, warna nayi)
export const openDirectChat = run(async (req, res) => {
  const me = req.user._id;
  const { userId } = req.body;
  if (!validId(userId) || same(userId, me)) fail('Please choose a person to chat with');
  const other = await User.findOne({ _id: userId, role: { $ne: 'Client' } }).select('_id').lean();
  if (!other) fail('Person not found', 404);

  const directKey = [String(me), String(userId)].sort().join('_');
  let conversation = await Conversation.findOne({ directKey });
  if (!conversation) {
    try {
      conversation = await Conversation.create({ type: 'direct', members: [me, userId], directKey, createdBy: me });
    } catch (error) {
      if (error.code !== 11000) throw error;
      conversation = await Conversation.findOne({ directKey }); // dono ne ek saath kholi
    }
  }
  // Pehle "Delete chat" ki thi: list me wapas dikhao (purane message chhupe hi rahenge)
  if (conversation.clears?.some(x => same(x.user, me) && x.hidden !== false)) {
    await Conversation.updateOne({ _id: conversation._id }, { $set: { 'clears.$[mine].hidden': false } }, { arrayFilters: [{ 'mine.user': me }], timestamps: false });
  }
  const usersById = await usersMap(conversation.members);
  const presence = await presenceMap(conversation.members);
  res.json(conversationView(conversation, me, usersById, 0, presence));
});

// @route POST /api/chat/conversations/group  { name, memberIds }
export const createGroup = run(async (req, res) => {
  const me = req.user._id;
  const name = String(req.body.name || '').trim().slice(0, 60);
  if (!name) fail('Please give the group a name');
  const ids = [...new Set((Array.isArray(req.body.memberIds) ? req.body.memberIds : []).filter(validId).map(String))].filter(id => !same(id, me));
  if (ids.length === 0) fail('Add at least one member');
  const valid = await User.find({ _id: { $in: ids }, role: { $ne: 'Client' } }).select('_id').lean();

  const conversation = await Conversation.create({
    type: 'group', name, members: [me, ...valid.map(u => u._id)], admins: [me], createdBy: me,
    reads: [{ user: me, at: new Date() }]
  });
  const text = `${req.user.name} created the group "${name}"`;
  await ChatMessage.create({ conversation: conversation._id, sender: me, senderName: req.user.name, text, kind: 'system' });
  conversation.lastMessage = { text, sender: me, senderName: req.user.name, at: new Date() };
  await conversation.save();

  const usersById = await usersMap(conversation.members);
  res.status(201).json(conversationView(conversation, me, usersById, 0, {}));
});

// @route PUT /api/chat/conversations/:id  { name?, memberIds? }  (sirf group admin)
export const updateGroup = run(async (req, res) => {
  const me = req.user._id;
  const conversation = await loadConversation(req.params.id, me);
  if (conversation.type !== 'group') fail('Only groups can be edited');
  if (!(conversation.admins || []).some(a => same(a, me))) fail('Only the group admin can change the group', 403);

  const notes = [];
  if (req.body.name !== undefined) {
    const name = String(req.body.name || '').trim().slice(0, 60);
    if (!name) fail('Group name cannot be empty');
    if (name !== conversation.name) notes.push(`renamed the group to "${name}"`);
    conversation.name = name;
  }
  if (Array.isArray(req.body.memberIds)) {
    const ids = [...new Set(req.body.memberIds.filter(validId).map(String))];
    const valid = await User.find({ _id: { $in: ids }, role: { $ne: 'Client' } }).select('_id').lean();
    const next = [...new Set([String(me), ...valid.map(u => String(u._id))])];
    const added = next.filter(id => !conversation.members.some(m => same(m, id))).length;
    const removed = conversation.members.filter(m => !next.includes(String(m))).length;
    if (added) notes.push(`added ${added} member${added > 1 ? 's' : ''}`);
    if (removed) notes.push(`removed ${removed} member${removed > 1 ? 's' : ''}`);
    conversation.members = next;
    conversation.admins = (conversation.admins || []).filter(a => next.includes(String(a)));
  }
  if (notes.length) {
    const text = `${req.user.name} ${notes.join(' and ')}`;
    await ChatMessage.create({ conversation: conversation._id, sender: me, senderName: req.user.name, text, kind: 'system' });
    conversation.lastMessage = { text, sender: me, senderName: req.user.name, at: new Date() };
  }
  await conversation.save();
  const usersById = await usersMap(conversation.members);
  res.json(conversationView(conversation, me, usersById, 0, {}));
});

// @route POST /api/chat/conversations/:id/leave  (group chhodna)
export const leaveGroup = run(async (req, res) => {
  const me = req.user._id;
  const conversation = await loadConversation(req.params.id, me);
  if (conversation.type !== 'group') fail('You can only leave a group');
  conversation.members = conversation.members.filter(m => !same(m, me));
  conversation.admins = (conversation.admins || []).filter(a => !same(a, me));
  // Admin chala gaya toh sabse purana member admin
  if (conversation.admins.length === 0 && conversation.members.length) conversation.admins = [conversation.members[0]];
  const text = `${req.user.name} left the group`;
  await ChatMessage.create({ conversation: conversation._id, sender: me, senderName: req.user.name, text, kind: 'system' });
  conversation.lastMessage = { text, sender: me, senderName: req.user.name, at: new Date() };
  await conversation.save();
  res.json({ message: 'You left the group' });
});

// @route GET /api/chat/conversations/:id/messages?after=ISO | ?before=ISO
// after = sirf naye (har kuch second me), before = upar scroll karne par purane
export const getMessages = run(async (req, res) => {
  const me = req.user._id;
  const conversation = await loadConversation(req.params.id, me);
  touchPresence(me).then(() => touchViewing(me, conversation._id)).catch(() => {});
  await cleanupExpiredChatFiles();

  // Query se PEHLE ka time (5 second peeche): beech me aaya message agli baar zaroor mile.
  // Kai server ho sakte hain jinki ghadi thodi alag ho; dohraaye gaye message frontend ID se hata deta hai.
  const syncPoint = new Date(Date.now() - 5000);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 40));
  const query = { conversation: conversation._id };
  const clearedAt = clearedAtOf(conversation, me);
  if (clearedAt) query.createdAt = { $gt: clearedAt };
  const after = req.query.after ? new Date(req.query.after) : null;
  const before = req.query.before ? new Date(req.query.before) : null;

  let messages;
  if (after && !Number.isNaN(after.getTime())) {
    // Naye message aur jo beech me delete hue (updatedAt badla) dono
    // Naye message, aur jo beech me badle (reaction laga / delete hua): sabka updatedAt badalta hai
    messages = await ChatMessage.find({ ...query, updatedAt: { $gt: after } }).sort({ createdAt: 1 }).limit(200).lean();
  } else {
    if (before && !Number.isNaN(before.getTime())) query.createdAt = { ...(query.createdAt || {}), $lt: before };
    messages = (await ChatMessage.find(query).sort({ createdAt: -1 }).limit(limit).lean()).reverse();
  }

  // Baaki members ne kab tak padha (✓✓ ke liye)
  const othersRead = (conversation.reads || []).filter(r => !same(r.user, me)).map(r => ({ user: r.user, at: r.at }));
  const presence = conversation.type === 'direct' ? await presenceMap(conversation.members.filter(m => !same(m, me))) : {};
  const otherSeen = Object.values(presence)[0] || null;

  res.json({
    messages: messages.map(m => ({ ...m, text: m.deletedAt ? '' : m.text })),
    reads: othersRead,
    memberCount: conversation.members.length,
    otherSeenAt: otherSeen,
    otherOnline: !!otherSeen && Date.now() - new Date(otherSeen).getTime() < ONLINE_WINDOW_MS,
    hasMore: !after && messages.length === limit,
    serverTime: syncPoint
  });
});

// @route POST /api/chat/conversations/:id/messages  { text, clientId }
export const sendMessage = run(async (req, res) => {
  const me = req.user._id;
  const conversation = await loadConversation(req.params.id, me);
  const text = String(req.body.text || '').replace(/\s+$/g, '').slice(0, 4000);

  // File: sirf hamare storage ka link, 50 MB tak, photo / video / PDF
  let attachment = null;
  if (req.body.attachment) {
    const a = req.body.attachment;
    // Local file (isi computer par): usi chat ke folder me honi chahiye aur sach me maujood ho; link server khud banata hai
    const local = localFilePath(a.pathname);
    if (local) {
      if (!String(a.pathname).startsWith(`local/chat/${conversation._id}/`) || !fs.existsSync(local)) fail('File not found. Please attach it again.');
    } else if (!isBlobUrl(a.url)) fail('File link is not valid');
    if (!isAllowedType(a.contentType)) fail('Only photos, videos and PDF files can be sent');
    if (!(Number(a.size) > 0) || Number(a.size) > MAX_FILE_BYTES) fail('A file can be at most 50 MB');
    attachment = {
      url: local ? localFileUrl(req, a.pathname) : a.url,
      pathname: String(a.pathname || '').slice(0, 300),
      name: String(a.name || 'file').slice(0, 150),
      size: Number(a.size),
      contentType: a.contentType,
      kind: fileKind(a.contentType)
    };
  }
  if (!text.trim() && !attachment) fail('Message is empty');
  const clientId = typeof req.body.clientId === 'string' && req.body.clientId.length <= 80 ? req.body.clientId : undefined;

  if (clientId) {
    const existing = await ChatMessage.findOne({ conversation: conversation._id, clientId }).lean();
    if (existing) return res.json(existing); // wahi message dobara aaya (network retry)
  }

  const message = await ChatMessage.create({
    conversation: conversation._id, sender: me, senderName: req.user.name, text, clientId,
    ...(attachment ? { attachment, expiresAt: new Date(Date.now() + FILE_LIFETIME_MS) } : {})
  });
  const now = message.createdAt;
  const preview = attachment ? filePreviewText(attachment, text.trim()) : text;
  conversation.lastMessage = { text: preview.slice(0, 200), sender: me, senderName: req.user.name, at: now, reaction: '' };
  // Bhejne wale ne apni chat padh li maani jati hai
  const mine = conversation.reads.find(r => same(r.user, me));
  if (mine) mine.at = now; else conversation.reads.push({ user: me, at: now });
  await conversation.save();

  // Jo chat me abhi nahi hain unhe phone par push (agar unhone phone alerts chalu kiye hain)
  try {
    const others = conversation.members.filter(m => !same(m, me));
    const watching = await ChatPresence.find({ user: { $in: others }, viewing: conversation._id, viewingAt: { $gte: new Date(Date.now() - VIEWING_FRESH_MS) } }).select('user').lean();
    const away = others.filter(id => !watching.some(w => same(w.user, id)));
    const title = conversation.type === 'group' ? `${req.user.name} in ${conversation.name}` : `💬 ${req.user.name}`;
    await Promise.all(away.map(id => sendPushToUser(id, { title, body: preview.slice(0, 140), url: `/chat?chat=${conversation._id}`, tag: `chat-${conversation._id}` })));
  } catch (error) {
    console.error('[CHAT] push failed:', error.message);
  }

  res.status(201).json(message);
});

// @route POST /api/chat/conversations/:id/read  (maine yeh chat padh li)
export const markRead = run(async (req, res) => {
  const me = req.user._id;
  const conversation = await loadConversation(req.params.id, me);
  const now = new Date();
  const mine = conversation.reads.find(r => same(r.user, me));
  if (mine) mine.at = now; else conversation.reads.push({ user: me, at: now });
  await Conversation.updateOne({ _id: conversation._id }, { $set: { reads: conversation.reads } }, { timestamps: false });
  res.json({ ok: true });
});

// @route POST /api/chat/upload  (Vercel Blob: browser ko file seedha storage par bhejne ki ijazat)
// Server se 4.5 MB se badi file nahi guzar sakti, isliye file browser se seedha storage me jaati hai; yahan sirf jaanch aur token.
// @route GET /api/chat/files/status  (bina login: sirf haan/naa, token kabhi nahi dikhata) - live par jaanch ke liye
export const getFileStatus = run(async (req, res) => {
  const mode = storageMode();
  res.json({
    ready: mode !== 'none',
    mode,
    tokenFound: storageReady(),
    tokenVariable: blobTokenName() || null,
    onVercel: !!process.env.VERCEL,
    problem: mode === 'none' ? 'BLOB_READ_WRITE_TOKEN is not set on this backend. Add the Blob store to THIS (backend) Vercel project and redeploy.' : ''
  });
});

// @route GET /api/chat/files/config  -> file kahan jayegi: 'local' (isi computer par) | 'blob' (Vercel) | 'none'
export const getFileConfig = run(async (req, res) => {
  res.json({ mode: storageMode(), maxBytes: MAX_FILE_BYTES });
});

// @route POST /api/chat/conversations/:id/file  (local: file seedhe body me; naam header 'x-file-name' me)
export const uploadLocalFile = run(async (req, res) => {
  if (storageMode() !== 'local') fail('Local file saving is off on this server', 400);
  const conversation = await loadConversation(req.params.id, req.user._id);
  const contentType = String(req.headers['content-type'] || '').split(';')[0].trim();
  if (!isAllowedType(contentType)) fail('Only photos, videos and PDF files can be sent');
  if (!Buffer.isBuffer(req.body) || !req.body.length) fail('File is empty');
  if (req.body.length > MAX_FILE_BYTES) fail('A file can be at most 50 MB', 413);
  let name = 'file';
  try { name = decodeURIComponent(String(req.headers['x-file-name'] || 'file')); } catch { /* naam padh nahi paaye */ }
  const pathname = await saveLocalFile(conversation._id, name, req.body);
  res.status(201).json({ url: localFileUrl(req, pathname), pathname });
});

export const chatUploadToken = run(async (req, res) => {
  if (!storageReady()) fail('File sending is not set up on the server yet (BLOB_READ_WRITE_TOKEN is missing).', 503);
  const me = req.user._id;
  const result = await handleUpload({
    token: blobToken(),
    request: req,
    body: req.body,
    onBeforeGenerateToken: async (pathname, clientPayload) => {
      // clientPayload = conversation ID: sirf us chat ka member file bhej sakta hai
      await loadConversation(clientPayload, me);
      if (!String(pathname).startsWith(`chat/${clientPayload}/`)) fail('Upload path is not valid');
      return {
        allowedContentTypes: ALLOWED_TYPES,
        maximumSizeInBytes: MAX_FILE_BYTES,
        addRandomSuffix: true,
        validUntil: Date.now() + 15 * 60 * 1000
      };
    }
  });
  res.json(result);
});

// @route POST /api/chat/messages/:id/react  { emoji }  (wahi emoji dobara = hatao, doosra = badlo)
export const reactToMessage = run(async (req, res) => {
  const me = req.user._id;
  if (!validId(req.params.id)) fail('Message not found', 404);
  const emoji = String(req.body.emoji || '');
  if (!REACTIONS.includes(emoji)) fail('This reaction is not allowed');
  const message = await ChatMessage.findOne({ _id: req.params.id, kind: 'text', deletedAt: null });
  if (!message) fail('Message not found', 404);
  await loadConversation(message.conversation, me); // sirf member react kar sakta hai

  const mine = message.reactions.find(r => same(r.user, me));
  if (mine && mine.emoji === emoji) message.reactions = message.reactions.filter(r => !same(r.user, me));
  else if (mine) mine.emoji = emoji;
  else message.reactions.push({ user: me, name: req.user.name, emoji });
  await message.save();

  // 🔴 Chat list me dikhe: "Shiva reacted ❤️ to "..."" (reaction hataya toh pichhla asli message wapas)
  const conversation = await Conversation.findById(message.conversation);
  const added = message.reactions.find(r => same(r.user, me));
  if (added) {
    conversation.lastMessage = { text: message.text.slice(0, 80), sender: me, senderName: req.user.name, at: new Date(), reaction: added.emoji };
  } else if (conversation.lastMessage?.reaction && same(conversation.lastMessage.sender, me)) {
    const latest = await ChatMessage.findOne({ conversation: conversation._id }).sort({ createdAt: -1 }).lean();
    conversation.lastMessage = latest
      ? { text: latest.deletedAt ? 'This message was deleted' : latest.text.slice(0, 200), sender: latest.sender, senderName: latest.senderName, at: latest.createdAt, reaction: '' }
      : { text: '', at: null, reaction: '' };
  }
  await conversation.save();

  res.json({ _id: message._id, reactions: message.reactions, updatedAt: message.updatedAt, lastMessage: conversation.lastMessage });
});

// @route GET /api/chat/messages/:id/info  (WhatsApp jaisa: kisne padha, kab; kisne abhi nahi padha)
export const getMessageInfo = run(async (req, res) => {
  const me = req.user._id;
  if (!validId(req.params.id)) fail('Message not found', 404);
  const message = await ChatMessage.findById(req.params.id).lean();
  if (!message) fail('Message not found', 404);
  const conversation = await loadConversation(message.conversation, me);

  const others = conversation.members.filter(m => !same(m, message.sender));
  const usersById = await usersMap(others);
  const readBy = [];
  const notRead = [];
  others.forEach(id => {
    const user = usersById[String(id)];
    if (!user) return;
    const at = readAtOf(conversation, id);
    if (at && at >= message.createdAt) readBy.push({ _id: id, name: user.name, role: user.role, at });
    else notRead.push({ _id: id, name: user.name, role: user.role });
  });
  readBy.sort((a, b) => new Date(a.at) - new Date(b.at));
  res.json({ sentAt: message.createdAt, readBy, notRead, reactions: message.reactions || [] });
});

// @route POST /api/chat/conversations/:id/clear  ("Delete chat": sirf mere liye; naya message aaye toh chat wapas dikhti hai)
export const clearChat = run(async (req, res) => {
  const me = req.user._id;
  const conversation = await loadConversation(req.params.id, me);
  const now = new Date();
  const clears = (conversation.clears || []).filter(c => !same(c.user, me));
  clears.push({ user: me, at: now, hidden: true });
  const reads = (conversation.reads || []).filter(r => !same(r.user, me));
  reads.push({ user: me, at: now });
  await Conversation.updateOne({ _id: conversation._id }, { $set: { clears, reads } }, { timestamps: false });
  res.json({ message: 'Chat deleted for you' });
});

// @route DELETE /api/chat/messages/:id  (apna message sabke liye delete)
export const deleteMessage = run(async (req, res) => {
  const me = req.user._id;
  if (!validId(req.params.id)) fail('Message not found', 404);
  const message = await ChatMessage.findOne({ _id: req.params.id, sender: me, kind: 'text' });
  if (!message) fail('You can only delete your own messages', 404);
  message.deletedAt = new Date();
  if (message.attachment?.url) {
    await deleteChatFile(message.attachment);
    message.attachment = undefined;
    message.expiresAt = undefined;
  }
  await message.save();

  const conversation = await Conversation.findById(message.conversation);
  if (conversation?.lastMessage?.at && same(conversation.lastMessage.sender, me) && conversation.lastMessage.at.getTime() === message.createdAt.getTime()) {
    conversation.lastMessage.text = 'This message was deleted';
    await conversation.save();
  }
  res.json({ ok: true });
});
