import { useContext, useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { 
  LayoutDashboard, Users, UserCircle, Briefcase, LogOut, Menu,
  X, Bell, ChevronRight, ChevronDown, ShieldCheck, PhoneCall, CheckCircle2,
  Settings, FileText, CalendarClock, ClipboardList, BriefcaseBusiness, Target,
  Activity, Landmark, Laptop, Megaphone, Wrench, IndianRupee
} from 'lucide-react';

const Layout = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  
  const [expandedMenu, setExpandedMenu] = useState({ 
    'Registrations': false, 
    'Returns & Audits': false,
  }); 
  
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);

  const [activePermissions, setActivePermissions] = useState(user?.permissions || []);

  useEffect(() => {
    const syncPermissions = async () => {
      if (!user?.token || user?.role === 'Admin') return; 
      
      try {
        const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/users/me`, {
          headers: { Authorization: `Bearer ${user.token}` }
        });
        
        setActivePermissions(data.permissions || []);
        
        const storedUser = JSON.parse(localStorage.getItem('user')); 
        if (storedUser) {
          storedUser.permissions = data.permissions || [];
          localStorage.setItem('user', JSON.stringify(storedUser));
        }
      } catch (error) {
        console.error("Failed to sync permissions silently", error);
      }
    };

    syncPermissions();
  }, [location.pathname, user?.token]); 

  useEffect(() => {
    setShowNotifications(true);
    const timer = setTimeout(() => {
      setShowNotifications(false);
    }, 10000); 
    return () => clearTimeout(timer);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        if (!user?.token) return;
        const headers = { Authorization: `Bearer ${user.token}` };
        
        const [leadsRes, clientsRes] = await Promise.all([
          axios.get(`${import.meta.env.VITE_API_URL}/leads`, { headers }),
          axios.get(`${import.meta.env.VITE_API_URL}/clients`, { headers })
        ]);
        
        const todayObj = new Date();
        const offset = todayObj.getTimezoneOffset() * 60000;
        const todayStr = new Date(todayObj - offset).toISOString().split('T')[0];

        const isDue = (dateStr) => {
          if (!dateStr) return false;
          const dStr = dateStr.split('T')[0];
          return dStr <= todayStr;
        };
        
        const todaysFollowUps = (leadsRes.data || []).filter(
          l => l.status === 'Follow-up' && isDue(l.nextFollowUpDate)
        ).map(l => ({ ...l, notifType: 'lead' }));

        const clientReminders = (clientsRes.data || []).filter(
          c => isDue(c.nextReminderDate)
        ).map(c => ({ ...c, notifType: 'client' }));
        
        setNotifications([...todaysFollowUps, ...clientReminders]);
      } catch (error) {
        console.error("Failed to load notifications", error);
      }
    };
    fetchNotifications();
  }, [user?.token, location.pathname]);

  const toggleMenu = (name, e) => {
    if(e) e.stopPropagation();
    setExpandedMenu(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const isSubItemActive = (subPath) => {
    const [basePath, query] = subPath.split('?');
    if (location.pathname !== basePath) return false;
    if (query) return decodeURIComponent(location.search) === `?${query}`;
    return !location.search; 
  };

  const sidebarStructure = [
    {
      category: 'Main',
      items: [
        { path: '/', name: 'Dashboard', icon: LayoutDashboard },
        ...(user?.role !== 'Admin' ? [{ path: '/my-portal', name: 'My Portal', icon: CalendarClock }] : []),
      ]
    },
    // 🔴 NAYA UPDATE: Hide/Show Marketing & Sales category based on LEADS/GST_SCAN permissions
    ...(user?.role === 'Admin' || activePermissions.includes('LEADS') || activePermissions.includes('GST_SCAN') ? [{
      category: 'Marketing & Sales',
      icon: Megaphone,
      items: [
        ...(user?.role === 'Admin' || activePermissions.includes('LEADS') ? [{ path: '/leads', name: 'Leads & Prospects', icon: UserCircle }] : []),
        ...(user?.role === 'Admin' || activePermissions.includes('GST_SCAN') ? [{ path: '/gst-health', name: 'GST Health Reports', icon: Activity }] : []),
      ]
    }] : []),
    {
      category: 'Service Team',
      icon: Wrench,
      items: [
        {
          name: 'Registrations',
          icon: Users,
          isGroup: true,
          subItems: [
            { path: '/clients', name: 'All Services' },
            { path: '/clients?service=ITR Filing', name: 'ITR Filing' },
            { path: '/clients?service=GST Registration', name: 'GST Registration' },
            { path: '/clients?service=Company Reg', name: 'Company Reg' },
            { path: '/clients?service=Trademark Reg', name: 'Trademark Reg' },
            { path: '/clients?service=Accounting & Audit', name: 'Accounting & Audit' }
          ]
        },
        {
          name: 'Returns & Audits',
          icon: FileText,
          isGroup: true,
          subItems: [
            { path: '/itr-returns', name: 'ITR Return' },
            { path: '/gst-returns', name: 'GST Return' },
            { path: '/roc-returns', name: 'ROC Return' },
            { path: '/audit', name: 'Audit' }
          ]
        },
        ...(user?.role === 'Admin' || activePermissions.includes('WORK') ? [{ 
          path: '/work-management', name: 'Work Management', icon: ClipboardList 
        }] : []),
      ]
    },
    {
      category: 'HR & Ops',
      icon: BriefcaseBusiness,
      items: [
        ...(user?.role === 'Admin' || activePermissions.includes('HR') ? [
          { path: '/hr/employees', name: 'Employee Master', icon: Users },
          { path: '/hr/attendance', name: 'Attendance Control', icon: CalendarClock },
          { path: '/hr/salary', name: 'Salary Calculation', icon: IndianRupee }
        ] : []),
        ...(user?.role === 'Admin' || activePermissions.includes('BAS') ? [{ 
          path: '/bas', name: 'Business Associates', icon: Briefcase 
        }] : []),
      ]
    },
    {
      category: 'Finance',
      icon: Landmark,
      items: [
        ...(user?.role === 'Admin' || activePermissions.includes('INVOICE') ? [{ 
          path: '/invoice-generator', name: 'Invoices', icon: FileText 
        }] : [])
      ]
    },
    {
      category: 'IT Department',
      icon: Laptop,
      items: [
        // Dummy or future IT routes can go here
      ]
    },
    ...(user?.role === 'Admin' ? [{
      category: 'Executive',
      items: [
        { path: '/ceo-panel', name: 'CEO Dashboard', icon: Target }
      ]
    }] : [])
  ];

  // Helper component to draw the "L" shape connector
  const ConnectorL = () => (
    <div className="absolute left-[20px] top-0 bottom-1/2 w-[16px] border-l border-b border-slate-700 rounded-bl-md z-0 opacity-50"></div>
  );

  // Helper component to draw the continuing straight line for items in a list
  const ConnectorStraight = () => (
    <div className="absolute left-[20px] top-0 bottom-0 border-l border-slate-700 z-0 opacity-50"></div>
  );

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 font-sans antialiased overflow-hidden">
      
      {/* Scrollbar Custom CSS */}
      <style dangerouslySetInnerHTML={{__html: `
        .sidebar-scroll::-webkit-scrollbar { width: 4px; }
        .sidebar-scroll::-webkit-scrollbar-track { background: transparent; }
        .sidebar-scroll::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
        .sidebar-scroll:hover::-webkit-scrollbar-thumb { background: #475569; }
      `}} />

      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <aside className={`
        fixed md:static inset-y-0 left-0 z-50 w-[260px] bg-[#0f172a] text-slate-300 flex flex-col border-r border-slate-800/80 shadow-2xl transition-transform duration-300 ease-in-out
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-800/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg bg-white flex items-center justify-center font-black text-white shadow-md">
                          <img src="/taxbucket-logo.webp" alt="" className='p-1'/>
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold text-white tracking-tight leading-tight">TaxBucket</span>
              <span className="text-[9px] text-slate-400 uppercase tracking-widest font-semibold leading-tight">Workspace</span>
            </div>
          </div>
          <button className="p-1 text-slate-400 hover:text-white md:hidden" onClick={() => setMobileOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto sidebar-scroll pb-6 pt-4">
          {sidebarStructure.map((section, sIdx) => {
            if (section.items.length === 0) return null;

            return (
              <div key={sIdx} className="mb-4">
                {/* SECTION HEADING */}
                {section.category !== 'Main' && (
                  <div className="px-5 py-2 mt-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 select-none">
                    {section.icon && <section.icon size={12} />}
                    {section.category}
                  </div>
                )}

                {/* SECTION ITEMS */}
                <div className="px-3">
                  {section.items.map((item, iIdx) => {
                    const isLastItem = iIdx === section.items.length - 1;

                    // IF IT IS A NESTED GROUP
                    if (item.isGroup) {
                      const isExpanded = expandedMenu[item.name];
                      const Icon = item.icon;
                      
                      return (
                        <div key={item.name} className="relative">
                          {section.category !== 'Main' && !isLastItem && <ConnectorStraight />}
                          {section.category !== 'Main' && <ConnectorL />}

                          <button
                            onClick={(e) => toggleMenu(item.name, e)}
                            className="w-full flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-slate-800/50 transition-colors ml-6 relative z-10"
                            style={{ width: 'calc(100% - 24px)' }}
                          >
                            <div className="flex items-center gap-2 text-sm font-medium">
                              {Icon && <Icon size={16} className={isExpanded ? 'text-blue-400' : 'text-slate-400'} />}
                              <span className={isExpanded ? 'text-blue-400' : 'text-slate-300'}>{item.name}</span>
                            </div>
                            <ChevronDown size={14} className={`text-slate-500 transition-transform ${isExpanded ? 'rotate-180 text-blue-400' : ''}`} />
                          </button>

                          <div className={`overflow-hidden transition-all duration-200 ${isExpanded ? 'max-h-[500px]' : 'max-h-0'}`}>
                            <div className="relative ml-8">
                              <div className="absolute left-[11px] top-0 bottom-3 border-l border-slate-700/60 z-0"></div>
                              
                              {item.subItems.map((sub, subIdx) => {
                                const active = isSubItemActive(sub.path);
                                const isLastSub = subIdx === item.subItems.length - 1;
                                
                                return (
                                  <div key={sub.name} className="relative pt-1 pb-1 flex items-center pl-6">
                                    <div className="absolute left-[11px] top-0 bottom-1/2 w-[12px] border-l border-b border-slate-700/60 rounded-bl-sm z-0"></div>
                                    {!isLastSub && <div className="absolute left-[11px] top-0 bottom-0 border-l border-slate-700/60 z-0"></div>}

                                    <NavLink
                                      to={sub.path}
                                      onClick={() => setMobileOpen(false)}
                                      className={`
                                        flex items-center gap-2 text-[12px] py-1 px-2 rounded-md w-full relative z-10 transition-all
                                        ${active ? 'text-blue-400 bg-blue-500/10 font-bold' : 'text-slate-400 hover:text-slate-200'}
                                      `}
                                    >
                                      {sub.name}
                                    </NavLink>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    }

                    // NORMAL ITEM (Direct link under a category)
                    const Icon = item.icon;
                    return (
                      <div key={item.name} className="relative pt-0.5 pb-0.5">
                        {section.category !== 'Main' && !isLastItem && <ConnectorStraight />}
                        {section.category !== 'Main' && <ConnectorL />}

                        <NavLink
                          to={item.path}
                          end={item.path === '/'}
                          onClick={() => setMobileOpen(false)}
                          className={({ isActive }) => `
                            flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm transition-all z-10 relative
                            ${section.category !== 'Main' ? 'ml-6 w-[calc(100%-24px)]' : 'w-full px-3 py-2 rounded-lg'}
                            ${isActive 
                              ? (section.category === 'Main' ? 'bg-blue-600 text-white font-bold shadow-lg shadow-blue-500/20' : 'text-blue-400 bg-blue-500/10 font-bold') 
                              : 'text-slate-300 hover:text-white hover:bg-slate-800/60 font-medium'
                            }
                          `}
                        >
                          {Icon && <Icon size={section.category === 'Main' ? 18 : 16} />}
                          <span>{item.name}</span>
                        </NavLink>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* BOTTOM USER PROFILE SECTION */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-900/50 shrink-0">
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-800/50 border border-slate-700/50 mb-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-9 w-9 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center font-bold shrink-0">
                {user?.name?.charAt(0) || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{user?.name || 'Tax Expert'}</p>
                <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
                  <ShieldCheck size={12} />
                  <span className="truncate capitalize">{user?.role || 'Admin'}</span>
                </div>
              </div>
            </div>
            {user?.role === 'Admin' && (
              <button 
                onClick={() => navigate('/settings')} 
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors shrink-0"
                title="Admin Settings"
              >
                <Settings size={16} />
              </button>
            )}
          </div>
          
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 rounded-lg border border-rose-500/20 transition-colors">
            <LogOut size={14} /> <span>Sign Out</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* HEADER BAR */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between gap-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)] shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setMobileOpen(true)} className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 md:hidden">
              <Menu size={20} />
            </button>
            <h2 className="font-bold text-slate-700 hidden sm:block">Welcome back, {user?.name?.split(' ')[0] || 'User'} 👋</h2>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className={`relative p-2 rounded-full transition-colors ${showNotifications ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}
              >
                <Bell size={18} />
                {notifications.length > 0 && (
                  <span className="absolute top-1 right-1.5 h-2 w-2 bg-rose-500 rounded-full ring-2 ring-white animate-pulse"></span>
                )}
              </button>

              {/* NOTIFICATIONS DROPDOWN */}
              {showNotifications && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)}></div>
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden animate-in slide-in-from-top-2">
                    <div className="p-3 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                      <div>
                        <h3 className="text-sm font-bold text-slate-800">Tasks & Alerts</h3>
                      </div>
                      <span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {notifications.length} New
                      </span>
                    </div>
                    
                    <div className="max-h-72 overflow-y-auto custom-scrollbar">
                      {notifications.length === 0 ? (
                        <div className="p-6 text-center text-slate-500 flex flex-col items-center gap-2">
                          <CheckCircle2 size={28} className="text-slate-300" />
                          <p className="text-xs font-medium">All caught up!</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-100">
                          {notifications.map(n => {
                            const dateToDisplay = n.notifType === 'lead' ? n.nextFollowUpDate : n.nextReminderDate;
                            return (
                              <div 
                                key={n._id} 
                                onClick={() => {
                                  setShowNotifications(false);
                                  if (n.notifType === 'lead') {
                                    navigate('/leads', { state: { openLeadId: n._id } });
                                  } else {
                                    navigate('/clients', { state: { openClientId: n._id } });
                                  }
                                }}
                                className="p-3 flex items-start gap-3 hover:bg-slate-50 transition-colors cursor-pointer text-left"
                              >
                                <div className={`mt-0.5 h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${n.notifType === 'lead' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                                  {n.notifType === 'lead' ? <PhoneCall size={12} /> : <FileText size={12} />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-bold text-slate-800 truncate">
                                    {n.notifType === 'lead' ? n.name : n.assesseeName}
                                  </p>
                                  <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                                    {n.notifType === 'lead' ? 'Call Follow-up Due' : `${n.service || 'Service'} Reminder`}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
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
    </div>
  );
};

export default Layout;