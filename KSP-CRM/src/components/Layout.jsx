import { useContext, useState, useEffect, useRef, useMemo } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { isAdminRole, isCeoRole } from '../utils/roles';
import { can } from '../utils/permissions';
import {
  LayoutDashboard, Users, UserCircle, Briefcase, LogOut, Menu,
  X, Bell, ChevronDown, ShieldCheck, PhoneCall, CheckCircle2,
  Settings, FileText, CalendarClock, ClipboardList, BriefcaseBusiness, Target,
  Activity, Landmark, Laptop, Megaphone, Wrench, IndianRupee, Receipt, ListTodo,
  AlertCircle, TrendingUp, Code, Globe, Zap, Cake, RotateCwFadingClock, HeartPulse,
  CheckCheck, Trash2, ArrowUpRight, BellOff, Search, Star, ChevronsLeft, ChevronsRight
} from 'lucide-react';

// 🔴 NOTIFICATION KAHAN SE AAYA: har notification ko uska source (tab) dikhate hain.
// Pehle `kind` (backend ka tag) dekhte hain, purani notifications ke liye link / title se andaza.
const NOTIFICATION_SOURCES = [
  { id: 'meeting', label: 'Calendar & Meetings', icon: CalendarClock, chip: 'bg-violet-100 text-violet-700', bar: 'bg-violet-500', match: (n) => n.kind === 'meeting-reminder' },
  { id: 'handover', label: 'Task Handover', icon: RotateCwFadingClock, chip: 'bg-indigo-100 text-indigo-700', bar: 'bg-indigo-500', match: (n) => n.kind?.startsWith('handover') || n.link === '/taskhandover' },
  { id: 'todo', label: 'Success List (To-Do)', icon: ListTodo, chip: 'bg-amber-100 text-amber-700', bar: 'bg-amber-500', match: (n) => n.kind === 'todo-reminder' || n.link === '/todo' || /to-do/i.test(n.title || '') },
  { id: 'invoice', label: 'Invoices', icon: Receipt, chip: 'bg-emerald-100 text-emerald-700', bar: 'bg-emerald-500', match: (n) => n.kind === 'invoice-reminder' || n.link === '/invoice-generator' },
  { id: 'dev', label: 'Development Tasks', icon: Code, chip: 'bg-cyan-100 text-cyan-700', bar: 'bg-cyan-500', match: (n) => n.kind === 'devtask' || n.link === '/it/dev-task' || /dev task/i.test(n.title || '') },
  { id: 'task', label: 'Work Management', icon: ClipboardList, chip: 'bg-blue-100 text-blue-700', bar: 'bg-blue-500', match: (n) => n.kind === 'task-assigned' || n.link === '/work-management' },
  { id: 'general', label: 'General', icon: Bell, chip: 'bg-slate-100 text-slate-600', bar: 'bg-slate-400', match: () => true }
];

const sourceOf = (n) => NOTIFICATION_SOURCES.find(s => s.match(n));
const isReminder = (n) => /reminder/i.test(n.kind || '') || /reminder|pending|action required/i.test(n.title || '');

const timeAgo = (date) => {
  const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'yesterday' : `${days} days ago`;
};

// 🔴 Har category ka apna rang: heading tab jaisi nahi dikhti (tab par hover = halka background,
// category par hover = uska apna rang + line chamakti hai, koi background nahi)
const SECTION_STYLE = {
  'Marketing & Sales': { chip: 'bg-pink-500/15 text-pink-300', hover: 'hover:text-pink-300', line: 'group-hover/sec:bg-pink-400/50', dot: 'bg-pink-400' },
  'Service Team': { chip: 'bg-sky-500/15 text-sky-300', hover: 'hover:text-sky-300', line: 'group-hover/sec:bg-sky-400/50', dot: 'bg-sky-400' },
  'HR & Ops': { chip: 'bg-emerald-500/15 text-emerald-300', hover: 'hover:text-emerald-300', line: 'group-hover/sec:bg-emerald-400/50', dot: 'bg-emerald-400' },
  'Finance': { chip: 'bg-amber-500/15 text-amber-300', hover: 'hover:text-amber-300', line: 'group-hover/sec:bg-amber-400/50', dot: 'bg-amber-400' },
  'IT Department': { chip: 'bg-cyan-500/15 text-cyan-300', hover: 'hover:text-cyan-300', line: 'group-hover/sec:bg-cyan-400/50', dot: 'bg-cyan-400' },
  'Executive': { chip: 'bg-violet-500/15 text-violet-300', hover: 'hover:text-violet-300', line: 'group-hover/sec:bg-violet-400/50', dot: 'bg-violet-400' }
};
const DEFAULT_SECTION_STYLE = { chip: 'bg-slate-700/60 text-slate-300', hover: 'hover:text-slate-200', line: 'group-hover/sec:bg-slate-500', dot: 'bg-blue-400' };

const COLLAPSE_KEY = 'taxbucket_sidebar_collapsed';
const MINI_KEY = 'taxbucket_sidebar_mini';
const PINS_KEY = 'taxbucket_sidebar_pins';

const readStored = (key, fallback) => {
  try { const value = JSON.parse(localStorage.getItem(key)); return value ?? fallback; } catch { return fallback; }
};
const writeStored = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage band ho toh bhi chale */ }
};

const Layout = () => {
  const { user, logout, refreshUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Sidebar: kaunse section band hain (yaad rehta hai) aur kaunse group khule hain
  const [collapsed, setCollapsed] = useState(() => readStored(COLLAPSE_KEY, {}));
  const [expandedMenu, setExpandedMenu] = useState({});
  // 🔴 Sidebar ki suvidhayein: chhota (sirf icon) mode, pin kiye hue tabs, aur tab dhoondhna
  const [mini, setMini] = useState(() => readStored(MINI_KEY, false));
  const [pins, setPins] = useState(() => readStored(PINS_KEY, []));
  const [navSearch, setNavSearch] = useState('');
  const searchRef = useRef(null);

  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notifFilter, setNotifFilter] = useState('all'); // 'all' | 'unread' | source id
  const [toasts, setToasts] = useState([]);              // naye notification ka chhota popup
  const knownIdsRef = useRef(null);                      // null = abhi pehli baar load nahi hua

  // 🔴 Har page badalne par rights server se taaza: Admin / CEO ne kuch badla ho toh turant dikhe
  useEffect(() => {
    refreshUser();
  }, [location.pathname, user?.token, refreshUser]);

  // ================= NOTIFICATIONS =================
  const authHeaders = { Authorization: `Bearer ${user?.token}` };

  useEffect(() => {
    if (!user?.token) return;
    let cancelled = false;

    const fetchNotifications = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/notifications`, { headers: { Authorization: `Bearer ${user.token}` } });
        if (cancelled) return;
        const list = res.data || [];
        setNotifications(list);

        // 🔴 Naya notification aaye toh poora panel khol kar kaam nahi rokte:
        // bas kone me ek chhota popup dikhta hai jo apne aap chala jata hai.
        if (knownIdsRef.current === null) {
          knownIdsRef.current = new Set(list.map(n => n._id)); // pehli baar: purane notification par popup nahi
        } else {
          const fresh = list.filter(n => !n.isRead && !knownIdsRef.current.has(n._id));
          list.forEach(n => knownIdsRef.current.add(n._id));
          if (fresh.length > 0) {
            // Jitne naye aaye utne hi dikhao (poori list nahi). Bahut saare ek saath aayein toh 4 dikha kar baaki ki ginti.
            const shown = fresh.slice(0, 4);
            const extra = fresh.length - shown.length;
            const batch = extra > 0 ? [...shown, { _id: `more-${Date.now()}`, isSummary: true, count: extra }] : shown;
            setToasts(prev => [...batch, ...prev].slice(0, 6));
            // Har popup apne aane ke 8 second baad khud hat jata hai
            const ids = batch.map(t => t._id);
            setTimeout(() => setToasts(prev => prev.filter(t => !ids.includes(t._id))), 8000);
          }
        }
      } catch (error) {
        console.error("Failed to load notifications", error);
      }
    };

    fetchNotifications();
    const intervalId = setInterval(fetchNotifications, 20000);
    return () => { cancelled = true; clearInterval(intervalId); };
  }, [user?.token]);

  const markRead = async (n) => {
    if (n.isRead) return;
    setNotifications(prev => prev.map(x => (x._id === n._id ? { ...x, isRead: true } : x)));
    try { await axios.put(`${import.meta.env.VITE_API_URL}/notifications/${n._id}/read`, {}, { headers: authHeaders }); } catch (e) { console.error(e); }
  };

  const openNotification = (n) => {
    setShowNotifications(false);
    setToasts(prev => prev.filter(t => t._id !== n._id));
    markRead(n);
    // Employee ka calendar My Portal me hai (CEO ka CEO Dashboard me), isliye meeting reminder wahin khulta hai
    const link = n.kind === 'meeting-reminder' && !isCeoRole(user?.role) ? '/my-portal#my-calendar' : n.link;
    if (link) navigate(link);
  };

  const markAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    try { await axios.put(`${import.meta.env.VITE_API_URL}/notifications/read-all`, {}, { headers: authHeaders }); } catch (e) { console.error(e); }
  };

  const clearRead = async () => {
    setNotifications(prev => prev.filter(n => !n.isRead));
    try { await axios.delete(`${import.meta.env.VITE_API_URL}/notifications/clear-read`, { headers: authHeaders }); } catch (e) { console.error(e); }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  // Filter chips: sirf wahi sources jinki notification maujood hai
  const sourceCounts = useMemo(() => {
    const counts = {};
    notifications.forEach(n => { const s = sourceOf(n); counts[s.id] = (counts[s.id] || 0) + 1; });
    return NOTIFICATION_SOURCES.filter(s => counts[s.id]).map(s => ({ ...s, count: counts[s.id] }));
  }, [notifications]);

  const shownNotifications = notifications.filter(n =>
    notifFilter === 'all' ? true : notifFilter === 'unread' ? !n.isRead : sourceOf(n).id === notifFilter
  );

  // ================= SIDEBAR =================
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isSubItemActive = (subPath) => {
    const [basePath, query] = subPath.split('?');
    if (location.pathname !== basePath) return false;
    if (query) return decodeURIComponent(location.search) === `?${query}`;
    return !location.search;
  };

  const toggleSection = (name) => setCollapsed(prev => {
    const next = { ...prev, [name]: !prev[name] };
    writeStored(COLLAPSE_KEY, next);
    return next;
  });

  const toggleMini = () => setMini(prev => { writeStored(MINI_KEY, !prev); return !prev; });

  const togglePin = (path) => setPins(prev => {
    const next = prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path];
    writeStored(PINS_KEY, next);
    return next;
  });

  // Ctrl + K (ya Cmd + K): tab dhoondhne wale box par seedha
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setMini(false);
        setTimeout(() => searchRef.current?.focus(), 50);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // 🔴 SIDEBAR: har tab ek right (perm) se juda hai. Jiske paas right hai usi ko tab dikhta hai.
  // placeholder = tab abhi bana nahi ("Soon"); wo tabhi dikhta hai jab us section ka koi asli tab dikh raha ho.
  const allowed = (item) => item.placeholder || !item.perm || can(user, item.perm);

  const buildSection = (category, icon, items) => {
    const visible = items
      .map(item => (item.isGroup ? { ...item, subItems: item.subItems.filter(allowed) } : item))
      .filter(item => (item.isGroup ? item.subItems.some(sub => !sub.placeholder) : allowed(item)));
    const hasRealTab = visible.some(item => (item.isGroup ? true : !item.placeholder));
    return hasRealTab ? [{ category, icon, items: visible }] : [];
  };

  const mainItems = [
    // Home: CEO ko sirf CEO Dashboard, Admin ko Dashboard, employee ko My Portal (employee ko Dashboard nahi dikhta)
    ...(isCeoRole(user?.role) ? [{ path: '/ceo-panel', name: 'CEO Dashboard', icon: Target }]
      : isAdminRole(user?.role) ? [{ path: '/', name: 'Dashboard', icon: LayoutDashboard }] : []),
    ...(!isAdminRole(user?.role) ? [
      // Success List ab My Portal ke andar hai (alag tab nahi)
      { path: '/my-portal', name: 'My Portal', icon: CalendarClock },
    ] : []),
    { path: '/work-management', name: 'Work Management', icon: ClipboardList, perm: 'WORK_MANAGEMENT' },
    { path: '/taskhandover', name: 'Task Handover', icon: RotateCwFadingClock, perm: 'TASK_HANDOVER' },
  ].filter(allowed);

  const sections = [
    ...buildSection('Marketing & Sales', Megaphone, [
      { path: '/leads', name: 'Leads & Prospects', icon: UserCircle, perm: 'LEADS' },
      { path: '/gst-health', name: 'GST Health Reports', icon: Activity, perm: 'GST_HEALTH' },
      { path: '/feeanddocuments', name: 'Fee & Documents', icon: FileText, perm: 'FEE_DOCS' },
      { name: 'Follow-ups', icon: PhoneCall, placeholder: true },
      { name: 'Sales Pipeline', icon: TrendingUp, placeholder: true },
      { name: 'Campaigns', icon: Megaphone, placeholder: true }
    ]),
    ...buildSection('Service Team', Wrench, [
      {
        name: 'Registrations',
        icon: Users,
        isGroup: true,
        subItems: [
          { path: '/clients', name: 'All Services', perm: 'REGISTRATIONS' },
          { path: '/clients?service=ITR Filing', name: 'ITR Filing', perm: 'REGISTRATIONS' },
          { path: '/clients?service=GST Registration', name: 'GST Registration', perm: 'REGISTRATIONS' },
          { path: '/clients?service=Company Reg', name: 'Company Reg', perm: 'REGISTRATIONS' },
          { path: '/clients?service=Trademark Reg', name: 'Trademark Reg', perm: 'REGISTRATIONS' },
          { path: '/clients?service=Accounting & Audit', name: 'Accounting & Audit', perm: 'REGISTRATIONS' },
          { path: '/clients?service=FSSAI Registration', name: 'FSSAI Registration', perm: 'REGISTRATIONS' },
          { path: '/clients?service=Other Services', name: 'Other Services', perm: 'REGISTRATIONS' }
        ]
      },
      {
        name: 'Returns & Audits',
        icon: FileText,
        isGroup: true,
        subItems: [
          { path: '/client-master', name: 'Client Master', perm: 'CLIENT_MASTER' },
          { path: '/itr-returns', name: 'ITR Return', perm: 'ITR' },
          { path: '/gst-returns', name: 'GST Return', perm: 'GST' },
          { path: '/roc-returns', name: 'ROC Return', perm: 'ROC' },
          { path: '/tds-returns', name: 'TDS Return', perm: 'TDS' },
          { path: '/audit', name: 'Audit', perm: 'AUDIT' },
          { path: '/fssai-returns', name: 'FSSAI Return', perm: 'FSSAI' },
          { name: 'Other Return', placeholder: true }
        ]
      },
      { path: '/bas', name: 'Business Associates', icon: Briefcase, perm: 'BAS' },
      { path: '/birthday-wishes', name: 'Client Birthday', icon: Cake, perm: 'BIRTHDAY' },
    ]),
    ...buildSection('HR & Ops', BriefcaseBusiness, [
      { path: '/hr/employees', name: 'Employee Master', icon: Users, perm: 'EMPLOYEE_MASTER' },
      { path: '/hr/attendance', name: 'Attendance Control', icon: CalendarClock, perm: 'ATTENDANCE' },
      { path: '/hr/salary', name: 'Salary Calculation', icon: IndianRupee, perm: 'SALARY' },
      { path: '/hr/holiday', name: 'Holiday', icon: ClipboardList, perm: 'HOLIDAY' },
      { path: '/officexpense', name: 'Office Expense', icon: Receipt, perm: 'OFFICE_EXPENSE' },
      { name: 'Leave', icon: FileText, placeholder: true },
      { name: 'Performance', icon: Activity, placeholder: true }
    ]),
    ...buildSection('Finance', Landmark, [
      { path: '/invoice-generator', name: 'Invoices', icon: FileText, perm: 'INVOICES' },
      { name: 'Collections', icon: IndianRupee, placeholder: true },
      { name: 'Outstanding', icon: AlertCircle, placeholder: true },
      { name: 'BA Commission', icon: Landmark, placeholder: true }
    ]),
    ...buildSection('IT Department', Laptop, [
      { path: '/it/dev-task', name: 'Development Tasks', icon: Code, perm: 'DEV_TASKS' },
      { name: 'CRM Issues', icon: Wrench, placeholder: true },
      { name: 'Website', icon: Globe, placeholder: true },
      { name: 'Automation', icon: Zap, placeholder: true }
    ]),
    ...buildSection('Executive', Target, [
      // CEO ke liye yeh upar Main me hai (home page), isliye yahan dobara nahi
      ...(isCeoRole(user?.role) ? [] : [{ path: '/ceo-panel', name: 'CEO Dashboard', icon: Target, perm: 'CEO_DASHBOARD' }]),
      { path: '/business-health', name: 'Client Health Reports', icon: HeartPulse, perm: 'BUSINESS_HEALTH' }
    ])
  ];

  // Saare asli tabs ek list me (search, pin aur mini mode ke liye)
  const allTabs = [
    ...mainItems.map(item => ({ ...item, section: 'Main' })),
    ...sections.flatMap(section => section.items.flatMap(item => {
      if (item.placeholder) return [];
      if (item.isGroup) return item.subItems.filter(sub => !sub.placeholder).map(sub => ({ ...sub, icon: item.icon, section: `${section.category} › ${item.name}` }));
      return [{ ...item, section: section.category }];
    }))
  ];

  const pinnedTabs = pins.map(path => allTabs.find(tab => tab.path === path)).filter(Boolean);

  const searchResults = navSearch.trim()
    ? allTabs.filter(tab => `${tab.name} ${tab.section}`.toLowerCase().includes(navSearch.trim().toLowerCase()))
    : [];

  // Kis tab me kitne naye (unread) notification hain: us tab par ginti dikhti hai
  const unreadByPath = {};
  notifications.forEach(n => { if (!n.isRead && n.link) unreadByPath[n.link] = (unreadByPath[n.link] || 0) + 1; });

  const goToTab = (tab) => { navigate(tab.path); setNavSearch(''); setMobileOpen(false); };

  // Jis page par user hai uska naam (header me dikhane ke liye)
  const currentPage = useMemo(() => {
    const flat = [...mainItems, ...sections.flatMap(s => s.items.flatMap(i => (i.isGroup ? i.subItems : [i])))];
    if (location.pathname === '/settings') return 'Access Control';
    const exact = flat.find(i => i.path && isSubItemActive(i.path));
    return (exact || flat.find(i => i.path && i.path.split('?')[0] === location.pathname))?.name || '';
    // eslint-disable-next-line
  }, [location.pathname, location.search, user?.permissions, user?.role]);

  const sectionHasActive = (section) => section.items.some(item =>
    item.isGroup ? item.subItems.some(sub => sub.path && sub.path.split('?')[0] === location.pathname) : item.path === location.pathname
  );

  const linkClass = (isActive) => `group relative flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-all ${
    isActive ? 'bg-blue-500/15 text-white font-bold' : 'text-slate-300 hover:text-white hover:bg-white/5 font-medium'
  }`;

  const renderItem = (item) => {
    const Icon = item.icon;

    // Abhi bana nahi: halka dikhao, click nahi hota
    if (item.placeholder) {
      return (
        <div key={item.name} className="flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium text-slate-500 cursor-default select-none" title="Coming soon">
          {Icon && <Icon size={16} className="shrink-0 opacity-60" />}
          <span className="truncate">{item.name}</span>
          <span className="ml-auto text-[8px] font-black uppercase tracking-wider bg-slate-700/60 text-slate-400 px-1.5 py-0.5 rounded">Soon</span>
        </div>
      );
    }

    if (item.isGroup) {
      const hasActive = item.subItems.some(sub => sub.path && sub.path.split('?')[0] === location.pathname);
      const isExpanded = expandedMenu[item.name] ?? hasActive;
      return (
        <div key={item.name}>
          <button onClick={() => setExpandedMenu(prev => ({ ...prev, [item.name]: !isExpanded }))} className={`group/grp w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-all border border-transparent ${hasActive ? 'text-white font-bold' : 'text-slate-300 hover:text-white hover:border-slate-700 font-medium'}`}>
            {Icon && <Icon size={16} className={`shrink-0 transition-colors ${hasActive ? 'text-blue-400' : 'text-slate-400 group-hover/grp:text-blue-300'}`} />}
            <span className="truncate">{item.name}</span>
            <span className="ml-auto text-[9px] font-bold text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">{item.subItems.filter(sub => !sub.placeholder).length}</span>
            <ChevronDown size={14} className={`text-slate-500 transition-transform group-hover/grp:text-blue-300 ${isExpanded ? 'rotate-180' : ''}`} />
          </button>
          {isExpanded && (
            <div className="ml-[22px] mt-0.5 mb-1 pl-3 border-l border-slate-700/70 space-y-0.5">
              {item.subItems.map(sub => sub.placeholder ? (
                <div key={sub.name} className="flex items-center px-2.5 py-1.5 text-[12px] font-medium text-slate-500 cursor-default" title="Coming soon">
                  {sub.name} <span className="ml-auto text-[8px] font-black uppercase tracking-wider bg-slate-700/60 text-slate-400 px-1.5 py-0.5 rounded">Soon</span>
                </div>
              ) : (
                <NavLink key={sub.name} to={sub.path} onClick={() => setMobileOpen(false)} className={`block px-2.5 py-1.5 rounded-md text-[12px] transition-all ${isSubItemActive(sub.path) ? 'bg-blue-500/15 text-blue-300 font-bold' : 'text-slate-400 hover:text-white hover:bg-white/5 font-medium'}`}>
                  <span className="flex items-center gap-2">{sub.name}{unreadByPath[sub.path] > 0 && <span className="ml-auto min-w-[16px] h-4 px-1 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">{unreadByPath[sub.path]}</span>}</span>
                </NavLink>
              ))}
            </div>
          )}
        </div>
      );
    }

    const unread = unreadByPath[item.path] || 0;
    const pinned = pins.includes(item.path);
    return (
      <div key={item.name} className="relative group/tab">
        <NavLink to={item.path} end={item.path === '/'} onClick={() => setMobileOpen(false)} className={({ isActive }) => linkClass(isActive)}>
          {({ isActive }) => (
            <>
              {isActive && <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r bg-blue-400"></span>}
              {Icon && <Icon size={16} className={`shrink-0 ${isActive ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-200'}`} />}
              <span className="truncate">{item.name}</span>
              {unread > 0 && <span className="ml-auto mr-5 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center" title={`${unread} new notification(s)`}>{unread > 9 ? '9+' : unread}</span>}
            </>
          )}
        </NavLink>
        {/* Pin: is tab ko sabse upar "Pinned" me rakho */}
        <button onClick={() => togglePin(item.path)} className={`absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded-md transition-opacity ${pinned ? 'text-amber-400 opacity-100' : 'text-slate-500 hover:text-amber-400 opacity-0 group-hover/tab:opacity-100'}`} title={pinned ? 'Unpin' : 'Pin to top'}>
          <Star size={12} className={pinned ? 'fill-amber-400' : ''} />
        </button>
      </div>
    );
  };

  // Chhote (sirf icon) sidebar ka ek button
  const renderMiniItem = (item) => {
    const Icon = item.icon || FileText;
    if (item.placeholder) return null;
    if (item.isGroup) {
      const hasActive = item.subItems.some(sub => sub.path && sub.path.split('?')[0] === location.pathname);
      return (
        <button key={item.name} onClick={() => { toggleMini(); setExpandedMenu(prev => ({ ...prev, [item.name]: true })); }} title={`${item.name} (click to expand)`} className={`relative mx-auto h-10 w-10 flex items-center justify-center rounded-xl transition-all ${hasActive ? 'bg-blue-500/15 text-blue-400' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
          <Icon size={18} />
        </button>
      );
    }
    const unread = unreadByPath[item.path] || 0;
    return (
      <NavLink key={item.name} to={item.path} end={item.path === '/'} title={item.name} className={({ isActive }) => `relative mx-auto h-10 w-10 flex items-center justify-center rounded-xl transition-all ${isActive ? 'bg-blue-500/15 text-blue-400' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
        <Icon size={18} />
        {unread > 0 && <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">{unread > 9 ? '9+' : unread}</span>}
      </NavLink>
    );
  };

  // Mobile par drawer hamesha poora khulta hai
  const isMini = mini && !mobileOpen;

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 font-sans antialiased overflow-hidden">

      <style dangerouslySetInnerHTML={{__html: `
        .sidebar-scroll::-webkit-scrollbar { width: 6px; }
        .sidebar-scroll::-webkit-scrollbar-track { background: transparent; }
        .sidebar-scroll::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
        .sidebar-scroll:hover::-webkit-scrollbar-thumb { background: #475569; }
      `}} />

      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* ============================ SIDEBAR ============================ */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-50 w-[264px] ${isMini ? 'md:w-[72px]' : 'md:w-[264px]'} bg-[#0f172a] text-slate-300 flex flex-col border-r border-slate-800/80 shadow-2xl transition-all duration-300 ease-in-out
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className={`h-16 flex items-center border-b border-slate-800/80 shrink-0 ${isMini ? 'justify-center px-2' : 'justify-between px-5'}`}>
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-white flex items-center justify-center shadow-md shrink-0">
              <img src="/taxbucket-logo.webp" alt="" className="p-1"/>
            </div>
            {!isMini && (
              <div className="flex flex-col">
                <span className="text-base font-bold text-white tracking-tight leading-tight">TaxBucket</span>
                <span className="text-[9px] text-slate-400 uppercase tracking-widest font-semibold leading-tight">Workspace</span>
              </div>
            )}
          </div>
          <button className="p-1 text-slate-400 hover:text-white md:hidden" onClick={() => setMobileOpen(false)}>
            <X size={20} />
          </button>
        </div>

        {isMini ? (
          // 🔴 CHHOTA SIDEBAR: sirf icon (naam mouse le jane par dikhta hai)
          <nav className="flex-1 overflow-y-auto sidebar-scroll py-3 flex flex-col gap-1">
            <button onClick={() => { toggleMini(); setTimeout(() => searchRef.current?.focus(), 80); }} title="Search tabs (Ctrl + K)" className="mx-auto h-10 w-10 flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-white/5"><Search size={18}/></button>
            {mainItems.map(renderMiniItem)}
            {sections.map(section => (
              <div key={section.category} className="flex flex-col gap-1 pt-2 mt-1 border-t border-slate-800/80">
                {section.items.map(renderMiniItem)}
              </div>
            ))}
          </nav>
        ) : (
          <>
            {/* Tab dhoondhna */}
            <div className="px-3 pt-3 shrink-0">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  ref={searchRef}
                  type="text"
                  value={navSearch}
                  onChange={(e) => setNavSearch(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && searchResults[0]) goToTab(searchResults[0]); if (e.key === 'Escape') setNavSearch(''); }}
                  placeholder="Search tabs..."
                  className="w-full pl-8 pr-12 py-2 text-xs font-medium bg-slate-800/60 border border-slate-700/60 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/40"
                />
                {navSearch
                  ? <button onClick={() => setNavSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-500 hover:text-white"><X size={13}/></button>
                  : <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-500 bg-slate-700/60 px-1.5 py-0.5 rounded">Ctrl K</span>}
              </div>
            </div>

            <nav className="flex-1 overflow-y-auto sidebar-scroll px-3 py-3 space-y-4">
              {navSearch.trim() ? (
                // Search ke nateeje
                <div className="space-y-0.5">
                  {searchResults.length === 0 ? (
                    <p className="text-xs text-slate-500 px-3 py-6 text-center">No tab found for "{navSearch}"</p>
                  ) : searchResults.map((tab, idx) => {
                    const TabIcon = tab.icon || FileText;
                    return (
                      <button key={tab.path} onClick={() => goToTab(tab)} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all ${idx === 0 ? 'bg-white/5' : 'hover:bg-white/5'}`}>
                        <TabIcon size={16} className="shrink-0 text-slate-400" />
                        <span className="min-w-0">
                          <span className="block text-[13px] font-semibold text-slate-200 truncate">{tab.name}</span>
                          <span className="block text-[10px] font-medium text-slate-500 truncate">{tab.section}</span>
                        </span>
                        {idx === 0 && <span className="ml-auto text-[9px] font-bold text-slate-500 bg-slate-700/60 px-1.5 py-0.5 rounded shrink-0">Enter</span>}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <>
                  {/* Pin kiye hue tabs */}
                  {pinnedTabs.length > 0 && (
                    <div>
                      <p className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-400/80"><Star size={11} className="fill-amber-400/80"/> Pinned</p>
                      <div className="mt-1 space-y-0.5">{pinnedTabs.map(tab => renderItem({ ...tab, name: tab.name }))}</div>
                    </div>
                  )}

                  {/* Main */}
                  <div className="space-y-0.5">{mainItems.map(renderItem)}</div>

                  {/* Sections (heading par click karke band / khol sakte hain) */}
                  {sections.map(section => {
                    const SectionIcon = section.icon;
                    const hasActive = sectionHasActive(section);
                    const isClosed = collapsed[section.category] && !hasActive; // jis section ka page khula hai wo band nahi hota
                    const sectionStyle = SECTION_STYLE[section.category] || DEFAULT_SECTION_STYLE;
                    return (
                      <div key={section.category}>
                        <button onClick={() => toggleSection(section.category)} title={isClosed ? 'Click to open' : 'Click to close'} className={`group/sec w-full flex items-center gap-2 pl-1.5 pr-2 py-1.5 select-none transition-colors ${hasActive ? 'text-slate-200' : 'text-slate-500'} ${sectionStyle.hover}`}>
                          <span className={`h-5 w-5 rounded-md flex items-center justify-center shrink-0 transition-transform group-hover/sec:scale-110 ${sectionStyle.chip}`}>
                            {SectionIcon && <SectionIcon size={11} />}
                          </span>
                          <span className="text-[10px] font-black uppercase tracking-[0.14em] whitespace-nowrap">{section.category}</span>
                          {hasActive && <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${sectionStyle.dot}`}></span>}
                          <span className={`flex-1 h-px bg-slate-800 transition-colors ${sectionStyle.line}`}></span>
                          <ChevronDown size={12} className={`shrink-0 transition-transform ${isClosed ? '-rotate-90' : ''}`} />
                        </button>
                        {!isClosed && <div className="mt-1 space-y-0.5">{section.items.map(renderItem)}</div>}
                      </div>
                    );
                  })}
                </>
              )}
            </nav>
          </>
        )}

        {isMini ? (
          <div className="p-2 border-t border-slate-800/80 bg-slate-900/50 shrink-0 flex flex-col items-center gap-1.5">
            <div className="h-9 w-9 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center font-bold" title={`${user?.name || 'User'} (${user?.role || ''})`}>
              {user?.name?.charAt(0) || 'U'}
            </div>
            {isAdminRole(user?.role) && (
              <button onClick={() => navigate('/settings')} className={`h-9 w-9 flex items-center justify-center rounded-lg transition-colors ${location.pathname === '/settings' ? 'bg-blue-500/20 text-blue-300' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`} title="Access Control & Settings"><Settings size={16} /></button>
            )}
            <button onClick={handleLogout} className="h-9 w-9 flex items-center justify-center rounded-lg text-rose-400 hover:bg-rose-500/10" title="Sign Out"><LogOut size={16} /></button>
          </div>
        ) : (
        <div className="p-3 border-t border-slate-800/80 bg-slate-900/50 shrink-0">
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-800/50 border border-slate-700/50 mb-2">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-9 w-9 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center font-bold shrink-0">
                {user?.name?.charAt(0) || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{user?.name || 'User'}</p>
                <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
                  <ShieldCheck size={12} />
                  <span className="truncate">{user?.role || 'Employee'}</span>
                </div>
              </div>
            </div>
            {isAdminRole(user?.role) && (
              <button
                onClick={() => { navigate('/settings'); setMobileOpen(false); }}
                className={`p-1.5 rounded-lg transition-colors shrink-0 ${location.pathname === '/settings' ? 'bg-blue-500/20 text-blue-300' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
                title="Access Control & Settings"
              >
                <Settings size={16} />
              </button>
            )}
          </div>

          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 rounded-lg border border-rose-500/20 transition-colors">
            <LogOut size={14} /> <span>Sign Out</span>
          </button>
        </div>
        )}
      </aside>

      {/* ============================ MAIN ============================ */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 px-4 md:px-6 flex items-center justify-between gap-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)] shrink-0">
          <div className="flex items-center gap-4 min-w-0">
            <button onClick={() => setMobileOpen(true)} className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 md:hidden">
              <Menu size={20} />
            </button>
            <button onClick={toggleMini} className="hidden md:flex p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800" title={mini ? 'Expand sidebar' : 'Collapse sidebar (more space)'}>
              {mini ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
            </button>
            <div className="min-w-0">
              <h2 className="font-bold text-slate-800 truncate">{currentPage || 'TaxBucket Workspace'}</h2>
              <p className="text-[11px] font-medium text-slate-400 hidden sm:block">Welcome back, {user?.name?.split(' ')[0] || 'User'} 👋</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className={`relative p-2 rounded-full transition-colors ${showNotifications ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}
                title="Notifications"
              >
                <Bell size={19} />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[10px] font-black rounded-full ring-2 ring-white flex items-center justify-center">{unreadCount > 9 ? '9+' : unreadCount}</span>
                )}
              </button>

              {/* NOTIFICATION PANEL (sirf bell dabane par khulta hai) */}
              {showNotifications && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)}></div>
                  <div className="absolute right-0 mt-2 w-[min(400px,calc(100vw-2rem))] bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in slide-in-from-top-2">
                    <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center gap-2">
                      <div>
                        <h3 className="text-sm font-black text-slate-800">Notifications</h3>
                        <p className="text-[10px] font-semibold text-slate-400">{unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={markAllRead} disabled={unreadCount === 0} className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:bg-blue-50 disabled:text-slate-300 disabled:hover:bg-transparent px-2 py-1.5 rounded-lg" title="Mark all as read"><CheckCheck size={13}/> Mark all read</button>
                        <button onClick={clearRead} disabled={notifications.every(n => !n.isRead)} className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 hover:bg-slate-100 disabled:text-slate-300 disabled:hover:bg-transparent px-2 py-1.5 rounded-lg" title="Remove notifications you have already read"><Trash2 size={12}/> Clear read</button>
                      </div>
                    </div>

                    {/* Filter: sab / unread / kis tab se aaya */}
                    {notifications.length > 0 && (
                      <div className="px-3 py-2 border-b border-slate-100 flex gap-1.5 overflow-x-auto custom-scrollbar">
                        {[{ id: 'all', label: 'All', count: notifications.length }, { id: 'unread', label: 'Unread', count: unreadCount }, ...sourceCounts].map(f => (
                          <button key={f.id} onClick={() => setNotifFilter(f.id)} className={`shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full border transition-colors ${notifFilter === f.id ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
                            {f.label} <span className={notifFilter === f.id ? 'text-slate-300' : 'text-slate-400'}>{f.count}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
                      {shownNotifications.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 flex flex-col items-center gap-2">
                          <BellOff size={28} className="text-slate-300" />
                          <p className="text-xs font-semibold">{notifications.length === 0 ? 'No notifications yet.' : 'Nothing in this filter.'}</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-100">
                          {shownNotifications.map(n => {
                            const source = sourceOf(n);
                            const SourceIcon = source.icon;
                            return (
                              <div key={n._id} onClick={() => openNotification(n)} className={`group relative px-4 py-3 flex items-start gap-3 cursor-pointer transition-colors ${n.isRead ? 'bg-white hover:bg-slate-50' : 'bg-blue-50/40 hover:bg-blue-50'}`}>
                                {!n.isRead && <span className={`absolute left-0 top-0 bottom-0 w-[3px] ${source.bar}`}></span>}
                                <div className={`mt-0.5 h-8 w-8 rounded-xl flex items-center justify-center shrink-0 ${source.chip} ${n.isRead ? 'opacity-60' : ''}`}>
                                  <SourceIcon size={15} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${source.chip}`}>{source.label}</span>
                                    {isReminder(n) && <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-rose-50 text-rose-600">Reminder</span>}
                                    <span className="ml-auto text-[10px] font-semibold text-slate-400 whitespace-nowrap">{timeAgo(n.createdAt)}</span>
                                  </div>
                                  <p className={`text-[13px] mt-1 break-words ${n.isRead ? 'font-semibold text-slate-600' : 'font-bold text-slate-900'}`}>{n.title}</p>
                                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug break-words">{n.message}</p>
                                  {n.link && <p className="text-[10px] font-bold text-blue-600 mt-1 flex items-center gap-0.5">Open {source.label} <ArrowUpRight size={11}/></p>}
                                </div>
                                {!n.isRead && (
                                  <button onClick={(e) => { e.stopPropagation(); markRead(n); }} className="shrink-0 p-1 rounded-lg text-slate-300 hover:text-emerald-600 hover:bg-emerald-50 opacity-0 group-hover:opacity-100 transition-opacity" title="Mark as read"><CheckCircle2 size={15}/></button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    {/* Sirf latest 20 rehte hain: purane database se apne aap hat jaate hain */}
                    <p className="px-4 py-2 border-t border-slate-100 bg-slate-50 text-[10px] font-semibold text-slate-400 text-center">Showing your latest 20 notifications. Older ones are removed automatically.</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-6 lg:p-8 bg-[#f8fafc]">
          <Outlet />
        </main>
      </div>

      {/* ============================ NAYE NOTIFICATION KA CHHOTA POPUP ============================ */}
      <div className="fixed top-20 right-4 z-[90] flex flex-col gap-2 w-[min(360px,calc(100vw-2rem))] pointer-events-none">
        {toasts.map(n => {
          // Bahut saare ek saath aaye: baaki ki sirf ginti, poori list bell dabane par
          if (n.isSummary) {
            return (
              <button key={n._id} onClick={() => { setToasts([]); setShowNotifications(true); }} className="pointer-events-auto bg-slate-800 hover:bg-slate-900 text-white rounded-2xl shadow-2xl px-4 py-2.5 text-xs font-bold flex items-center justify-between gap-2 animate-in slide-in-from-right-4 fade-in">
                <span>+{n.count} more new notification{n.count > 1 ? 's' : ''}</span>
                <span className="flex items-center gap-1 text-blue-300">Open bell <Bell size={12}/></span>
              </button>
            );
          }
          const source = sourceOf(n);
          const SourceIcon = source.icon;
          return (
            <div key={n._id} className="pointer-events-auto bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex animate-in slide-in-from-right-4 fade-in">
              <div className={`w-1.5 shrink-0 ${source.bar}`}></div>
              <div className="flex-1 min-w-0 p-3 flex items-start gap-3">
                <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 ${source.chip}`}><SourceIcon size={15} /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">{isReminder(n) ? 'Reminder' : 'New'} · {source.label}</p>
                  <p className="text-[13px] font-bold text-slate-900 break-words">{n.title}</p>
                  <p className="text-[11px] text-slate-500 leading-snug break-words line-clamp-2">{n.message}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    {n.link && <button onClick={() => openNotification(n)} className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-0.5">Open <ArrowUpRight size={11}/></button>}
                    <button onClick={() => { markRead(n); setToasts(prev => prev.filter(t => t._id !== n._id)); }} className="text-[11px] font-bold text-slate-400 hover:text-slate-600">Mark read</button>
                  </div>
                </div>
                <button onClick={() => setToasts(prev => prev.filter(t => t._id !== n._id))} className="shrink-0 p-1 rounded-lg text-slate-300 hover:text-slate-600 hover:bg-slate-100" title="Dismiss"><X size={14}/></button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Layout;
