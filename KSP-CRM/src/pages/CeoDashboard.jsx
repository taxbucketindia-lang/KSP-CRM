// import React, { useState, useEffect, useContext, useMemo } from 'react';
// import axios from 'axios';
// import { AuthContext } from '../context/AuthContext';
// import toast, { Toaster } from 'react-hot-toast';
// import { 
//   TrendingUp, Users, Wallet, AlertOctagon, Trophy, 
//   Target, Activity, ArrowUpRight, PieChart, Briefcase, 
//   UserCheck, PhoneCall, CheckCircle2, History, ClipboardList,
//   FileText, Image, IndianRupee, Banknote,
//   Plus, X, BellRing, CalendarDays, Circle, Trash2, ListTodo, CheckSquare, Loader2, AlertCircle
// } from 'lucide-react';

// const CeoDashboard = () => {
//   const { user } = useContext(AuthContext);
//   const [loading, setLoading] = useState(true);
//   const [data, setData] = useState({
//     clients: [], leads: [], tasks: [], itr: [], gst: [], employees: [], invoices: [], attendance: []
//   });

//   // SUCCESS LIST (TODO) STATES
//   const [ceoTodos, setCeoTodos] = useState([]);
//   const [isTodoModalOpen, setIsTodoModalOpen] = useState(false);
//   const [todoSaving, setTodoSaving] = useState(false);
  
//   // 🔴 NAYA: Tabs State for Success List (Default: 'Pending')
//   const [todoTab, setTodoTab] = useState('Pending'); 

//   const [todoForm, setTodoForm] = useState({
//     title: '', description: '', 
//     dueDate: new Date().toISOString().split('T')[0],
//     endDate: new Date().toISOString().split('T')[0],
//     priority: 'High'
//   });

//   useEffect(() => {
//     const fetchCeoData = async () => {
//       try {
//         const headers = { Authorization: `Bearer ${user.token}` };
//         const [clientsRes, leadsRes, tasksRes, itrRes, gstRes, empRes, invoiceRes, attRes, todosRes] = await Promise.all([
//           axios.get(`${import.meta.env.VITE_API_URL}/clients`, { headers }).catch(() => ({ data: [] })),
//           axios.get(`${import.meta.env.VITE_API_URL}/leads`, { headers }).catch(() => ({ data: [] })),
//           axios.get(`${import.meta.env.VITE_API_URL}/tasks`, { headers }).catch(() => ({ data: [] })),
//           axios.get(`${import.meta.env.VITE_API_URL}/itr`, { headers }).catch(() => ({ data: [] })),
//           axios.get(`${import.meta.env.VITE_API_URL}/gst`, { headers }).catch(() => ({ data: [] })),
//           axios.get(`${import.meta.env.VITE_API_URL}/hr/employees`, { headers }).catch(() => ({ data: [] })),
//           axios.get(`${import.meta.env.VITE_API_URL}/invoices`, { headers }).catch(() => ({ data: [] })),
//           axios.get(`${import.meta.env.VITE_API_URL}/hr/attendance`, { headers }).catch(() => ({ data: [] })),
//           axios.get(`${import.meta.env.VITE_API_URL}/todos`, { headers }).catch(() => ({ data: [] }))
//         ]);

//         setData({
//           clients: Array.isArray(clientsRes.data) ? clientsRes.data : (clientsRes.data?.clients || []),
//           leads: Array.isArray(leadsRes.data) ? leadsRes.data : (leadsRes.data?.leads || []),
//           tasks: Array.isArray(tasksRes.data) ? tasksRes.data : [],
//           itr: Array.isArray(itrRes.data) ? itrRes.data : [],
//           gst: Array.isArray(gstRes.data) ? gstRes.data : [],
//           employees: Array.isArray(empRes.data) ? empRes.data : [],
//           invoices: Array.isArray(invoiceRes.data) ? invoiceRes.data : (invoiceRes.data?.invoices || []),
//           attendance: Array.isArray(attRes.data) ? attRes.data : []
//         });

//         setCeoTodos(Array.isArray(todosRes.data) ? todosRes.data : []);
//       } catch (error) {
//         console.error("Error fetching CEO data", error);
//       } finally {
//         setLoading(false);
//       }
//     };
//     fetchCeoData();
//   }, [user.token]);

//   // ==========================================
//   // SUCCESS LIST (TO-DO) HANDLERS
//   // ==========================================
//   const handleTodoChange = (e) => setTodoForm({ ...todoForm, [e.target.name]: e.target.value });

//   const handleTodoSave = async (e) => {
//     e.preventDefault();
//     if (!todoForm.title || !todoForm.endDate) return toast.error("Title and End Date are mandatory!");
//     setTodoSaving(true);
//     try {
//       const headers = { Authorization: `Bearer ${user.token}` };
//       const res = await axios.post(`${import.meta.env.VITE_API_URL}/todos`, todoForm, { headers });
//       toast.success("Task added to Success List! Reminder Active.");
//       setCeoTodos([...ceoTodos, res.data]);
//       setIsTodoModalOpen(false);
//       // Ensure tab remains on pending so user can see new task
//       setTodoTab('Pending');
//       setTodoForm({ title: '', description: '', dueDate: new Date().toISOString().split('T')[0], endDate: new Date().toISOString().split('T')[0], priority: 'High' });
//     } catch (error) {
//       toast.error("Error saving task");
//     } finally { setTodoSaving(false); }
//   };

//   const toggleTodoStatus = async (todo) => {
//     const newStatus = todo.status === 'Completed' ? 'Pending' : 'Completed';
//     try {
//       const headers = { Authorization: `Bearer ${user.token}` };
//       await axios.put(`${import.meta.env.VITE_API_URL}/todos/${todo._id}`, { status: newStatus }, { headers });
//       setCeoTodos(prev => prev.map(t => t._id === todo._id ? { ...t, status: newStatus } : t));
//       if (newStatus === 'Completed') toast.success("Awesome! Task Completed 🎉");
//     } catch (error) { toast.error("Failed to update task"); }
//   };

//   const deleteTodo = async (id) => {
//     if (!window.confirm("Delete this task from Success List?")) return;
//     try {
//       const headers = { Authorization: `Bearer ${user.token}` };
//       await axios.delete(`${import.meta.env.VITE_API_URL}/todos/${id}`, { headers });
//       setCeoTodos(prev => prev.filter(t => t._id !== id));
//       toast.success("Task deleted");
//     } catch (error) { toast.error("Error deleting task"); }
//   };

//   const isTodoOverdue = (todo) => {
//     if (todo.status === 'Completed') return false;
//     const end = new Date(todo.endDate || todo.dueDate);
//     end.setHours(23, 59, 59, 999);
//     return end < new Date();
//   };

//   const getPriorityColor = (priority) => {
//     if (priority === 'High') return 'text-rose-600 bg-rose-50 border-rose-200';
//     if (priority === 'Medium') return 'text-amber-600 bg-amber-50 border-amber-200';
//     return 'text-emerald-600 bg-emerald-50 border-emerald-200';
//   };

//   // 🔴 NAYA: Filter Logic based on Tabs
//   const filteredCeoTodos = useMemo(() => {
//     let filtered = ceoTodos;
//     if (todoTab !== 'All') {
//       filtered = filtered.filter(t => t.status === todoTab);
//     }
//     return filtered.sort((a, b) => {
//       if (a.status === 'Completed' && b.status !== 'Completed') return 1;
//       if (a.status !== 'Completed' && b.status === 'Completed') return -1;
//       return new Date(a.endDate || a.dueDate) - new Date(b.endDate || b.dueDate);
//     });
//   }, [ceoTodos, todoTab]);


//   // ==========================================
//   // CEO Level Analytics Calculation
//   // ==========================================
//   const analytics = useMemo(() => {
//     const { clients, leads, tasks, itr, gst, employees, invoices, attendance } = data;
    
//     // 1. Finances
//     let totalRevenue = 0;
//     let totalCollected = 0;
    
//     const calculateMoney = (item) => {
//       const fee = Number(item.feeAmount || 0);
//       const rec = Number(item.amountReceived || 0);
//       totalRevenue += fee;
//       totalCollected += rec;
//     };
    
//     if (Array.isArray(clients)) clients.forEach(calculateMoney);
//     if (Array.isArray(itr)) itr.forEach(calculateMoney);
//     if (Array.isArray(gst)) gst.forEach(calculateMoney);
    
//     const outstanding = totalRevenue - totalCollected;
//     const collectionRate = totalRevenue > 0 ? Math.round((totalCollected / totalRevenue) * 100) : 0;

//     // 2. Client Base
//     const activeWorkspaces = (itr?.length || 0) + (gst?.length || 0);

//     // 3. Sales & Leads Funnel
//     const totalLeads = leads?.length || 0;
//     const newLeads = Array.isArray(leads) ? leads.filter(l => l.status === 'New').length : 0;
//     const inTalksLeads = Array.isArray(leads) ? leads.filter(l => l.status === 'Follow-up').length : 0;
//     const convertedLeads = Array.isArray(leads) ? leads.filter(l => l.status === 'Converted').length : 0;
//     const conversionRate = totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0;

//     let leadServiceItr = 0;
//     let leadServiceGst = 0;
//     let leadServiceReg = 0;
    
//     if (Array.isArray(leads)) {
//       leads.filter(l => l.status === 'Converted').forEach(l => {
//           const serviceArr = Array.isArray(l.queryService) ? l.queryService : [l.queryService || ''];
//           serviceArr.forEach(srv => {
//               const s = srv.toLowerCase();
//               if (s.includes('itr')) leadServiceItr++;
//               else if (s.includes('gst')) leadServiceGst++;
//               else leadServiceReg++;
//           });
//       });
//     }

//     // 4. Operations
//     const overdueTasks = Array.isArray(tasks) ? tasks.filter(t => t.isOverdue && t.currentStatus !== 'Completed').length : 0;
//     const defectiveItr = Array.isArray(itr) ? itr.filter(i => i.itrProcessedStatus === 'Defective').length : 0;
//     const gstErrors = Array.isArray(gst) ? gst.filter(g => g.gstStatus === 'Error/Mismatch').length : 0;
//     const totalCriticalIssues = defectiveItr + gstErrors;

//     // 5. EMPLOYEE PERFORMANCE LEADERBOARD
//     const employeeStats = [];
//     if (Array.isArray(employees) && Array.isArray(tasks)) {
//       employees.forEach(emp => {
//           const empTasks = tasks.filter(t => t.assignedTo && (t.assignedTo._id === emp._id || t.assignedTo === emp._id));
//           if(empTasks.length > 0) {
//               const completed = empTasks.filter(t => t.currentStatus === 'Completed').length;
//               const pending = empTasks.filter(t => t.currentStatus !== 'Completed').length;
//               const overdue = empTasks.filter(t => t.isOverdue && t.currentStatus !== 'Completed').length;
              
//               employeeStats.push({
//                   name: emp.name,
//                   designation: emp.designation || 'Staff',
//                   totalAssigned: empTasks.length,
//                   completed,
//                   pending,
//                   overdue,
//                   score: completed 
//               });
//           }
//       });
//       employeeStats.sort((a,b) => b.score - a.score);
//     }

//     // 6. GENERAL LIVE TEAM ACTIVITY LOG
//     let allActivities = [];

//     if (Array.isArray(leads)) {
//         leads.forEach(l => {
//             const time = new Date(l.updatedAt || l.createdAt);
//             const isCreation = l.createdAt === l.updatedAt;
//             allActivities.push({
//                 id: `lead-${l._id}`,
//                 action: isCreation ? 'added a new Lead:' : `updated Lead status to [${l.status}]:`,
//                 subject: l.name,
//                 user: l.createdBy?.name || 'An Employee',
//                 time: time,
//                 icon: UserCheck,
//                 color: 'text-purple-600', bg: 'bg-purple-100'
//             });
//         });
//     }

//     if (Array.isArray(clients)) {
//         clients.forEach(c => {
//             const time = new Date(c.updatedAt || c.createdAt);
//             const isCreation = c.createdAt === c.updatedAt;
//             allActivities.push({
//                 id: `client-${c._id}`,
//                 action: isCreation ? 'created CRM profile for' : 'updated CRM record of',
//                 subject: c.assesseeName,
//                 user: c.createdBy?.name || 'An Employee',
//                 time: time,
//                 icon: Users,
//                 color: 'text-amber-600', bg: 'bg-amber-100'
//             });
//         });
//     }

//     if (Array.isArray(tasks)) {
//       tasks.forEach(t => {
//         const time = new Date(t.updatedAt || t.createdAt);
//         const isCreation = t.createdAt === t.updatedAt;
//         allActivities.push({
//           id: `task-${t._id}`,
//           action: isCreation ? 'created a new task' : `updated task status to [${t.currentStatus}]`,
//           subject: `Task #${t.taskId}`,
//           user: t.assignedTo?.name || 'An Employee',
//           time: time,
//           icon: ClipboardList,
//           color: 'text-blue-600', bg: 'bg-blue-100'
//         });
//       });
//     }
    
//     if (Array.isArray(itr)) {
//       itr.forEach(i => {
//         const time = new Date(i.updatedAt || i.createdAt);
//         const isCreation = i.createdAt === i.updatedAt;
//         allActivities.push({
//           id: `itr-${i._id}`,
//           action: isCreation ? 'added to ITR workspace:' : 'updated ITR filing details for',
//           subject: i.assesseeName || 'Client',
//           user: i.createdBy?.name || i.itrFiledBy || 'An Employee',
//           time: time,
//           icon: Briefcase,
//           color: 'text-indigo-600', bg: 'bg-indigo-100'
//         });
//       });
//     }

//     if (Array.isArray(gst)) {
//       gst.forEach(g => {
//         const time = new Date(g.updatedAt || g.createdAt);
//         const isCreation = g.createdAt === g.updatedAt;
//         allActivities.push({
//           id: `gst-${g._id}`,
//           action: isCreation ? 'added to GST workspace:' : 'updated GST record for',
//           subject: g.tradeName || g.assesseeName || 'Client',
//           user: g.createdBy?.name || 'An Employee',
//           time: time,
//           icon: Briefcase,
//           color: 'text-emerald-600', bg: 'bg-emerald-100'
//         });
//       });
//     }

//     allActivities.sort((a, b) => b.time - a.time);
//     const recentActivities = allActivities.slice(0, 25);

//     // 7. BILLING, INVOICE & SCREENSHOT AUDIT TRAIL
//     let billingLogs = [];

//     if (Array.isArray(invoices)) {
//       invoices.forEach(inv => {
//           billingLogs.push({
//               id: `inv-${inv._id}`,
//               clientName: inv.clientName || inv.assesseeName || 'Unknown Client',
//               amount: inv.totalAmount || inv.amount || 0,
//               action: 'Generated Invoice',
//               user: inv.createdBy?.name || 'Admin',
//               time: new Date(inv.createdAt || inv.updatedAt),
//               type: 'invoice'
//           });
//       });
//     }

//     const extractPaymentProofs = (item, source) => {
//         if(!item.remarks) return;
//         const remarksLower = item.remarks.toLowerCase();
        
//         if(remarksLower.includes('payment') || remarksLower.includes('screenshot') || remarksLower.includes('ss ') || remarksLower.includes('received')) {
//             const blocks = item.remarks.split(/(?=\n\n--------------------------------------\n|\n?📅 )/);
            
//             blocks.forEach((block, index) => {
//                 const lBlock = block.toLowerCase();
//                 if(lBlock.includes('payment') || lBlock.includes('screenshot') || lBlock.includes('ss ') || lBlock.includes('received')) {
                    
//                     let userStr = item.createdBy?.name || 'Admin';
//                     const userMatch = block.match(/👤 (.*?)(?=\n| \()/);
//                     if (userMatch) userStr = userMatch[1].trim();

//                     let dateObj = new Date(item.updatedAt);
//                     const dateMatch = block.match(/📅 (.*?)(?=\s\|)/);
//                     if (dateMatch) {
//                        const parsed = new Date(dateMatch[1]);
//                        if(!isNaN(parsed)) dateObj = parsed;
//                     }

//                     billingLogs.push({
//                         id: `pay-${item._id}-${index}`,
//                         clientName: item.assesseeName || item.tradeName || 'Client',
//                         amount: item.amountReceived || item.feeAmount || 0,
//                         action: 'Uploaded Payment Proof / Update',
//                         details: block.split('💬').pop().trim().substring(0, 50) + '...', 
//                         user: userStr,
//                         time: dateObj,
//                         type: 'payment',
//                         source: source
//                     });
//                 }
//             });
//         }
//     };

//     if (Array.isArray(clients)) clients.forEach(c => extractPaymentProofs(c, 'CRM'));
//     if (Array.isArray(itr)) itr.forEach(i => extractPaymentProofs(i, 'ITR'));
//     if (Array.isArray(gst)) gst.forEach(g => extractPaymentProofs(g, 'GST'));

//     billingLogs.sort((a,b) => b.time - a.time);
//     const recentBillingLogs = billingLogs.slice(0, 20); 

//     // 8. HR / ATTENDANCE TODAY
//     const offset = new Date().getTimezoneOffset() * 60000;
//     const localToday = new Date(Date.now() - offset).toISOString().split('T')[0];

//     let presentToday = 0;
//     let absentToday = 0;
//     let onLeaveToday = 0;
    
//     const activeEmployees = Array.isArray(employees) ? employees.filter(e => e.status === 'Active').length : 0;

//     if (Array.isArray(attendance)) {
//         const todaysRecords = attendance.filter(a => a.date && a.date.startsWith(localToday));
//         todaysRecords.forEach(r => {
//             if (r.status === 'Present' || r.status === 'WFH' || r.status === 'Half Day') presentToday++;
//             else if (r.status === 'Absent') absentToday++;
//             else if (r.status === 'Leave') onLeaveToday++;
//         });
//     }

//     const notMarkedToday = activeEmployees - (presentToday + absentToday + onLeaveToday);

//     return {
//       totalRevenue, totalCollected, outstanding, collectionRate,
//       activeWorkspaces,
//       totalLeads, newLeads, inTalksLeads, convertedLeads, conversionRate,
//       leadServiceItr, leadServiceGst, leadServiceReg,
//       overdueTasks, totalCriticalIssues, defectiveItr, gstErrors,
//       employeeStats, recentActivities, recentBillingLogs,
//       activeEmployees, presentToday, absentToday, onLeaveToday, notMarkedToday 
//     };
//   }, [data]);

//   if (loading) {
//     return (
//       <div className="flex flex-col items-center justify-center h-[70vh] space-y-4">
//         <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-slate-900"></div>
//         <p className="text-slate-500 font-bold tracking-widest uppercase text-xs">Loading CEO Snapshot...</p>
//       </div>
//     );
//   }

//   return (
//     <div className="max-w-7xl mx-auto space-y-6 pb-12">
      
//       {/* HEADER */}
//       <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-5">
//         <div>
//           <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
//             <Target size={32} className="text-indigo-600" /> Executive Snapshot
//           </h1>
//           <p className="text-sm text-slate-500 mt-1 font-medium">Real-time macro overview of TaxBucket operations and financials.</p>
//         </div>
//         <div className="bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg">
//           <Activity size={16} className="text-emerald-400" /> Live Data Synced
//         </div>
//       </div>

//       {/* 🔴 NAYA: CEO SUCCESS LIST (TABS & HORIZONTAL TASKS) */}
//       <div className="mb-6">
//         <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
//           <h2 className="text-sm font-black uppercase tracking-widest text-indigo-600 flex items-center gap-2">
//             <ListTodo size={18}/> Success List (My Action Items)
//           </h2>
          
//           <div className="flex items-center gap-3 w-full sm:w-auto">
//             {/* Tabs Component */}
//             <div className="flex bg-slate-100 p-1 rounded-xl">
//               {['All', 'Pending', 'Completed'].map(tab => (
//                 <button 
//                   key={tab} 
//                   onClick={() => setTodoTab(tab)}
//                   className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all ${todoTab === tab ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
//                 >
//                   {tab}
//                 </button>
//               ))}
//             </div>
            
//             <button onClick={() => setIsTodoModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all ml-auto">
//               <Plus size={14}/> Add Task
//             </button>
//           </div>
//         </div>

//         <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
//           {filteredCeoTodos.length === 0 ? (
//              <div className="bg-white p-6 rounded-3xl border border-slate-200 border-dashed w-full text-center text-slate-400 shadow-sm flex flex-col items-center">
//                <CheckSquare size={32} className="mx-auto mb-2 opacity-50"/>
//                <p className="text-sm font-bold text-slate-500">List is clear!</p>
//                <p className="text-xs">No {todoTab.toLowerCase()} tasks found.</p>
//              </div>
//           ) : (
//              filteredCeoTodos.map(todo => {
//                 const isCompleted = todo.status === 'Completed';
//                 const overdue = isTodoOverdue(todo);
//                 return (
//                   <div key={todo._id} className={`bg-white p-4 rounded-2xl border shrink-0 min-w-[320px] max-w-[320px] flex flex-col ${isCompleted ? 'border-slate-200 opacity-60 grayscale-[50%]' : overdue ? 'border-rose-200 shadow-sm bg-rose-50/10' : 'border-slate-200 shadow-sm hover:shadow-md'} transition-all`}>
//                     <div className="flex items-start gap-3">
//                       <button onClick={() => toggleTodoStatus(todo)} className={`mt-0.5 transition-colors ${isCompleted ? 'text-emerald-500' : 'text-slate-300 hover:text-emerald-500'}`}>
//                         {isCompleted ? <CheckCircle2 size={20} className="fill-emerald-50"/> : <Circle size={20} />}
//                       </button>
//                       <div className="flex-1 min-w-0">
//                         <div className="flex items-center gap-2 mb-1">
//                           <h3 className={`text-sm font-bold truncate ${isCompleted ? 'text-slate-500 line-through' : 'text-slate-800'}`} title={todo.title}>{todo.title}</h3>
//                           <button onClick={() => deleteTodo(todo._id)} className="text-slate-300 hover:text-rose-500 ml-auto"><Trash2 size={14}/></button>
//                         </div>
//                         {!isCompleted && (
//                           <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${getPriorityColor(todo.priority)}`}>
//                             {todo.priority}
//                           </span>
//                         )}
//                         {overdue && !isCompleted && (
//                           <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border bg-rose-100 text-rose-700 border-rose-200 inline-flex items-center gap-1 animate-pulse ml-2">
//                             <AlertCircle size={10}/> Overdue
//                           </span>
//                         )}
//                         {todo.description && (
//                           <p className={`text-xs mt-2 line-clamp-2 leading-relaxed ${isCompleted ? 'text-slate-400' : 'text-slate-500'}`}>{todo.description}</p>
//                         )}
//                       </div>
//                     </div>
//                     <div className={`mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold uppercase ${isCompleted ? 'text-slate-300' : 'text-slate-400'}`}>
//                       <span className="flex items-center gap-1"><CalendarDays size={12}/> {new Date(todo.dueDate).toLocaleDateString('en-IN', {day:'numeric', month:'short'})}</span>
//                       <span className={`flex items-center gap-1 ${!isCompleted ? 'text-rose-500' : ''}`}>End: {new Date(todo.endDate).toLocaleDateString('en-IN', {day:'numeric', month:'short'})}</span>
//                     </div>
//                   </div>
//                 );
//              })
//           )}
//         </div>
//       </div>

//       {/* TIER 1: FINANCIAL HEALTH */}
//       <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2 mt-4">1. Business Health</h2>
//       <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        
//         <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-3xl text-white shadow-xl relative overflow-hidden">
//           <div className="absolute top-0 right-0 p-4 opacity-20"><Wallet size={80} /></div>
//           <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Total Expected Revenue</p>
//           <h3 className="text-3xl font-black flex items-center mb-4">₹{analytics.totalRevenue.toLocaleString('en-IN')}</h3>
//           <div className="bg-white/10 backdrop-blur px-3 py-2 rounded-lg inline-flex items-center gap-2 text-xs font-bold text-emerald-400 border border-white/10">
//             <ArrowUpRight size={14} /> Pipeline Looks Good
//           </div>
//         </div>

//         <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden hover:shadow-md transition-shadow">
//           <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Total Collected</p>
//           <h3 className="text-3xl font-black text-emerald-600 flex items-center mb-2">₹{analytics.totalCollected.toLocaleString('en-IN')}</h3>
//           <div className="w-full bg-slate-100 rounded-full h-2 mt-4">
//             <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${analytics.collectionRate}%` }}></div>
//           </div>
//           <p className="text-xs font-bold text-slate-400 mt-2">{analytics.collectionRate}% Collection Rate</p>
//         </div>

//         <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden hover:shadow-md transition-shadow border-l-4 border-l-rose-500">
//           <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Outstanding / Stuck</p>
//           <h3 className="text-3xl font-black text-rose-600 flex items-center mb-2">₹{analytics.outstanding.toLocaleString('en-IN')}</h3>
//           <p className="text-xs font-bold text-rose-500 bg-rose-50 px-2 py-1 rounded inline-block mt-1">Requires follow-up</p>
//         </div>

//         <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-center items-center text-center hover:shadow-md transition-shadow">
//           <PieChart size={32} className="text-indigo-500 mb-3" />
//           <h4 className="text-xl font-black text-slate-800">{analytics.activeWorkspaces}</h4>
//           <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Active Workspaces (GST/ITR)</p>
//         </div>
//       </div>

//       {/* TIER 2: DEEP LEAD ANALYTICS & BOTTLENECKS */}
//       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
        
//         {/* LEAD FUNNEL */}
//         <div>
//           <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">2. Sales Pipeline & Conversions</h2>
//           <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm h-full flex flex-col">
//             <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
//               <div className="flex items-center gap-3">
//                 <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><TrendingUp size={24}/></div>
//                 <div>
//                   <h3 className="text-lg font-bold text-slate-800">Lead Funnel Details</h3>
//                   <p className="text-xs text-slate-500 font-medium">Tracking journey from Inquiry to Conversion</p>
//                 </div>
//               </div>
//               <div className="text-right">
//                 <span className="text-3xl font-black text-emerald-600">{analytics.conversionRate}%</span>
//                 <p className="text-[10px] font-bold uppercase text-slate-400">Win Rate</p>
//               </div>
//             </div>

//             <div className="grid grid-cols-3 gap-4 mb-6">
//                 <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center flex flex-col items-center justify-center">
//                     <div className="mx-auto h-8 w-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-2"><UserCheck size={14}/></div>
//                     <h4 className="text-xl font-black text-slate-800">{analytics.newLeads}</h4>
//                     <p className="text-[9px] font-bold uppercase text-slate-400 mt-1">Fresh Added</p>
//                 </div>
//                 <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center flex flex-col items-center justify-center">
//                     <div className="mx-auto h-8 w-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mb-2"><PhoneCall size={14}/></div>
//                     <h4 className="text-xl font-black text-slate-800">{analytics.inTalksLeads}</h4>
//                     <p className="text-[9px] font-bold uppercase text-slate-400 mt-1">Follow-ups Active</p>
//                 </div>
//                 <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center flex flex-col items-center justify-center">
//                     <div className="mx-auto h-8 w-8 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-2"><CheckCircle2 size={14}/></div>
//                     <h4 className="text-xl font-black text-slate-800">{analytics.convertedLeads}</h4>
//                     <p className="text-[9px] font-bold uppercase text-slate-400 mt-1">Converted</p>
//                 </div>
//             </div>

//             <div className="pt-2 mt-auto">
//                 <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Converted Clients Breakdown</p>
//                 <div className="space-y-3">
//                   <div className="flex items-center justify-between text-sm">
//                       <span className="font-bold text-slate-700 flex items-center gap-2"><Briefcase size={14} className="text-indigo-500"/> ITR Services</span>
//                       <span className="font-black text-indigo-700 bg-indigo-50 px-2 py-1 rounded border border-indigo-100">{analytics.leadServiceItr}</span>
//                   </div>
//                   <div className="flex items-center justify-between text-sm">
//                       <span className="font-bold text-slate-700 flex items-center gap-2"><Briefcase size={14} className="text-emerald-500"/> GST Services</span>
//                       <span className="font-black text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-100">{analytics.leadServiceGst}</span>
//                   </div>
//                   <div className="flex items-center justify-between text-sm">
//                       <span className="font-bold text-slate-700 flex items-center gap-2"><Briefcase size={14} className="text-amber-500"/> Registrations / Other</span>
//                       <span className="font-black text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-100">{analytics.leadServiceReg}</span>
//                   </div>
//                 </div>
//             </div>

//           </div>
//         </div>

//         {/* RED FLAGS & NEW ATTENDANCE BLOCK */}
//         <div className="flex flex-col gap-6 h-full">
          
//           <div className="bg-rose-50 border border-rose-100 p-5 rounded-3xl shadow-sm">
//             <h2 className="text-xs font-black uppercase tracking-widest text-rose-500 mb-3 flex items-center gap-2"><AlertOctagon size={16}/> 3. Operational Red Flags</h2>
//             <div className="grid grid-cols-2 gap-4">
//               <div className="bg-white p-4 rounded-2xl border border-rose-100 shadow-sm text-center">
//                 <h4 className="text-3xl font-black text-rose-600">{analytics.overdueTasks}</h4>
//                 <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-1">Overdue Tasks</p>
//               </div>
//               <div className="bg-white p-4 rounded-2xl border border-rose-100 shadow-sm text-center">
//                 <h4 className="text-3xl font-black text-rose-600">{analytics.totalCriticalIssues}</h4>
//                 <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-1">Defective Returns</p>
//                 <p className="text-[9px] text-slate-400 mt-1">({analytics.defectiveItr} ITR / {analytics.gstErrors} GST)</p>
//               </div>
//             </div>
//           </div>

//           <div className="bg-slate-800 border border-slate-700 p-5 rounded-3xl shadow-sm flex-1 flex flex-col">
//              <h2 className="text-xs font-black uppercase tracking-widest text-blue-400 mb-3 flex items-center gap-2"><Users size={16}/> 4. Today's Team Attendance</h2>
//              <div className="grid grid-cols-3 gap-3 flex-1">
//                 <div className="bg-slate-900/50 p-3 rounded-2xl border border-slate-700 flex flex-col justify-center items-center text-center">
//                   <h4 className="text-2xl font-black text-emerald-400">{analytics.presentToday}</h4>
//                   <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-1">Present</p>
//                 </div>
//                 <div className="bg-slate-900/50 p-3 rounded-2xl border border-slate-700 flex flex-col justify-center items-center text-center">
//                   <h4 className="text-2xl font-black text-rose-400">{analytics.absentToday + analytics.onLeaveToday}</h4>
//                   <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-1">Absent/Leave</p>
//                 </div>
//                 <div className="bg-slate-900/50 p-3 rounded-2xl border border-slate-700 flex flex-col justify-center items-center text-center">
//                   <h4 className="text-2xl font-black text-amber-400">{analytics.notMarkedToday > 0 ? analytics.notMarkedToday : 0}</h4>
//                   <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-1">Not Marked</p>
//                 </div>
//              </div>
//           </div>

//         </div>
//       </div>

//       {/* TIER 3: BILLING & PAYMENT PROOFS AUDIT LOG */}
//       <div className="pt-4">
//           <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2"><Banknote size={16} className="text-emerald-500"/> 5. Billing & Payment Proofs Audit Log</h2>
//           <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
//               <div className="overflow-x-auto custom-scrollbar">
//                   <table className="w-full text-left text-sm">
//                       <thead className="bg-slate-50/80 border-b border-slate-100">
//                           <tr className="text-slate-500 text-[11px] font-bold uppercase tracking-wider">
//                               <th className="py-4 px-6">Date & Time</th>
//                               <th className="py-4 px-6">Client Name</th>
//                               <th className="py-4 px-6 text-emerald-600">Amount (₹)</th>
//                               <th className="py-4 px-6">Action / Details</th>
//                               <th className="py-4 px-6">Action By</th>
//                           </tr>
//                       </thead>
//                       <tbody className="divide-y divide-slate-100">
//                           {analytics.recentBillingLogs.length === 0 ? (
//                               <tr><td colSpan="5" className="text-center py-10 text-slate-400">No recent billing or payment activities found.</td></tr>
//                           ) : (
//                               analytics.recentBillingLogs.map((log) => (
//                                   <tr key={log.id} className="hover:bg-slate-50 transition-colors">
//                                       <td className="py-4 px-6 whitespace-nowrap text-xs font-bold text-slate-600">
//                                           {log.time.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
//                                       </td>
//                                       <td className="py-4 px-6 font-bold text-slate-800">
//                                           {log.clientName}
//                                           {log.source && <span className="ml-2 text-[9px] bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded">{log.source}</span>}
//                                       </td>
//                                       <td className="py-4 px-6 font-black text-emerald-600">
//                                           {log.amount > 0 ? `₹${log.amount.toLocaleString('en-IN')}` : '-'}
//                                       </td>
//                                       <td className="py-4 px-6">
//                                           <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${log.type === 'invoice' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
//                                               {log.type === 'invoice' ? <FileText size={12}/> : <Image size={12}/>}
//                                               {log.action}
//                                           </div>
//                                           {log.details && (
//                                               <p className="text-[10px] text-slate-500 mt-1 max-w-[200px] truncate" title={log.details}>
//                                                   "{log.details}"
//                                               </p>
//                                           )}
//                                       </td>
//                                       <td className="py-4 px-6">
//                                           <div className="flex items-center gap-2">
//                                               <div className="h-6 w-6 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[9px] font-bold">
//                                                   {log.user.charAt(0).toUpperCase()}
//                                               </div>
//                                               <span className="text-xs font-bold text-slate-700">{log.user}</span>
//                                           </div>
//                                       </td>
//                                   </tr>
//                               ))
//                           )}
//                       </tbody>
//                   </table>
//               </div>
//           </div>
//       </div>

//       {/* TIER 4: EMPLOYEE LEADERBOARD & LIVE ACTIVITY */}
//       <div className="pt-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
          
//           {/* LEADERBOARD */}
//           <div className="lg:col-span-2">
//               <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2"><Trophy size={16} className="text-amber-500"/> 6. Team Performance Leaderboard</h2>
//               <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden h-[400px] flex flex-col">
//                   <div className="overflow-x-auto flex-1 custom-scrollbar">
//                       <table className="w-full text-left text-sm">
//                           <thead className="bg-slate-50/80 sticky top-0 z-10">
//                               <tr className="border-b border-slate-100 text-slate-500 text-xs font-bold uppercase tracking-wider">
//                                   <th className="py-4 px-6">Employee Name</th>
//                                   <th className="py-4 px-6 text-center">Assigned Tasks</th>
//                                   <th className="py-4 px-6 text-center text-emerald-600">Completed</th>
//                                   <th className="py-4 px-6 text-center text-blue-600">Processing</th>
//                                   <th className="py-4 px-6 text-center text-rose-600">Overdue</th>
//                               </tr>
//                           </thead>
//                           <tbody className="divide-y divide-slate-100">
//                               {analytics.employeeStats.length === 0 ? (
//                                   <tr><td colSpan="5" className="text-center py-10 text-slate-400">No task data available for employees yet.</td></tr>
//                               ) : (
//                                   analytics.employeeStats.map((emp, idx) => (
//                                       <tr key={idx} className="hover:bg-slate-50 transition-colors">
//                                           <td className="py-4 px-6">
//                                               <div className="flex items-center gap-3">
//                                                   <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-[10px] ${idx === 0 ? 'bg-amber-100 text-amber-600 ring-2 ring-amber-400' : 'bg-slate-100 text-slate-600'}`}>
//                                                       {idx === 0 ? <Trophy size={12}/> : `${idx + 1}`}
//                                                   </div>
//                                                   <div>
//                                                       <p className="font-bold text-slate-800">{emp.name}</p>
//                                                       <p className="text-[10px] text-slate-500 uppercase">{emp.designation}</p>
//                                                   </div>
//                                               </div>
//                                           </td>
//                                           <td className="py-4 px-6 text-center font-bold text-slate-700">{emp.totalAssigned}</td>
//                                           <td className="py-4 px-6 text-center">
//                                               <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-lg font-black border border-emerald-100">{emp.completed}</span>
//                                           </td>
//                                           <td className="py-4 px-6 text-center">
//                                               <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg font-bold border border-blue-100">{emp.pending}</span>
//                                           </td>
//                                           <td className="py-4 px-6 text-center">
//                                               {emp.overdue > 0 ? (
//                                                   <span className="bg-rose-50 text-rose-700 px-3 py-1 rounded-lg font-black border border-rose-100 animate-pulse">{emp.overdue}</span>
//                                               ) : (
//                                                   <span className="text-slate-400 font-medium">-</span>
//                                               )}
//                                           </td>
//                                       </tr>
//                                   ))
//                               )}
//                           </tbody>
//                       </table>
//                   </div>
//               </div>
//           </div>

//           {/* LIVE ACTIVITY LOG */}
//           <div className="lg:col-span-1">
//               <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2"><History size={16} className="text-blue-500"/> 7. Live Activity Feed</h2>
//               <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden h-[400px] flex flex-col">
//                   <div className="p-4 bg-slate-50/50 border-b border-slate-100">
//                       <p className="text-[11px] font-bold text-slate-500 uppercase">Recent actions by team</p>
//                   </div>
//                   <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
//                       {analytics.recentActivities.length === 0 ? (
//                           <div className="flex flex-col items-center justify-center h-full text-slate-400">
//                               <History size={32} className="mb-2 opacity-50"/>
//                               <p className="text-xs font-medium">No recent activity found.</p>
//                           </div>
//                       ) : (
//                           analytics.recentActivities.map((act) => {
//                               const Icon = act.icon;
//                               return (
//                                   <div key={act.id} className="flex gap-3 animate-in fade-in slide-in-from-right-4">
//                                       <div className={`mt-0.5 h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${act.bg} ${act.color}`}>
//                                           <Icon size={14} />
//                                       </div>
//                                       <div>
//                                           <p className="text-xs font-medium text-slate-600 leading-snug">
//                                               <span className="font-bold text-slate-900">{act.user}</span> {act.action} <span className="font-bold text-slate-800">{act.subject}</span>
//                                           </p>
//                                           <p className="text-[10px] font-bold text-slate-400 mt-1">
//                                               {act.time.toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
//                                           </p>
//                                       </div>
//                                   </div>
//                               )
//                           })
//                       )}
//                   </div>
//               </div>
//           </div>
//       </div>

//       {/* NEW TASK MODAL FOR CEO */}
//       {isTodoModalOpen && (
//         <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
//           <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200">
//             <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/80">
//               <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
//                 <BellRing className="text-indigo-600" size={20}/> Add CEO Task
//               </h2>
//               <button onClick={() => setIsTodoModalOpen(false)} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/50"><X size={18} /></button>
//             </div>
            
//             <form onSubmit={handleTodoSave} className="p-6 space-y-5">
//               <div>
//                 <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Task Title *</label>
//                 <input type="text" name="title" required value={todoForm.title} onChange={handleTodoChange} placeholder="e.g. Discuss Q3 Sales Target" className="w-full text-sm font-semibold border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500/20 outline-none" />
//               </div>

//               <div>
//                 <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Details / Description</label>
//                 <textarea name="description" rows="2" value={todoForm.description} onChange={handleTodoChange} placeholder="Any specific details..." className="w-full text-sm font-medium border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500/20 outline-none resize-none" />
//               </div>

//               <div className="grid grid-cols-2 gap-4">
//                 <div>
//                   <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1"><CalendarDays size={12}/> Start Date *</label>
//                   <input type="date" name="dueDate" required value={todoForm.dueDate} onChange={handleTodoChange} className="w-full text-sm font-bold border border-slate-200 rounded-xl p-3 text-slate-700 focus:ring-2 focus:ring-indigo-500/20 outline-none" />
//                 </div>
//                 <div>
//                   <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1"><CalendarDays size={12}/> End Date *</label>
//                   <input type="date" name="endDate" required value={todoForm.endDate} onChange={handleTodoChange} className="w-full text-sm font-bold border border-slate-200 rounded-xl p-3 text-slate-700 focus:ring-2 focus:ring-indigo-500/20 outline-none" />
//                 </div>
//               </div>

//               <div>
//                 <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Priority</label>
//                 <select name="priority" value={todoForm.priority} onChange={handleTodoChange} className="w-full text-sm font-bold border border-slate-200 rounded-xl p-3 text-slate-700 focus:ring-2 focus:ring-indigo-500/20 outline-none">
//                   <option value="High">🔴 High Priority</option>
//                   <option value="Medium">🟡 Medium Priority</option>
//                   <option value="Low">🟢 Low Priority</option>
//                 </select>
//               </div>

//               <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
//                 <button type="button" onClick={() => setIsTodoModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl">Cancel</button>
//                 <button type="submit" disabled={todoSaving} className="px-6 py-2.5 text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md transition-all flex items-center gap-2">
//                   {todoSaving ? <Loader2 size={16} className="animate-spin"/> : <CheckCircle2 size={16} />} Save Task
//                 </button>
//               </div>
//             </form>
//           </div>
//         </div>
//       )}

//     </div>
//   );
// };

// export default CeoDashboard;




import React, { useState, useEffect, useContext, useMemo } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import toast, { Toaster } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { 
  TrendingUp, Users, Wallet, AlertOctagon, Trophy, 
  Target, Activity, ArrowUpRight, PieChart, Briefcase, 
  UserCheck, PhoneCall, CheckCircle2, History, ClipboardList,
  FileText, Image, IndianRupee, Banknote,
  Plus, X, BellRing, CalendarDays, Circle, Trash2, ListTodo, CheckSquare, Loader2, AlertCircle
} from 'lucide-react';

const CeoDashboard = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate(); 
  
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    clients: [], leads: [], tasks: [], itr: [], gst: [], employees: [], invoices: [], attendance: [], 
    clientMaster: [] // 🔴 NAYA: Client Master Data Array
  });

  // SUCCESS LIST (TODO) STATES
  const [ceoTodos, setCeoTodos] = useState([]);
  const [isTodoModalOpen, setIsTodoModalOpen] = useState(false);
  const [todoSaving, setTodoSaving] = useState(false);
  
  const [todoTab, setTodoTab] = useState('Pending'); 

  const [todoForm, setTodoForm] = useState({
    title: '', description: '', 
    dueDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    priority: 'High'
  });

  useEffect(() => {
    const fetchCeoData = async () => {
      try {
        const headers = { Authorization: `Bearer ${user.token}` };
        // 🔴 NAYA: Added Client Master API Endpoint
        const [clientsRes, leadsRes, tasksRes, itrRes, gstRes, empRes, invoiceRes, attRes, todosRes, clientMasterRes] = await Promise.all([
          axios.get(`${import.meta.env.VITE_API_URL}/clients`, { headers }).catch(() => ({ data: [] })),
          axios.get(`${import.meta.env.VITE_API_URL}/leads`, { headers }).catch(() => ({ data: [] })),
          axios.get(`${import.meta.env.VITE_API_URL}/tasks`, { headers }).catch(() => ({ data: [] })),
          axios.get(`${import.meta.env.VITE_API_URL}/itr`, { headers }).catch(() => ({ data: [] })),
          axios.get(`${import.meta.env.VITE_API_URL}/gst`, { headers }).catch(() => ({ data: [] })),
          axios.get(`${import.meta.env.VITE_API_URL}/users/employees`, { headers }).catch(() => ({ data: [] })),
          axios.get(`${import.meta.env.VITE_API_URL}/invoices`, { headers }).catch(() => ({ data: [] })),
          axios.get(`${import.meta.env.VITE_API_URL}/hr/attendance`, { headers }).catch(() => ({ data: [] })),
          axios.get(`${import.meta.env.VITE_API_URL}/todos`, { headers }).catch(() => ({ data: [] })),
          axios.get(`${import.meta.env.VITE_API_URL}/client-master`, { headers }).catch(() => ({ data: { data: [] } }))
        ]);

        setData({
          clients: Array.isArray(clientsRes.data) ? clientsRes.data : (clientsRes.data?.clients || []),
          leads: Array.isArray(leadsRes.data) ? leadsRes.data : (leadsRes.data?.leads || []),
          tasks: Array.isArray(tasksRes.data) ? tasksRes.data : [],
          itr: Array.isArray(itrRes.data) ? itrRes.data : [],
          gst: Array.isArray(gstRes.data) ? gstRes.data : [],
          employees: Array.isArray(empRes.data) ? empRes.data : [],
          invoices: Array.isArray(invoiceRes.data) ? invoiceRes.data : (invoiceRes.data?.data || invoiceRes.data?.invoices || []),
          attendance: Array.isArray(attRes.data) ? attRes.data : [],
          clientMaster: Array.isArray(clientMasterRes.data?.data) ? clientMasterRes.data.data : (clientMasterRes.data || []) // 🔴 Data set kara
        });

        setCeoTodos(Array.isArray(todosRes.data) ? todosRes.data : []);
      } catch (error) {
        console.error("Error fetching CEO data", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCeoData();
  }, [user.token]);

  // ==========================================
  // SUCCESS LIST (TO-DO) HANDLERS
  // ==========================================
  const handleTodoChange = (e) => setTodoForm({ ...todoForm, [e.target.name]: e.target.value });

  const handleTodoSave = async (e) => {
    e.preventDefault();
    if (!todoForm.title || !todoForm.endDate) return toast.error("Title and End Date are mandatory!");
    setTodoSaving(true);
    try {
      const headers = { Authorization: `Bearer ${user.token}` };
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/todos`, todoForm, { headers });
      toast.success("Task added to Success List! Reminder Active.");
      setCeoTodos([...ceoTodos, res.data]);
      setIsTodoModalOpen(false);
      setTodoTab('Pending');
      setTodoForm({ title: '', description: '', dueDate: new Date().toISOString().split('T')[0], endDate: new Date().toISOString().split('T')[0], priority: 'High' });
    } catch (error) {
      toast.error("Error saving task");
    } finally { setTodoSaving(false); }
  };

  const toggleTodoStatus = async (todo) => {
    const newStatus = todo.status === 'Completed' ? 'Pending' : 'Completed';
    try {
      const headers = { Authorization: `Bearer ${user.token}` };
      await axios.put(`${import.meta.env.VITE_API_URL}/todos/${todo._id}`, { status: newStatus }, { headers });
      setCeoTodos(prev => prev.map(t => t._id === todo._id ? { ...t, status: newStatus } : t));
      if (newStatus === 'Completed') toast.success("Awesome! Task Completed 🎉");
    } catch (error) { toast.error("Failed to update task"); }
  };

  const deleteTodo = async (id) => {
    if (!window.confirm("Delete this task from Success List?")) return;
    try {
      const headers = { Authorization: `Bearer ${user.token}` };
      await axios.delete(`${import.meta.env.VITE_API_URL}/todos/${id}`, { headers });
      setCeoTodos(prev => prev.filter(t => t._id !== id));
      toast.success("Task deleted");
    } catch (error) { toast.error("Error deleting task"); }
  };

  const isTodoOverdue = (todo) => {
    if (todo.status === 'Completed') return false;
    const end = new Date(todo.endDate || todo.dueDate);
    end.setHours(23, 59, 59, 999);
    return end < new Date();
  };

  const getPriorityColor = (priority) => {
    if (priority === 'High') return 'text-rose-600 bg-rose-50 border-rose-200';
    if (priority === 'Medium') return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-emerald-600 bg-emerald-50 border-emerald-200';
  };

  const filteredCeoTodos = useMemo(() => {
    let filtered = ceoTodos;
    if (todoTab !== 'All') {
      filtered = filtered.filter(t => t.status === todoTab);
    }
    return filtered.sort((a, b) => {
      if (a.status === 'Completed' && b.status !== 'Completed') return 1;
      if (a.status !== 'Completed' && b.status === 'Completed') return -1;
      return new Date(a.endDate || a.dueDate) - new Date(b.endDate || b.dueDate);
    });
  }, [ceoTodos, todoTab]);


  // ==========================================
  // CEO Level Analytics Calculation
  // ==========================================
  const analytics = useMemo(() => {
    const { clients, leads, tasks, itr, gst, employees, invoices, attendance, clientMaster } = data;
    
    // 1. FINANCES (Now pulling from both Invoices and Client Master)
    let totalRevenue = 0;
    let totalCollected = 0;
    let totalOpeningBalance = 0; // 🔴 NEW VARIABLE
    const totalInvoicesGenerated = Array.isArray(invoices) ? invoices.length : 0;

    // 🔴 Calculate Opening Balances first
    if (Array.isArray(clientMaster)) {
      clientMaster.forEach(client => {
        totalOpeningBalance += Number(client.openingBalance || 0);
      });
    }

    if (Array.isArray(invoices)) {
      invoices.forEach(inv => {
        const invTotal = Number(inv.totalAmountAfterTax || 0);
        let invReceived = Number(inv.amountReceived || 0);
        
        if (inv.paymentStatus === 'Paid' && invReceived === 0) {
          invReceived = invTotal;
        }
        
        totalRevenue += invTotal;
        totalCollected += invReceived;
      });
    }
    
    // 🔴 Total Expected Revenue ab Opening Balance ko bhi ginega
    const finalTotalRevenue = totalRevenue + totalOpeningBalance;
    const outstanding = finalTotalRevenue - totalCollected;
    const collectionRate = finalTotalRevenue > 0 ? Math.round((totalCollected / finalTotalRevenue) * 100) : 0;

    // Latest 5 Invoices
    const latestInvoices = Array.isArray(invoices) 
      ? [...invoices].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5) 
      : [];

    // 2. Sales & Leads Funnel
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

    // 3. Operations
    const overdueTasks = Array.isArray(tasks) ? tasks.filter(t => t.isOverdue && t.currentStatus !== 'Completed').length : 0;
    const defectiveItr = Array.isArray(itr) ? itr.filter(i => i.itrProcessedStatus === 'Defective').length : 0;
    const gstErrors = Array.isArray(gst) ? gst.filter(g => g.gstStatus === 'Error/Mismatch').length : 0;
    const totalCriticalIssues = defectiveItr + gstErrors;

    // 4. EMPLOYEE PERFORMANCE LEADERBOARD
    const employeeStats = [];
    if (Array.isArray(employees) && Array.isArray(tasks)) {
      employees.forEach(emp => {
          const empTasks = tasks.filter(t => t.assignedTo && (String(t.assignedTo._id || t.assignedTo) === String(emp._id)));
          const completed = empTasks.filter(t => t.currentStatus === 'Completed').length;
          const pending = empTasks.filter(t => t.currentStatus !== 'Completed').length;
          const overdue = empTasks.filter(t => t.isOverdue && t.currentStatus !== 'Completed').length;
          
          employeeStats.push({
              empId: emp.empId || 'EMP---',
              name: emp.name,
              designation: emp.designation || 'Staff',
              totalAssigned: empTasks.length,
              completed,
              pending,
              overdue,
              score: completed 
          });
      });
      employeeStats.sort((a,b) => b.score - a.score);
    }

    // 5. GENERAL LIVE TEAM ACTIVITY LOG
    let allActivities = [];

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

    allActivities.sort((a, b) => b.time - a.time);
    const recentActivities = allActivities.slice(0, 25);

    // 6. BILLING LOG (SIRF INVOICES)
    let billingLogs = [];

    if (Array.isArray(invoices)) {
      invoices.forEach(inv => {
          billingLogs.push({
              id: `inv-${inv._id}`,
              clientName: inv.customer?.name || inv.clientName || inv.assesseeName || 'Unknown Client',
              amount: inv.totalAmountAfterTax || inv.amount || 0,
              action: 'Generated Invoice',
              user: inv.createdBy?.name || 'Admin',
              time: new Date(inv.createdAt || inv.updatedAt),
              type: 'invoice',
              invoiceNo: inv.invoiceNo,
              paymentStatus: inv.paymentStatus
          });
      });
    }

    billingLogs.sort((a,b) => b.time - a.time);
    const recentBillingLogs = billingLogs.slice(0, 20); 

    // 7. HR / ATTENDANCE TODAY
    const offset = new Date().getTimezoneOffset() * 60000;
    const localToday = new Date(Date.now() - offset).toISOString().split('T')[0];

    let presentToday = 0;
    let absentToday = 0;
    let onLeaveToday = 0;
    
    const activeEmployeesList = Array.isArray(employees) ? employees.filter(e => e.status === 'Active' && e.role !== 'Admin' && e.role !== 'Client') : [];
    const activeEmployeesCount = activeEmployeesList.length;

    const presentEmployeesDetails = [];

    if (Array.isArray(attendance)) {
        const todaysRecords = attendance.filter(a => a.date && a.date.startsWith(localToday));
        
        todaysRecords.forEach(r => {
            if (['Present', 'WFH', 'Half Day'].includes(r.status)) {
                presentToday++;
                
                let empName = 'Unknown';
                let empIdStr = 'EMP---';
                
                if (r.employee && typeof r.employee === 'object') {
                    empName = r.employee.name || 'Unknown';
                    empIdStr = r.employee.empId || 'EMP---';
                } else {
                    const foundEmp = employees.find(e => String(e._id) === String(r.employee));
                    if (foundEmp) {
                        empName = foundEmp.name;
                        empIdStr = foundEmp.empId || 'EMP---';
                    }
                }

                let checkInTime = 'N/A';
                if (r.checkInTime) {
                    checkInTime = new Date(r.checkInTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
                }
                
                presentEmployeesDetails.push({
                    name: empName,
                    empId: empIdStr,
                    checkInTime: checkInTime,
                    status: r.status
                });
                
            } else if (r.status === 'Absent') {
                absentToday++;
            } else if (r.status === 'Leave') {
                onLeaveToday++;
            }
        });
    }

    const notMarkedToday = activeEmployeesCount > (presentToday + absentToday + onLeaveToday) 
                            ? activeEmployeesCount - (presentToday + absentToday + onLeaveToday) 
                            : 0;

    return {
      totalRevenue: finalTotalRevenue, // 🔴 UPDATED
      totalCollected, 
      outstanding, 
      collectionRate, 
      totalInvoicesGenerated, 
      latestInvoices,
      totalLeads, newLeads, inTalksLeads, convertedLeads, conversionRate,
      leadServiceItr, leadServiceGst, leadServiceReg,
      overdueTasks, totalCriticalIssues, defectiveItr, gstErrors,
      employeeStats, recentActivities, recentBillingLogs,
      activeEmployeesCount, presentToday, absentToday, onLeaveToday, notMarkedToday, presentEmployeesDetails
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

      {/* CEO SUCCESS LIST */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
          <h2 className="text-sm font-black uppercase tracking-widest text-indigo-600 flex items-center gap-2">
            <ListTodo size={18}/> Success List (My Action Items)
          </h2>
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="flex bg-slate-100 p-1 rounded-xl">
              {['All', 'Pending', 'Completed'].map(tab => (
                <button 
                  key={tab} 
                  onClick={() => setTodoTab(tab)}
                  className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all ${todoTab === tab ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  {tab}
                </button>
              ))}
            </div>
            
            <button onClick={() => setIsTodoModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all ml-auto">
              <Plus size={14}/> Add Task
            </button>
          </div>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
          {filteredCeoTodos.length === 0 ? (
             <div className="bg-white p-6 rounded-3xl border border-slate-200 border-dashed w-full text-center text-slate-400 shadow-sm flex flex-col items-center">
               <CheckSquare size={32} className="mx-auto mb-2 opacity-50"/>
               <p className="text-sm font-bold text-slate-500">List is clear!</p>
               <p className="text-xs">No {todoTab.toLowerCase()} tasks found.</p>
             </div>
          ) : (
             filteredCeoTodos.map(todo => {
                const isCompleted = todo.status === 'Completed';
                const overdue = isTodoOverdue(todo);
                return (
                  <div key={todo._id} className={`bg-white p-4 rounded-2xl border shrink-0 min-w-[320px] max-w-[320px] flex flex-col ${isCompleted ? 'border-slate-200 opacity-60 grayscale-[50%]' : overdue ? 'border-rose-200 shadow-sm bg-rose-50/10' : 'border-slate-200 shadow-sm hover:shadow-md'} transition-all`}>
                    <div className="flex items-start gap-3">
                      <button onClick={() => toggleTodoStatus(todo)} className={`mt-0.5 transition-colors ${isCompleted ? 'text-emerald-500' : 'text-slate-300 hover:text-emerald-500'}`}>
                        {isCompleted ? <CheckCircle2 size={20} className="fill-emerald-50"/> : <Circle size={20} />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className={`text-sm font-bold truncate ${isCompleted ? 'text-slate-500 line-through' : 'text-slate-800'}`} title={todo.title}>{todo.title}</h3>
                          <button onClick={() => deleteTodo(todo._id)} className="text-slate-300 hover:text-rose-500 ml-auto"><Trash2 size={14}/></button>
                        </div>
                        {!isCompleted && (
                          <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${getPriorityColor(todo.priority)}`}>
                            {todo.priority}
                          </span>
                        )}
                        {overdue && !isCompleted && (
                          <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border bg-rose-100 text-rose-700 border-rose-200 inline-flex items-center gap-1 animate-pulse ml-2">
                            <AlertCircle size={10}/> Overdue
                          </span>
                        )}
                        {todo.description && (
                          <p className={`text-xs mt-2 line-clamp-2 leading-relaxed ${isCompleted ? 'text-slate-400' : 'text-slate-500'}`}>{todo.description}</p>
                        )}
                      </div>
                    </div>
                    <div className={`mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold uppercase ${isCompleted ? 'text-slate-300' : 'text-slate-400'}`}>
                      <span className="flex items-center gap-1"><CalendarDays size={12}/> {new Date(todo.dueDate).toLocaleDateString('en-IN', {day:'numeric', month:'short'})}</span>
                      <span className={`flex items-center gap-1 ${!isCompleted ? 'text-rose-500' : ''}`}>End: {new Date(todo.endDate).toLocaleDateString('en-IN', {day:'numeric', month:'short'})}</span>
                    </div>
                  </div>
                );
             })
          )}
        </div>
      </div>

      {/* TIER 1: FINANCIAL HEALTH (Invoice + Opening Balances) */}
      <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2 mt-4">1. Business Health</h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-3xl text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-20"><Wallet size={80} /></div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Total Expected Revenue (Inv + O.B.)</p>
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
          <FileText size={32} className="text-indigo-500 mb-3" />
          <h4 className="text-xl font-black text-slate-800">{analytics.totalInvoicesGenerated}</h4>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Invoices Generated</p>
        </div>
      </div>

      {/* TIER 2: LATEST INVOICES RAISED */}
      <div className="pt-4">
          <div className="flex justify-between items-center mb-3">
             <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
               <FileText size={16} className="text-indigo-500"/> 2. Latest Generated Invoices
             </h2>
             <button onClick={() => navigate('/invoice-generator', { state: { openHistory: true } })} className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 shadow-sm">
               View All Invoices <ArrowUpRight size={14}/>
             </button>
          </div>
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50/80 border-b border-slate-100">
                          <tr className="text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                              <th className="py-4 px-6">Invoice No & Date</th>
                              <th className="py-4 px-6">Client Name</th>
                              <th className="py-4 px-6 text-right">Billed Amount</th>
                              <th className="py-4 px-6 text-center">Status</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                          {analytics.latestInvoices.length === 0 ? (
                              <tr><td colSpan="4" className="text-center py-10 text-slate-400">No invoices generated yet.</td></tr>
                          ) : (
                              analytics.latestInvoices.map((inv) => (
                                  <tr key={inv._id} className="hover:bg-slate-50 transition-colors">
                                      <td className="py-4 px-6">
                                          <p className="font-bold text-slate-800">{inv.invoiceNo}</p>
                                          <p className="text-[10px] text-slate-500 font-medium mt-0.5">{new Date(inv.invoiceDate || inv.createdAt).toLocaleDateString('en-IN')}</p>
                                      </td>
                                      <td className="py-4 px-6 font-bold text-slate-700">
                                          {inv.customer?.name || 'Unknown Client'}
                                          {inv.isProforma && <span className="ml-2 bg-purple-100 text-purple-700 text-[9px] px-1.5 py-0.5 rounded uppercase">Proforma</span>}
                                      </td>
                                      <td className="py-4 px-6 font-black text-slate-800 text-right">
                                          ₹{Number(inv.totalAmountAfterTax || 0).toLocaleString('en-IN')}
                                      </td>
                                      <td className="py-4 px-6 text-center">
                                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${inv.paymentStatus === 'Paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : inv.paymentStatus === 'Partially Paid' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                                              {inv.paymentStatus || 'Pending'}
                                          </span>
                                      </td>
                                  </tr>
                              ))
                          )}
                      </tbody>
                  </table>
              </div>
          </div>
      </div>

      {/* TIER 3: DEEP LEAD ANALYTICS & BOTTLENECKS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
        
        {/* LEAD FUNNEL */}
        <div>
          <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">3. Sales Pipeline & Conversions</h2>
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

        {/* RED FLAGS & NEW ATTENDANCE BLOCK */}
        <div className="flex flex-col gap-6 h-full">
          
          <div className="bg-rose-50 border border-rose-100 p-5 rounded-3xl shadow-sm">
            <h2 className="text-xs font-black uppercase tracking-widest text-rose-500 mb-3 flex items-center gap-2"><AlertOctagon size={16}/> 4. Operational Red Flags</h2>
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
             <h2 className="text-xs font-black uppercase tracking-widest text-blue-400 mb-3 flex items-center gap-2"><Users size={16}/> 5. Today's Team Attendance</h2>
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

             <div className="mt-4 pt-4 border-t border-slate-700">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Punched In Today</p>
                <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar pr-1">
                   {analytics.presentEmployeesDetails.length === 0 ? (
                       <p className="text-xs text-slate-500 italic">No one has punched in yet.</p>
                   ) : (
                       analytics.presentEmployeesDetails.map((emp, i) => (
                           <div key={i} className="flex justify-between items-center bg-slate-900/40 p-2.5 rounded-lg border border-slate-700/80 hover:border-slate-600 transition-colors">
                               <div className="flex items-center gap-2.5">
                                   <div className="h-6 w-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold border border-emerald-500/30">
                                       {emp.name.charAt(0)}
                                   </div>
                                   <div>
                                       <p className="text-xs font-bold text-slate-300 leading-none">{emp.name}</p>
                                       <p className="text-[9px] font-mono text-slate-500 mt-0.5">{emp.empId}</p>
                                   </div>
                               </div>
                               <div className="text-right">
                                   <span className="text-xs font-bold text-emerald-400 tracking-wide">{emp.checkInTime}</span>
                                   <p className="text-[9px] text-slate-500 uppercase mt-0.5">{emp.status}</p>
                               </div>
                           </div>
                       ))
                   )}
                </div>
             </div>
          </div>

        </div>
      </div>

      {/* TIER 4: BILLING & PAYMENT PROOFS AUDIT LOG */}
      <div className="pt-4">
          <div className="flex justify-between items-center mb-3">
             <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
               <Banknote size={16} className="text-emerald-500"/> 6. Billing & Invoices Log
             </h2>
             <button onClick={() => navigate('/invoice-generator', { state: { openHistory: true } })} className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 shadow-sm">
               View All Invoices <ArrowUpRight size={14}/>
             </button>
          </div>
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50/80 border-b border-slate-100">
                          <tr className="text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                              <th className="py-4 px-6">Date & Time</th>
                              <th className="py-4 px-6">Invoice & Client</th>
                              <th className="py-4 px-6 text-emerald-600">Amount & Status</th>
                              <th className="py-4 px-6">Action / Details</th>
                              <th className="py-4 px-6">Action By</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                          {analytics.recentBillingLogs.length === 0 ? (
                              <tr><td colSpan="5" className="text-center py-10 text-slate-400">No invoices generated yet.</td></tr>
                          ) : (
                              analytics.recentBillingLogs.map((log) => (
                                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                                      <td className="py-4 px-6 whitespace-nowrap text-xs font-bold text-slate-600 align-top">
                                          {log.time.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                      </td>
                                      <td className="py-4 px-6 font-bold text-slate-800 align-top">
                                          {log.invoiceNo && <span className="block text-blue-600 font-mono text-[10px] mb-0.5">{log.invoiceNo}</span>}
                                          {log.clientName}
                                      </td>
                                      <td className="py-4 px-6 font-black text-emerald-600 align-top">
                                          {log.amount > 0 ? `₹${log.amount.toLocaleString('en-IN')}` : '-'}
                                          <div className="mt-1.5">
                                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${log.paymentStatus === 'Paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : log.paymentStatus === 'Partially Paid' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                                              {log.paymentStatus || 'Pending'}
                                            </span>
                                          </div>
                                      </td>
                                      <td className="py-4 px-6 align-top">
                                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border bg-blue-50 text-blue-700 border-blue-100">
                                              <FileText size={12}/> {log.action}
                                          </div>
                                      </td>
                                      <td className="py-4 px-6 align-top">
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

      {/* TIER 5: EMPLOYEE LEADERBOARD */}
      <div className="pt-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <div className="lg:col-span-2">
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2"><Trophy size={16} className="text-amber-500"/> 7. Team Performance Leaderboard</h2>
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden h-[400px] flex flex-col">
                  <div className="overflow-x-auto flex-1 custom-scrollbar">
                      <table className="w-full text-left text-sm">
                          <thead className="bg-slate-50/80 sticky top-0 z-10">
                              <tr className="border-b border-slate-100 text-slate-500 text-xs font-bold uppercase tracking-wider">
                                  <th className="py-4 px-6">Employee Details</th>
                                  <th className="py-4 px-6 text-center">Assigned Tasks</th>
                                  <th className="py-4 px-6 text-center text-emerald-600">Completed</th>
                                  <th className="py-4 px-6 text-center text-blue-600">Processing</th>
                                  <th className="py-4 px-6 text-center text-rose-600">Overdue</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                              {analytics.employeeStats.length === 0 ? (
                                  <tr><td colSpan="5" className="text-center py-10 text-slate-400">No employee data available.</td></tr>
                              ) : (
                                  analytics.employeeStats.map((emp, idx) => (
                                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                          <td className="py-4 px-6">
                                              <div className="flex items-center gap-3">
                                                  <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-[10px] ${idx === 0 && emp.score > 0 ? 'bg-amber-100 text-amber-600 ring-2 ring-amber-400' : 'bg-slate-100 text-slate-600'}`}>
                                                      {idx === 0 && emp.score > 0 ? <Trophy size={12}/> : `${idx + 1}`}
                                                  </div>
                                                  <div>
                                                      <div className="flex items-center gap-2">
                                                          <p className="font-bold text-slate-800">{emp.name}</p>
                                                          <span className="text-[9px] font-mono bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100">{emp.empId}</span>
                                                      </div>
                                                      <p className="text-[10px] text-slate-500 uppercase mt-0.5">{emp.designation}</p>
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
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2"><History size={16} className="text-blue-500"/> 8. Live Activity Feed</h2>
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

      {/* NEW TASK MODAL FOR CEO */}
      {isTodoModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/80">
              <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <BellRing className="text-indigo-600" size={20}/> Add CEO Task
              </h2>
              <button onClick={() => setIsTodoModalOpen(false)} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/50"><X size={18} /></button>
            </div>
            
            <form onSubmit={handleTodoSave} className="p-6 space-y-5">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Task Title *</label>
                <input type="text" name="title" required value={todoForm.title} onChange={handleTodoChange} placeholder="e.g. Discuss Q3 Sales Target" className="w-full text-sm font-semibold border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500/20 outline-none" />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Details / Description</label>
                <textarea name="description" rows="2" value={todoForm.description} onChange={handleTodoChange} placeholder="Any specific details..." className="w-full text-sm font-medium border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500/20 outline-none resize-none" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1"><CalendarDays size={12}/> Start Date *</label>
                  <input type="date" name="dueDate" required value={todoForm.dueDate} onChange={handleTodoChange} className="w-full text-sm font-bold border border-slate-200 rounded-xl p-3 text-slate-700 focus:ring-2 focus:ring-indigo-500/20 outline-none" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1"><CalendarDays size={12}/> End Date *</label>
                  <input type="date" name="endDate" required value={todoForm.endDate} onChange={handleTodoChange} className="w-full text-sm font-bold border border-slate-200 rounded-xl p-3 text-slate-700 focus:ring-2 focus:ring-indigo-500/20 outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Priority</label>
                <select name="priority" value={todoForm.priority} onChange={handleTodoChange} className="w-full text-sm font-bold border border-slate-200 rounded-xl p-3 text-slate-700 focus:ring-2 focus:ring-indigo-500/20 outline-none">
                  <option value="High">🔴 High Priority</option>
                  <option value="Medium">🟡 Medium Priority</option>
                  <option value="Low">🟢 Low Priority</option>
                </select>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button type="button" onClick={() => setIsTodoModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl">Cancel</button>
                <button type="submit" disabled={todoSaving} className="px-6 py-2.5 text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md transition-all flex items-center gap-2">
                  {todoSaving ? <Loader2 size={16} className="animate-spin"/> : <CheckCircle2 size={16} />} Save Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default CeoDashboard;