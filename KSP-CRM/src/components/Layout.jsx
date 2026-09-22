import { useContext, useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { 
  LayoutDashboard, Users, UserCircle, Briefcase, LogOut, Menu,
  X, Bell, ChevronRight, ChevronDown, ShieldCheck, PhoneCall, CheckCircle2,
  Settings, FileText, CalendarClock, ClipboardList, BriefcaseBusiness, Target,
  Activity // 🔴 NAYA: Activity icon for GST Health Scan
} from 'lucide-react';

const Layout = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  
  const [expandedMenu, setExpandedMenu] = useState({ 
    'Existing Clients': false, 
    'Registrations': false, 
    'Returns & Audits': false,
    'HR Ops': false 
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

  const menuItems = [
    { path: '/', name: 'Dashboard', icon: LayoutDashboard },
    
    ...(user?.role === 'Admin' ? [{ 
      path: '/ceo-panel', 
      name: 'CEO Snapshot', 
      icon: Target 
    }] : []),

    ...(user?.role !== 'Admin' ? [{ 
      path: '/my-portal', 
      name: 'My Portal', 
      icon: CalendarClock 
    }] : []),
    
    { path: '/leads', name: 'Leads & Prospects', icon: UserCircle },
    
    // 🔴 NAYA TAB: GST Health Report
    { path: '/gst-health', name: 'GST Health Scan', icon: Activity },

    { 
      name: 'Existing Clients', 
      icon: Users,
      groups: [
        {
          name: 'Registrations',
          items: [
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
          items: [
            { path: '/itr-returns', name: 'Income Tax Return' },
            { path: '/gst-returns', name: 'GST Return' },
            { path: '/roc-returns', name: 'ROC Return' },
            { path: '/audit', name: 'Audit' }
          ]
        }
      ]
    },
    
    ...(user?.role === 'Admin' || activePermissions.includes('HR') ? [{ 
      name: 'HR Ops', 
      icon: BriefcaseBusiness,
      subItems: [ 
        { path: '/hr/employees', name: 'Employee Master' },
        { path: '/hr/attendance', name: 'Attendance Control' },
        { path: '/hr/salary', name: 'Salary Calculation' }
      ]
    }] : []),

    ...(user?.role === 'Admin' || activePermissions.includes('BAS') ? [{ 
      path: '/bas', 
      name: 'Business Associates', 
      icon: Briefcase 
    }] : []),

    ...(user?.role === 'Admin' || activePermissions.includes('WORK') ? [{ 
      path: '/work-management', 
      name: 'Work Management', 
      icon: ClipboardList 
    }] : []),

    ...(user?.role === 'Admin' || activePermissions.includes('INVOICE') ? [{ 
      path: '/invoice-generator', 
      name: 'Invoice Generator', 
      icon: FileText 
    }] : [])
  ];

  const isSubItemActive = (subPath) => {
    const [basePath, query] = subPath.split('?');
    if (location.pathname !== basePath) return false;
    if (query) return decodeURIComponent(location.search) === `?${query}`;
    return !location.search; 
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 font-sans antialiased overflow-hidden">
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <aside className={`
        fixed md:static inset-y-0 left-0 z-50 w-72 bg-slate-900 text-slate-200 flex flex-col border-r border-slate-800 shadow-xl transition-transform duration-300 ease-in-out
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="h-20 flex items-center justify-between px-6 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-black text-white text-lg shadow-md">
              TB
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold text-white tracking-tight">TaxBucket</span>
              <span className="text-[11px] text-slate-400 uppercase tracking-widest font-semibold">CRM Portal</span>
            </div>
          </div>
          <button className="p-1 text-slate-400 hover:text-white md:hidden" onClick={() => setMobileOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto custom-scrollbar">
          {menuItems.map((item) => {
            const Icon = item.icon;
            
            // Handle both Nested Groups (Clients) and Direct SubItems (HR Ops)
            if (item.groups || item.subItems) {
              const isParentExpanded = expandedMenu[item.name];
              return (
                <div key={item.name} className="space-y-1 mt-2 mb-2">
                  <button
                    onClick={(e) => toggleMenu(item.name, e)}
                    className={`w-full group flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${isParentExpanded ? 'bg-slate-800/50 text-white' : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'}`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon size={20} className={isParentExpanded ? 'text-blue-500' : ''} />
                      <span>{item.name}</span>
                    </div>
                    <ChevronDown size={16} className={`transition-transform duration-200 ${isParentExpanded ? 'rotate-180 text-blue-500' : ''}`} />
                  </button>
                  
                  <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isParentExpanded ? 'max-h-[1000px] opacity-100 mt-1' : 'max-h-0 opacity-0'}`}>
                    <div className="flex flex-col gap-2 pl-7 pr-2 border-l-2 border-slate-800 ml-[22px] py-2">
                      
                      {/* DIRECT SUB-ITEMS RENDER (Used for HR Ops) */}
                      {item.subItems && item.subItems.map((subItem) => {
                        const active = isSubItemActive(subItem.path);
                        return (
                          <button
                            key={subItem.name}
                            onClick={() => {
                              navigate(subItem.path);
                              setMobileOpen(false);
                            }}
                            className={`
                              text-left py-2 px-3 rounded-md text-[11px] font-bold transition-all duration-200 flex items-center justify-between
                              ${active 
                                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'}
                            `}
                          >
                            {subItem.name}
                            {active && <ChevronRight size={12} className="opacity-70" />}
                          </button>
                        );
                      })}

                      {/* NESTED GROUPS RENDER (Used for Existing Clients) */}
                      {item.groups && item.groups.map((group) => {
                        const isGroupExpanded = expandedMenu[group.name];
                        return (
                          <div key={group.name} className="flex flex-col">
                            <button 
                              onClick={(e) => toggleMenu(group.name, e)}
                              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition-all ${isGroupExpanded ? 'bg-slate-800 text-blue-400 shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}
                            >
                              <span className="uppercase tracking-wider">{group.name}</span>
                              <ChevronDown size={14} className={`transition-transform duration-200 ${isGroupExpanded ? 'rotate-180' : ''}`} />
                            </button>
                            
                            <div className={`overflow-hidden transition-all duration-300 ease-in-out flex flex-col gap-1 pl-2 ${isGroupExpanded ? 'max-h-[500px] mt-1.5' : 'max-h-0'}`}>
                              {group.items.map((subItem) => {
                                const active = isSubItemActive(subItem.path);
                                return (
                                  <button
                                    key={subItem.name}
                                    onClick={() => {
                                      navigate(subItem.path);
                                      setMobileOpen(false);
                                    }}
                                    className={`
                                      text-left py-2 px-3 rounded-md text-[11px] font-bold transition-all duration-200 flex items-center justify-between
                                      ${active 
                                        ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'}
                                    `}
                                  >
                                    {subItem.name}
                                    {active && <ChevronRight size={12} className="opacity-70" />}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )
                      })}
                      
                    </div>
                  </div>
                </div>
              );
            }

            // Normal Menu Render
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) => `
                  group flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200
                  ${isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'}
                `}
              >
                <div className="flex items-center gap-3">
                  <Icon size={20} />
                  <span>{item.name}</span>
                </div>
                <ChevronRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-800/40 border border-slate-800 mb-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-10 w-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold shrink-0">
                {user?.name?.charAt(0) || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{user?.name || 'Tax Expert'}</p>
                <div className="flex items-center gap-1 text-xs text-emerald-400">
                  <ShieldCheck size={13} />
                  <span className="truncate capitalize">{user?.role || 'Admin'}</span>
                </div>
              </div>
            </div>
            {user?.role === 'Admin' && (
              <button 
                onClick={() => navigate('/settings')} 
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors shrink-0"
                title="Admin Settings"
              >
                <Settings size={18} />
              </button>
            )}
          </div>
          
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 rounded-lg border border-rose-500/20 transition-colors">
            <LogOut size={16} /> <span>Sign Out</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-20 bg-white border-b border-slate-200 px-6 flex items-center justify-between gap-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          <div className="flex items-center gap-4">
            <button onClick={() => setMobileOpen(true)} className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 md:hidden">
              <Menu size={22} />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className={`relative p-2.5 rounded-full transition-colors ${showNotifications ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}
              >
                <Bell size={19} />
                {notifications.length > 0 && (
                  <span className="absolute top-2 right-2 h-2.5 w-2.5 bg-rose-500 rounded-full ring-2 ring-white animate-pulse"></span>
                )}
              </button>

              {showNotifications && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)}></div>
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                      <div>
                        <h3 className="text-sm font-bold text-slate-800">Tasks & Reminders</h3>
                        <p className="text-[11px] text-slate-500 font-medium">Scheduled for today</p>
                      </div>
                      <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2 py-0.5 rounded-full">
                        {notifications.length} Alerts
                      </span>
                    </div>
                    
                    <div className="max-h-72 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center text-slate-500 flex flex-col items-center gap-2">
                          <CheckCircle2 size={32} className="text-slate-300" />
                          <p className="text-sm font-medium">No tasks due today!</p>
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
                                className="p-4 flex items-start gap-3 hover:bg-slate-50 transition-colors cursor-pointer text-left"
                              >
                                <div className={`mt-0.5 h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${n.notifType === 'lead' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                                  {n.notifType === 'lead' ? <PhoneCall size={14} /> : <FileText size={14} />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-bold text-slate-800 truncate">
                                    {n.notifType === 'lead' ? n.name : n.assesseeName}
                                  </p>
                                  <p className="text-xs text-slate-500 mt-0.5 truncate">
                                    {n.notifType === 'lead' ? 'Scheduled Call Follow-up' : `${n.service || 'Service'} Reminder`}
                                  </p>
                                  <div className="flex items-center gap-2 mt-1.5">
                                    <span className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded border ${n.notifType === 'lead' ? 'text-purple-600 bg-purple-50 border-purple-100' : 'text-blue-600 bg-blue-50 border-blue-100'}`}>
                                      {n.mobile}
                                    </span>
                                    {dateToDisplay && (
                                      <span className="flex items-center gap-1 text-[10px] font-bold text-rose-500">
                                        <CalendarClock size={11} />
                                        {new Date(dateToDisplay).toLocaleDateString('en-IN')}
                                      </span>
                                    )}
                                  </div>
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
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-6 lg:p-8 bg-slate-50">
          <Outlet /> 
        </main>
      </div>
    </div>
  );
};

export default Layout;