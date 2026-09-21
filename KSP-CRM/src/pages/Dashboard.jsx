import { useState, useEffect, useContext, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import toast, { Toaster } from 'react-hot-toast';
import { 
  Users, Wallet, Briefcase, TrendingUp, ArrowRight,
  Activity, UserCircle, Clock, IndianRupee, CheckCircle2, AlertCircle,
  Phone, CalendarDays, X, FileText, CalendarClock,
  ClipboardList, UsersRound, AlertTriangle, Receipt, Sparkles, PieChart, BellRing, Gift
} from 'lucide-react';

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const [data, setData] = useState({ 
    leads: [], clients: [], tasks: [], employees: [], attendance: [],
    itr: [], gst: [], roc: [], audit: []
  });
  
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);

  const isAdmin = user?.role === 'Admin';

  const fetchMegaDashboardData = async (silent = false) => {
    if (!silent) setLoading(true);
    else setIsRefreshing(true);

    try {
      const headers = { Authorization: `Bearer ${user.token}` };
      
      const [leadsRes, clientsRes, tasksRes, empRes, attRes, itrRes, gstRes, rocRes, auditRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_URL}/leads`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${import.meta.env.VITE_API_URL}/clients`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${import.meta.env.VITE_API_URL}/tasks`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${import.meta.env.VITE_API_URL}/hr/employees`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${import.meta.env.VITE_API_URL}/hr/attendance`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${import.meta.env.VITE_API_URL}/itr`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${import.meta.env.VITE_API_URL}/gst`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${import.meta.env.VITE_API_URL}/roc`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${import.meta.env.VITE_API_URL}/audit`, { headers }).catch(() => ({ data: [] }))
      ]);

      setData({
        leads: Array.isArray(leadsRes.data) ? leadsRes.data : (leadsRes.data?.leads || []),
        clients: Array.isArray(clientsRes.data) ? clientsRes.data : (clientsRes.data?.clients || []),
        tasks: tasksRes.data || [],
        employees: empRes.data || [],
        attendance: attRes.data || [],
        itr: itrRes.data || [],
        gst: gstRes.data || [],
        roc: rocRes.data || [],
        audit: auditRes.data || []
      });
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Error fetching mega dashboard data:", error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // 30 SECOND AUTO REFRESH LOGIC
  useEffect(() => {
    fetchMegaDashboardData(); 

    const intervalId = setInterval(() => {
      fetchMegaDashboardData(true); 
    }, 30000); 

    return () => clearInterval(intervalId); 
    // eslint-disable-next-line
  }, [user.token]);

  // --- CALCULATIONS ---

  const todaysReminders = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const isDue = (dateStr) => {
      if (!dateStr) return false;
      const d = new Date(dateStr);
      d.setHours(0, 0, 0, 0); 
      return d.getTime() <= today.getTime(); 
    };

    const leadReminders = (data.leads || []).filter(l => l.status === 'Follow-up' && isDue(l.nextFollowUpDate)).map(l => ({ ...l, notifType: 'lead' }));
    const clientReminders = (data.clients || []).filter(c => isDue(c.nextReminderDate)).map(c => ({ ...c, notifType: 'client' }));

    return [...leadReminders, ...clientReminders];
  }, [data.leads, data.clients]);

  const stats = useMemo(() => {
    const { leads, clients, tasks, employees, attendance, itr, gst, roc, audit } = data;
    
    // 🔴 1. FINANCIALS: SMART ANTI-DOUBLE-COUNTING LOGIC
    let totalRevenue = 0;
    let totalReceived = 0;
    let totalPending = 0;
    let paidClientsCount = 0;
    let focClientsCount = 0; // 🔴 NEW FOC COUNTER
    
    const defaulters = []; // Store defaulters list
    
    const workspaceRecordsMap = new Map();

    const processWorkspaceItem = (item, source) => {
      const uniqueKey = item.crmClientId || item.pan || item._id; 
      workspaceRecordsMap.set(uniqueKey, item);

      const fee = Number(item.feeAmount || 0);
      const rec = Number(item.amountReceived || 0);
      const due = fee - rec;

      totalRevenue += fee;
      totalReceived += rec;
      totalPending += (due > 0 ? due : 0);

      if (item.feeStatus === 'Paid') paidClientsCount++;
      if (item.feeStatus === 'FOC') focClientsCount++; // 🔴 COUNT FOC
      
      if(due > 0) {
          defaulters.push({
              name: item.assesseeName || item.tradeName,
              mobile: item.mobile,
              due: due,
              source: source,
              id: item._id
          });
      }
    };

    itr.forEach(item => processWorkspaceItem(item, 'ITR'));
    gst.forEach(item => processWorkspaceItem(item, 'GST'));
    roc.forEach(item => processWorkspaceItem(item, 'ROC'));
    audit.forEach(item => processWorkspaceItem(item, 'Audit'));

    let pureClientCount = 0;

    clients.forEach(c => {
      const uniqueKey = c._id || c.pan;
      
      if (!workspaceRecordsMap.has(uniqueKey)) {
        pureClientCount++;

        const fee = Number(c.feeAmount || 0);
        const rec = Number(c.amountReceived || 0);
        const due = fee - rec;

        totalRevenue += fee;
        totalReceived += rec;
        totalPending += (due > 0 ? due : 0);

        if (c.feeStatus === 'Paid') paidClientsCount++;
        if (c.feeStatus === 'FOC') focClientsCount++; // 🔴 COUNT FOC
        
        if(due > 0) {
            defaulters.push({
                name: c.assesseeName || c.tradeName,
                mobile: c.mobile,
                due: due,
                source: 'CRM',
                id: c._id
            });
        }
      }
    });

    const topDefaulters = defaulters.sort((a,b) => b.due - a.due).slice(0,5);

    const revenuePercentage = totalRevenue > 0 ? Math.round((totalReceived / totalRevenue) * 100) : 0;
    
    // 2. LEADS
    const newLeads = leads.filter(l => l.status === 'New').length;
    const hotLeads = leads.filter(l => l.priority === 'Hot').length;
    const convertedLeads = leads.filter(l => l.status === 'Converted').length;
    
    // 3. TASKS & LATEST ACTIVITY
    const activeTasks = tasks.filter(t => !['Completed', 'Approved'].includes(t.currentStatus)).length;
    const overdueTasks = tasks.filter(t => t.isOverdue).length;
    const sortedTasks = [...tasks].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    const latestTask = sortedTasks.length > 0 ? sortedTasks[0] : null;

    // Critical Alerts
    const criticalAlerts = [];
    gst.forEach(g => {
        if(g.gstStatus === 'Error/Mismatch') criticalAlerts.push({ name: g.tradeName || g.assesseeName, issue: 'Error/Mismatch in GST', id: g._id, link: '/clients?service=GST%20Registration' });
    });
    itr.forEach(i => {
        if(i.itrProcessedStatus === 'Defective') criticalAlerts.push({ name: i.assesseeName, issue: 'Defective ITR', id: i._id, link: '/clients?service=ITR%20Filing' });
    });

    // 4. HR & ATTENDANCE
    const todayStr = new Date().toISOString().split('T')[0];
    const activeEmployees = employees.filter(e => e.status === 'Active');
    const totalEmps = activeEmployees.length;
    
    const presentCount = attendance.filter(a => a.date && a.date.startsWith(todayStr) && ['Present', 'WFH', 'Half Day'].includes(a.status)).length;
    const absentCount = totalEmps > 0 ? totalEmps - presentCount : 0;

    // Service Breakdown
    const serviceBreakdown = {
      ITR: itr.length,
      GST: gst.length,
      ROC: roc.length,
      Audit: audit.length,
      Other: pureClientCount
    };
    
    const totalClientsCount = pureClientCount + workspaceRecordsMap.size; 

    return {
      totalClients: totalClientsCount,
      totalRevenue,
      totalPending,
      totalReceived,
      paidClientsCount,
      focClientsCount, // 🔴 EXPORTING FOC COUNT
      revenuePercentage,
      topDefaulters,
      
      totalLeads: leads.length,
      newLeads,
      hotLeads,
      convertedLeads,
      todaysRemindersCount: todaysReminders.length,
      
      activeTasks,
      overdueTasks,
      latestTask,
      criticalAlerts,
      
      totalEmps,
      presentCount,
      absentCount,
      serviceBreakdown
    };
  }, [data, todaysReminders.length]);

  const currentDate = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] space-y-4">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-slate-200 border-t-blue-600"></div>
        <p className="text-slate-500 font-medium animate-pulse">Compiling Live Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto relative pb-10">
      <Toaster position="top-right" />

      {/* HERO HEADER WITH LIVE SYNC BADGE */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 p-8 rounded-3xl text-white shadow-xl shadow-blue-900/20 relative overflow-hidden group">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-colors duration-1000"></div>
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-32 h-32 bg-blue-500/20 rounded-full blur-2xl"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 border border-white/20 text-[10px] font-bold uppercase tracking-wider backdrop-blur-md">
              <span className={`w-2 h-2 rounded-full ${isRefreshing ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'}`}></span>
              {isRefreshing ? 'Syncing...' : 'Live Auto-Sync'}
            </span>
            <span className="text-[10px] text-blue-200 font-medium">Updated: {lastUpdated.toLocaleTimeString()}</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight flex items-center gap-3">
            Welcome, {user?.name?.split(' ')[0] || 'Admin'}! 👋
          </h1>
          <p className="text-blue-200 mt-2 text-sm md:text-base font-medium max-w-xl">
            {isAdmin ? "Here is the 360° overview of operations, finances, and team performance." : "Here is your daily task and prospect overview."}
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-3">
          {stats.todaysRemindersCount > 0 && (
            <button 
              onClick={() => setIsFollowUpModalOpen(true)}
              className="bg-rose-500 hover:bg-rose-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg flex items-center gap-2 animate-bounce cursor-pointer"
            >
              <CalendarDays size={18} /> Due Today ({stats.todaysRemindersCount})
            </button>
          )}
          <div className="bg-white/10 backdrop-blur-md px-5 py-2.5 rounded-xl border border-white/20 text-sm font-bold flex items-center gap-2">
            <Clock size={18} className="text-blue-300" />
            {currentDate}
          </div>
        </div>
      </div>
      
      {/* CRITICAL ALERTS */}
      {isAdmin && stats.criticalAlerts.length > 0 && (
          <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-xl shadow-sm animate-in slide-in-from-top-2">
              <div className="flex items-center gap-2 mb-2">
                  <BellRing size={18} className="text-rose-600 animate-pulse"/>
                  <h3 className="text-sm font-bold text-rose-800">Critical Client Alerts</h3>
              </div>
              <ul className="space-y-1 ml-6 list-disc text-xs text-rose-700 font-medium">
                  {stats.criticalAlerts.map(alert => (
                      <li key={alert.id}>
                          <strong>{alert.name}</strong> - {alert.issue} 
                          <Link to={alert.link} className="ml-2 underline text-blue-600 hover:text-blue-800">Review</Link>
                      </li>
                  ))}
              </ul>
          </div>
      )}

      {/* FINANCIALS & HR OVERVIEW (Admin Only) */}
      {isAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4 duration-500">
          
          {/* Revenue Graph Card */}
          <div className="lg:col-span-1 bg-white rounded-3xl border border-slate-200 shadow-sm p-6 flex flex-col items-center justify-center hover:-translate-y-1 transition-transform duration-300 relative overflow-hidden">
            {/* 🔴 NEW FOC BADGE */}
            <div className="absolute top-4 right-4 bg-purple-50 border border-purple-100 px-3 py-1.5 rounded-lg flex flex-col items-end shadow-sm">
                <span className="text-[9px] font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1"><Gift size={10}/> Free of Cost</span>
                <span className="text-sm font-black text-purple-600">{stats.focClientsCount} Files</span>
            </div>

            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-6 w-full text-left flex items-center gap-2">
              <Activity size={16} className="text-blue-600"/> Revenue Overview
            </h2>
            
            {/* CSS DONUT CHART */}
            <div className="relative w-36 h-36 rounded-full flex items-center justify-center shadow-inner" 
                 style={{ background: `conic-gradient(#10b981 ${stats.revenuePercentage}%, #f1f5f9 ${stats.revenuePercentage}%)` }}>
              <div className="absolute w-24 h-24 bg-white rounded-full flex flex-col items-center justify-center shadow-sm">
                <span className="text-2xl font-black text-slate-800">{stats.revenuePercentage}%</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Received</span>
              </div>
            </div>
            
            <div className="w-full mt-6 space-y-3">
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2 font-bold text-slate-700"><span className="w-3 h-3 rounded-full bg-emerald-500"></span> Received</div>
                <div className="font-black text-emerald-600 flex items-center"><IndianRupee size={12}/> {stats.totalReceived.toLocaleString('en-IN')}</div>
              </div>
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2 font-bold text-slate-700"><span className="w-3 h-3 rounded-full bg-slate-200"></span> Pending</div>
                <div className="font-black text-rose-500 flex items-center"><IndianRupee size={12}/> {stats.totalPending.toLocaleString('en-IN')}</div>
              </div>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group hover:-translate-y-1">
              <div className="absolute top-0 right-0 w-20 h-20 bg-blue-50 rounded-bl-full -z-0 group-hover:scale-110 transition-transform"></div>
              <div className="relative z-10 flex flex-col h-full justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Total Expected Revenue</p>
                  <h3 className="text-3xl font-black text-blue-600 flex items-center"><IndianRupee size={28} className="mr-0.5" />{stats.totalRevenue.toLocaleString('en-IN')}</h3>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-blue-500 bg-blue-50 px-2 py-1 rounded-lg"><Receipt size={14} /> Overall Business</div>
                  <div className="h-10 w-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center"><Wallet size={20} /></div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group hover:-translate-y-1">
              <div className="absolute top-0 right-0 w-20 h-20 bg-amber-50 rounded-bl-full -z-0 group-hover:scale-110 transition-transform"></div>
              <div className="relative z-10 flex flex-col h-full justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Total Tasks & Files</p>
                  <h3 className="text-3xl font-black text-slate-800">{stats.totalClients}</h3>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg"><CheckCircle2 size={14} /> {stats.paidClientsCount} Fully Paid</div>
                  <div className="h-10 w-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center"><Users size={20} /></div>
                </div>
              </div>
            </div>
            
            {/* Live HR Attendance */}
            <div className="sm:col-span-2 bg-gradient-to-r from-slate-800 to-slate-900 p-6 rounded-3xl border border-slate-800 shadow-lg text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 opacity-10"><UsersRound size={120} className="-mt-4 -mr-4" /></div>
              <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">Today's Workforce</p>
                  <h3 className="text-3xl font-black flex items-end gap-2">
                    {stats.presentCount} <span className="text-lg text-slate-400 font-medium mb-1">/ {stats.totalEmps} Present</span>
                  </h3>
                </div>
                
                <div className="flex gap-4 w-full sm:w-auto">
                  <div className="bg-white/10 backdrop-blur px-4 py-3 rounded-2xl flex-1 sm:w-32 border border-white/10">
                    <p className="text-[10px] uppercase text-emerald-400 font-bold mb-0.5">Present / WFH</p>
                    <p className="text-xl font-black">{stats.presentCount}</p>
                  </div>
                  <div className="bg-rose-500/20 backdrop-blur px-4 py-3 rounded-2xl flex-1 sm:w-32 border border-rose-500/20">
                    <p className="text-[10px] uppercase text-rose-400 font-bold mb-0.5">Absent / Leave</p>
                    <p className="text-xl font-black text-rose-300">{stats.absentCount}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LATEST ACTIVITY TICKER & OPERATIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-6 duration-500 delay-100">
        
        {/* Activity Ticker */}
        <div className="lg:col-span-3 bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-indigo-600 text-white flex items-center justify-center animate-pulse shadow-md">
              <Sparkles size={18} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-indigo-500 tracking-wider">Latest Team Activity</p>
              {stats.latestTask ? (
                <p className="text-sm font-semibold text-indigo-900 mt-0.5">
                  <strong className="font-black">{stats.latestTask.assignedTo?.name || 'Someone'}</strong> updated task 
                  <span className="mx-1 px-1.5 py-0.5 bg-white rounded border border-indigo-200 text-xs font-mono">{stats.latestTask.taskId}</span> 
                  to <strong className="text-indigo-600">{stats.latestTask.currentStatus}</strong>
                </p>
              ) : (
                <p className="text-sm font-semibold text-indigo-900 mt-0.5">No recent activity detected today.</p>
              )}
            </div>
          </div>
          {stats.latestTask && (
            <div className="text-xs font-bold text-indigo-400 bg-white px-3 py-1.5 rounded-lg border border-indigo-100 shrink-0">
              {new Date(stats.latestTask.updatedAt).toLocaleTimeString()}
            </div>
          )}
        </div>

        {/* Task Stats */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-blue-500 hover:-translate-y-1 transition-transform">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Open Tasks</p>
          <div className="flex items-end justify-between">
            <h3 className="text-3xl font-black text-slate-800">{stats.activeTasks}</h3>
            <ClipboardList className="text-blue-200" size={32} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-rose-500 hover:-translate-y-1 transition-transform">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Overdue Tasks</p>
          <div className="flex items-end justify-between">
            <h3 className="text-3xl font-black text-rose-600">{stats.overdueTasks}</h3>
            <AlertTriangle className="text-rose-200" size={32} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-amber-500 hover:-translate-y-1 transition-transform">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Hot Lead Prospects</p>
          <div className="flex items-end justify-between">
            <h3 className="text-3xl font-black text-amber-600">{stats.hotLeads}</h3>
            <TrendingUp className="text-amber-200" size={32} />
          </div>
        </div>
      </div>
      
      {/* TOP DEFAULTERS WIDGET */}
      {isAdmin && stats.topDefaulters.length > 0 && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-shadow">
               <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                 <AlertCircle size={16} className="text-rose-500"/> Top 5 Defaulters (Pending Dues)
               </h2>
               <div className="overflow-x-auto">
                 <table className="w-full text-left text-sm">
                     <thead>
                         <tr className="border-b border-slate-100 text-slate-500 text-xs font-semibold">
                             <th className="py-2">Client Name</th>
                             <th className="py-2">Mobile</th>
                             <th className="py-2 text-right">Pending Due</th>
                             <th className="py-2 text-center">Action</th>
                         </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-50">
                         {stats.topDefaulters.map((defaulter, idx) => (
                             <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                 <td className="py-3 font-bold text-slate-800">{defaulter.name} <span className="ml-2 text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{defaulter.source}</span></td>
                                 <td className="py-3 text-slate-600">{defaulter.mobile || 'N/A'}</td>
                                 <td className="py-3 font-black text-rose-600 text-right">₹{defaulter.due.toLocaleString('en-IN')}</td>
                                 <td className="py-3 text-center">
                                     <a href={`https://wa.me/91${defaulter.mobile}?text=Dear%20${defaulter.name},%20this%20is%20a%20reminder%20for%20your%20pending%20payment%20of%20Rs.%20${defaulter.due}.%20Please%20clear%20the%20dues%20at%20the%20earliest.`} target="_blank" rel="noreferrer" className="inline-block bg-emerald-50 text-emerald-700 px-3 py-1 text-xs font-bold rounded-md hover:bg-emerald-100 transition-colors">WhatsApp</a>
                                 </td>
                             </tr>
                         ))}
                     </tbody>
                 </table>
               </div>
          </div>
      )}

      {/* PIPELINES & ACTION LINKS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-8 duration-500 delay-200">
        
        {/* PIPELINES */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-shadow">
            <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2"><TrendingUp size={20} className="text-blue-600" /> Leads Conversion Funnel</h2>
            <div className="flex flex-col gap-5">
              <div className="flex items-center gap-4">
                <div className="w-24 text-xs font-bold text-slate-500 uppercase text-right">Fresh</div>
                <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden"><div className="bg-blue-500 h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${Math.min((stats.newLeads / (stats.totalLeads || 1)) * 100, 100)}%` }}></div></div>
                <div className="w-8 text-sm font-black text-slate-700">{stats.newLeads}</div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-24 text-xs font-bold text-slate-500 uppercase text-right">In Progress</div>
                <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden"><div className="bg-amber-400 h-full rounded-full transition-all duration-1000 ease-out delay-100" style={{ width: `${Math.min(((stats.totalLeads - stats.newLeads - stats.convertedLeads) / (stats.totalLeads || 1)) * 100, 100)}%` }}></div></div>
                <div className="w-8 text-sm font-black text-slate-700">{stats.totalLeads - stats.newLeads - stats.convertedLeads}</div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-24 text-xs font-bold text-slate-500 uppercase text-right">Converted</div>
                <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden"><div className="bg-emerald-500 h-full rounded-full transition-all duration-1000 ease-out delay-200" style={{ width: `${Math.min((stats.convertedLeads / (stats.totalLeads || 1)) * 100, 100)}%` }}></div></div>
                <div className="w-8 text-sm font-black text-slate-700">{stats.convertedLeads}</div>
              </div>
            </div>
            <div className="mt-6 pt-5 border-t border-slate-100 text-right">
              <Link to="/leads" className="text-sm font-bold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 bg-blue-50 px-4 py-2 rounded-lg transition-colors">Open Leads Master <ArrowRight size={16} /></Link>
            </div>
          </div>
          
          {/* SERVICE BREAKDOWN */}
          {isAdmin && (
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-shadow">
                 <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                     <PieChart size={16} className="text-blue-600"/> Service Distribution
                 </h2>
                 <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
                     <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100">
                         <p className="text-[10px] font-bold text-indigo-500 uppercase">ITR</p>
                         <p className="text-xl font-black text-indigo-700 mt-1">{stats.serviceBreakdown.ITR}</p>
                     </div>
                     <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                         <p className="text-[10px] font-bold text-emerald-500 uppercase">GST</p>
                         <p className="text-xl font-black text-emerald-700 mt-1">{stats.serviceBreakdown.GST}</p>
                     </div>
                     <div className="bg-amber-50 p-3 rounded-xl border border-amber-100">
                         <p className="text-[10px] font-bold text-amber-500 uppercase">ROC</p>
                         <p className="text-xl font-black text-amber-700 mt-1">{stats.serviceBreakdown.ROC}</p>
                     </div>
                     <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
                         <p className="text-[10px] font-bold text-blue-500 uppercase">Audit</p>
                         <p className="text-xl font-black text-blue-700 mt-1">{stats.serviceBreakdown.Audit}</p>
                     </div>
                     <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                         <p className="text-[10px] font-bold text-slate-500 uppercase">Other</p>
                         <p className="text-xl font-black text-slate-700 mt-1">{stats.serviceBreakdown.Other}</p>
                     </div>
                 </div>
              </div>
          )}
        </div>

        {/* QUICK ACTIONS */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-5">Quick Jump Menu</h2>
          <div className="space-y-3">
            <Link to="/leads" className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-blue-50 transition-all hover:scale-[1.02] group shadow-sm hover:shadow">
              <div className="flex items-center gap-3"><div className="bg-white p-2.5 rounded-xl text-blue-600 shadow-sm"><UserCircle size={20} /></div><div className="text-sm font-bold text-slate-700">Add New Lead</div></div>
              <ArrowRight size={16} className="text-slate-400 group-hover:text-blue-600" />
            </Link>
            <Link to="/clients" className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-emerald-50 transition-all hover:scale-[1.02] group shadow-sm hover:shadow">
              <div className="flex items-center gap-3"><div className="bg-white p-2.5 rounded-xl text-emerald-600 shadow-sm"><Users size={20} /></div><div className="text-sm font-bold text-slate-700">Manage Clients</div></div>
              <ArrowRight size={16} className="text-slate-400 group-hover:text-emerald-600" />
            </Link>
            <Link to="/work-management" className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-indigo-50 transition-all hover:scale-[1.02] group shadow-sm hover:shadow">
              <div className="flex items-center gap-3"><div className="bg-white p-2.5 rounded-xl text-indigo-600 shadow-sm"><ClipboardList size={20} /></div><div className="text-sm font-bold text-slate-700">Work Management</div></div>
              <ArrowRight size={16} className="text-slate-400 group-hover:text-indigo-600" />
            </Link>
            {isAdmin && (
              <Link to="/hr/attendance" className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-orange-50 transition-all hover:scale-[1.02] group shadow-sm hover:shadow">
                <div className="flex items-center gap-3"><div className="bg-white p-2.5 rounded-xl text-orange-600 shadow-sm"><UsersRound size={20} /></div><div className="text-sm font-bold text-slate-700">Attendance Log</div></div>
                <ArrowRight size={16} className="text-slate-400 group-hover:text-orange-600" />
              </Link>
            )}
            
            {/* DEADLINE REMINDERS SHORTCUT */}
            {isAdmin && (
                <div className="mt-6 pt-4 border-t border-slate-200">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Statutory Deadlines</p>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs p-2 rounded-lg bg-indigo-50 text-indigo-700 font-semibold border border-indigo-100">
                            <span>GSTR-1</span>
                            <span>11th of Month</span>
                        </div>
                        <div className="flex justify-between items-center text-xs p-2 rounded-lg bg-indigo-50 text-indigo-700 font-semibold border border-indigo-100">
                            <span>GSTR-3B</span>
                            <span>20th of Month</span>
                        </div>
                        <div className="flex justify-between items-center text-xs p-2 rounded-lg bg-emerald-50 text-emerald-700 font-semibold border border-emerald-100">
                            <span>Adv Tax Installment</span>
                            <span>15th Dec</span>
                        </div>
                    </div>
                </div>
            )}
            
          </div>
        </div>
      </div>

      {/* MODAL: TODAY'S FOLLOW UPS */}
      {isFollowUpModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-slate-50 rounded-3xl w-full max-w-3xl shadow-2xl border border-slate-100 flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
            
            <div className="flex justify-between items-center px-6 py-5 border-b border-slate-200 bg-white rounded-t-3xl">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold border border-rose-100">
                  <CalendarDays size={24} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-800 tracking-tight">Scheduled Reminders</h2>
                  <p className="text-xs text-slate-500 font-bold">{todaysReminders.length} items requiring attention today</p>
                </div>
              </div>
              <button onClick={() => setIsFollowUpModalOpen(false)} className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="overflow-y-auto p-6 space-y-4 custom-scrollbar">
              {todaysReminders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                  <CheckCircle2 size={48} className="text-emerald-400 mb-3" />
                  <p className="text-sm font-bold text-slate-600">All caught up!</p>
                  <p className="text-xs font-medium">No tasks or reminders scheduled for today.</p>
                </div>
              ) : (
                todaysReminders.map(item => {
                  const isLead = item.notifType === 'lead';
                  
                  return (
                    <div 
                      key={item._id} 
                      className={`bg-white shadow-sm rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-5 border transition-all hover:-translate-y-1 ${
                        isLead 
                          ? 'border-purple-100 border-l-4 border-l-purple-500 shadow-purple-100/50' 
                          : 'border-blue-100 border-l-4 border-l-blue-500 shadow-blue-100/50'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`shrink-0 h-12 w-12 rounded-full flex items-center justify-center border ${isLead ? 'bg-purple-50 text-purple-600 border-purple-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                          {isLead ? <Phone size={20} /> : <FileText size={20} />}
                        </div>

                        <div>
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${isLead ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                              {isLead ? 'Lead Follow-up' : `${item.service || 'Service'} Reminder`}
                            </span>
                            <span className="text-[10px] font-bold text-slate-500 font-mono bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                              ID: {isLead ? item.leadId : item.clientId}
                            </span>
                          </div>
                          
                          <h3 className="font-black text-slate-800 text-lg leading-tight">
                            {isLead ? item.name : item.assesseeName}
                          </h3>
                          
                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 font-medium mt-2">
                            <span className="flex items-center gap-1">
                              <Phone size={12} className="text-slate-400" /> {item.mobile}
                            </span>
                            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                            <span>
                              {isLead 
                                ? (Array.isArray(item.queryService) ? item.queryService.join(', ') : item.queryService || 'General Inquiry')
                                : (item.service || 'Client Service')}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto border-t sm:border-t-0 border-slate-100 pt-3 sm:pt-0 w-full sm:w-auto justify-end">
                        <button 
                          onClick={() => {
                            setIsFollowUpModalOpen(false);
                            if (isLead) {
                              navigate('/leads', { state: { openLeadId: item._id } });
                            } else {
                              navigate(`/clients?service=${item.service || 'ITR Filing'}`, { state: { openClientId: item._id } });
                            }
                          }}
                          className={`px-5 py-2.5 text-white rounded-xl text-xs font-bold transition-colors shadow-sm ${isLead ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-600/20' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'}`}
                        >
                          {isLead ? 'Open Lead' : 'Open Client'}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            
          </div>
        </div>
      )}

    </div>
  );
};

export default Dashboard;