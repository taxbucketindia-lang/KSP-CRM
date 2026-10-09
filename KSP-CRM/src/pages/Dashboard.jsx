import { isAdminRole } from '../utils/roles';
import { useState, useEffect, useContext, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import toast, { Toaster } from 'react-hot-toast';
import { 
  Users, Wallet, Briefcase, TrendingUp, ArrowRight,
  Activity, UserCircle, Clock, IndianRupee, CheckCircle2, AlertCircle,
  Phone, CalendarDays, X, FileText, CalendarClock,
  ClipboardList, UsersRound, AlertTriangle, Receipt, Sparkles, PieChart, BellRing, Gift, Cake,
  LogIn, LogOut, MapPin
} from 'lucide-react';

const formatTo12Hour = (timeStr) => {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':');
  let hours = parseInt(h, 10);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; 
  return `${hours}:${m} ${ampm}`;
};

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const [data, setData] = useState({ 
    leads: [], clients: [], tasks: [], employees: [], attendance: [],
    itr: [], gst: [], roc: [], audit: [], invoices: [], clientMaster: []
  });
  
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);

  const [punchLoading, setPunchLoading] = useState(false);

  const isAdmin = isAdminRole(user?.role);

  const fetchMegaDashboardData = async (silent = false) => {
    if (!silent) setLoading(true);
    else setIsRefreshing(true);

    try {
      const headers = { Authorization: `Bearer ${user.token}` };
      
      const [leadsRes, clientsRes, tasksRes, empRes, attRes, itrRes, gstRes, rocRes, auditRes, invoicesRes, clientMasterRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_URL}/leads`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${import.meta.env.VITE_API_URL}/clients`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${import.meta.env.VITE_API_URL}/tasks`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${import.meta.env.VITE_API_URL}/hr/employees`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${import.meta.env.VITE_API_URL}/hr/attendance`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${import.meta.env.VITE_API_URL}/itr`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${import.meta.env.VITE_API_URL}/gst`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${import.meta.env.VITE_API_URL}/roc`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${import.meta.env.VITE_API_URL}/audit`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${import.meta.env.VITE_API_URL}/invoices`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${import.meta.env.VITE_API_URL}/client-master`, { headers }).catch(() => ({ data: [] }))
      ]);

      // STRCIT ARRAY CHECKS APPLIED HERE TO PREVENT CRASHES
      setData({
        leads: Array.isArray(leadsRes.data) ? leadsRes.data : (leadsRes.data?.leads || []),
        clients: Array.isArray(clientsRes.data) ? clientsRes.data : (clientsRes.data?.clients || []),
        tasks: Array.isArray(tasksRes.data) ? tasksRes.data : (tasksRes.data?.tasks || []),
        employees: Array.isArray(empRes.data) ? empRes.data : (empRes.data?.employees || []),
        attendance: Array.isArray(attRes.data) ? attRes.data : (attRes.data?.attendance || []),
        itr: Array.isArray(itrRes.data) ? itrRes.data : (itrRes.data?.data || []),
        gst: Array.isArray(gstRes.data) ? gstRes.data : (gstRes.data?.data || []),
        roc: Array.isArray(rocRes.data) ? rocRes.data : (rocRes.data?.data || []),
        audit: Array.isArray(auditRes.data) ? auditRes.data : (auditRes.data?.data || []),
        invoices: Array.isArray(invoicesRes.data?.data) ? invoicesRes.data.data : (Array.isArray(invoicesRes.data) ? invoicesRes.data : []),
        clientMaster: Array.isArray(clientMasterRes.data?.data) ? clientMasterRes.data.data : (Array.isArray(clientMasterRes.data) ? clientMasterRes.data : [])
      });
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Error fetching mega dashboard data:", error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMegaDashboardData(); 

    const intervalId = setInterval(() => {
      fetchMegaDashboardData(true); 
    }, 30000); 

    return () => clearInterval(intervalId); 
    // eslint-disable-next-line
  }, [user.token]);

  const localToday = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];

  const myEmpRecord = useMemo(() => {
    return data.employees.find(e => e.email === user.email || (e.userId && (e.userId._id === user._id || e.userId === user._id)));
  }, [data.employees, user]);

  const myTodayAttendance = useMemo(() => {
    if (!myEmpRecord) return null;
    return data.attendance.find(a => {
       const empId = a.employee?._id || a.employee; 
       return empId === myEmpRecord._id && a.date && a.date.startsWith(localToday);
    });
  }, [data.attendance, myEmpRecord, localToday]);

  const fetchCurrentLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject("Geolocation is not supported by your browser.");
      } else {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            const googleMapsLink = `https://www.google.com/maps?q=${latitude},${longitude}`;
            try {
              const res = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
              if (res.data && res.data.display_name) {
                const addressParts = res.data.display_name.split(',');
                resolve(`${addressParts.slice(0, 3).join(',')}|${googleMapsLink}`);
              } else {
                resolve(`Lat: ${latitude.toFixed(2)}, Lng: ${longitude.toFixed(2)}|${googleMapsLink}`);
              }
            } catch (err) {
              resolve(`Lat: ${latitude.toFixed(2)}, Lng: ${longitude.toFixed(2)}|${googleMapsLink}`); 
            }
          },
          () => reject("Location access denied or failed.")
        );
      }
    });
  };

  const handleQuickPunch = async (type) => {
    if (!myEmpRecord) return toast.error("Your Employee profile is not linked. Contact Admin.");
    setPunchLoading(true);

    try {
      const locStr = await fetchCurrentLocation();
      const now = new Date();
      const timeStr = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');

      let payload = {
        employee: myEmpRecord._id,
        companyName: myEmpRecord.companyName || 'SkyEdge Taxbucket India',
        date: localToday,
        status: 'Present',
        remarks: 'Punched from Quick Dashboard'
      };

      if (type === 'IN') {
        payload.inTime = timeStr;
        payload.inLocation = locStr;
      } else if (type === 'OUT') {
        if (!myTodayAttendance || !myTodayAttendance.inTime) {
          toast.error("Please punch in first!");
          setPunchLoading(false);
          return;
        }
        payload.inTime = myTodayAttendance.inTime;
        payload.inLocation = myTodayAttendance.inLocation;
        payload.outTime = timeStr;
        payload.outLocation = locStr;

        const [inH, inM] = payload.inTime.split(':').map(Number);
        const [outH, outM] = payload.outTime.split(':').map(Number);
        let diffMins = (outH * 60 + outM) - (inH * 60 + inM);
        if (diffMins < 0) diffMins += 24 * 60; 
        payload.totalHours = `${Math.floor(diffMins / 60)}h ${diffMins % 60}m`;
      }

      const headers = { Authorization: `Bearer ${user.token}` };
      await axios.post(`${import.meta.env.VITE_API_URL}/hr/attendance`, { records: [payload] }, { headers });

      toast.success(`Successfully Punched ${type}! Location captured.`);
      fetchMegaDashboardData(true);

    } catch (error) {
      toast.error(typeof error === 'string' ? error : "Failed to punch attendance.");
    } finally {
      setPunchLoading(false);
    }
  };


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

    const leadReminders = (Array.isArray(data.leads) ? data.leads : []).filter(l => l.status === 'Follow-up' && isDue(l.nextFollowUpDate)).map(l => ({ ...l, notifType: 'lead' }));
    const clientReminders = (Array.isArray(data.clients) ? data.clients : []).filter(c => isDue(c.nextReminderDate)).map(c => ({ ...c, notifType: 'client' }));

    return [...leadReminders, ...clientReminders];
  }, [data.leads, data.clients]);

  const stats = useMemo(() => {
    const { leads, clients, tasks, employees, attendance, itr, gst, roc, audit, invoices, clientMaster } = data;
    
    let totalRevenue = 0;
    let totalReceived = 0;
    let totalPending = 0;
    let focClientsCount = 0; 
    
    const defaultersMap = new Map();

    // 1. ADD CLIENT MASTER OPENING BALANCES FIRST
    if (Array.isArray(clientMaster)) {
      clientMaster.forEach(client => {
        const openingBal = Number(client.openingBalance || 0);
        if (openingBal > 0) {
          totalRevenue += openingBal;
          totalPending += openingBal;
          
          const clientName = client.name || 'Unknown Client';
          defaultersMap.set(clientName, {
            name: clientName,
            mobile: client.mobile || '',
            due: openingBal,
            id: client._id,
            source: 'Opening Balance'
          });
        }
      });
    }

    // 2. THEN ADD INVOICES DATA
    if (Array.isArray(invoices)) {
      invoices.forEach(inv => {
        const invTotal = Number(inv.totalAmountAfterTax || 0);
        let invReceived = Number(inv.amountReceived || 0);
        
        if (inv.paymentStatus === 'Paid' && invReceived === 0) {
          invReceived = invTotal;
        }
        
        const due = invTotal - invReceived;

        totalRevenue += invTotal;
        totalReceived += invReceived;
        
        if (inv.feeStatus === 'FOC') focClientsCount++; 
        
        if (due > 0 && inv.paymentStatus !== 'Paid') {
          totalPending += due;
          const clientName = inv.customer?.name || inv.clientName || 'Unknown Client';
          const mobile = inv.customer?.phone || '';
          
          if (defaultersMap.has(clientName)) {
             defaultersMap.get(clientName).due += due;
             if (!defaultersMap.get(clientName).source.includes('Invoice')) {
               defaultersMap.get(clientName).source += ' + Invoice';
             }
          } else {
             defaultersMap.set(clientName, { name: clientName, mobile, due, id: inv._id, source: 'Invoice' });
          }
        }
      });
    }

    const defaulters = Array.from(defaultersMap.values());
    const topDefaulters = defaulters.sort((a,b) => b.due - a.due).slice(0,5);

    const revenuePercentage = totalRevenue > 0 ? Math.round((totalReceived / totalRevenue) * 100) : 0;
    const paidClientsCount = Array.isArray(invoices) ? invoices.filter(i => i.paymentStatus === 'Paid').length : 0;
    const totalInvoicesCount = Array.isArray(invoices) ? invoices.length : 0;

    const safeLeads = Array.isArray(leads) ? leads : [];
    const newLeads = safeLeads.filter(l => l.status === 'New').length;
    const hotLeads = safeLeads.filter(l => l.priority === 'Hot').length;
    const convertedLeads = safeLeads.filter(l => l.status === 'Converted').length;
    
    const safeTasks = Array.isArray(tasks) ? tasks : [];
    const activeTasks = safeTasks.filter(t => !['Completed', 'Approved'].includes(t.currentStatus)).length;
    const overdueTasks = safeTasks.filter(t => t.isOverdue).length;
    const sortedTasks = [...safeTasks].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    const latestTask = sortedTasks.length > 0 ? sortedTasks[0] : null;

    const criticalAlerts = [];
    if (Array.isArray(gst)) {
      gst.forEach(g => {
          if(g.gstStatus === 'Error/Mismatch') criticalAlerts.push({ name: g.tradeName || g.assesseeName, issue: 'Error/Mismatch in GST', id: g._id, link: '/clients?service=GST%20Registration' });
      });
    }
    
    if (Array.isArray(itr)) {
      itr.forEach(i => {
          if(i.itrProcessedStatus === 'Defective') criticalAlerts.push({ name: i.assesseeName, issue: 'Defective ITR', id: i._id, link: '/clients?service=ITR%20Filing' });
      });
    }

    const offset = new Date().getTimezoneOffset() * 60000;
    const localToday = new Date(Date.now() - offset).toISOString().split('T')[0];
    
    const activeEmployees = (Array.isArray(employees) ? employees : []).filter(e => e.status === 'Active');
    const totalEmps = activeEmployees.length;
    
    let presentCount = 0;
    let absentCount = 0;

    if (Array.isArray(attendance)) {
        const todaysRecords = attendance.filter(a => a.date && a.date.startsWith(localToday));
        todaysRecords.forEach(a => {
            if (['Present', 'WFH', 'Half Day'].includes(a.status)) {
                presentCount++;
            } else if (['Absent', 'Leave'].includes(a.status)) {
                absentCount++;
            }
        });
    }

    const notMarkedCount = totalEmps > 0 ? (totalEmps - presentCount - absentCount) : 0;

    const serviceBreakdown = {
      ITR: Array.isArray(itr) ? itr.length : 0,
      GST: Array.isArray(gst) ? gst.length : 0,
      ROC: Array.isArray(roc) ? roc.length : 0,
      Audit: Array.isArray(audit) ? audit.length : 0,
      Other: Array.isArray(clients) ? clients.length : 0
    };

    return {
      totalInvoices: totalInvoicesCount,
      totalRevenue,
      totalPending,
      totalReceived,
      paidClientsCount,
      focClientsCount,
      revenuePercentage,
      topDefaulters,
      
      totalLeads: safeLeads.length,
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
      notMarkedCount,
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

      {/* LOCATION LOADER OVERLAY */}
      {punchLoading && (
          <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
               <div className="bg-white p-6 rounded-2xl flex flex-col items-center shadow-xl animate-in fade-in zoom-in-95">
                   <MapPin className="animate-bounce text-blue-500 mb-2" size={32} />
                   <p className="text-slate-800 font-bold">Capturing GPS Coordinates...</p>
                   <p className="text-xs text-slate-500 mt-1">Please allow location access if prompted.</p>
               </div>
          </div>
      )}

      {/* HERO HEADER WITH LIVE SYNC BADGE */}
      <div className="flex flex-col md:flex-row justify-between gap-6 bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 p-8 rounded-3xl text-white shadow-xl shadow-blue-900/20 relative overflow-hidden group">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-colors duration-1000"></div>
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-32 h-32 bg-blue-500/20 rounded-full blur-2xl"></div>
        
        {/* LEFT SECTION */}
        <div className="relative z-10 flex flex-col justify-end">
          <div className="flex items-center gap-3 mb-3">
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
            {isAdmin ? "Here is the 360° overview of operations, financials, and team performance." : "Here is your daily task and prospect overview."}
          </p>
        </div>

        {/* RIGHT SECTION */}
        <div className="relative z-10 flex flex-col items-start md:items-end gap-3">
          
          {!isAdmin && (
             <div className="flex flex-wrap items-center gap-3 bg-white/10 backdrop-blur-md p-2.5 rounded-2xl border border-white/20 w-fit">
                <div className="text-[11px] font-bold uppercase tracking-wider text-blue-100 flex items-center gap-1 ml-2">
                   <Clock size={14}/> Quick Punch:
                </div>
                <button
                  onClick={() => handleQuickPunch('IN')}
                  disabled={punchLoading || myTodayAttendance?.inTime}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm ${myTodayAttendance?.inTime ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/30 cursor-not-allowed' : 'bg-emerald-500 hover:bg-emerald-600 text-white'}`}
                >
                   <LogIn size={14}/> {myTodayAttendance?.inTime ? `In (${formatTo12Hour(myTodayAttendance.inTime)})` : 'Punch In'}
                </button>
                <button
                  onClick={() => handleQuickPunch('OUT')}
                  disabled={punchLoading || !myTodayAttendance?.inTime || myTodayAttendance?.outTime}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm ${myTodayAttendance?.outTime ? 'bg-rose-500/20 text-rose-200 border border-rose-500/30 cursor-not-allowed' : !myTodayAttendance?.inTime ? 'bg-slate-500/40 text-slate-300 cursor-not-allowed border border-slate-500/30' : 'bg-rose-500 hover:bg-rose-600 text-white'}`}
                >
                   <LogOut size={14}/> {myTodayAttendance?.outTime ? `Out (${formatTo12Hour(myTodayAttendance.outTime)})` : 'Punch Out'}
                </button>
             </div>
          )}

          {stats.todaysRemindersCount > 0 && (
            <button 
              onClick={() => setIsFollowUpModalOpen(true)}
              className="bg-rose-500 hover:bg-rose-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg flex items-center justify-center gap-2 animate-bounce cursor-pointer w-full md:w-auto"
            >
              <CalendarDays size={18} /> Due Today ({stats.todaysRemindersCount})
            </button>
          )}

          <div className="bg-white/10 backdrop-blur-md px-5 py-2.5 rounded-xl border border-white/20 text-sm font-bold flex items-center justify-center gap-2 w-full md:w-auto mt-auto">
            <CalendarDays size={16} className="text-blue-300" />
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
                  {stats.criticalAlerts.map((alert, idx) => (
                      <li key={idx}>
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
            {stats.focClientsCount > 0 && (
              <div className="absolute top-4 right-4 bg-purple-50 border border-purple-100 px-3 py-1.5 rounded-lg flex flex-col items-end shadow-sm">
                  <span className="text-[9px] font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1"><Gift size={10}/> Free of Cost</span>
                  <span className="text-sm font-black text-purple-600">{stats.focClientsCount} Files</span>
              </div>
            )}

            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-6 w-full text-left flex items-center gap-2">
              <Activity size={16} className="text-blue-600"/> Revenue Overview
            </h2>
            
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
                  <div className="flex items-center gap-1.5 text-xs font-bold text-blue-500 bg-blue-50 px-2 py-1 rounded-lg"><Receipt size={14} /> From All Invoices & O.B.</div>
                  <div className="h-10 w-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center"><Wallet size={20} /></div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group hover:-translate-y-1">
              <div className="absolute top-0 right-0 w-20 h-20 bg-amber-50 rounded-bl-full -z-0 group-hover:scale-110 transition-transform"></div>
              <div className="relative z-10 flex flex-col h-full justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Total Client Base</p>
                  <h3 className="text-3xl font-black text-slate-800">{stats.totalInvoices}</h3>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg"><CheckCircle2 size={14} /> {stats.paidClientsCount} Invoices Fully Paid</div>
                  <div className="h-10 w-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center"><Users size={20} /></div>
                </div>
              </div>
            </div>
            
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
                  <div className="bg-emerald-500/20 backdrop-blur px-4 py-3 rounded-2xl flex-1 sm:w-28 border border-emerald-500/20">
                    <p className="text-[10px] uppercase text-emerald-400 font-bold mb-0.5">Present</p>
                    <p className="text-xl font-black text-emerald-300">{stats.presentCount}</p>
                  </div>
                  <div className="bg-rose-500/20 backdrop-blur px-4 py-3 rounded-2xl flex-1 sm:w-28 border border-rose-500/20">
                    <p className="text-[10px] uppercase text-rose-400 font-bold mb-0.5">Absent/Leave</p>
                    <p className="text-xl font-black text-rose-300">{stats.absentCount}</p>
                  </div>
                  <div className="bg-amber-500/20 backdrop-blur px-4 py-3 rounded-2xl flex-1 sm:w-28 border border-amber-500/20">
                    <p className="text-[10px] uppercase text-amber-400 font-bold mb-0.5">Unmarked</p>
                    <p className="text-xl font-black text-amber-300">{stats.notMarkedCount}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LATEST ACTIVITY TICKER & OPERATIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-6 duration-500 delay-100">
        
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
                                 <td className="py-3 font-bold text-slate-800">
                                   {defaulter.name} 
                                   <span className="ml-2 text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{defaulter.source}</span>
                                 </td>
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
            
            <Link to="/birthday-wishes" className="flex items-center justify-between p-3.5 rounded-2xl border border-pink-100 bg-pink-50/50 hover:bg-pink-100 transition-all hover:scale-[1.02] group shadow-sm hover:shadow">
              <div className="flex items-center gap-3"><div className="bg-white p-2.5 rounded-xl text-pink-600 shadow-sm"><Cake size={20} /></div><div className="text-sm font-bold text-slate-700">Birthday Wishes</div></div>
              <ArrowRight size={16} className="text-slate-400 group-hover:text-pink-600" />
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