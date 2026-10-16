import React, { useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback } from 'react';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import {
  X, Search, Send, Plus, Users, ArrowLeft, MessageCircle, Check, CheckCheck, Trash2, Loader2, UserPlus, LogOut, Pencil, Info, ChevronDown, Copy, SmilePlus,
  Paperclip, FileText, Clock, Download, Maximize2
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { upload } from '@vercel/blob/client';
import { formatIstTime, formatIstDate, istDateKey, istToday } from '../utils/time';

// 🔴 TEAM CHAT (WhatsApp jaisa): 1-to-1 aur group chat. Server thodi-thodi der me sirf NAYE message deta hai
// (live server par hamesha khula connection nahi chalta). Panel band ho tab bhi unread ginti aati rehti hai.

const POLL_LIST_OPEN = 8000;      // panel khula: chats ki list
const POLL_LIST_CLOSED = 25000;   // panel band: sirf unread ginti
const POLL_MESSAGES = 3000;       // khuli chat ke naye message
const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

const AVATAR_COLORS = ['bg-blue-100 text-blue-700', 'bg-emerald-100 text-emerald-700', 'bg-amber-100 text-amber-700', 'bg-violet-100 text-violet-700', 'bg-pink-100 text-pink-700', 'bg-cyan-100 text-cyan-700', 'bg-orange-100 text-orange-700', 'bg-lime-100 text-lime-700'];
const colorFor = (id) => AVATAR_COLORS[String(id || '').split('').reduce((s, c) => s + c.charCodeAt(0), 0) % AVATAR_COLORS.length];
const initials = (name) => String(name || '?').trim().split(/\s+/).slice(0, 2).map(w => w.charAt(0).toUpperCase()).join('');
const newClientId = () => (window.crypto?.randomUUID ? window.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

// 🔴 FILES: photo / video / PDF, ek file 50 MB tak, ek baar me 10 tak. 24 ghante baad server apne aap hata deta hai.
const MAX_FILE_BYTES = 50 * 1024 * 1024;
const MAX_FILES = 10;
const SHARE_CACHE = 'ksp-share'; // phone ke "Share" se aayi files (service worker yahan rakhta hai)
const fileKindOf = (type) => (/^image\//.test(type) ? 'image' : /^video\//.test(type) ? 'video' : type === 'application/pdf' ? 'pdf' : null);
const formatSize = (bytes) => (bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round((bytes || 0) / 1024))} KB`);
const filePreviewText = (a, caption) => {
  const label = { image: '📷 Photo', video: '🎥 Video', pdf: `📄 ${a.name || 'PDF'}` }[a.kind] || `📎 ${a.name || 'File'}`;
  return caption ? `${label}: ${caption}` : label;
};
const expiresLabel = (expiresAt) => {
  const hours = (new Date(expiresAt) - Date.now()) / 3600000;
  return hours <= 1 ? 'Deletes within 1 hour' : `Deletes in ${Math.ceil(hours)}h`;
};

// Message ke andar file: photo / PDF dabao = chat ke andar hi bada viewer khule (nayi tab nahi), video wahin chalta hai
const AttachmentView = ({ a, pending, pct, expiresAt, onOpen }) => {
  const open = () => { if (!pending) onOpen?.(a); };
  let body;
  if (a.kind === 'image') {
    body = <button type="button" onClick={open} className="block rounded-lg overflow-hidden cursor-zoom-in"><img src={a.url} alt={a.name} className="max-h-72 w-full max-w-[280px] object-cover bg-slate-100" /></button>;
  } else if (a.kind === 'video') {
    body = (
      <div className="relative">
        <video src={a.url} controls preload="metadata" playsInline className="rounded-lg max-h-72 w-full max-w-[300px] bg-black" />
        {!pending && <button type="button" onClick={open} className="absolute top-1.5 left-1.5 h-7 w-7 rounded-full bg-slate-900/60 text-white flex items-center justify-center hover:bg-slate-900/80" title="Open big"><Maximize2 size={13} /></button>}
      </div>
    );
  } else {
    body = (
      <button type="button" onClick={open} className="flex items-center gap-2.5 p-2.5 pr-3 rounded-lg bg-black/5 hover:bg-black/10 min-w-[200px] max-w-[280px] text-left">
        <span className="h-10 w-9 rounded-md bg-rose-500 text-white text-[10px] font-black flex items-center justify-center shrink-0">PDF</span>
        <span className="min-w-0">
          <span className="block text-[13px] font-bold text-slate-800 truncate">{a.name}</span>
          <span className="block text-[11px] text-slate-500">{formatSize(a.size)} · Tap to view</span>
        </span>
      </button>
    );
  }
  return (
    <div className="relative mt-0.5 mb-1">
      {body}
      {pending && (
        <div className="absolute inset-0 rounded-lg bg-slate-900/45 flex flex-col items-center justify-center text-white text-xs font-bold gap-1">
          <Loader2 size={22} className="animate-spin" />
          {pct != null ? `${pct}%` : 'Sending'}
        </div>
      )}
      {!pending && expiresAt && <p className="mt-1 text-[10px] text-slate-500 flex items-center gap-1"><Clock size={10} /> {expiresLabel(expiresAt)}</p>}
    </div>
  );
};

const Avatar = ({ id, name, group, online, size = 'h-10 w-10' }) => (
  <span className={`relative ${size} rounded-full flex items-center justify-center font-black text-sm shrink-0 ${group ? 'bg-slate-200 text-slate-600' : colorFor(id)}`}>
    {group ? <Users size={17} /> : initials(name)}
    {online && <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white"></span>}
  </span>
);

// List ke liye chhota time: aaj = 4:15 pm, kal = Yesterday, warna date
const shortTime = (date) => {
  if (!date) return '';
  const key = istDateKey(date);
  const today = istToday();
  if (key === today) return formatIstTime(date);
  const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  if (key === yesterday) return 'Yesterday';
  return formatIstDate(date, { day: '2-digit', month: 'short' });
};
const dayLabel = (key) => {
  if (key === istToday()) return 'Today';
  const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  if (key === yesterday) return 'Yesterday';
  return formatIstDate(`${key}T12:00:00+05:30`, { day: 'numeric', month: 'long', year: 'numeric' });
};
const lastSeenText = (seenAt, online) => {
  if (online) return 'online';
  if (!seenAt) return 'not seen in chat yet';
  return `last seen ${shortTime(seenAt).toLowerCase() === 'yesterday' ? 'yesterday' : shortTime(seenAt)}${istDateKey(seenAt) === istToday() ? ' today' : ''}`;
};

// embedded = Chat page ke andar (popup nahi). open = page khula hai ya nahi (band ho tab bhi unread ginti aati rehti hai)
const ChatPanel = ({ user, open, onClose, onUnreadChange, initialChatId, embedded = false }) => {
  const api = `${import.meta.env.VITE_API_URL}/chat`;
  const headers = useMemo(() => ({ Authorization: `Bearer ${user.token}` }), [user.token]);
  const me = String(user._id);

  const [conversations, setConversations] = useState([]);
  const [listLoaded, setListLoaded] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [reads, setReads] = useState([]);
  const [peer, setPeer] = useState({ seenAt: null, online: false });
  const [hasMore, setHasMore] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  const [view, setView] = useState('chats');       // 'chats' | 'contacts' | 'group'
  const [contacts, setContacts] = useState([]);
  const [groupForm, setGroupForm] = useState({ name: '', members: [] });
  const [showInfo, setShowInfo] = useState(false);
  const [editGroup, setEditGroup] = useState(null); // { name, members }
  // 🔴 Message ka ⋮ menu aur "Message info" (kisne kab padha)
  const [menuFor, setMenuFor] = useState(null);     // message _id jiska menu khula hai
  // 🔴 Menu poori screen ke upar khulta hai (chat box ke andar nahi), isliye kabhi kat-ta nahi:
  // pehle uski lambai naapte hain, phir message ke neeche jagah ho toh neeche, warna upar
  const [menuAnchor, setMenuAnchor] = useState(null); // { top, bottom, left, right, mine }
  const [menuStyle, setMenuStyle] = useState(null);
  const menuRef = useRef(null);
  const openMenu = (event, id, mine) => {
    const row = event.currentTarget.closest('[data-bubble]');
    const rect = (row?.querySelector('[data-msg]') || row || event.currentTarget).getBoundingClientRect();
    setMenuAnchor({ top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right, mine });
    setMenuStyle(null);
    setMenuFor(id);
  };
  useLayoutEffect(() => {
    if (!menuFor || !menuAnchor || !menuRef.current) return;
    const { offsetHeight: h, offsetWidth: w } = menuRef.current;
    const gap = 6;
    const fitsBelow = window.innerHeight - menuAnchor.bottom >= h + gap + 8;
    const top = fitsBelow ? menuAnchor.bottom + gap : Math.max(8, menuAnchor.top - h - gap);
    const wanted = menuAnchor.mine ? menuAnchor.right - w : menuAnchor.left;
    const left = Math.min(Math.max(8, wanted), window.innerWidth - w - 8);
    setMenuStyle({ top, left });
  }, [menuFor, menuAnchor]);
  // Chat scroll ho ya window ka size badle toh menu band (galat jagah na latke)
  useEffect(() => {
    if (!menuFor) return undefined;
    const close = () => setMenuFor(null);
    const box = scrollRef.current;
    box?.addEventListener('scroll', close, { passive: true });
    window.addEventListener('resize', close);
    return () => { box?.removeEventListener('scroll', close); window.removeEventListener('resize', close); };
  }, [menuFor]);
  const [info, setInfo] = useState(null);           // { message, loading, data }
  // 🔴 Bhejne ke liye chuni files (photo / video / PDF) aur upload kitna hua
  const [files, setFiles] = useState([]);           // [{ id, file, kind, preview }]
  const [uploadPct, setUploadPct] = useState(null);
  const fileInputRef = useRef(null);
  const fileModeRef = useRef(null);                 // 'local' | 'blob' | 'none' (server se ek baar poochte hain)
  const [viewer, setViewer] = useState(null);       // chat ke andar khuli photo / PDF / video
  useEffect(() => {
    if (!viewer) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setViewer(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [viewer]);

  const lastSyncRef = useRef(null);      // khuli chat me aakhri baar kab tak ke message aaye
  const scrollRef = useRef(null);
  const nearBottomRef = useRef(true);
  const inputRef = useRef(null);

  const active = conversations.find(c => String(c._id) === String(activeId)) || null;

  // ---------------- CHATS KI LIST + UNREAD ----------------
  const loadConversations = useCallback(async () => {
    try {
      const res = await axios.get(`${api}/conversations`, { headers });
      setConversations(res.data.conversations || []);
      onUnreadChange?.(res.data.totalUnread || 0);
      setListLoaded(true);
    } catch { /* agli baar dobara */ }
  }, [api, headers, onUnreadChange]);

  useEffect(() => {
    loadConversations();
    const timer = setInterval(() => { if (!document.hidden) loadConversations(); }, open ? POLL_LIST_OPEN : POLL_LIST_CLOSED);
    return () => clearInterval(timer);
  }, [loadConversations, open]);

  useEffect(() => {
    if (open) setActiveId(initialChatId || null);
    else setActiveId(null);
  }, [open, initialChatId]);

  // ---------------- FILE CHUNNA ----------------
  // Sirf photo / video / PDF, har file 50 MB tak; galat file par turant bata do
  const addFiles = (list) => {
    const picked = [];
    for (const original of list) {
      let file = original;
      // Kuch phone PDF ka type nahi batate: naam se pehchano
      if (!file.type && /\.pdf$/i.test(file.name)) file = new File([file], file.name, { type: 'application/pdf' });
      const kind = fileKindOf(file.type);
      if (!kind) { toast.error(`${file.name}: only photos, videos and PDF files can be sent`); continue; }
      if (file.size > MAX_FILE_BYTES) { toast.error(`${file.name} is ${formatSize(file.size)}. A file can be at most 50 MB.`); continue; }
      picked.push({ id: newClientId(), file, kind, preview: URL.createObjectURL(file) });
    }
    setFiles(prev => {
      const next = [...prev, ...picked];
      if (next.length > MAX_FILES) toast.error(`You can send up to ${MAX_FILES} files at a time`);
      return next.slice(0, MAX_FILES);
    });
  };
  const removeFile = (id) => setFiles(prev => {
    const gone = prev.find(f => f.id === id);
    if (gone) URL.revokeObjectURL(gone.preview);
    return prev.filter(f => f.id !== id);
  });

  // 🔴 Phone ke "Share" menu se CRM chuna: service worker ne files rakh di hain, unhe yahan le aao.
  // Phir user koi bhi chat chune, files wahan bhejne ke liye taiyaar milti hain.
  useEffect(() => {
    if (!open || !('caches' in window)) return;
    (async () => {
      try {
        const cache = await caches.open(SHARE_CACHE);
        const metaRes = await cache.match('/shared-meta');
        if (!metaRes) return;
        const meta = await metaRes.json();
        const shared = [];
        for (const f of meta.files || []) {
          const res = await cache.match(f.key);
          if (res) shared.push(new File([await res.blob()], f.name || 'file', { type: f.type || '' }));
        }
        await caches.delete(SHARE_CACHE);
        if (/[?&]shared=1/.test(window.location.search)) window.history.replaceState(window.history.state, '', '/chat');
        if (Date.now() - (meta.at || 0) > 60 * 60 * 1000) return; // ghante bhar purana share: chhod do
        if (shared.length) addFiles(shared);
        if (meta.text) setText(prev => prev || meta.text);
        if (shared.length || meta.text) {
          setActiveId(null);
          setView('chats');
          toast.success(shared.length ? `${shared.length} file${shared.length > 1 ? 's' : ''} ready. Pick a chat to send.` : 'Pick a chat to send it.');
        }
      } catch { /* share nahi mila: kuch nahi */ }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // ---------------- KHULI CHAT KE MESSAGE ----------------
  const markRead = useCallback((id) => {
    axios.post(`${api}/conversations/${id}/read`, {}, { headers }).catch(() => {});
    setConversations(prev => prev.map(c => (String(c._id) === String(id) ? { ...c, unread: 0 } : c)));
  }, [api, headers]);

  const applyMeta = (data) => {
    setReads(data.reads || []);
    setPeer({ seenAt: data.otherSeenAt, online: data.otherOnline });
    if (data.serverTime) lastSyncRef.current = data.serverTime;
  };

  // Chat khulte hi aakhri 40 message
  useEffect(() => {
    if (!open || !activeId) return undefined;
    let cancelled = false;
    setMessages([]); setHasMore(false); setLoadingMessages(true); setShowInfo(false); setEditGroup(null); setMenuFor(null); setInfo(null);
    lastSyncRef.current = null;
    axios.get(`${api}/conversations/${activeId}/messages`, { headers, params: { limit: 40 } })
      .then(res => {
        if (cancelled) return;
        setMessages(res.data.messages || []);
        setHasMore(!!res.data.hasMore);
        applyMeta(res.data);
        nearBottomRef.current = true;
        markRead(activeId);
      })
      .catch(error => { if (!cancelled) toast.error(error.response?.data?.message || 'Could not open the chat'); })
      .finally(() => { if (!cancelled) setLoadingMessages(false); });
    return () => { cancelled = true; };
  }, [open, activeId, api, headers, markRead]);

  // Har 3 second: sirf naye (aur beech me delete hue) message
  useEffect(() => {
    if (!open || !activeId) return undefined;
    const timer = setInterval(async () => {
      if (document.hidden || !lastSyncRef.current) return;
      try {
        const res = await axios.get(`${api}/conversations/${activeId}/messages`, { headers, params: { after: lastSyncRef.current } });
        const incoming = res.data.messages || [];
        applyMeta(res.data);
        if (incoming.length) {
          setMessages(prev => {
            const byId = new Map(prev.map(m => [String(m._id), m]));
            incoming.forEach(m => byId.set(String(m._id), m));
            return [...byId.values()].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
          });
          if (incoming.some(m => String(m.sender) !== me)) markRead(activeId);
        }
      } catch { /* agli baar */ }
    }, POLL_MESSAGES);
    return () => clearInterval(timer);
  }, [open, activeId, api, headers, me, markRead]);

  // Naya message aaye toh neeche scroll (agar user pehle se neeche tha)
  const stickToBottom = useCallback(() => {
    const box = scrollRef.current;
    if (box && nearBottomRef.current) box.scrollTop = box.scrollHeight;
  }, []);
  useLayoutEffect(() => {
    stickToBottom();
    // Agle frame me dobara: tab tak screen poori ban chuki hoti hai
    const frame = requestAnimationFrame(stickToBottom);
    return () => cancelAnimationFrame(frame);
  }, [messages, loadingMessages, stickToBottom]);

  // 🔴 Chat khulte hi AAKHRI message dikhe: photo / video baad me load hokar lambai badhati hain,
  // isliye jab bhi andar ki lambai badle aur user neeche hi tha, phir se neeche le jao (beech me na ruke)
  useEffect(() => {
    const box = scrollRef.current;
    if (!box || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(stickToBottom);
    observer.observe(box);
    Array.from(box.children).forEach(child => observer.observe(child));
    return () => observer.disconnect();
  }, [messages, activeId, stickToBottom]);

  const onScroll = async () => {
    const box = scrollRef.current;
    if (!box) return;
    nearBottomRef.current = box.scrollHeight - box.scrollTop - box.clientHeight < 80;
    // Sabse upar pahunche toh purane message
    if (box.scrollTop < 40 && hasMore && !loadingMessages && messages.length) {
      setLoadingMessages(true);
      const heightBefore = box.scrollHeight;
      try {
        const res = await axios.get(`${api}/conversations/${activeId}/messages`, { headers, params: { before: messages[0].createdAt, limit: 40 } });
        setMessages(prev => [...(res.data.messages || []), ...prev]);
        setHasMore(!!res.data.hasMore);
        requestAnimationFrame(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight - heightBefore; });
      } catch { /* chhod do */ } finally { setLoadingMessages(false); }
    }
  };

  // ---------------- BHEJNA / DELETE ----------------
  // Ek message: sirf text, ya file (+ caption). File browser se seedha storage par jaati hai, phir message me uska link.
  const deliver = async (chatId, body, item) => {
    const clientId = newClientId();
    const localFile = item ? { url: item.preview, name: item.file.name, size: item.file.size, contentType: item.file.type, kind: item.kind } : undefined;
    const temp = { _id: `temp-${clientId}`, clientId, sender: me, senderName: user.name, text: body, attachment: localFile, createdAt: new Date().toISOString(), pending: true };
    setMessages(prev => [...prev, temp]);
    try {
      let attachment;
      // Server batata hai file kahan jayegi: 'local' = isi computer par (backend), 'blob' = Vercel Blob
      if (item && !fileModeRef.current) {
        try { fileModeRef.current = (await axios.get(`${api}/files/config`, { headers })).data.mode; } catch { fileModeRef.current = 'blob'; }
      }
      if (item && fileModeRef.current === 'none') throw new Error('File sending is not set up on the server yet (storage token missing).');
      if (item && fileModeRef.current === 'local') {
        setUploadPct(0);
        const res = await axios.post(`${api}/conversations/${chatId}/file`, item.file, {
          headers: { ...headers, 'Content-Type': item.file.type, 'X-File-Name': encodeURIComponent(item.file.name) },
          onUploadProgress: (e) => setUploadPct(Math.min(100, Math.round((e.loaded * 100) / (e.total || item.file.size))))
        });
        attachment = { url: res.data.url, pathname: res.data.pathname, name: item.file.name, size: item.file.size, contentType: item.file.type };
      } else if (item) {
        setUploadPct(0);
        const safeName = item.file.name.replace(/[^\w.-]+/g, '_').slice(-80) || 'file';
        const blob = await upload(`chat/${chatId}/${safeName}`, item.file, {
          access: 'public',
          handleUploadUrl: `${api}/upload`,
          clientPayload: String(chatId),
          headers,
          contentType: item.file.type,
          multipart: item.file.size > 8 * 1024 * 1024, // badi file tukdon me (beech me net ruke toh bhi theek)
          onUploadProgress: ({ percentage }) => setUploadPct(Math.round(percentage))
        });
        attachment = { url: blob.url, pathname: blob.pathname, name: item.file.name, size: item.file.size, contentType: item.file.type };
      }
      const res = await axios.post(`${api}/conversations/${chatId}/messages`, { text: body, clientId, attachment }, { headers });
      setMessages(prev => prev.map(m => (m._id === temp._id ? res.data : m)));
      const preview = attachment ? filePreviewText(res.data.attachment || localFile, body) : body;
      setConversations(prev => {
        const updated = prev.map(c => (String(c._id) === String(chatId) ? { ...c, lastMessage: { text: preview, sender: me, senderName: user.name, at: res.data.createdAt } } : c));
        return updated.sort((a, b) => new Date(b.lastMessage?.at || b.updatedAt) - new Date(a.lastMessage?.at || a.updatedAt));
      });
    } catch (error) {
      setMessages(prev => prev.map(m => (m._id === temp._id ? { ...m, pending: false, failed: true } : m)));
      // Token na milna = server par file storage set nahi (BLOB_READ_WRITE_TOKEN) ya login khatam
      const tokenIssue = /client token/i.test(error.message || '');
      toast.error(error.response?.data?.message
        || (tokenIssue ? 'File sending is not set up on the server yet (storage token missing). Please ask the admin.'
          : item ? `${item.file.name}: could not send the file. ${error.message || ''}` : 'Message not sent'), { duration: 6000 });
    } finally {
      if (item) setUploadPct(null);
    }
  };

  const send = async () => {
    const body = text.trim();
    if ((!body && files.length === 0) || !activeId || sending) return;
    const chatId = activeId;
    const queue = files;
    setText('');
    setFiles([]);
    nearBottomRef.current = true;
    setSending(true);
    try {
      if (queue.length === 0) await deliver(chatId, body, null);
      // Kai files: ek-ek karke, caption aakhri file ke saath
      else for (let i = 0; i < queue.length; i += 1) await deliver(chatId, i === queue.length - 1 ? body : '', queue[i]);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const removeMessage = async (message) => {
    setMenuFor(null);
    if (!window.confirm('Delete this message for everyone?')) return;
    try {
      await axios.delete(`${api}/messages/${message._id}`, { headers });
      setMessages(prev => prev.map(m => (m._id === message._id ? { ...m, deletedAt: new Date().toISOString(), text: '', attachment: undefined } : m)));
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not delete');
    }
  };

  // ---------------- EMOJI / INFO / COPY / DELETE CHAT ----------------
  // Reaction: wahi emoji dobara = hatao, doosra = badlo (screen par turant, server par peeche se)
  const react = async (message, emoji) => {
    setMenuFor(null);
    const before = message.reactions || [];
    const mineNow = before.find(r => String(r.user) === me);
    const next = mineNow && mineNow.emoji === emoji
      ? before.filter(r => String(r.user) !== me)
      : [...before.filter(r => String(r.user) !== me), { user: me, name: user.name, emoji }];
    setMessages(prev => prev.map(m => (m._id === message._id ? { ...m, reactions: next } : m)));
    try {
      const res = await axios.post(`${api}/messages/${message._id}/react`, { emoji }, { headers });
      setMessages(prev => prev.map(m => (m._id === message._id ? { ...m, reactions: res.data.reactions } : m)));
      if (res.data.lastMessage) {
        setConversations(prev => prev
          .map(c => (String(c._id) === String(activeId) ? { ...c, lastMessage: res.data.lastMessage.at ? res.data.lastMessage : null } : c))
          .sort((a, b) => new Date(b.lastMessage?.at || b.updatedAt) - new Date(a.lastMessage?.at || a.updatedAt)));
      }
    } catch (error) {
      setMessages(prev => prev.map(m => (m._id === message._id ? { ...m, reactions: before } : m)));
      toast.error(error.response?.data?.message || 'Could not react');
    }
  };

  const openInfo = async (message) => {
    setMenuFor(null);
    setInfo({ message, loading: true, data: null });
    try {
      const res = await axios.get(`${api}/messages/${message._id}/info`, { headers });
      setInfo({ message, loading: false, data: res.data });
    } catch (error) {
      setInfo(null);
      toast.error(error.response?.data?.message || 'Could not load message info');
    }
  };

  const copyMessage = async (message) => {
    setMenuFor(null);
    // Sirf file ho toh uska link copy
    const value = message.text || message.attachment?.url || '';
    try { await navigator.clipboard.writeText(value); toast.success(message.text ? 'Message copied' : 'File link copied'); } catch { toast.error('Could not copy'); }
  };

  // "Delete chat": sirf mere liye purane message hat jaate hain; doosron ki chat waisi hi rehti hai
  const deleteChat = async () => {
    if (!active) return;
    if (!window.confirm(`Delete this chat with ${active.name}?\n\nAll messages will be removed for you only. Others will still see them. If someone sends a new message, the chat comes back.`)) return;
    try {
      await axios.post(`${api}/conversations/${activeId}/clear`, {}, { headers });
      setConversations(prev => prev.filter(c => String(c._id) !== String(activeId)));
      setActiveId(null);
      toast.success('Chat deleted');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not delete the chat');
    }
  };

  // ---------------- NAYI CHAT / GROUP ----------------
  const loadContacts = async () => {
    try {
      const res = await axios.get(`${api}/users`, { headers });
      setContacts(res.data || []);
    } catch { toast.error('Could not load the team list'); }
  };
  const openContacts = (mode) => { setView(mode); setSearch(''); loadContacts(); if (mode === 'group') setGroupForm({ name: '', members: [] }); };

  const startDirect = async (person) => {
    try {
      const res = await axios.post(`${api}/conversations/direct`, { userId: person._id }, { headers });
      setConversations(prev => (prev.some(c => String(c._id) === String(res.data._id)) ? prev : [res.data, ...prev]));
      setActiveId(res.data._id);
      setView('chats'); setSearch('');
    } catch (error) { toast.error(error.response?.data?.message || 'Could not start the chat'); }
  };

  const createGroup = async () => {
    if (!groupForm.name.trim()) return toast.error('Please give the group a name');
    if (groupForm.members.length === 0) return toast.error('Select at least one member');
    try {
      const res = await axios.post(`${api}/conversations/group`, { name: groupForm.name.trim(), memberIds: groupForm.members }, { headers });
      setConversations(prev => [res.data, ...prev]);
      setActiveId(res.data._id);
      setView('chats'); setSearch('');
      toast.success('Group created');
    } catch (error) { toast.error(error.response?.data?.message || 'Could not create the group'); }
  };

  const saveGroup = async () => {
    try {
      const res = await axios.put(`${api}/conversations/${activeId}`, { name: editGroup.name, memberIds: editGroup.members }, { headers });
      setConversations(prev => prev.map(c => (String(c._id) === String(res.data._id) ? { ...res.data, unread: c.unread } : c)));
      setEditGroup(null);
      toast.success('Group updated');
    } catch (error) { toast.error(error.response?.data?.message || 'Could not update the group'); }
  };

  const leave = async () => {
    if (!window.confirm(`Leave the group "${active?.name}"?`)) return;
    try {
      await axios.post(`${api}/conversations/${activeId}/leave`, {}, { headers });
      setConversations(prev => prev.filter(c => String(c._id) !== String(activeId)));
      setActiveId(null);
      toast.success('You left the group');
    } catch (error) { toast.error(error.response?.data?.message || 'Could not leave'); }
  };

  // ---------------- TICK (✓ / ✓✓) ----------------
  const tickFor = (message) => {
    if (message.failed) return <span className="text-[10px] font-bold text-rose-500">Not sent</span>;
    if (message.pending) return <Loader2 size={11} className="animate-spin text-slate-400" />;
    const others = (active?.members?.length || 2) - 1;
    const readers = reads.filter(r => r.at && new Date(r.at) >= new Date(message.createdAt)).length;
    return readers >= others && others > 0 ? <CheckCheck size={14} className="text-sky-500" /> : <Check size={14} className="text-slate-400" />;
  };

  if (!open) return null;

  const term = search.trim().toLowerCase();
  const shownConversations = conversations.filter(c => !term || c.name.toLowerCase().includes(term));
  const shownContacts = contacts.filter(p => !term || `${p.name} ${p.role} ${p.empId || ''}`.toLowerCase().includes(term));

  // Message ko din ke hisaab se group karna (Today / Yesterday / date)
  const grouped = [];
  messages.forEach(m => {
    const key = istDateKey(m.createdAt);
    if (!grouped.length || grouped[grouped.length - 1].key !== key) grouped.push({ key, items: [] });
    grouped[grouped.length - 1].items.push(m);
  });

  const listPane = (
    <div className={`flex flex-col border-r border-slate-200 bg-white w-full md:w-[330px] shrink-0 ${activeId ? 'hidden md:flex' : 'flex'}`}>
      {/* Header */}
      <div className="h-16 px-4 flex items-center justify-between gap-2 border-b border-slate-100 bg-slate-50 shrink-0">
        {view === 'chats' ? (
          <>
            <h2 className="text-lg font-black text-slate-800 flex items-center gap-2"><MessageCircle size={20} className="text-emerald-600" /> Team Chat</h2>
            <div className="flex items-center gap-1">
              <button onClick={() => openContacts('group')} className="p-2 rounded-full text-slate-500 hover:bg-slate-200" title="New group"><Users size={18} /></button>
              <button onClick={() => openContacts('contacts')} className="p-2 rounded-full text-slate-500 hover:bg-slate-200" title="New chat"><Plus size={19} /></button>
              {/* Chat page band karke pichhle page par */}
              <button onClick={onClose} className={`ml-1 inline-flex items-center gap-1 pl-2 pr-2.5 py-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white text-xs font-bold transition-colors ${embedded ? '' : 'md:hidden'}`} title="Close Team Chat and go back"><X size={14} strokeWidth={2.5} /> Close</button>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <button onClick={() => { setView('chats'); setSearch(''); }} className="p-2 rounded-full text-slate-500 hover:bg-slate-200"><ArrowLeft size={18} /></button>
            <h2 className="text-base font-black text-slate-800">{view === 'group' ? 'New Group' : 'New Chat'}</h2>
          </div>
        )}
      </div>

      <div className="p-3 border-b border-slate-100 shrink-0 space-y-2">
        {/* Phone ke Share se aayi (ya chuni hui) files: kisi chat par dabao, wahan bhejne ke liye taiyaar */}
        {view === 'chats' && !activeId && files.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200">
            <Paperclip size={15} className="text-emerald-700 shrink-0" />
            <p className="flex-1 text-xs font-bold text-emerald-800">{files.length} file{files.length > 1 ? 's' : ''} ready. Tap a chat to send.</p>
            <button onClick={() => { files.forEach(f => URL.revokeObjectURL(f.preview)); setFiles([]); }} className="text-[11px] font-bold text-slate-500 hover:text-rose-600">Cancel</button>
          </div>
        )}
        {view === 'group' && (
          <input type="text" autoFocus maxLength={60} value={groupForm.name} onChange={(e) => setGroupForm(prev => ({ ...prev, name: e.target.value }))} placeholder="Group name * (e.g. GST Team)" className={`w-full px-3 py-2 text-sm font-semibold border rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 ${groupForm.name.trim() ? 'bg-white border-slate-200' : 'bg-amber-50 border-amber-300'}`} />
        )}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={view === 'chats' ? 'Search chats' : 'Search people'} className="w-full pl-9 pr-3 py-2 text-sm bg-slate-100 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {view === 'chats' ? (
          !listLoaded ? (
            <div className="py-10 flex justify-center"><Loader2 className="animate-spin text-slate-400" /></div>
          ) : shownConversations.length === 0 ? (
            <div className="p-8 text-center">
              <MessageCircle size={36} className="mx-auto text-slate-200 mb-2" />
              <p className="text-sm font-bold text-slate-500">{term ? 'No chat found' : 'No chats yet'}</p>
              {!term && <button onClick={() => openContacts('contacts')} className="mt-3 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-xl">Start a chat</button>}
            </div>
          ) : shownConversations.map(c => {
            const isActive = String(c._id) === String(activeId);
            const mineLast = c.lastMessage && String(c.lastMessage.sender) === me;
            return (
              <button key={c._id} onClick={() => setActiveId(c._id)} className={`w-full px-3 py-2.5 flex items-center gap-3 text-left border-b border-slate-50 transition-colors ${isActive ? 'bg-emerald-50' : 'hover:bg-slate-50'}`}>
                <Avatar id={c.other?._id || c._id} name={c.name} group={c.type === 'group'} online={c.other?.online} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-slate-800 truncate">{c.name}</p>
                    <span className={`text-[10px] font-semibold shrink-0 ${c.unread ? 'text-emerald-600' : 'text-slate-400'}`}>{shortTime(c.lastMessage?.at || c.updatedAt)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-xs truncate ${c.unread ? 'font-bold text-slate-700' : 'text-slate-500'}`}>
                      {c.lastMessage?.reaction
                        ? `${mineLast ? 'You' : (c.lastMessage.senderName || '').split(' ')[0]} reacted ${c.lastMessage.reaction} to "${c.lastMessage.text}"`
                        : c.lastMessage ? `${mineLast ? 'You: ' : c.type === 'group' && c.lastMessage.senderName ? `${c.lastMessage.senderName.split(' ')[0]}: ` : ''}${c.lastMessage.text}` : (c.type === 'group' ? `${c.members.length} members` : c.other?.role || 'Say hello 👋')}
                    </p>
                    {c.unread > 0 && <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-emerald-500 text-white text-[10px] font-black flex items-center justify-center shrink-0">{c.unread > 99 ? '99+' : c.unread}</span>}
                  </div>
                </div>
              </button>
            );
          })
        ) : (
          <>
            {view === 'group' && groupForm.members.length > 0 && (
              <p className="px-4 pt-3 text-[11px] font-bold text-emerald-700">{groupForm.members.length} selected</p>
            )}
            {shownContacts.length === 0 ? (
              <p className="p-8 text-center text-sm font-semibold text-slate-400">No one found</p>
            ) : shownContacts.map(person => {
              const picked = groupForm.members.includes(String(person._id));
              return (
                <button key={person._id}
                  onClick={() => (view === 'contacts' ? startDirect(person) : setGroupForm(prev => ({ ...prev, members: picked ? prev.members.filter(id => id !== String(person._id)) : [...prev.members, String(person._id)] })))}
                  className={`w-full px-3 py-2.5 flex items-center gap-3 text-left border-b border-slate-50 transition-colors ${picked ? 'bg-emerald-50' : 'hover:bg-slate-50'}`}>
                  <Avatar id={person._id} name={person.name} online={person.online} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-800 truncate">{person.name}</p>
                    <p className="text-[11px] text-slate-500 truncate">{person.role}{person.empId ? ` · ${person.empId}` : ''} · {lastSeenText(person.seenAt, person.online)}</p>
                  </div>
                  {view === 'group' && <span className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 ${picked ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300'}`}>{picked && <Check size={12} strokeWidth={3} />}</span>}
                </button>
              );
            })}
          </>
        )}
      </div>

      {view === 'group' && (
        <div className="p-3 border-t border-slate-100 shrink-0">
          {/* Kya bharna baaki hai wo button ke upar hi likha aata hai */}
          {(!groupForm.name.trim() || groupForm.members.length === 0) && (
            <p className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1.5 mb-2">
              {!groupForm.name.trim() ? 'Type a group name at the top to create the group.' : 'Select at least one person.'}
            </p>
          )}
          <button onClick={createGroup} disabled={!groupForm.name.trim() || groupForm.members.length === 0} className="w-full py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-xl flex items-center justify-center gap-2"><Users size={16} /> Create Group{groupForm.members.length ? ` (${groupForm.members.length + 1} people)` : ''}</button>
        </div>
      )}
    </div>
  );

  const chatPane = !active ? (
    <div className="hidden md:flex flex-1 flex-col items-center justify-center bg-[#f0f2f5] text-center p-8">
      <span className="h-20 w-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4"><MessageCircle size={36} /></span>
      <p className="text-lg font-black text-slate-700">TaxBucket Team Chat</p>
      <p className="text-sm text-slate-500 mt-1 max-w-sm">Pick a chat on the left, or press + to message anyone in the team. Use the group button to talk to many people together.</p>
    </div>
  ) : (
    <div className="flex-1 flex flex-col min-w-0 bg-[#efeae2]">
      {/* Chat header */}
      <div className="h-16 px-3 md:px-4 flex items-center gap-3 bg-slate-50 border-b border-slate-200 shrink-0">
        <button onClick={() => setActiveId(null)} className="p-1.5 rounded-full text-slate-500 hover:bg-slate-200 md:hidden"><ArrowLeft size={19} /></button>
        <Avatar id={active.other?._id || active._id} name={active.name} group={active.type === 'group'} online={active.type === 'direct' && peer.online} />
        <button onClick={() => setShowInfo(prev => !prev)} className="min-w-0 flex-1 text-left">
          <p className="text-sm font-black text-slate-800 truncate">{active.name}</p>
          <p className={`text-[11px] truncate ${active.type === 'direct' && peer.online ? 'text-emerald-600 font-bold' : 'text-slate-500'}`}>
            {active.type === 'group' ? active.members.map(m => (String(m._id) === me ? 'You' : m.name.split(' ')[0])).join(', ') : `${active.other?.role || ''}${active.other?.role ? ' · ' : ''}${lastSeenText(peer.seenAt, peer.online)}`}
          </p>
        </button>
        <button onClick={() => setShowInfo(prev => !prev)} className="p-2 rounded-full text-slate-500 hover:bg-slate-200" title="Chat info"><Info size={18} /></button>
        <button onClick={() => (embedded ? setActiveId(null) : onClose())} className="hidden md:block p-2 rounded-full text-slate-500 hover:bg-slate-200" title="Close this chat"><X size={19} /></button>
      </div>

      {/* Group / person info */}
      {showInfo && (
        <div className="bg-white border-b border-slate-200 p-4 max-h-[45%] overflow-y-auto custom-scrollbar shrink-0">
          {active.type === 'direct' ? (
            <div className="text-sm text-slate-600 space-y-1">
              <p className="font-black text-slate-800">{active.other?.name}</p>
              <p>{active.other?.role}{active.other?.empId ? ` · ${active.other.empId}` : ''}</p>
              <p className="text-xs text-slate-400">{lastSeenText(peer.seenAt, peer.online)}</p>
              <button onClick={deleteChat} className="mt-2 inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg"><Trash2 size={12} /> Delete chat</button>
            </div>
          ) : editGroup ? (
            <div className="space-y-3">
              <input type="text" maxLength={60} value={editGroup.name} onChange={(e) => setEditGroup(prev => ({ ...prev, name: e.target.value }))} className="w-full px-3 py-2 text-sm font-semibold border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20" />
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Members</p>
              <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-1">
                {contacts.map(person => {
                  const picked = editGroup.members.includes(String(person._id));
                  return (
                    <button key={person._id} onClick={() => setEditGroup(prev => ({ ...prev, members: picked ? prev.members.filter(id => id !== String(person._id)) : [...prev.members, String(person._id)] }))} className={`w-full px-2 py-1.5 rounded-lg flex items-center gap-2 text-left text-sm ${picked ? 'bg-emerald-50' : 'hover:bg-slate-50'}`}>
                      <span className={`h-4 w-4 rounded border-2 flex items-center justify-center ${picked ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300'}`}>{picked && <Check size={10} strokeWidth={3} />}</span>
                      <span className="font-semibold text-slate-700 truncate">{person.name}</span>
                      <span className="text-[11px] text-slate-400 truncate">{person.role}</span>
                    </button>
                  );
                })}
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setEditGroup(null)} className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg">Cancel</button>
                <button onClick={saveGroup} className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg">Save</button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-black text-slate-800">{active.name} · {active.members.length} members</p>
                <div className="flex items-center gap-1">
                  {active.isAdmin && <button onClick={() => { loadContacts(); setEditGroup({ name: active.name, members: active.members.map(m => String(m._id)).filter(id => id !== me) }); }} className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg"><Pencil size={12} /> Edit</button>}
                  <button onClick={deleteChat} className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg" title="Remove all messages for you only"><Trash2 size={12} /> Delete chat</button>
                  <button onClick={leave} className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg"><LogOut size={12} /> Leave</button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {active.members.map(m => (
                  <span key={m._id} className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-1 rounded-full">
                    {String(m._id) === me ? 'You' : m.name}
                    {(active.admins || []).some(a => String(a) === String(m._id)) && <span className="text-[9px] font-black uppercase text-emerald-700">admin</span>}
                  </span>
                ))}
              </div>
              {active.isAdmin && <p className="text-[11px] text-slate-400 flex items-center gap-1"><UserPlus size={12} /> As admin you can rename the group and add or remove people.</p>}
            </div>
          )}
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} onScroll={onScroll} className="flex-1 overflow-y-auto custom-scrollbar px-3 md:px-8 py-4 space-y-1">
        {loadingMessages && messages.length === 0 && <div className="py-10 flex justify-center"><Loader2 className="animate-spin text-slate-500" /></div>}
        {loadingMessages && messages.length > 0 && <div className="flex justify-center py-1"><Loader2 size={16} className="animate-spin text-slate-500" /></div>}
        {!loadingMessages && messages.length === 0 && (
          <div className="flex justify-center py-10"><span className="text-xs font-semibold text-slate-600 bg-white/80 px-3 py-1.5 rounded-lg shadow-sm">No messages yet. Say hello 👋</span></div>
        )}
        {grouped.map(group => (
          <div key={group.key} className="space-y-1">
            <div className="flex justify-center py-2"><span className="text-[11px] font-bold text-slate-600 bg-white/90 px-3 py-1 rounded-lg shadow-sm">{dayLabel(group.key)}</span></div>
            {group.items.map((m, index) => {
              if (m.kind === 'system') {
                return <div key={m._id} className="flex justify-center"><span className="text-[11px] font-semibold text-slate-600 bg-amber-50 border border-amber-100 px-3 py-1 rounded-lg">{m.text}</span></div>;
              }
              const mine = String(m.sender) === me;
              const prev = group.items[index - 1];
              const showName = active.type === 'group' && !mine && (!prev || String(prev.sender) !== String(m.sender) || prev.kind === 'system');
              const canAct = !m.deletedAt && !m.pending && !m.failed;
              // Ek jaise emoji ek saath: 👍 3
              const reactionGroups = Object.values((m.reactions || []).reduce((acc, r) => {
                (acc[r.emoji] = acc[r.emoji] || { emoji: r.emoji, names: [], mine: false }).names.push(String(r.user) === me ? 'You' : r.name);
                if (String(r.user) === me) acc[r.emoji].mine = true;
                return acc;
              }, {}));
              const menuOpen = menuFor === m._id;
              return (
                <div key={m._id} data-bubble className={`group flex ${mine ? 'justify-end' : 'justify-start'} ${reactionGroups.length ? 'mb-4' : ''}`}>
                  <div data-msg className={`relative max-w-[78%] md:max-w-[65%] rounded-xl px-3 pt-1.5 pb-1 shadow-sm ${mine ? 'bg-[#d9fdd3] rounded-tr-sm' : 'bg-white rounded-tl-sm'}`}>
                    {showName && <p className={`text-[11px] font-black mb-0.5 pr-5 ${colorFor(m.sender).split(' ')[1]}`}>{m.senderName}</p>}
                    {m.deletedAt ? (
                      <p className="text-[13px] italic text-slate-400 pr-12">🚫 This message was deleted</p>
                    ) : (
                      <>
                        {m.attachment?.url && <AttachmentView a={m.attachment} pending={m.pending} pct={m.pending ? uploadPct : null} expiresAt={m.expiresAt} onOpen={(a) => setViewer({ ...a, senderName: mine ? 'You' : m.senderName, at: m.createdAt })} />}
                        {m.text
                          ? <p className="text-[13.5px] text-slate-800 whitespace-pre-wrap break-words pr-14 leading-snug">{m.text}</p>
                          : m.attachment?.url && <div className="h-3.5"></div>}
                      </>
                    )}
                    <span className="absolute bottom-1 right-2 flex items-center gap-1 text-[10px] text-slate-500">
                      {formatIstTime(m.createdAt)}
                      {mine && !m.deletedAt && tickFor(m)}
                    </span>

                    {/* ⋮ MENU: message par mouse le jao (phone par halka hamesha dikhta hai) */}
                    {canAct && (
                      <button
                        onClick={(e) => { e.stopPropagation(); if (menuOpen) setMenuFor(null); else openMenu(e, m._id, mine); }}
                        className={`absolute top-1 right-1 h-6 w-6 rounded-full flex items-center justify-center text-slate-500 transition-opacity ${mine ? 'bg-[#d9fdd3]' : 'bg-white'} ${menuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-60'} hover:text-slate-800`}
                        title="Message options"
                      >
                        <ChevronDown size={15} />
                      </button>
                    )}
                    {menuOpen && createPortal(
                      <>
                        <div className="fixed inset-0 z-[95]" onClick={() => setMenuFor(null)}></div>
                        <div ref={menuRef} style={menuStyle || { top: 0, left: 0, visibility: 'hidden' }} className="fixed z-[96] w-56 bg-white rounded-xl shadow-2xl border border-slate-200 py-1.5">
                          <div className="flex items-center justify-between px-2 pb-1.5 mb-1 border-b border-slate-100">
                            {REACTIONS.map(emoji => (
                              <button key={emoji} onClick={() => react(m, emoji)} className={`h-8 w-8 rounded-full text-lg flex items-center justify-center hover:bg-slate-100 hover:scale-110 transition-transform ${(m.reactions || []).some(r => String(r.user) === me && r.emoji === emoji) ? 'bg-emerald-100' : ''}`} title={`React ${emoji}`}>{emoji}</button>
                            ))}
                          </div>
                          {mine && <button onClick={() => openInfo(m)} className="w-full px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"><Info size={15} className="text-slate-400" /> Message info</button>}
                          {m.attachment?.url && <a href={`${m.attachment.url}?download=1`} download={m.attachment.name} onClick={() => setMenuFor(null)} className="w-full px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"><Download size={15} className="text-slate-400" /> Download</a>}
                          <button onClick={() => copyMessage(m)} className="w-full px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"><Copy size={15} className="text-slate-400" /> {m.text ? 'Copy' : 'Copy link'}</button>
                          {mine && <button onClick={() => removeMessage(m)} className="w-full px-3 py-2 text-left text-sm font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2"><Trash2 size={15} /> Delete for everyone</button>}
                        </div>
                      </>,
                      document.body
                    )}

                    {/* Emoji reactions: kisne kiya wo mouse le jane par; dabane par apna emoji lagao / hatao */}
                    {reactionGroups.length > 0 && (
                      <div className={`absolute -bottom-4 ${mine ? 'right-2' : 'left-2'} flex items-center gap-1`}>
                        {reactionGroups.map(r => (
                          <button key={r.emoji} onClick={() => react(m, r.emoji)} title={r.names.join(', ')} className={`flex items-center gap-0.5 px-1.5 h-6 rounded-full text-[13px] bg-white border shadow-sm ${r.mine ? 'border-emerald-400' : 'border-slate-200'}`}>
                            {r.emoji}{r.names.length > 1 && <span className="text-[10px] font-bold text-slate-500">{r.names.length}</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Jaldi react: bubble ke bagal me smiley (mouse le jane par) */}
                  {canAct && (
                    <button onClick={(e) => openMenu(e, m._id, mine)} className={`self-center mx-1 p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-white/70 opacity-0 group-hover:opacity-100 transition-opacity ${mine ? 'order-first' : ''}`} title="React"><SmilePlus size={16} /></button>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* FILE VIEWER: photo / PDF / video chat ke andar hi badi dikhe (nayi tab nahi). Esc ya ✕ = band */}
      {viewer && (
        <div className="fixed inset-0 z-[90] bg-slate-950/95 flex flex-col animate-in fade-in" onClick={() => setViewer(null)}>
          <div className="h-14 px-3 md:px-5 flex items-center gap-3 text-white shrink-0" onClick={(e) => e.stopPropagation()}>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold truncate">{viewer.name}</p>
              <p className="text-[11px] text-slate-400 truncate">{viewer.senderName} · {shortTime(viewer.at)}{istDateKey(viewer.at) === istToday() ? '' : `, ${formatIstTime(viewer.at)}`} · {formatSize(viewer.size)}</p>
            </div>
            <a href={`${viewer.url}?download=1`} download={viewer.name} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold" title="Download"><Download size={15} /> <span className="hidden sm:inline">Download</span></a>
            <button onClick={() => setViewer(null)} className="h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center" title="Close (Esc)"><X size={18} /></button>
          </div>
          <div className="flex-1 min-h-0 flex items-center justify-center p-2 md:p-6">
            {viewer.kind === 'image' && <img src={viewer.url} alt={viewer.name} className="max-h-full max-w-full object-contain rounded-lg shadow-2xl" onClick={(e) => e.stopPropagation()} />}
            {viewer.kind === 'video' && <video src={viewer.url} controls autoPlay playsInline className="max-h-full max-w-full rounded-lg bg-black shadow-2xl" onClick={(e) => e.stopPropagation()} />}
            {viewer.kind === 'pdf' && (/Android/i.test(navigator.userAgent) ? (
              // Android Chrome page ke andar PDF nahi dikha pata: download ka saaf button
              <div className="bg-white rounded-2xl p-6 text-center max-w-xs" onClick={(e) => e.stopPropagation()}>
                <span className="mx-auto h-14 w-12 rounded-lg bg-rose-500 text-white text-xs font-black flex items-center justify-center mb-3">PDF</span>
                <p className="text-sm font-bold text-slate-800 break-words">{viewer.name}</p>
                <p className="text-xs text-slate-500 mt-1 mb-4">This phone cannot show PDFs inside the page. Download it to view.</p>
                <a href={`${viewer.url}?download=1`} download={viewer.name} className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold"><Download size={16} /> Download PDF</a>
              </div>
            ) : (
              <iframe src={viewer.url} title={viewer.name} className="w-full h-full max-w-5xl bg-white rounded-lg shadow-2xl" onClick={(e) => e.stopPropagation()} />
            ))}
          </div>
        </div>
      )}

      {/* MESSAGE INFO: kisne padha (kab), kisne abhi nahi */}
      {info && (
        <div className="fixed inset-0 z-[80] bg-slate-900/40 flex items-center justify-center p-4" onClick={() => setInfo(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm max-h-[80vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <p className="text-sm font-black text-slate-800">Message info</p>
              <button onClick={() => setInfo(null)} className="p-1.5 rounded-full text-slate-400 hover:bg-slate-100"><X size={16} /></button>
            </div>
            <div className="p-4 bg-[#efeae2]">
              <div className="ml-auto max-w-[90%] w-fit bg-[#d9fdd3] rounded-xl rounded-tr-sm px-3 py-2 shadow-sm">
                <p className="text-[13px] text-slate-800 whitespace-pre-wrap break-words">{info.message.attachment?.url ? filePreviewText(info.message.attachment, info.message.text) : info.message.text}</p>
                <p className="text-[10px] text-slate-500 text-right mt-0.5">{formatIstTime(info.message.createdAt)}</p>
              </div>
            </div>
            <div className="overflow-y-auto custom-scrollbar p-4 space-y-4">
              {info.loading ? (
                <div className="py-6 flex justify-center"><Loader2 className="animate-spin text-slate-400" /></div>
              ) : (
                <>
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-wider text-sky-600 flex items-center gap-1.5 mb-2"><CheckCheck size={14} /> Read by ({info.data.readBy.length})</p>
                    {info.data.readBy.length === 0 ? <p className="text-xs text-slate-400">No one has read it yet.</p> : info.data.readBy.map(r => (
                      <div key={r._id} className="flex items-center gap-2.5 py-1.5">
                        <Avatar id={r._id} name={r.name} size="h-8 w-8" />
                        <div className="min-w-0 flex-1"><p className="text-sm font-bold text-slate-700 truncate">{r.name}</p><p className="text-[11px] text-slate-400">{r.role}</p></div>
                        <span className="text-[11px] font-semibold text-slate-500 text-right shrink-0">{shortTime(r.at)}{istDateKey(r.at) === istToday() ? '' : `, ${formatIstTime(r.at)}`}</span>
                      </div>
                    ))}
                  </div>
                  {info.data.notRead.length > 0 && (
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5 mb-2"><Check size={14} /> Sent, not read yet ({info.data.notRead.length})</p>
                      {info.data.notRead.map(r => (
                        <div key={r._id} className="flex items-center gap-2.5 py-1.5">
                          <Avatar id={r._id} name={r.name} size="h-8 w-8" />
                          <div className="min-w-0 flex-1"><p className="text-sm font-bold text-slate-700 truncate">{r.name}</p><p className="text-[11px] text-slate-400">{r.role}</p></div>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-[11px] text-slate-400">Sent {shortTime(info.data.sentAt)}{istDateKey(info.data.sentAt) === istToday() ? '' : `, ${formatIstTime(info.data.sentAt)}`}</p>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Chuni hui files: chhota preview, X = hatao */}
      {files.length > 0 && (
        <div className="px-3 pt-2.5 bg-slate-50 border-t border-slate-200 shrink-0">
          <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1.5">
            {files.map(f => (
              <div key={f.id} className="relative h-16 w-16 shrink-0 rounded-lg overflow-hidden border border-slate-200 bg-white">
                {f.kind === 'image' ? <img src={f.preview} alt={f.file.name} className="h-full w-full object-cover" />
                  : f.kind === 'video' ? <video src={f.preview} muted preload="metadata" className="h-full w-full object-cover bg-black" />
                    : <div className="h-full w-full flex flex-col items-center justify-center p-1"><FileText size={20} className="text-rose-500" /><span className="text-[9px] font-semibold text-slate-600 truncate w-full text-center">{f.file.name}</span></div>}
                <span className="absolute bottom-0 inset-x-0 text-[9px] font-bold text-white bg-slate-900/60 text-center">{formatSize(f.file.size)}</span>
                {!sending && <button onClick={() => removeFile(f.id)} className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full bg-slate-900/70 text-white flex items-center justify-center" title="Remove"><X size={11} /></button>}
              </div>
            ))}
          </div>
          <p className="text-[10px] font-semibold text-slate-500 pb-0.5">Max 50 MB per file. Files are deleted automatically after 24 hours.</p>
        </div>
      )}

      {/* Likhne ka box: Enter = bhejo, Shift + Enter = nayi line. 📎 = photo / video / PDF */}
      <div className={`px-3 py-2.5 bg-slate-50 flex items-end gap-2 shrink-0 ${files.length ? '' : 'border-t border-slate-200'}`}>
        <input ref={fileInputRef} type="file" multiple accept="image/*,video/*,application/pdf,.pdf" className="hidden" onChange={(e) => { addFiles([...e.target.files]); e.target.value = ''; }} />
        <button onClick={() => fileInputRef.current?.click()} disabled={sending} className="h-11 w-11 rounded-full text-slate-500 hover:bg-slate-200 hover:text-slate-800 disabled:opacity-40 flex items-center justify-center shrink-0 transition-colors" title="Send photo, video or PDF (max 50 MB)">
          <Paperclip size={19} />
        </button>
        <textarea
          ref={inputRef}
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          onPaste={(e) => { const pasted = [...(e.clipboardData?.files || [])]; if (pasted.length) { e.preventDefault(); addFiles(pasted); } }}
          placeholder={files.length ? 'Add a caption (optional)' : 'Type a message'}
          maxLength={4000}
          className="flex-1 resize-none max-h-32 px-4 py-2.5 text-sm bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/20"
          style={{ height: 'auto' }}
          onInput={(e) => { e.target.style.height = 'auto'; e.target.style.height = `${Math.min(e.target.scrollHeight, 128)}px`; }}
        />
        <button onClick={send} disabled={(!text.trim() && !files.length) || sending} className="h-11 w-11 rounded-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white flex items-center justify-center shrink-0 transition-colors" title="Send (Enter)">
          {sending && uploadPct != null ? <span className="text-[10px] font-black">{uploadPct}%</span> : <Send size={18} />}
        </button>
      </div>
    </div>
  );

  // Chat page: poori jagah me (popup nahi)
  if (embedded) {
    return (
      <div className="h-full w-full bg-white md:rounded-2xl md:border md:border-slate-200 md:shadow-sm overflow-hidden flex">
        {/* Chat page par koi aur page nahi hota, isliye sandesh (galti / success) dikhane wala yahin */}
        <Toaster position="top-center" />
        {listPane}
        {chatPane}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[70] bg-slate-900/40 backdrop-blur-[1px] flex justify-end" onClick={onClose}>
      <div className="w-full md:w-[min(980px,calc(100vw-2rem))] h-full md:h-[calc(100vh-2rem)] md:my-4 md:mr-4 bg-white md:rounded-2xl shadow-2xl overflow-hidden flex animate-in slide-in-from-right-4" onClick={(e) => e.stopPropagation()}>
        {listPane}
        {chatPane}
      </div>
    </div>
  );
};

export default ChatPanel;
