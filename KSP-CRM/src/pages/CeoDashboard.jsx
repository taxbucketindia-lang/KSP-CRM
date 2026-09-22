import React, { useState, useEffect, useContext, useMemo } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { 
  TrendingUp, Users, Wallet, AlertOctagon, Trophy, 
  Target, Activity, ArrowUpRight, PieChart, Briefcase, 
  UserCheck, PhoneCall, CheckCircle2, History, ClipboardList,
  FileText, Image, IndianRupee, Banknote
} from 'lucide-react';

const CeoDashboard = () => {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    clients: [], leads: [], tasks: [], itr: [], gst: [], employees: [], invoices: [], attendance: []
  });

  useEffect(() => {
    const fetchCeoData = async () => {
      try {
        const headers = { Authorization: `Bearer ${user.token}` };
        const [clientsRes, leadsRes, tasksRes, itrRes, gstRes, empRes, invoiceRes, attRes] = await Promise.all([
          axios.get(`${import.meta.env.VITE_API_URL}/clients`, { headers }).catch(() => ({ data: [] })),
          axios.get(`${import.meta.env.VITE_API_URL}/leads`, { headers }).catch(() => ({ data: [] })),
          axios.get(`${import.meta.env.VITE_API_URL}/tasks`, { headers }).catch(() => ({ data: [] })),
          axios.get(`${import.meta.env.VITE_API_URL}/itr`, { headers }).catch(() => ({ data: [] })),
          axios.get(`${import.meta.env.VITE_API_URL}/gst`, { headers }).catch(() => ({ data: [] })),
          axios.get(`${import.meta.env.VITE_API_URL}/hr/employees`, { headers }).catch(() => ({ data: [] })),
          axios.get(`${import.meta.env.VITE_API_URL}/invoices`, { headers }).catch(() => ({ data: [] })),
          axios.get(`${import.meta.env.VITE_API_URL}/hr/attendance`, { headers }).catch(() => ({ data: [] }))
        ]);

        setData({
          clients: Array.isArray(clientsRes.data) ? clientsRes.data : (clientsRes.data?.clients || []),
          leads: Array.isArray(leadsRes.data) ? leadsRes.data : (leadsRes.data?.leads || []),
          tasks: Array.isArray(tasksRes.data) ? tasksRes.data : [],
          itr: Array.isArray(itrRes.data) ? itrRes.data : [],
          gst: Array.isArray(gstRes.data) ? gstRes.data : [],
          employees: Array.isArray(empRes.data) ? empRes.data : [],
          invoices: Array.isArray(invoiceRes.data) ? invoiceRes.data : (invoiceRes.data?.invoices || []),
          attendance: Array.isArray(attRes.data) ? attRes.data : []
        });
      } catch (error) {
        console.error("Error fetching CEO data", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCeoData();
  }, [user.token]);

  // CEO Level Analytics Calculation
  const analytics = useMemo(() => {
    const { clients, leads, tasks, itr, gst, employees, invoices, attendance } = data;
    
    // 1. Finances
    let totalRevenue = 0;
    let totalCollected = 0;
    
    const calculateMoney = (item) => {
      const fee = Number(item.feeAmount || 0);
      const rec = Number(item.amountReceived || 0);
      totalRevenue += fee;
      totalCollected += rec;
    };
    
    if (Array.isArray(clients)) clients.forEach(calculateMoney);
    if (Array.isArray(itr)) itr.forEach(calculateMoney);
    if (Array.isArray(gst)) gst.forEach(calculateMoney);
    
    const outstanding = totalRevenue - totalCollected;
    const collectionRate = totalRevenue > 0 ? Math.round((totalCollected / totalRevenue) * 100) : 0;

    // 2. Client Base
    const activeWorkspaces = (itr?.length || 0) + (gst?.length || 0);

    // 3. Sales & Leads Funnel
    const totalLeads = leads?.length || 0;
    const newLeads = Array.isArray(leads) ? leads.filter(l => l.status === 'New').length : 0;
    const inTalksLeads = Array.isArray(leads) ? leads.filter(l => l.status === 'Follow-up').length : 0;
    const convertedLeads = Array.isArray(leads) ? leads.filter(l => l.status === 'Converted').length : 0;
    const conversionRate = totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0;

    let leadServiceItr = 0;
    let leadServiceGst = 0;
    let leadServiceReg = 0;
    
    if (Array.isArray(leads)) {
      leads.filter(l => l.status === 'Converted').forEach(l => {
          const serviceArr = Array.isArray(l.queryService) ? l.queryService : [l.queryService || ''];
          serviceArr.forEach(srv => {
              const s = srv.toLowerCase();
              if (s.includes('itr')) leadServiceItr++;
              else if (s.includes('gst')) leadServiceGst++;
              else leadServiceReg++;
          });
      });
    }

    // 4. Operations
    const overdueTasks = Array.isArray(tasks) ? tasks.filter(t => t.isOverdue && t.currentStatus !== 'Completed').length : 0;
    const defectiveItr = Array.isArray(itr) ? itr.filter(i => i.itrProcessedStatus === 'Defective').length : 0;
    const gstErrors = Array.isArray(gst) ? gst.filter(g => g.gstStatus === 'Error/Mismatch').length : 0;
    const totalCriticalIssues = defectiveItr + gstErrors;

    // 5. EMPLOYEE PERFORMANCE LEADERBOARD
    const employeeStats = [];
    if (Array.isArray(employees) && Array.isArray(tasks)) {
      employees.forEach(emp => {
          const empTasks = tasks.filter(t => t.assignedTo && (t.assignedTo._id === emp._id || t.assignedTo === emp._id));
          if(empTasks.length > 0) {
              const completed = empTasks.filter(t => t.currentStatus === 'Completed').length;
              const pending = empTasks.filter(t => t.currentStatus !== 'Completed').length;
              const overdue = empTasks.filter(t => t.isOverdue && t.currentStatus !== 'Completed').length;
              
              employeeStats.push({
                  name: emp.name,
                  designation: emp.designation || 'Staff',
                  totalAssigned: empTasks.length,
                  completed,
                  pending,
                  overdue,
                  score: completed 
              });
          }
      });
      employeeStats.sort((a,b) => b.score - a.score);
    }

    // 🔴 6. GENERAL LIVE TEAM ACTIVITY LOG (COMPREHENSIVE FIX)
    let allActivities = [];

    // Leads Actions
    if (Array.isArray(leads)) {
        leads.forEach(l => {
            const time = new Date(l.updatedAt || l.createdAt);
            const isCreation = l.createdAt === l.updatedAt;
            allActivities.push({
                id: `lead-${l._id}`,
                action: isCreation ? 'added a new Lead:' : `updated Lead status to [${l.status}]:`,
                subject: l.name,
                user: l.createdBy?.name || 'An Employee',
                time: time,
                icon: UserCheck,
                color: 'text-purple-600', bg: 'bg-purple-100'
            });
        });
    }

    // Clients Actions
    if (Array.isArray(clients)) {
        clients.forEach(c => {
            const time = new Date(c.updatedAt || c.createdAt);
            const isCreation = c.createdAt === c.updatedAt;
            allActivities.push({
                id: `client-${c._id}`,
                action: isCreation ? 'created CRM profile for' : 'updated CRM record of',
                subject: c.assesseeName,
                user: c.createdBy?.name || 'An Employee',
                time: time,
                icon: Users,
                color: 'text-amber-600', bg: 'bg-amber-100'
            });
        });
    }

    // Tasks Actions
    if (Array.isArray(tasks)) {
      tasks.forEach(t => {
        const time = new Date(t.updatedAt || t.createdAt);
        const isCreation = t.createdAt === t.updatedAt;
        allActivities.push({
          id: `task-${t._id}`,
          action: isCreation ? 'created a new task' : `updated task status to [${t.currentStatus}]`,
          subject: `Task #${t.taskId}`,
          user: t.assignedTo?.name || 'An Employee',
          time: time,
          icon: ClipboardList,
          color: 'text-blue-600', bg: 'bg-blue-100'
        });
      });
    }
    
    // ITR Actions
    if (Array.isArray(itr)) {
      itr.forEach(i => {
        const time = new Date(i.updatedAt || i.createdAt);
        const isCreation = i.createdAt === i.updatedAt;
        allActivities.push({
          id: `itr-${i._id}`,
          action: isCreation ? 'added to ITR workspace:' : 'updated ITR filing details for',
          subject: i.assesseeName || 'Client',
          user: i.createdBy?.name || i.itrFiledBy || 'An Employee',
          time: time,
          icon: Briefcase,
          color: 'text-indigo-600', bg: 'bg-indigo-100'
        });
      });
    }

    // GST Actions
    if (Array.isArray(gst)) {
      gst.forEach(g => {
        const time = new Date(g.updatedAt || g.createdAt);
        const isCreation = g.createdAt === g.updatedAt;
        allActivities.push({
          id: `gst-${g._id}`,
          action: isCreation ? 'added to GST workspace:' : 'updated GST record for',
          subject: g.tradeName || g.assesseeName || 'Client',
          user: g.createdBy?.name || 'An Employee',
          time: time,
          icon: Briefcase,
          color: 'text-emerald-600', bg: 'bg-emerald-100'
        });
      });
    }

    // Sort ALL activities chronologically (latest first) and keep top 25
    allActivities.sort((a, b) => b.time - a.time);
    const recentActivities = allActivities.slice(0, 25);

    // 7. BILLING, INVOICE & SCREENSHOT AUDIT TRAIL
    let billingLogs = [];

    if (Array.isArray(invoices)) {
      invoices.forEach(inv => {
          billingLogs.push({
              id: `inv-${inv._id}`,
              clientName: inv.clientName || inv.assesseeName || 'Unknown Client',
              amount: inv.totalAmount || inv.amount || 0,
              action: 'Generated Invoice',
              user: inv.createdBy?.name || 'Admin',
              time: new Date(inv.createdAt || inv.updatedAt),
              type: 'invoice'
          });
      });
    }

    const extractPaymentProofs = (item, source) => {
        if(!item.remarks) return;
        const remarksLower = item.remarks.toLowerCase();
        
        if(remarksLower.includes('payment') || remarksLower.includes('screenshot') || remarksLower.includes('ss ') || remarksLower.includes('received')) {
            const blocks = item.remarks.split(/(?=\n\n--------------------------------------\n|\n?📅 )/);
            
            blocks.forEach((block, index) => {
                const lBlock = block.toLowerCase();
                if(lBlock.includes('payment') || lBlock.includes('screenshot') || lBlock.includes('ss ') || lBlock.includes('received')) {
                    
                    let userStr = item.createdBy?.name || 'Admin';
                    const userMatch = block.match(/👤 (.*?)(?=\n| \()/);
                    if (userMatch) userStr = userMatch[1].trim();

                    let dateObj = new Date(item.updatedAt);
                    const dateMatch = block.match(/📅 (.*?)(?=\s\|)/);
                    if (dateMatch) {
                       const parsed = new Date(dateMatch[1]);
                       if(!isNaN(parsed)) dateObj = parsed;
                    }

                    billingLogs.push({
                        id: `pay-${item._id}-${index}`,
                        clientName: item.assesseeName || item.tradeName || 'Client',
                        amount: item.amountReceived || item.feeAmount || 0,
                        action: 'Uploaded Payment Proof / Update',
                        details: block.split('💬').pop().trim().substring(0, 50) + '...', 
                        user: userStr,
                        time: dateObj,
                        type: 'payment',
                        source: source
                    });
                }
            });
        }
    };

    if (Array.isArray(clients)) clients.forEach(c => extractPaymentProofs(c, 'CRM'));
    if (Array.isArray(itr)) itr.forEach(i => extractPaymentProofs(i, 'ITR'));
    if (Array.isArray(gst)) gst.forEach(g => extractPaymentProofs(g, 'GST'));

    billingLogs.sort((a,b) => b.time - a.time);
    const recentBillingLogs = billingLogs.slice(0, 20); 

    // 8. HR / ATTENDANCE TODAY
    const offset = new Date().getTimezoneOffset() * 60000;
    const localToday = new Date(Date.now() - offset).toISOString().split('T')[0];

    let presentToday = 0;
    let absentToday = 0;
    let onLeaveToday = 0;
    
    const activeEmployees = Array.isArray(employees) ? employees.filter(e => e.status === 'Active').length : 0;

    if (Array.isArray(attendance)) {
        const todaysRecords = attendance.filter(a => a.date && a.date.startsWith(localToday));
        todaysRecords.forEach(r => {
            if (r.status === 'Present' || r.status === 'WFH' || r.status === 'Half Day') presentToday++;
            else if (r.status === 'Absent') absentToday++;
            else if (r.status === 'Leave') onLeaveToday++;
        });
    }

    const notMarkedToday = activeEmployees - (presentToday + absentToday + onLeaveToday);

    return {
      totalRevenue, totalCollected, outstanding, collectionRate,
      activeWorkspaces,
      totalLeads, newLeads, inTalksLeads, convertedLeads, conversionRate,
      leadServiceItr, leadServiceGst, leadServiceReg,
      overdueTasks, totalCriticalIssues, defectiveItr, gstErrors,
      employeeStats, recentActivities, recentBillingLogs,
      activeEmployees, presentToday, absentToday, onLeaveToday, notMarkedToday 
    };
  }, [data]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-slate-900"></div>
        <p className="text-slate-500 font-bold tracking-widest uppercase text-xs">Loading CEO Snapshot...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Target size={32} className="text-indigo-600" /> Executive Snapshot
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Real-time macro overview of TaxBucket operations and financials.</p>
        </div>
        <div className="bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg">
          <Activity size={16} className="text-emerald-400" /> Live Data Synced
        </div>
      </div>

      {/* TIER 1: FINANCIAL HEALTH */}
      <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">1. Business Health</h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-3xl text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-20"><Wallet size={80} /></div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Total Expected Revenue</p>
          <h3 className="text-3xl font-black flex items-center mb-4">₹{analytics.totalRevenue.toLocaleString('en-IN')}</h3>
          <div className="bg-white/10 backdrop-blur px-3 py-2 rounded-lg inline-flex items-center gap-2 text-xs font-bold text-emerald-400 border border-white/10">
            <ArrowUpRight size={14} /> Pipeline Looks Good
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden hover:shadow-md transition-shadow">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Total Collected</p>
          <h3 className="text-3xl font-black text-emerald-600 flex items-center mb-2">₹{analytics.totalCollected.toLocaleString('en-IN')}</h3>
          <div className="w-full bg-slate-100 rounded-full h-2 mt-4">
            <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${analytics.collectionRate}%` }}></div>
          </div>
          <p className="text-xs font-bold text-slate-400 mt-2">{analytics.collectionRate}% Collection Rate</p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden hover:shadow-md transition-shadow border-l-4 border-l-rose-500">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Outstanding / Stuck</p>
          <h3 className="text-3xl font-black text-rose-600 flex items-center mb-2">₹{analytics.outstanding.toLocaleString('en-IN')}</h3>
          <p className="text-xs font-bold text-rose-500 bg-rose-50 px-2 py-1 rounded inline-block mt-1">Requires follow-up</p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-center items-center text-center hover:shadow-md transition-shadow">
          <PieChart size={32} className="text-indigo-500 mb-3" />
          <h4 className="text-xl font-black text-slate-800">{analytics.activeWorkspaces}</h4>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Active Workspaces (GST/ITR)</p>
        </div>
      </div>

      {/* TIER 2: DEEP LEAD ANALYTICS & BOTTLENECKS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
        
        {/* LEAD FUNNEL */}
        <div>
          <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">2. Sales Pipeline & Conversions</h2>
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm h-full flex flex-col">
            <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><TrendingUp size={24}/></div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Lead Funnel Details</h3>
                  <p className="text-xs text-slate-500 font-medium">Tracking journey from Inquiry to Conversion</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-3xl font-black text-emerald-600">{analytics.conversionRate}%</span>
                <p className="text-[10px] font-bold uppercase text-slate-400">Win Rate</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center flex flex-col items-center justify-center">
                    <div className="mx-auto h-8 w-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-2"><UserCheck size={14}/></div>
                    <h4 className="text-xl font-black text-slate-800">{analytics.newLeads}</h4>
                    <p className="text-[9px] font-bold uppercase text-slate-400 mt-1">Fresh Added</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center flex flex-col items-center justify-center">
                    <div className="mx-auto h-8 w-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mb-2"><PhoneCall size={14}/></div>
                    <h4 className="text-xl font-black text-slate-800">{analytics.inTalksLeads}</h4>
                    <p className="text-[9px] font-bold uppercase text-slate-400 mt-1">Follow-ups Active</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center flex flex-col items-center justify-center">
                    <div className="mx-auto h-8 w-8 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-2"><CheckCircle2 size={14}/></div>
                    <h4 className="text-xl font-black text-slate-800">{analytics.convertedLeads}</h4>
                    <p className="text-[9px] font-bold uppercase text-slate-400 mt-1">Converted</p>
                </div>
            </div>

            <div className="pt-2 mt-auto">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Converted Clients Breakdown</p>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                      <span className="font-bold text-slate-700 flex items-center gap-2"><Briefcase size={14} className="text-indigo-500"/> ITR Services</span>
                      <span className="font-black text-indigo-700 bg-indigo-50 px-2 py-1 rounded border border-indigo-100">{analytics.leadServiceItr}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                      <span className="font-bold text-slate-700 flex items-center gap-2"><Briefcase size={14} className="text-emerald-500"/> GST Services</span>
                      <span className="font-black text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-100">{analytics.leadServiceGst}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                      <span className="font-bold text-slate-700 flex items-center gap-2"><Briefcase size={14} className="text-amber-500"/> Registrations / Other</span>
                      <span className="font-black text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-100">{analytics.leadServiceReg}</span>
                  </div>
                </div>
            </div>

          </div>
        </div>

        {/* 🔴 RED FLAGS & NEW ATTENDANCE BLOCK */}
        <div className="flex flex-col gap-6 h-full">
          
          <div className="bg-rose-50 border border-rose-100 p-5 rounded-3xl shadow-sm">
            <h2 className="text-xs font-black uppercase tracking-widest text-rose-500 mb-3 flex items-center gap-2"><AlertOctagon size={16}/> 3. Operational Red Flags</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-rose-100 shadow-sm text-center">
                <h4 className="text-3xl font-black text-rose-600">{analytics.overdueTasks}</h4>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-1">Overdue Tasks</p>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-rose-100 shadow-sm text-center">
                <h4 className="text-3xl font-black text-rose-600">{analytics.totalCriticalIssues}</h4>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-1">Defective Returns</p>
                <p className="text-[9px] text-slate-400 mt-1">({analytics.defectiveItr} ITR / {analytics.gstErrors} GST)</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-800 border border-slate-700 p-5 rounded-3xl shadow-sm flex-1 flex flex-col">
             <h2 className="text-xs font-black uppercase tracking-widest text-blue-400 mb-3 flex items-center gap-2"><Users size={16}/> 4. Today's Team Attendance</h2>
             <div className="grid grid-cols-3 gap-3 flex-1">
                <div className="bg-slate-900/50 p-3 rounded-2xl border border-slate-700 flex flex-col justify-center items-center text-center">
                  <h4 className="text-2xl font-black text-emerald-400">{analytics.presentToday}</h4>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-1">Present</p>
                </div>
                <div className="bg-slate-900/50 p-3 rounded-2xl border border-slate-700 flex flex-col justify-center items-center text-center">
                  <h4 className="text-2xl font-black text-rose-400">{analytics.absentToday + analytics.onLeaveToday}</h4>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-1">Absent/Leave</p>
                </div>
                <div className="bg-slate-900/50 p-3 rounded-2xl border border-slate-700 flex flex-col justify-center items-center text-center">
                  <h4 className="text-2xl font-black text-amber-400">{analytics.notMarkedToday > 0 ? analytics.notMarkedToday : 0}</h4>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-1">Not Marked</p>
                </div>
             </div>
          </div>

        </div>
      </div>

      {/* TIER 3: BILLING & PAYMENT PROOFS AUDIT LOG */}
      <div className="pt-4">
          <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2"><Banknote size={16} className="text-emerald-500"/> 5. Billing & Payment Proofs Audit Log</h2>
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50/80 border-b border-slate-100">
                          <tr className="text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                              <th className="py-4 px-6">Date & Time</th>
                              <th className="py-4 px-6">Client Name</th>
                              <th className="py-4 px-6 text-emerald-600">Amount (₹)</th>
                              <th className="py-4 px-6">Action / Details</th>
                              <th className="py-4 px-6">Action By</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                          {analytics.recentBillingLogs.length === 0 ? (
                              <tr><td colSpan="5" className="text-center py-10 text-slate-400">No recent billing or payment activities found.</td></tr>
                          ) : (
                              analytics.recentBillingLogs.map((log) => (
                                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                                      <td className="py-4 px-6 whitespace-nowrap text-xs font-bold text-slate-600">
                                          {log.time.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                      </td>
                                      <td className="py-4 px-6 font-bold text-slate-800">
                                          {log.clientName}
                                          {log.source && <span className="ml-2 text-[9px] bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded">{log.source}</span>}
                                      </td>
                                      <td className="py-4 px-6 font-black text-emerald-600">
                                          {log.amount > 0 ? `₹${log.amount.toLocaleString('en-IN')}` : '-'}
                                      </td>
                                      <td className="py-4 px-6">
                                          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${log.type === 'invoice' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
                                              {log.type === 'invoice' ? <FileText size={12}/> : <Image size={12}/>}
                                              {log.action}
                                          </div>
                                          {log.details && (
                                              <p className="text-[10px] text-slate-500 mt-1 max-w-[200px] truncate" title={log.details}>
                                                  "{log.details}"
                                              </p>
                                          )}
                                      </td>
                                      <td className="py-4 px-6">
                                          <div className="flex items-center gap-2">
                                              <div className="h-6 w-6 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[9px] font-bold">
                                                  {log.user.charAt(0).toUpperCase()}
                                              </div>
                                              <span className="text-xs font-bold text-slate-700">{log.user}</span>
                                          </div>
                                      </td>
                                  </tr>
                              ))
                          )}
                      </tbody>
                  </table>
              </div>
          </div>
      </div>

      {/* TIER 4: EMPLOYEE LEADERBOARD & LIVE ACTIVITY */}
      <div className="pt-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* LEADERBOARD */}
          <div className="lg:col-span-2">
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2"><Trophy size={16} className="text-amber-500"/> 6. Team Performance Leaderboard</h2>
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden h-[400px] flex flex-col">
                  <div className="overflow-x-auto flex-1 custom-scrollbar">
                      <table className="w-full text-left text-sm">
                          <thead className="bg-slate-50/80 sticky top-0 z-10">
                              <tr className="border-b border-slate-100 text-slate-500 text-xs font-bold uppercase tracking-wider">
                                  <th className="py-4 px-6">Employee Name</th>
                                  <th className="py-4 px-6 text-center">Assigned Tasks</th>
                                  <th className="py-4 px-6 text-center text-emerald-600">Completed</th>
                                  <th className="py-4 px-6 text-center text-blue-600">Processing</th>
                                  <th className="py-4 px-6 text-center text-rose-600">Overdue</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                              {analytics.employeeStats.length === 0 ? (
                                  <tr><td colSpan="5" className="text-center py-10 text-slate-400">No task data available for employees yet.</td></tr>
                              ) : (
                                  analytics.employeeStats.map((emp, idx) => (
                                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                          <td className="py-4 px-6">
                                              <div className="flex items-center gap-3">
                                                  <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-[10px] ${idx === 0 ? 'bg-amber-100 text-amber-600 ring-2 ring-amber-400' : 'bg-slate-100 text-slate-600'}`}>
                                                      {idx === 0 ? <Trophy size={12}/> : `${idx + 1}`}
                                                  </div>
                                                  <div>
                                                    <p className="font-bold text-slate-800">{emp.name}</p>
                                                    <p className="text-[10px] text-slate-500 uppercase">{emp.designation}</p>
                                                  </div>
                                              </div>
                                          </td>
                                          <td className="py-4 px-6 text-center font-bold text-slate-700">{emp.totalAssigned}</td>
                                          <td className="py-4 px-6 text-center">
                                              <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-lg font-black border border-emerald-100">{emp.completed}</span>
                                          </td>
                                          <td className="py-4 px-6 text-center">
                                              <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg font-bold border border-blue-100">{emp.pending}</span>
                                          </td>
                                          <td className="py-4 px-6 text-center">
                                              {emp.overdue > 0 ? (
                                                  <span className="bg-rose-50 text-rose-700 px-3 py-1 rounded-lg font-black border border-rose-100 animate-pulse">{emp.overdue}</span>
                                              ) : (
                                                  <span className="text-slate-400 font-medium">-</span>
                                              )}
                                          </td>
                                      </tr>
                                  ))
                              )}
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>

          {/* LIVE ACTIVITY LOG */}
          <div className="lg:col-span-1">
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2"><History size={16} className="text-blue-500"/> 7. Live Activity Feed</h2>
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden h-[400px] flex flex-col">
                  <div className="p-4 bg-slate-50/50 border-b border-slate-100">
                      <p className="text-[11px] font-bold text-slate-500 uppercase">Recent actions by team</p>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                      {analytics.recentActivities.length === 0 ? (
                          <div className="flex flex-col items-center justify-center h-full text-slate-400">
                              <History size={32} className="mb-2 opacity-50"/>
                              <p className="text-xs font-medium">No recent activity found.</p>
                          </div>
                      ) : (
                          analytics.recentActivities.map((act) => {
                              const Icon = act.icon;
                              return (
                                  <div key={act.id} className="flex gap-3 animate-in fade-in slide-in-from-right-4">
                                      <div className={`mt-0.5 h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${act.bg} ${act.color}`}>
                                          <Icon size={14} />
                                      </div>
                                      <div>
                                          <p className="text-xs font-medium text-slate-600 leading-snug">
                                              <span className="font-bold text-slate-900">{act.user}</span> {act.action} <span className="font-bold text-slate-800">{act.subject}</span>
                                          </p>
                                          <p className="text-[10px] font-bold text-slate-400 mt-1">
                                              {act.time.toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                          </p>
                                      </div>
                                  </div>
                              )
                          })
                      )}
                  </div>
              </div>
          </div>
      </div>

    </div>
  );
};

export default CeoDashboard;