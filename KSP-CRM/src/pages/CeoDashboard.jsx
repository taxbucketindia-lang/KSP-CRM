// import React, { useState, useEffect, useContext, useMemo } from 'react';
// import axios from 'axios';
// import { AuthContext } from '../context/AuthContext';
// import toast, { Toaster } from 'react-hot-toast';
// import { useNavigate, Link } from 'react-router-dom';
// import { 
//   TrendingUp, Users, Wallet, AlertOctagon, Trophy, 
//   Target, Activity, ArrowUpRight, PieChart, Briefcase, 
//   UserCheck, PhoneCall, CheckCircle2, History, ClipboardList,
//   FileText, Image, IndianRupee, Banknote, Edit,
//   Plus, X, BellRing, CalendarDays, Circle, Trash2, ListTodo, CheckSquare, Loader2, AlertCircle, Filter
// } from 'lucide-react';

// const CeoDashboard = () => {
//   const { user } = useContext(AuthContext);
//   const navigate = useNavigate(); 
  
//   const [loading, setLoading] = useState(true);
//   const [data, setData] = useState({
//     clients: [], leads: [], tasks: [], itr: [], gst: [], employees: [], invoices: [], attendance: [], 
//     clientMaster: []
//   });

//   // ==========================================
//   // SUCCESS LIST (TODO) STATES
//   // ==========================================
//   const [ceoTodos, setCeoTodos] = useState([]);
//   const [isTodoModalOpen, setIsTodoModalOpen] = useState(false);
//   const [todoSaving, setTodoSaving] = useState(false);
  
//   const [isViewAllTodosOpen, setIsViewAllTodosOpen] = useState(false);
//   const [editingTodoId, setEditingTodoId] = useState(null);
//   const [popupDateFilter, setPopupDateFilter] = useState({ start: '', end: '' });
  
//   const [todoTab, setTodoTab] = useState('Pending'); 

//   const [todoForm, setTodoForm] = useState({
//     title: '', description: '', 
//     dueDate: new Date().toISOString().split('T')[0],
//     endDate: new Date().toISOString().split('T')[0],
//     priority: 'High'
//   });

//   // 🔴 NEW STATE FOR ACTIVITY FEED FILTER
//   const [activityFilter, setActivityFilter] = useState('All');

//   useEffect(() => {
//     const fetchCeoData = async () => {
//       try {
//         const headers = { Authorization: `Bearer ${user.token}` };
//         const [clientsRes, leadsRes, tasksRes, itrRes, gstRes, empRes, invoiceRes, attRes, todosRes, clientMasterRes] = await Promise.all([
//           axios.get(`${import.meta.env.VITE_API_URL}/clients`, { headers }).catch(() => ({ data: [] })),
//           axios.get(`${import.meta.env.VITE_API_URL}/leads`, { headers }).catch(() => ({ data: [] })),
//           axios.get(`${import.meta.env.VITE_API_URL}/tasks`, { headers }).catch(() => ({ data: [] })),
//           axios.get(`${import.meta.env.VITE_API_URL}/itr`, { headers }).catch(() => ({ data: [] })),
//           axios.get(`${import.meta.env.VITE_API_URL}/gst`, { headers }).catch(() => ({ data: [] })),
//           axios.get(`${import.meta.env.VITE_API_URL}/users/employees`, { headers }).catch(() => ({ data: [] })),
//           axios.get(`${import.meta.env.VITE_API_URL}/invoices`, { headers }).catch(() => ({ data: [] })),
//           axios.get(`${import.meta.env.VITE_API_URL}/hr/attendance`, { headers }).catch(() => ({ data: [] })),
//           axios.get(`${import.meta.env.VITE_API_URL}/todos`, { headers }).catch(() => ({ data: [] })),
//           axios.get(`${import.meta.env.VITE_API_URL}/client-master`, { headers }).catch(() => ({ data: { data: [] } }))
//         ]);

//         setData({
//           clients: Array.isArray(clientsRes.data) ? clientsRes.data : (clientsRes.data?.clients || []),
//           leads: Array.isArray(leadsRes.data) ? leadsRes.data : (leadsRes.data?.leads || []),
//           tasks: Array.isArray(tasksRes.data) ? tasksRes.data : [],
//           itr: Array.isArray(itrRes.data) ? itrRes.data : [],
//           gst: Array.isArray(gstRes.data) ? gstRes.data : [],
//           employees: Array.isArray(empRes.data) ? empRes.data : [],
//           invoices: Array.isArray(invoiceRes.data) ? invoiceRes.data : (invoiceRes.data?.data || invoiceRes.data?.invoices || []),
//           attendance: Array.isArray(attRes.data) ? attRes.data : [],
//           clientMaster: Array.isArray(clientMasterRes.data?.data) ? clientMasterRes.data.data : (clientMasterRes.data || [])
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

//   const openNewTodo = () => {
//     setEditingTodoId(null);
//     setTodoForm({
//       title: '', description: '', 
//       dueDate: new Date().toISOString().split('T')[0],
//       endDate: new Date().toISOString().split('T')[0],
//       priority: 'High'
//     });
//     setIsTodoModalOpen(true);
//   };

//   const openEditTodo = (todo) => {
//     setEditingTodoId(todo._id);
//     setTodoForm({
//       title: todo.title,
//       description: todo.description || '',
//       dueDate: todo.dueDate ? new Date(todo.dueDate).toISOString().split('T')[0] : '',
//       endDate: todo.endDate ? new Date(todo.endDate).toISOString().split('T')[0] : '',
//       priority: todo.priority || 'Medium'
//     });
//     setIsTodoModalOpen(true);
//   };

//   const handleTodoSave = async (e) => {
//     e.preventDefault();
//     if (!todoForm.title || !todoForm.endDate) return toast.error("Title and End Date are mandatory!");
//     setTodoSaving(true);
//     try {
//       const headers = { Authorization: `Bearer ${user.token}` };
      
//       if (editingTodoId) {
//         // UPDATE EXISTING TASK (Reschedule)
//         const res = await axios.put(`${import.meta.env.VITE_API_URL}/todos/${editingTodoId}`, todoForm, { headers });
//         toast.success("Task Rescheduled/Updated Successfully!");
//         setCeoTodos(prev => prev.map(t => t._id === editingTodoId ? res.data : t));
//       } else {
//         // CREATE NEW TASK
//         const res = await axios.post(`${import.meta.env.VITE_API_URL}/todos`, todoForm, { headers });
//         toast.success("Task added to Success List! Reminder Active.");
//         setCeoTodos([...ceoTodos, res.data]);
//         setTodoTab('Pending');
//       }
//       setIsTodoModalOpen(false);
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

//   // 1. Regular Filtered Todos for Slider
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

//   // 2. Modal View with Date Filters
//   const modalFilteredTodos = useMemo(() => {
//     let filtered = ceoTodos;
//     if (todoTab !== 'All') {
//       filtered = filtered.filter(t => t.status === todoTab);
//     }
//     if (popupDateFilter.start) {
//       const start = new Date(popupDateFilter.start).getTime();
//       filtered = filtered.filter(t => new Date(t.dueDate).getTime() >= start || new Date(t.endDate).getTime() >= start);
//     }
//     if (popupDateFilter.end) {
//       const end = new Date(popupDateFilter.end);
//       end.setHours(23, 59, 59, 999);
//       filtered = filtered.filter(t => new Date(t.endDate).getTime() <= end.getTime());
//     }
//     return filtered.sort((a, b) => {
//       if (a.status === 'Completed' && b.status !== 'Completed') return 1;
//       if (a.status !== 'Completed' && b.status === 'Completed') return -1;
//       return new Date(a.endDate || a.dueDate) - new Date(b.endDate || b.dueDate);
//     });
//   }, [ceoTodos, todoTab, popupDateFilter]);


//   // ==========================================
//   // CEO Level Analytics Calculation
//   // ==========================================
//   const analytics = useMemo(() => {
//     const { clients, leads, tasks, itr, gst, employees, invoices, attendance, clientMaster } = data;
    
//     let totalRevenue = 0;
//     let totalCollected = 0;
//     let totalOpeningBalance = 0; 
//     const totalInvoicesGenerated = Array.isArray(invoices) ? invoices.length : 0;

//     if (Array.isArray(clientMaster)) {
//       clientMaster.forEach(client => {
//         totalOpeningBalance += Number(client.openingBalance || 0);
//       });
//     }

//     if (Array.isArray(invoices)) {
//       invoices.forEach(inv => {
//         const invTotal = Number(inv.totalAmountAfterTax || 0);
//         let invReceived = Number(inv.amountReceived || 0);
        
//         if (inv.paymentStatus === 'Paid' && invReceived === 0) {
//           invReceived = invTotal;
//         }
        
//         totalRevenue += invTotal;
//         totalCollected += invReceived;
//       });
//     }
    
//     const finalTotalRevenue = totalRevenue + totalOpeningBalance;
//     const outstanding = finalTotalRevenue - totalCollected;
//     const collectionRate = finalTotalRevenue > 0 ? Math.round((totalCollected / finalTotalRevenue) * 100) : 0;

//     const latestInvoices = Array.isArray(invoices) 
//       ? [...invoices].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5) 
//       : [];

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

//     const overdueTasks = Array.isArray(tasks) ? tasks.filter(t => t.isOverdue && t.currentStatus !== 'Completed').length : 0;
//     const defectiveItr = Array.isArray(itr) ? itr.filter(i => i.itrProcessedStatus === 'Defective').length : 0;
//     const gstErrors = Array.isArray(gst) ? gst.filter(g => g.gstStatus === 'Error/Mismatch').length : 0;
//     const totalCriticalIssues = defectiveItr + gstErrors;

//     const employeeStats = [];
//     if (Array.isArray(employees) && Array.isArray(tasks)) {
//       employees.forEach(emp => {
//           const empTasks = tasks.filter(t => t.assignedTo && (String(t.assignedTo._id || t.assignedTo) === String(emp._id)));
//           const completed = empTasks.filter(t => t.currentStatus === 'Completed').length;
//           const pending = empTasks.filter(t => t.currentStatus !== 'Completed').length;
//           const overdue = empTasks.filter(t => t.isOverdue && t.currentStatus !== 'Completed').length;
          
//           employeeStats.push({
//               empId: emp.empId || 'EMP---',
//               name: emp.name,
//               designation: emp.designation || 'Staff',
//               totalAssigned: empTasks.length,
//               completed,
//               pending,
//               overdue,
//               score: completed 
//           });
//       });
//       employeeStats.sort((a,b) => b.score - a.score);
//     }

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

//     allActivities.sort((a, b) => b.time - a.time);
//     const recentActivities = allActivities.slice(0, 25);

//     let billingLogs = [];

//     if (Array.isArray(invoices)) {
//       invoices.forEach(inv => {
//           billingLogs.push({
//               id: `inv-${inv._id}`,
//               clientName: inv.customer?.name || inv.clientName || inv.assesseeName || 'Unknown Client',
//               amount: inv.totalAmountAfterTax || inv.amount || 0,
//               action: 'Generated Invoice',
//               user: inv.createdBy?.name || 'Admin',
//               time: new Date(inv.createdAt || inv.updatedAt),
//               type: 'invoice',
//               invoiceNo: inv.invoiceNo,
//               paymentStatus: inv.paymentStatus
//           });
//       });
//     }

//     billingLogs.sort((a,b) => b.time - a.time);
//     // 🔴 REDUCED TO TOP 5
//     const recentBillingLogs = billingLogs.slice(0, 5); 

//     const offset = new Date().getTimezoneOffset() * 60000;
//     const localToday = new Date(Date.now() - offset).toISOString().split('T')[0];

//     let presentToday = 0;
//     let absentToday = 0;
//     let onLeaveToday = 0;
    
//     const activeEmployeesList = Array.isArray(employees) ? employees.filter(e => e.status === 'Active' && e.role !== 'Admin' && e.role !== 'CEO' && e.role !== 'Client') : [];
//     const activeEmployeesCount = activeEmployeesList.length;

//     const presentEmployeesDetails = [];

//     if (Array.isArray(attendance)) {
//         const todaysRecords = attendance.filter(a => a.date && a.date.startsWith(localToday));
        
//         todaysRecords.forEach(r => {
//             if (['Present', 'WFH', 'Half Day'].includes(r.status)) {
//                 presentToday++;
                
//                 let empName = 'Unknown';
//                 let empIdStr = 'EMP---';
                
//                 if (r.employee && typeof r.employee === 'object') {
//                     empName = r.employee.name || 'Unknown';
//                     empIdStr = r.employee.empId || 'EMP---';
//                 } else {
//                     const foundEmp = employees.find(e => String(e._id) === String(r.employee));
//                     if (foundEmp) {
//                         empName = foundEmp.name;
//                         empIdStr = foundEmp.empId || 'EMP---';
//                     }
//                 }

//                 let checkInTime = 'N/A';
//                 if (r.checkInTime) {
//                     checkInTime = new Date(r.checkInTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
//                 }
                
//                 presentEmployeesDetails.push({
//                     name: empName,
//                     empId: empIdStr,
//                     checkInTime: checkInTime,
//                     status: r.status
//                 });
                
//             } else if (r.status === 'Absent') {
//                 absentToday++;
//             } else if (r.status === 'Leave') {
//                 onLeaveToday++;
//             }
//         });
//     }

//     const notMarkedToday = activeEmployeesCount > (presentToday + absentToday + onLeaveToday) 
//                             ? activeEmployeesCount - (presentToday + absentToday + onLeaveToday) 
//                             : 0;

//     return {
//       totalRevenue: finalTotalRevenue, 
//       totalCollected, 
//       outstanding, 
//       collectionRate, 
//       totalInvoicesGenerated, 
//       latestInvoices,
//       totalLeads, newLeads, inTalksLeads, convertedLeads, conversionRate,
//       leadServiceItr, leadServiceGst, leadServiceReg,
//       overdueTasks, totalCriticalIssues, defectiveItr, gstErrors,
//       employeeStats, recentActivities, recentBillingLogs,
//       activeEmployeesCount, presentToday, absentToday, onLeaveToday, notMarkedToday, presentEmployeesDetails
//     };
//   }, [data]);

//   // 🔴 FILTER ACTIVITIES BY EMPLOYEE
//   const displayedActivities = useMemo(() => {
//     if (activityFilter === 'All') return analytics.recentActivities;
//     return analytics.recentActivities.filter(act => act.user === activityFilter);
//   }, [analytics.recentActivities, activityFilter]);

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

//       {/* CEO SUCCESS LIST WIDGET */}
//       <div className="mb-6">
//         <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
//           <h2 className="text-sm font-black uppercase tracking-widest text-indigo-600 flex items-center gap-2">
//             <ListTodo size={18}/> Success List (My Action Items)
//           </h2>
          
//           <div className="flex items-center gap-3 w-full sm:w-auto">
//             {/* TABS AB BAHAR HAIN */}
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
            
//             {/* VIEW ALL & ADD TASK BUTTONS */}
//             <button onClick={() => setIsViewAllTodosOpen(true)} className="text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ml-auto sm:ml-0 border border-indigo-200">
//               View All
//             </button>
//             <button onClick={openNewTodo} className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all">
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
//                           <button onClick={() => openEditTodo(todo)} className="text-slate-400 hover:text-indigo-600 ml-auto bg-slate-50 hover:bg-indigo-50 p-1.5 rounded transition-colors" title="Reschedule / Edit"><Edit size={14}/></button>
//                           <button onClick={() => deleteTodo(todo._id)} className="text-slate-400 hover:text-rose-600 ml-1 bg-slate-50 hover:bg-rose-50 p-1.5 rounded transition-colors" title="Delete"><Trash2 size={14}/></button>
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
//           <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Total Expected Revenue (Inv + O.B.)</p>
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
//           <FileText size={32} className="text-indigo-500 mb-3" />
//           <h4 className="text-xl font-black text-slate-800">{analytics.totalInvoicesGenerated}</h4>
//           <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Invoices Generated</p>
//         </div>
//       </div>

//       {/* TIER 2: LATEST INVOICES RAISED */}
//       <div className="pt-4">
//           <div className="flex justify-between items-center mb-3">
//              <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
//                <FileText size={16} className="text-indigo-500"/> 2. Latest Generated Invoices
//              </h2>
//              <button onClick={() => navigate('/invoice-generator', { state: { openHistory: true } })} className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 shadow-sm">
//                View All Invoices <ArrowUpRight size={14}/>
//              </button>
//           </div>
//           <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
//               <div className="overflow-x-auto custom-scrollbar">
//                   <table className="w-full text-left text-sm">
//                       <thead className="bg-slate-50/80 border-b border-slate-100">
//                           <tr className="text-slate-500 text-[11px] font-bold uppercase tracking-wider">
//                               <th className="py-4 px-6">Invoice No & Date</th>
//                               <th className="py-4 px-6">Client Name</th>
//                               <th className="py-4 px-6 text-right">Billed Amount</th>
//                               <th className="py-4 px-6 text-center">Status</th>
//                           </tr>
//                       </thead>
//                       <tbody className="divide-y divide-slate-100">
//                           {analytics.latestInvoices.length === 0 ? (
//                               <tr><td colSpan="4" className="text-center py-10 text-slate-400">No invoices generated yet.</td></tr>
//                           ) : (
//                               analytics.latestInvoices.map((inv) => (
//                                   <tr key={inv._id} className="hover:bg-slate-50 transition-colors">
//                                       <td className="py-4 px-6">
//                                           <p className="font-bold text-slate-800">{inv.invoiceNo}</p>
//                                           <p className="text-[10px] text-slate-500 font-medium mt-0.5">{new Date(inv.invoiceDate || inv.createdAt).toLocaleDateString('en-IN')}</p>
//                                       </td>
//                                       <td className="py-4 px-6 font-bold text-slate-700">
//                                           {inv.customer?.name || 'Unknown Client'}
//                                           {inv.isProforma && <span className="ml-2 bg-purple-100 text-purple-700 text-[9px] px-1.5 py-0.5 rounded uppercase">Proforma</span>}
//                                       </td>
//                                       <td className="py-4 px-6 font-black text-slate-800 text-right">
//                                           ₹{Number(inv.totalAmountAfterTax || 0).toLocaleString('en-IN')}
//                                       </td>
//                                       <td className="py-4 px-6 text-center">
//                                           <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${inv.paymentStatus === 'Paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : inv.paymentStatus === 'Partially Paid' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
//                                               {inv.paymentStatus || 'Pending'}
//                                           </span>
//                                       </td>
//                                   </tr>
//                               ))
//                           )}
//                       </tbody>
//                   </table>
//               </div>
//           </div>
//       </div>

//       {/* TIER 3: DEEP LEAD ANALYTICS & BOTTLENECKS */}
//       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
//         <div>
//           <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">3. Sales Pipeline & Conversions</h2>
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
//             <h2 className="text-xs font-black uppercase tracking-widest text-rose-500 mb-3 flex items-center gap-2"><AlertOctagon size={16}/> 4. Operational Red Flags</h2>
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
//              <h2 className="text-xs font-black uppercase tracking-widest text-blue-400 mb-3 flex items-center gap-2"><Users size={16}/> 5. Today's Team Attendance</h2>
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

//              <div className="mt-4 pt-4 border-t border-slate-700">
//                 <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Punched In Today</p>
//                 <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar pr-1">
//                    {analytics.presentEmployeesDetails.length === 0 ? (
//                        <p className="text-xs text-slate-500 italic">No one has punched in yet.</p>
//                    ) : (
//                        analytics.presentEmployeesDetails.map((emp, i) => (
//                            <div key={i} className="flex justify-between items-center bg-slate-900/40 p-2.5 rounded-lg border border-slate-700/80 hover:border-slate-600 transition-colors">
//                                <div className="flex items-center gap-2.5">
//                                    <div className="h-6 w-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold border border-emerald-500/30">
//                                        {emp.name.charAt(0)}
//                                    </div>
//                                    <div>
//                                        <p className="text-xs font-bold text-slate-300 leading-none">{emp.name}</p>
//                                        <p className="text-[9px] font-mono text-slate-500 mt-0.5">{emp.empId}</p>
//                                    </div>
//                                </div>
//                                <div className="text-right">
//                                    <span className="text-xs font-bold text-emerald-400 tracking-wide">{emp.checkInTime}</span>
//                                    <p className="text-[9px] text-slate-500 uppercase mt-0.5">{emp.status}</p>
//                                </div>
//                            </div>
//                        ))
//                    )}
//                 </div>
//              </div>
//           </div>
//         </div>
//       </div>

//       {/* TIER 4: BILLING & PAYMENT PROOFS AUDIT LOG */}
//       <div className="pt-4">
//           <div className="flex justify-between items-center mb-3">
//              <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
//                <Banknote size={16} className="text-emerald-500"/> 6. Billing & Invoices Log (Top 5)
//              </h2>
//              <button onClick={() => navigate('/invoice-generator', { state: { openHistory: true } })} className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 shadow-sm">
//                View All Invoices <ArrowUpRight size={14}/>
//              </button>
//           </div>
//           <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
//               <div className="overflow-x-auto custom-scrollbar">
//                   <table className="w-full text-left text-sm">
//                       <thead className="bg-slate-50/80 border-b border-slate-100">
//                           <tr className="text-slate-500 text-[11px] font-bold uppercase tracking-wider">
//                               <th className="py-4 px-6">Date & Time</th>
//                               <th className="py-4 px-6">Invoice & Client</th>
//                               <th className="py-4 px-6 text-emerald-600">Amount & Status</th>
//                               <th className="py-4 px-6">Action / Details</th>
//                               <th className="py-4 px-6">Action By</th>
//                           </tr>
//                       </thead>
//                       <tbody className="divide-y divide-slate-100">
//                           {analytics.recentBillingLogs.length === 0 ? (
//                               <tr><td colSpan="5" className="text-center py-10 text-slate-400">No invoices generated yet.</td></tr>
//                           ) : (
//                               analytics.recentBillingLogs.map((log) => (
//                                   <tr key={log.id} className="hover:bg-slate-50 transition-colors">
//                                       <td className="py-4 px-6 whitespace-nowrap text-xs font-bold text-slate-600 align-top">
//                                           {log.time.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
//                                       </td>
//                                       <td className="py-4 px-6 font-bold text-slate-800 align-top">
//                                           {log.invoiceNo && <span className="block text-blue-600 font-mono text-[10px] mb-0.5">{log.invoiceNo}</span>}
//                                           {log.clientName}
//                                       </td>
//                                       <td className="py-4 px-6 font-black text-emerald-600 align-top">
//                                           {log.amount > 0 ? `₹${log.amount.toLocaleString('en-IN')}` : '-'}
//                                           <div className="mt-1.5">
//                                             <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${log.paymentStatus === 'Paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : log.paymentStatus === 'Partially Paid' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
//                                               {log.paymentStatus || 'Pending'}
//                                             </span>
//                                           </div>
//                                       </td>
//                                       <td className="py-4 px-6 align-top">
//                                           <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border bg-blue-50 text-blue-700 border-blue-100">
//                                               <FileText size={12}/> {log.action}
//                                           </div>
//                                       </td>
//                                       <td className="py-4 px-6 align-top">
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

//       {/* TIER 5: EMPLOYEE LEADERBOARD & LIVE FEED */}
//       <div className="pt-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
//           <div className="lg:col-span-2">
//               <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2"><Trophy size={16} className="text-amber-500"/> 7. Team Performance Leaderboard</h2>
//               <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden h-[400px] flex flex-col">
//                   <div className="overflow-x-auto flex-1 custom-scrollbar">
//                       <table className="w-full text-left text-sm">
//                           <thead className="bg-slate-50/80 sticky top-0 z-10">
//                               <tr className="border-b border-slate-100 text-slate-500 text-xs font-bold uppercase tracking-wider">
//                                   <th className="py-4 px-6">Employee Details</th>
//                                   <th className="py-4 px-6 text-center">Assigned Tasks</th>
//                                   <th className="py-4 px-6 text-center text-emerald-600">Completed</th>
//                                   <th className="py-4 px-6 text-center text-blue-600">Processing</th>
//                                   <th className="py-4 px-6 text-center text-rose-600">Overdue</th>
//                               </tr>
//                           </thead>
//                           <tbody className="divide-y divide-slate-100">
//                               {analytics.employeeStats.length === 0 ? (
//                                   <tr><td colSpan="5" className="text-center py-10 text-slate-400">No employee data available.</td></tr>
//                               ) : (
//                                   analytics.employeeStats.map((emp, idx) => (
//                                       <tr key={idx} className="hover:bg-slate-50 transition-colors">
//                                           <td className="py-4 px-6">
//                                               <div className="flex items-center gap-3">
//                                                   <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-[10px] ${idx === 0 && emp.score > 0 ? 'bg-amber-100 text-amber-600 ring-2 ring-amber-400' : 'bg-slate-100 text-slate-600'}`}>
//                                                       {idx === 0 && emp.score > 0 ? <Trophy size={12}/> : `${idx + 1}`}
//                                                   </div>
//                                                   <div>
//                                                       <div className="flex items-center gap-2">
//                                                           <p className="font-bold text-slate-800">{emp.name}</p>
//                                                           <span className="text-[9px] font-mono bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100">{emp.empId}</span>
//                                                       </div>
//                                                       <p className="text-[10px] text-slate-500 uppercase mt-0.5">{emp.designation}</p>
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

//           {/* LIVE ACTIVITY LOG WITH FILTER */}
//           <div className="lg:col-span-1">
//               <div className="flex justify-between items-center mb-3">
//                  <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
//                     <History size={16} className="text-blue-500"/> 8. Live Activity Feed
//                  </h2>
//                  <div className="relative">
//                     <select 
//                         value={activityFilter}
//                         onChange={(e) => setActivityFilter(e.target.value)}
//                         className="text-xs font-bold text-slate-600 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 focus:ring-2 focus:ring-blue-500/20 outline-none appearance-none bg-white cursor-pointer hover:bg-slate-50 transition-colors shadow-sm"
//                         style={{ maxWidth: '140px' }}
//                     >
//                         <option value="All">All Staff</option>
//                         {[...new Set(analytics.recentActivities.map(act => act.user))].map(user => (
//                             <option key={user} value={user}>{user}</option>
//                         ))}
//                     </select>
//                     <Filter size={12} className="absolute left-2.5 top-[8px] text-slate-400 pointer-events-none" />
//                  </div>
//               </div>

//               <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden h-[400px] flex flex-col">
//                   <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
//                       <p className="text-[11px] font-bold text-slate-500 uppercase">Recent actions by team</p>
//                       {activityFilter !== 'All' && (
//                           <span className="text-[9px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-bold uppercase truncate max-w-[100px]">
//                               {activityFilter}
//                           </span>
//                       )}
//                   </div>
//                   <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
//                       {displayedActivities.length === 0 ? (
//                           <div className="flex flex-col items-center justify-center h-full text-slate-400">
//                               <History size={32} className="mb-2 opacity-50"/>
//                               <p className="text-xs font-medium">No recent activity found.</p>
//                           </div>
//                       ) : (
//                           displayedActivities.map((act) => {
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

//       {/* NEW MODAL: VIEW ALL SUCCESS LIST (Full Filter View) */}
//       {isViewAllTodosOpen && (
//         <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
//           <div className="bg-slate-50 rounded-3xl w-full max-w-4xl shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95">
            
//             <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 bg-white shrink-0">
//               <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
//                 <ListTodo className="text-indigo-600" size={24}/> All Success List Tasks
//               </h2>
//               <button onClick={() => setIsViewAllTodosOpen(false)} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"><X size={20} /></button>
//             </div>

//             <div className="p-4 bg-white border-b border-slate-100 flex flex-col sm:flex-row gap-4 justify-between items-center shrink-0">
//                {/* TABS IN MODAL */}
//                <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
//                  {['All', 'Pending', 'Completed'].map(tab => (
//                    <button 
//                      key={tab} 
//                      onClick={() => setTodoTab(tab)}
//                      className={`flex-1 px-4 py-2 text-xs font-bold rounded-lg transition-all ${todoTab === tab ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
//                    >
//                      {tab}
//                    </button>
//                  ))}
//                </div>

//                {/* DATE FILTER IN MODAL */}
//                <div className="flex items-center gap-2 w-full sm:w-auto">
//                  <input type="date" value={popupDateFilter.start} onChange={(e) => setPopupDateFilter({...popupDateFilter, start: e.target.value})} className="p-2 text-xs font-bold text-slate-600 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 outline-none w-full"/>
//                  <span className="text-slate-400 font-bold text-xs">to</span>
//                  <input type="date" value={popupDateFilter.end} onChange={(e) => setPopupDateFilter({...popupDateFilter, end: e.target.value})} className="p-2 text-xs font-bold text-slate-600 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 outline-none w-full"/>
//                  {(popupDateFilter.start || popupDateFilter.end) && (
//                    <button onClick={() => setPopupDateFilter({start:'', end:''})} className="p-2 bg-rose-50 text-rose-500 rounded-lg hover:bg-rose-100 transition-colors" title="Clear Dates"><X size={14}/></button>
//                  )}
//                </div>
//             </div>

//             <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-slate-50/50">
//               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                  {modalFilteredTodos.length === 0 ? (
//                     <div className="col-span-1 md:col-span-2 text-center py-16 text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200">
//                       <CheckSquare size={48} className="mx-auto mb-3 opacity-50 text-slate-300"/>
//                       <p className="font-bold text-slate-600">No tasks found.</p>
//                       <p className="text-xs">Adjust your date filters or add a new task.</p>
//                     </div>
//                  ) : (
//                     modalFilteredTodos.map(todo => {
//                       const isCompleted = todo.status === 'Completed';
//                       const overdue = isTodoOverdue(todo);
//                       return (
//                         <div key={todo._id} className={`bg-white p-4 rounded-2xl border flex flex-col ${isCompleted ? 'border-slate-200 opacity-60 grayscale-[50%]' : overdue ? 'border-rose-200 shadow-sm bg-rose-50/10' : 'border-slate-200 shadow-sm hover:shadow-md'} transition-all`}>
//                           <div className="flex items-start gap-3">
//                             <button onClick={() => toggleTodoStatus(todo)} className={`mt-0.5 transition-colors ${isCompleted ? 'text-emerald-500' : 'text-slate-300 hover:text-emerald-500'}`}>
//                               {isCompleted ? <CheckCircle2 size={20} className="fill-emerald-50"/> : <Circle size={20} />}
//                             </button>
//                             <div className="flex-1 min-w-0">
//                               <div className="flex items-center gap-2 mb-1">
//                                 <h3 className={`text-sm font-bold truncate ${isCompleted ? 'text-slate-500 line-through' : 'text-slate-800'}`} title={todo.title}>{todo.title}</h3>
//                                 {/* 🔴 RESCHEDULE / EDIT BUTTON */}
//                                 <button onClick={() => openEditTodo(todo)} className="text-slate-400 hover:text-indigo-600 ml-auto bg-slate-50 hover:bg-indigo-50 p-1.5 rounded transition-colors" title="Reschedule / Edit"><Edit size={14}/></button>
//                                 <button onClick={() => deleteTodo(todo._id)} className="text-slate-400 hover:text-rose-600 ml-1 bg-slate-50 hover:bg-rose-50 p-1.5 rounded transition-colors"><Trash2 size={14}/></button>
//                               </div>
//                               {!isCompleted && (
//                                 <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${getPriorityColor(todo.priority)}`}>
//                                   {todo.priority}
//                                 </span>
//                               )}
//                               {overdue && !isCompleted && (
//                                 <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border bg-rose-100 text-rose-700 border-rose-200 inline-flex items-center gap-1 animate-pulse ml-2">
//                                   <AlertCircle size={10}/> Overdue
//                                 </span>
//                               )}
//                               {todo.description && (
//                                 <p className={`text-xs mt-2 line-clamp-2 leading-relaxed ${isCompleted ? 'text-slate-400' : 'text-slate-500'}`}>{todo.description}</p>
//                               )}
//                             </div>
//                           </div>
//                           <div className={`mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold uppercase ${isCompleted ? 'text-slate-300' : 'text-slate-400'}`}>
//                             <span className="flex items-center gap-1"><CalendarDays size={12}/> {new Date(todo.dueDate).toLocaleDateString('en-IN', {day:'numeric', month:'short'})}</span>
//                             <span className={`flex items-center gap-1 ${!isCompleted ? 'text-rose-500' : ''}`}>End: {new Date(todo.endDate).toLocaleDateString('en-IN', {day:'numeric', month:'short'})}</span>
//                           </div>
//                         </div>
//                       );
//                     })
//                  )}
//               </div>
//             </div>
            
//           </div>
//         </div>
//       )}

//       {/* NEW TASK / EDIT TASK MODAL */}
//       {isTodoModalOpen && (
//         <div className="fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
//           <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200">
//             <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/80">
//               <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
//                 <BellRing className="text-indigo-600" size={20}/> {editingTodoId ? 'Reschedule / Edit Task' : 'Add CEO Task'}
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
//                   {todoSaving ? <Loader2 size={16} className="animate-spin"/> : <CheckCircle2 size={16} />} {editingTodoId ? 'Save Changes' : 'Add Task'}
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
import MeetingCalendar from '../components/MeetingCalendar';
import { useNavigate, Link } from 'react-router-dom';
import { 
  TrendingUp, Users, Wallet, AlertOctagon, Trophy, 
  Target, Activity, ArrowUpRight, PieChart, Briefcase, 
  UserCheck, PhoneCall, CheckCircle2, History, ClipboardList,
  FileText, Image, IndianRupee, Banknote, Edit,
  Plus, X, BellRing, CalendarDays, Circle, Trash2, ListTodo, CheckSquare, Loader2, AlertCircle, Filter, Code
} from 'lucide-react';

// 🔴 PERIOD FILTER (Leaderboard + Activity Feed): All Time / Day / Month / Year
const localDateKey = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const currentPeriodValue = (mode) => {
  const today = localDateKey(new Date());
  if (mode === 'day') return today;
  if (mode === 'month') return today.slice(0, 7);
  if (mode === 'year') return today.slice(0, 4);
  return '';
};

// date us period me aati hai ya nahi ('2026-10-09' / '2026-10' / '2026')
const inPeriod = (date, period) => {
  if (period.mode === 'all') return true;
  if (!date || !period.value || Number.isNaN(new Date(date).getTime())) return false;
  return localDateKey(date).startsWith(period.value);
};

const periodLabel = (period) => {
  if (period.mode === 'all' || !period.value) return 'All Time';
  if (period.mode === 'day') return new Date(period.value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  if (period.mode === 'month') return new Date(`${period.value}-01`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  return `Year ${period.value}`;
};

const PeriodFilter = ({ period, onChange }) => {
  const inputClass = "text-xs font-bold text-slate-600 border border-slate-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-blue-500/20 outline-none bg-white shadow-sm";
  return (
    <div className="flex items-center gap-1.5">
      <select
        value={period.mode}
        onChange={(e) => onChange({ mode: e.target.value, value: currentPeriodValue(e.target.value) })}
        className={`${inputClass} cursor-pointer hover:bg-slate-50`}
      >
        <option value="all">All Time</option>
        <option value="day">Day Wise</option>
        <option value="month">Month Wise</option>
        <option value="year">Year Wise</option>
      </select>
      {period.mode === 'day' && (
        <input type="date" value={period.value} onChange={(e) => onChange({ ...period, value: e.target.value })} className={inputClass} />
      )}
      {period.mode === 'month' && (
        <input type="month" value={period.value} onChange={(e) => onChange({ ...period, value: e.target.value })} className={inputClass} />
      )}
      {period.mode === 'year' && (
        <input type="number" min="2020" max="2100" value={period.value} onChange={(e) => onChange({ ...period, value: e.target.value })} className={`${inputClass} w-20`} />
      )}
    </div>
  );
};

// Har section ka ek jaisa heading (icon + title + chhota hint + right side controls)
const SectionTitle = ({ icon: Icon, title, hint, color = 'bg-slate-100 text-slate-600', children }) => (
  <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
    <div className="flex items-center gap-3 min-w-0">
      <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${color}`}><Icon size={18}/></div>
      <div className="min-w-0">
        <h2 className="text-base font-black text-slate-800 leading-tight">{title}</h2>
        {hint && <p className="text-[11px] font-medium text-slate-400">{hint}</p>}
      </div>
    </div>
    {children}
  </div>
);

const CeoDashboard = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate(); 
  
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    clients: [], leads: [], tasks: [], itr: [], gst: [], employees: [], invoices: [], attendance: [], 
    clientMaster: [], devTasks: []
  });

  // ==========================================
  // SUCCESS LIST (TODO) STATES
  // ==========================================
  const [ceoTodos, setCeoTodos] = useState([]);
  const [isTodoModalOpen, setIsTodoModalOpen] = useState(false);
  const [todoSaving, setTodoSaving] = useState(false);
  
  const [isViewAllTodosOpen, setIsViewAllTodosOpen] = useState(false);
  const [editingTodoId, setEditingTodoId] = useState(null);
  const [popupDateFilter, setPopupDateFilter] = useState({ start: '', end: '' });

  const [selectedEmployee, setSelectedEmployee] = useState(null);
const [isEmpModalOpen, setIsEmpModalOpen] = useState(false);
  
  const [todoTab, setTodoTab] = useState('Pending'); 

  const [todoForm, setTodoForm] = useState({
    title: '', description: '', 
    dueDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    priority: 'High'
  });

  // 🔴 NEW STATE FOR ACTIVITY FEED FILTER
  const [activityFilter, setActivityFilter] = useState('All');
  const [activityPeriod, setActivityPeriod] = useState({ mode: 'all', value: '' });
  const [perfPeriod, setPerfPeriod] = useState({ mode: 'all', value: '' });
  const [financePeriod, setFinancePeriod] = useState({ mode: 'all', value: '' });
  const [financeModal, setFinanceModal] = useState(null); // 'revenue' | 'collected' | 'outstanding' | 'invoices'

  useEffect(() => {
    const fetchCeoData = async () => {
      try {
        const headers = { Authorization: `Bearer ${user.token}` };
        const [clientsRes, leadsRes, tasksRes, itrRes, gstRes, empRes, invoiceRes, attRes, todosRes, clientMasterRes, devTasksRes] = await Promise.all([
          axios.get(`${import.meta.env.VITE_API_URL}/clients`, { headers }).catch(() => ({ data: [] })),
          axios.get(`${import.meta.env.VITE_API_URL}/leads`, { headers }).catch(() => ({ data: [] })),
          axios.get(`${import.meta.env.VITE_API_URL}/tasks`, { headers }).catch(() => ({ data: [] })),
          axios.get(`${import.meta.env.VITE_API_URL}/itr`, { headers }).catch(() => ({ data: [] })),
          axios.get(`${import.meta.env.VITE_API_URL}/gst`, { headers }).catch(() => ({ data: [] })),
          axios.get(`${import.meta.env.VITE_API_URL}/users/employees`, { headers }).catch(() => ({ data: [] })),
          axios.get(`${import.meta.env.VITE_API_URL}/invoices`, { headers }).catch(() => ({ data: [] })),
          axios.get(`${import.meta.env.VITE_API_URL}/hr/attendance`, { headers }).catch(() => ({ data: [] })),
          axios.get(`${import.meta.env.VITE_API_URL}/todos`, { headers }).catch(() => ({ data: [] })),
          axios.get(`${import.meta.env.VITE_API_URL}/client-master`, { headers }).catch(() => ({ data: { data: [] } })),
          axios.get(`${import.meta.env.VITE_API_URL}/devtasks`, { headers }).catch(() => ({ data: { data: [] } }))
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
          clientMaster: Array.isArray(clientMasterRes.data?.data) ? clientMasterRes.data.data : (clientMasterRes.data || []),
          devTasks: Array.isArray(devTasksRes.data?.data) ? devTasksRes.data.data : []
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

  const openNewTodo = () => {
    setEditingTodoId(null);
    setTodoForm({
      title: '', description: '', 
      dueDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      priority: 'High'
    });
    setIsTodoModalOpen(true);
  };

  const openEditTodo = (todo) => {
    setEditingTodoId(todo._id);
    setTodoForm({
      title: todo.title,
      description: todo.description || '',
      dueDate: todo.dueDate ? new Date(todo.dueDate).toISOString().split('T')[0] : '',
      endDate: todo.endDate ? new Date(todo.endDate).toISOString().split('T')[0] : '',
      priority: todo.priority || 'Medium'
    });
    setIsTodoModalOpen(true);
  };

const handleOpenEmployeeDetail = (empStat) => {
    // Work Management + Development dono ke tasks pehle se empStat.tasks me hain
    setSelectedEmployee(empStat);
    setIsEmpModalOpen(true);
  };

  const handleTodoSave = async (e) => {
    e.preventDefault();
    if (!todoForm.title || !todoForm.endDate) return toast.error("Title and End Date are mandatory!");
    setTodoSaving(true);
    try {
      const headers = { Authorization: `Bearer ${user.token}` };
      
      if (editingTodoId) {
        // UPDATE EXISTING TASK (Reschedule)
        const res = await axios.put(`${import.meta.env.VITE_API_URL}/todos/${editingTodoId}`, todoForm, { headers });
        toast.success("Task Rescheduled/Updated Successfully!");
        setCeoTodos(prev => prev.map(t => t._id === editingTodoId ? res.data : t));
      } else {
        // CREATE NEW TASK
        const res = await axios.post(`${import.meta.env.VITE_API_URL}/todos`, todoForm, { headers });
        toast.success("Task added to Success List! Reminder Active.");
        setCeoTodos([...ceoTodos, res.data]);
        setTodoTab('Pending');
      }
      setIsTodoModalOpen(false);
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

  // 1. Regular Filtered Todos for Slider
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

  // 2. Modal View with Date Filters
  const modalFilteredTodos = useMemo(() => {
    let filtered = ceoTodos;
    if (todoTab !== 'All') {
      filtered = filtered.filter(t => t.status === todoTab);
    }
    if (popupDateFilter.start) {
      const start = new Date(popupDateFilter.start).getTime();
      filtered = filtered.filter(t => new Date(t.dueDate).getTime() >= start || new Date(t.endDate).getTime() >= start);
    }
    if (popupDateFilter.end) {
      const end = new Date(popupDateFilter.end);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter(t => new Date(t.endDate).getTime() <= end.getTime());
    }
    return filtered.sort((a, b) => {
      if (a.status === 'Completed' && b.status !== 'Completed') return 1;
      if (a.status !== 'Completed' && b.status === 'Completed') return -1;
      return new Date(a.endDate || a.dueDate) - new Date(b.endDate || b.dueDate);
    });
  }, [ceoTodos, todoTab, popupDateFilter]);


  // ==========================================
  // CEO Level Analytics Calculation
  // ==========================================
  const analytics = useMemo(() => {
    const { clients, leads, tasks, itr, gst, employees, invoices, attendance, clientMaster, devTasks } = data;
    
    let totalRevenue = 0;
    let totalCollected = 0;
    let totalOpeningBalance = 0; 
    const totalInvoicesGenerated = Array.isArray(invoices) ? invoices.length : 0;

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
    
    const finalTotalRevenue = totalRevenue + totalOpeningBalance;
    const outstanding = finalTotalRevenue - totalCollected;
    const collectionRate = finalTotalRevenue > 0 ? Math.round((totalCollected / finalTotalRevenue) * 100) : 0;

    const latestInvoices = Array.isArray(invoices) 
      ? [...invoices].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5) 
      : [];

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

    const overdueTasks = Array.isArray(tasks) ? tasks.filter(t => t.isOverdue && t.currentStatus !== 'Completed').length : 0;
    const defectiveItr = Array.isArray(itr) ? itr.filter(i => i.itrProcessedStatus === 'Defective').length : 0;
    const gstErrors = Array.isArray(gst) ? gst.filter(g => g.gstStatus === 'Error/Mismatch').length : 0;
    const totalCriticalIssues = defectiveItr + gstErrors;

    // 🔴 LEADERBOARD: Work Management + Development Tasks dono ka performance
    const sameName = (x, y) => String(x || '').trim().toLowerCase() === String(y || '').trim().toLowerCase();
    const isDevOverdue = (t) => t.status !== 'Completed' && t.dueDate && new Date(t.dueDate) < new Date();

    const employeeStats = [];
    if (Array.isArray(employees) && Array.isArray(tasks)) {
      employees.forEach(emp => {
          const empTasks = tasks.filter(t => t.assignedTo && (String(t.assignedTo._id || t.assignedTo) === String(emp._id)));
          // Dev tasks sirf unhi ke khate me jinka role Developer hai
          const isDeveloper = String(emp.role || '').toLowerCase() === 'developer';
          const empDevTasks = isDeveloper ? (Array.isArray(devTasks) ? devTasks : []).filter(t => sameName(t.assignedTo, emp.name)) : [];

          const completed = empTasks.filter(t => t.currentStatus === 'Completed').length
            + empDevTasks.filter(t => t.status === 'Completed').length;
          const pending = empTasks.filter(t => t.currentStatus !== 'Completed').length
            + empDevTasks.filter(t => t.status !== 'Completed').length;
          const overdue = empTasks.filter(t => t.isOverdue && t.currentStatus !== 'Completed').length
            + empDevTasks.filter(isDevOverdue).length;

          // Dono tarah ke tasks ek hi shape me (employee popup ke liye)
          const allTasks = [
            ...empTasks.map(t => ({
              _id: t._id, source: 'Work', taskId: t.taskId,
              title: t.taskTitle || t.clientName || t.serviceCategory || 'Task',
              description: t.taskDescription, currentStatus: t.currentStatus, dueDate: t.dueDate,
              assignedBy: t.assignedBy?.name, sortTime: new Date(t.updatedAt || t.createdAt),
              createdAt: new Date(t.createdAt),
              completedAt: t.currentStatus === 'Completed' ? new Date(t.completionDate || t.updatedAt || t.createdAt) : null,
              isOverdue: !!t.isOverdue && t.currentStatus !== 'Completed'
            })),
            ...empDevTasks.map(t => ({
              _id: t._id, source: 'Dev', taskId: 'DEV',
              title: t.title,
              description: t.remarks?.length ? `Last update: ${t.remarks[t.remarks.length - 1].message}` : t.description,
              currentStatus: t.status, dueDate: t.dueDate,
              assignedBy: t.assignedByName, sortTime: new Date(t.updatedAt || t.createdAt),
              createdAt: new Date(t.createdAt),
              completedAt: t.status === 'Completed' ? new Date([...(t.remarks || [])].reverse().find(r => r.status === 'Completed')?.date || t.updatedAt || t.createdAt) : null,
              isOverdue: isDevOverdue(t)
            }))
          ].sort((x, y) => y.sortTime - x.sortTime);

          employeeStats.push({
              _id: emp._id,
              empId: emp.empId || 'EMP---',
              name: emp.name,
              isDeveloper,
              designation: emp.designation || emp.role || 'Staff',
              totalAssigned: allTasks.length,
              workAssigned: empTasks.length,
              devAssigned: empDevTasks.length,
              completed,
              pending,
              overdue,
              tasks: allTasks,
              score: completed
          });
      });
      employeeStats.sort((a,b) => b.score - a.score || b.totalAssigned - a.totalAssigned);
    }

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

    // 🔴 WORK MANAGEMENT: kisne kisko task diya + kisne kya update kiya
    if (Array.isArray(tasks)) {
      tasks.forEach(t => {
        const taskName = t.taskTitle || t.clientName || 'Task';
        const created = new Date(t.createdAt);
        const updated = new Date(t.updatedAt || t.createdAt);

        allActivities.push({
          id: `task-assign-${t._id}`,
          user: t.assignedBy?.name || 'Admin',
          action: 'assigned',
          subject: `Task #${t.taskId}`,
          tail: `to ${t.assignedTo?.name || 'an employee'}`,
          detail: taskName,
          source: 'Work',
          time: created,
          icon: ClipboardList,
          color: 'text-blue-600', bg: 'bg-blue-100'
        });

        if (updated - created > 1000) {
          allActivities.push({
            id: `task-update-${t._id}`,
            user: t.assignedTo?.name || 'An Employee',
            action: `updated status to [${t.currentStatus}] on`,
            subject: `Task #${t.taskId}`,
            detail: taskName,
            source: 'Work',
            time: updated,
            icon: ClipboardList,
            color: 'text-blue-600', bg: 'bg-blue-100'
          });
        }
      });
    }

    // 🔴 DEVELOPMENT TASKS: assign + har progress update / remark
    if (Array.isArray(devTasks)) {
      devTasks.forEach(t => {
        allActivities.push({
          id: `dev-assign-${t._id}`,
          user: t.assignedByName || 'Admin',
          action: 'assigned Dev Task',
          subject: t.title,
          tail: `to ${t.assignedTo}`,
          detail: t.module ? `Module: ${t.module}` : '',
          source: 'Dev',
          time: new Date(t.createdAt),
          icon: Code,
          color: 'text-emerald-600', bg: 'bg-emerald-100'
        });

        (t.remarks || []).forEach((r, idx) => {
          allActivities.push({
            id: `dev-remark-${t._id}-${idx}`,
            user: r.employeeName || t.assignedTo,
            action: r.status ? `updated Dev Task [${r.status}]` : 'updated Dev Task',
            subject: t.title,
            detail: r.message,
            source: 'Dev',
            time: new Date(r.date),
            icon: Code,
            color: 'text-emerald-600', bg: 'bg-emerald-100'
          });
        });
      });
    }

    allActivities = allActivities.filter(act => !Number.isNaN(act.time.getTime()));
    allActivities.sort((a, b) => b.time - a.time);
    // Zyada history rakhte hain taaki ek employee chunne par uska poora kaam dikhe
    const recentActivities = allActivities;
    const activityUsers = [...new Set(recentActivities.map(act => act.user))].sort();

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
    // 🔴 REDUCED TO TOP 5
    const recentBillingLogs = billingLogs.slice(0, 5); 

    const offset = new Date().getTimezoneOffset() * 60000;
    const localToday = new Date(Date.now() - offset).toISOString().split('T')[0];

    let presentToday = 0;
    let absentToday = 0;
    let onLeaveToday = 0;
    
    const activeEmployeesList = Array.isArray(employees) ? employees.filter(e => e.status === 'Active' && e.role !== 'Admin' && e.role !== 'CEO' && e.role !== 'Client') : [];
    const activeEmployeesCount = activeEmployeesList.length;

    const presentEmployeesDetails = [];

    if (Array.isArray(attendance)) {
        // More robust date matching (handles both ISO strings and "YYYY-MM-DD" formats)
        const todaysRecords = attendance.filter(a => {
            if (!a.date) return false;
            const recordDate = new Date(a.date).toISOString().split('T')[0];
            return recordDate === localToday || String(a.date).startsWith(localToday);
        });
        
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

                // 🔴 FIXED: Check multiple common keys for check-in time
              let checkInTime = 'N/A';
const rawInTime = r.inTime || r.checkInTime || r.checkIn;

if (rawInTime) {
    // Agar time "09:30" format me hai (HH:MM)
    if (typeof rawInTime === 'string' && rawInTime.includes(':') && !rawInTime.includes('T')) {
        let [h, m] = rawInTime.split(':').map(Number);
        const ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12 || 12;
        checkInTime = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
    } else {
        // Agar full ISO date/time string hai toh usko standard 12-hour format me badal do
        const dateObj = new Date(rawInTime);
        if (!isNaN(dateObj.getTime())) {
            checkInTime = dateObj.toLocaleTimeString('en-IN', { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: true 
            });
        } else {
            checkInTime = String(rawInTime);
        }
    }
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
      totalRevenue: finalTotalRevenue, 
      totalCollected, 
      outstanding, 
      collectionRate, 
      totalInvoicesGenerated, 
      latestInvoices,
      totalLeads, newLeads, inTalksLeads, convertedLeads, conversionRate,
      leadServiceItr, leadServiceGst, leadServiceReg,
      overdueTasks, totalCriticalIssues, defectiveItr, gstErrors,
      employeeStats, recentActivities, activityUsers, recentBillingLogs,
      activeEmployeesCount, presentToday, absentToday, onLeaveToday, notMarkedToday, presentEmployeesDetails
    };
  }, [data]);

  // 🔴 FILTER ACTIVITIES BY EMPLOYEE
  const displayedActivities = useMemo(() => {
    const list = analytics.recentActivities.filter(act =>
      (activityFilter === 'All' || act.user === activityFilter) && inPeriod(act.time, activityPeriod)
    );
    // All Time me sirf taaza 40, kisi din / month / year me us period ki poori history
    return list.slice(0, activityPeriod.mode === 'all' ? 40 : 300);
  }, [analytics.recentActivities, activityFilter, activityPeriod]);

  // 🔴 LEADERBOARD FOR SELECTED DAY / MONTH / YEAR
  // Assigned = us period me mile tasks, Completed = us period me complete hue tasks
  const leaderboard = useMemo(() => {
    if (perfPeriod.mode === 'all') return analytics.employeeStats;

    return analytics.employeeStats.map(emp => {
      const assigned = emp.tasks.filter(t => inPeriod(t.createdAt, perfPeriod));
      const completedTasks = emp.tasks.filter(t => t.completedAt && inPeriod(t.completedAt, perfPeriod));
      const tasksInPeriod = emp.tasks.filter(t => assigned.includes(t) || completedTasks.includes(t));

      return {
        ...emp,
        tasks: tasksInPeriod,
        totalAssigned: assigned.length,
        workAssigned: assigned.filter(t => t.source === 'Work').length,
        devAssigned: assigned.filter(t => t.source === 'Dev').length,
        completed: completedTasks.length,
        pending: assigned.filter(t => t.currentStatus !== 'Completed').length,
        overdue: assigned.filter(t => t.isOverdue).length,
        score: completedTasks.length
      };
    }).sort((x, y) => y.score - x.score || y.totalAssigned - x.totalAssigned);
  }, [analytics.employeeStats, perfPeriod]);

  // 🔴 BUSINESS HEALTH (Day / Month / Year wise) + popup ki lists
  // Revenue / Invoices / Outstanding = us period me bane invoices. Collected = us period me aaya paisa.
  const finance = useMemo(() => {
    const invoices = Array.isArray(data.invoices) ? data.invoices : [];
    const isAll = financePeriod.mode === 'all';
    const latestBy = (list, key) => list.reduce((best, item) => (!best || new Date(item[key]) > new Date(best[key]) ? item : best), null);

    const rows = invoices.map(inv => {
      const total = Number(inv.totalAmountAfterTax || 0);
      let credited = Number(inv.amountReceived || 0); // paisa + discount dono
      if (inv.paymentStatus === 'Paid' && credited === 0) credited = total;

      const history = (inv.paymentHistory || []).map(p => ({
        date: p.date, amount: Number(p.amount || 0), discount: Number(p.discount || 0), mode: p.mode || 'Online'
      }));
      // Purane invoices jinme payment history nahi likhi, sirf received amount hai
      const recorded = history.reduce((sum, p) => sum + p.amount + p.discount, 0);
      if (credited - recorded > 0.5) {
        history.push({ date: inv.paymentDate || inv.updatedAt || inv.createdAt, amount: credited - recorded, discount: 0, mode: 'Not recorded' });
      }

      return {
        id: inv._id,
        invoiceNo: inv.invoiceNo,
        client: inv.customer?.name || inv.clientName || 'Unknown Client',
        phone: inv.customer?.phone || '',
        invDate: inv.invoiceDate || inv.createdAt,
        total, credited,
        due: Math.max(0, total - credited),
        status: inv.paymentStatus || 'Pending',
        history,
        lastPayment: latestBy(history, 'date'),
        lastSent: latestBy(inv.sendLogs || [], 'sentAt'),
        dailyAlert: !!inv.dailyAlert,
        createdBy: inv.createdBy?.name || ''
      };
    });

    const raised = rows.filter(r => inPeriod(r.invDate, financePeriod))
      .sort((a, b) => new Date(b.invDate) - new Date(a.invDate));

    const payments = rows.flatMap(r => r.history
      .filter(p => inPeriod(p.date, financePeriod))
      .map((p, idx) => ({ ...p, key: `${r.id}-${idx}`, client: r.client, invoiceNo: r.invoiceNo }))
    ).sort((a, b) => new Date(b.date) - new Date(a.date));

    // Opening balance ki koi date nahi hoti, isliye sirf All Time me judta hai
    const openingBalance = isAll && Array.isArray(data.clientMaster)
      ? data.clientMaster.reduce((sum, c) => sum + Number(c.openingBalance || 0), 0) : 0;

    const billed = raised.reduce((sum, r) => sum + r.total, 0);
    const collected = payments.reduce((sum, p) => sum + p.amount, 0);
    const discountGiven = payments.reduce((sum, p) => sum + p.discount, 0);
    const invoiceDue = raised.reduce((sum, r) => sum + r.due, 0);
    const revenue = billed + openingBalance;

    // Client wise jod
    const groupByClient = (list) => {
      const map = {};
      list.forEach(r => {
        const key = r.client.trim().toLowerCase();
        if (!map[key]) map[key] = { client: r.client, phone: r.phone, invoices: [], billed: 0, received: 0, due: 0, dailyAlert: false };
        const g = map[key];
        g.invoices.push(r);
        g.billed += r.total;
        g.received += r.credited;
        g.due += r.due;
        g.phone = g.phone || r.phone;
        g.dailyAlert = g.dailyAlert || r.dailyAlert;
      });
      return Object.values(map).map(g => ({
        ...g,
        oldestDate: g.invoices.reduce((old, r) => (!old || new Date(r.invDate) < new Date(old) ? r.invDate : old), null),
        lastPayment: latestBy(g.invoices.map(r => r.lastPayment).filter(Boolean), 'date'),
        lastSent: latestBy(g.invoices.map(r => r.lastSent).filter(Boolean), 'sentAt')
      }));
    };

    return {
      revenue, billed, openingBalance, collected, discountGiven,
      outstanding: invoiceDue + openingBalance,
      invoiceDue,
      invoiceCount: raised.length,
      collectionRate: revenue > 0 ? Math.min(100, Math.round((collected / revenue) * 100)) : 0,
      raised, payments,
      revenueClients: groupByClient(raised).sort((a, b) => b.billed - a.billed),
      outstandingClients: groupByClient(raised.filter(r => r.due > 0)).sort((a, b) => b.due - a.due)
    };
  }, [data.invoices, data.clientMaster, financePeriod]);

  const formatInr = (amount) => `₹${Number(amount || 0).toLocaleString('en-IN')}`;
  const formatDay = (date) => date ? new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
  const daysSince = (date) => date ? Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 86400000)) : 0;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-slate-900"></div>
        <p className="text-slate-500 font-bold tracking-widest uppercase text-xs">Loading CEO Snapshot...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      <Toaster position="top-right" />
      
      {/* HEADER */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 md:p-8 text-white shadow-xl">
        <div className="absolute -top-16 -right-10 h-56 w-56 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-20 left-1/3 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none"></div>

        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-300 flex items-center gap-2">
              <Target size={14}/> Executive Snapshot
            </p>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight mt-2">
              Welcome back, {user?.name?.split(' ')[0] || 'Sir'} 👋
            </h1>
            <p className="text-sm text-slate-300 mt-1 font-medium">
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · Live overview of TaxBucket operations and financials.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 shrink-0">
            <div className="bg-white/10 backdrop-blur border border-white/10 rounded-2xl px-4 py-3 text-center min-w-[96px]">
              <p className="text-xl font-black text-emerald-400">{analytics.presentToday}<span className="text-xs font-bold text-slate-400">/{analytics.activeEmployeesCount}</span></p>
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-300 mt-0.5">Present Today</p>
            </div>
            <div className="bg-white/10 backdrop-blur border border-white/10 rounded-2xl px-4 py-3 text-center min-w-[96px]">
              <p className={`text-xl font-black ${analytics.overdueTasks > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>{analytics.overdueTasks}</p>
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-300 mt-0.5">Overdue Tasks</p>
            </div>
            <div className="bg-white/10 backdrop-blur border border-white/10 rounded-2xl px-4 py-3 text-center min-w-[96px]">
              <p className="text-xl font-black text-amber-300">{analytics.conversionRate}%</p>
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-300 mt-0.5">Lead Win Rate</p>
            </div>
          </div>
        </div>
      </div>

      {/* TIER 1: FINANCIAL HEALTH */}
      <div>
        <SectionTitle icon={Wallet} title="Business Health" hint={`Revenue, collections and dues · ${periodLabel(financePeriod)} · click a card for details`} color="bg-indigo-50 text-indigo-600">
          <PeriodFilter period={financePeriod} onChange={setFinancePeriod} />
        </SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          <button type="button" onClick={() => setFinanceModal('revenue')} className="text-left bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer">
            <div className="flex items-start justify-between gap-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{financePeriod.mode === 'all' ? 'Total Expected Revenue' : 'Revenue Billed'}</p>
              <div className="h-9 w-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0"><Wallet size={18}/></div>
            </div>
            <h3 className="text-2xl font-black text-slate-900 mt-2 break-words">{formatInr(finance.revenue)}</h3>
            <p className="text-[11px] font-semibold text-slate-400 mt-3">
              {financePeriod.mode === 'all' ? 'Invoices + opening balance' : 'Invoices raised in this period'}
            </p>
          </button>

          <button type="button" onClick={() => setFinanceModal('collected')} className="text-left bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer">
            <div className="flex items-start justify-between gap-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Collected</p>
              <div className="h-9 w-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0"><Banknote size={18}/></div>
            </div>
            <h3 className="text-2xl font-black text-emerald-600 mt-2 break-words">{formatInr(finance.collected)}</h3>
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3">
              <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${finance.collectionRate}%` }}></div>
            </div>
            <p className="text-[11px] font-semibold text-slate-400 mt-1.5">
              {finance.collectionRate}% of billed{finance.discountGiven > 0 ? ` · ${formatInr(finance.discountGiven)} discount given` : ''}
            </p>
          </button>

          <button type="button" onClick={() => setFinanceModal('outstanding')} className="text-left bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-rose-300 transition-all cursor-pointer">
            <div className="flex items-start justify-between gap-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Outstanding / Stuck</p>
              <div className="h-9 w-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0"><AlertCircle size={18}/></div>
            </div>
            <h3 className="text-2xl font-black text-rose-600 mt-2 break-words">{formatInr(finance.outstanding)}</h3>
            <p className={`text-[11px] font-bold mt-3 inline-block px-2 py-0.5 rounded ${finance.outstanding > 0 ? 'text-rose-600 bg-rose-50' : 'text-emerald-600 bg-emerald-50'}`}>
              {finance.outstanding > 0 ? `${finance.outstandingClients.length} client(s) to follow up` : 'Nothing pending'}
            </p>
          </button>

          <button type="button" onClick={() => setFinanceModal('invoices')} className="text-left bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-amber-300 transition-all cursor-pointer">
            <div className="flex items-start justify-between gap-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Invoices Generated</p>
              <div className="h-9 w-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0"><FileText size={18}/></div>
            </div>
            <h3 className="text-2xl font-black text-slate-900 mt-2">{finance.invoiceCount}</h3>
            <p className="text-[11px] font-bold text-indigo-600 mt-3 inline-flex items-center gap-1">
              View invoice list <ArrowUpRight size={12}/>
            </p>
          </button>
        </div>
      </div>

      {/* CEO SUCCESS LIST WIDGET */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 md:p-6">
        <SectionTitle icon={ListTodo} title="Success List" hint="Your personal to-do list with reminders" color="bg-indigo-50 text-indigo-600">
          <div className="flex flex-wrap items-center gap-2">
            {/* TABS AB BAHAR HAIN */}
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

            {/* VIEW ALL & ADD TASK BUTTONS */}
            <button onClick={() => setIsViewAllTodosOpen(true)} className="text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-2 rounded-xl text-xs font-bold transition-all border border-indigo-100">
              View All
            </button>
            <button onClick={openNewTodo} className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all">
              <Plus size={14}/> Add Task
            </button>
          </div>
        </SectionTitle>

        <div className="flex gap-4 overflow-x-auto pb-2 custom-scrollbar">
          {filteredCeoTodos.length === 0 ? (
             <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 border-dashed w-full text-center text-slate-400 flex flex-col items-center">
               <CheckSquare size={32} className="mx-auto mb-2 opacity-50"/>
               <p className="text-sm font-bold text-slate-500">List is clear!</p>
               <p className="text-xs">No {todoTab.toLowerCase()} tasks found.</p>
             </div>
          ) : (
             filteredCeoTodos.map(todo => {
                const isCompleted = todo.status === 'Completed';
                const overdue = isTodoOverdue(todo);
                return (
                  <div key={todo._id} className={`p-4 rounded-2xl border shrink-0 min-w-[300px] max-w-[300px] flex flex-col ${isCompleted ? 'bg-slate-50 border-slate-200 opacity-70' : overdue ? 'bg-rose-50/40 border-rose-200' : 'bg-slate-50/60 border-slate-200 hover:border-indigo-200 hover:bg-white hover:shadow-md'} transition-all`}>
                    <div className="flex items-start gap-3">
                      <button onClick={() => toggleTodoStatus(todo)} className={`mt-0.5 transition-colors ${isCompleted ? 'text-emerald-500' : 'text-slate-300 hover:text-emerald-500'}`}>
                        {isCompleted ? <CheckCircle2 size={20} className="fill-emerald-50"/> : <Circle size={20} />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className={`text-sm font-bold truncate ${isCompleted ? 'text-slate-500 line-through' : 'text-slate-800'}`} title={todo.title}>{todo.title}</h3>
                          <button onClick={() => openEditTodo(todo)} className="text-slate-400 hover:text-indigo-600 ml-auto hover:bg-indigo-50 p-1.5 rounded transition-colors" title="Reschedule / Edit"><Edit size={14}/></button>
                          <button onClick={() => deleteTodo(todo._id)} className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded transition-colors" title="Delete"><Trash2 size={14}/></button>
                        </div>
                        {!isCompleted && (
                          <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${getPriorityColor(todo.priority)}`}>
                            {todo.priority}
                          </span>
                        )}
                        {overdue && !isCompleted && (
                          <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border bg-rose-100 text-rose-700 border-rose-200 inline-flex items-center gap-1 ml-2">
                            <AlertCircle size={10}/> Overdue
                          </span>
                        )}
                        {todo.description && (
                          <p className={`text-xs mt-2 line-clamp-2 leading-relaxed ${isCompleted ? 'text-slate-400' : 'text-slate-500'}`}>{todo.description}</p>
                        )}
                      </div>
                    </div>
                    <div className={`mt-4 pt-3 border-t border-slate-200/70 flex items-center justify-between text-[10px] font-bold uppercase ${isCompleted ? 'text-slate-300' : 'text-slate-400'}`}>
                      <span className="flex items-center gap-1"><CalendarDays size={12}/> {new Date(todo.dueDate).toLocaleDateString('en-IN', {day:'numeric', month:'short'})}</span>
                      <span className={`flex items-center gap-1 ${!isCompleted ? 'text-rose-500' : ''}`}>End: {new Date(todo.endDate).toLocaleDateString('en-IN', {day:'numeric', month:'short'})}</span>
                    </div>
                  </div>
                );
             })
          )}
        </div>
      </div>

      {/* 🔴 CALENDAR & MEETINGS (reminders: 9:30 AM, 30 min aur 10 min pehle) */}
      <MeetingCalendar />

      {/* TIER 3: DEEP LEAD ANALYTICS & BOTTLENECKS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        <div className="bg-white p-5 md:p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col">
          <SectionTitle icon={TrendingUp} title="Sales Pipeline & Conversions" hint="Journey from inquiry to conversion" color="bg-blue-50 text-blue-600">
            <div className="text-right">
              <span className="text-2xl font-black text-emerald-600">{analytics.conversionRate}%</span>
              <p className="text-[10px] font-bold uppercase text-slate-400">Win Rate · {analytics.totalLeads} leads</p>
            </div>
          </SectionTitle>

          <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-blue-50/60 p-4 rounded-2xl border border-blue-100 text-center">
                  <div className="mx-auto h-8 w-8 bg-white text-blue-600 rounded-full flex items-center justify-center mb-2 shadow-sm"><UserCheck size={14}/></div>
                  <h4 className="text-xl font-black text-slate-800">{analytics.newLeads}</h4>
                  <p className="text-[9px] font-bold uppercase text-slate-500 mt-1">Fresh Added</p>
              </div>
              <div className="bg-purple-50/60 p-4 rounded-2xl border border-purple-100 text-center">
                  <div className="mx-auto h-8 w-8 bg-white text-purple-600 rounded-full flex items-center justify-center mb-2 shadow-sm"><PhoneCall size={14}/></div>
                  <h4 className="text-xl font-black text-slate-800">{analytics.inTalksLeads}</h4>
                  <p className="text-[9px] font-bold uppercase text-slate-500 mt-1">Follow-ups Active</p>
              </div>
              <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-100 text-center">
                  <div className="mx-auto h-8 w-8 bg-white text-emerald-600 rounded-full flex items-center justify-center mb-2 shadow-sm"><CheckCircle2 size={14}/></div>
                  <h4 className="text-xl font-black text-slate-800">{analytics.convertedLeads}</h4>
                  <p className="text-[9px] font-bold uppercase text-slate-500 mt-1">Converted</p>
              </div>
          </div>

          <div className="mt-auto">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">Converted Clients Breakdown</p>
              <div className="space-y-3">
                {[
                  { label: 'ITR Services', value: analytics.leadServiceItr, bar: 'bg-indigo-500', text: 'text-indigo-700' },
                  { label: 'GST Services', value: analytics.leadServiceGst, bar: 'bg-emerald-500', text: 'text-emerald-700' },
                  { label: 'Registrations / Other', value: analytics.leadServiceReg, bar: 'bg-amber-500', text: 'text-amber-700' }
                ].map(row => {
                  const totalConverted = analytics.leadServiceItr + analytics.leadServiceGst + analytics.leadServiceReg;
                  const width = totalConverted > 0 ? Math.round((row.value / totalConverted) * 100) : 0;
                  return (
                    <div key={row.label}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-bold text-slate-700 flex items-center gap-2"><Briefcase size={13} className={row.text}/> {row.label}</span>
                        <span className={`font-black ${row.text}`}>{row.value}</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5">
                        <div className={`${row.bar} h-1.5 rounded-full transition-all`} style={{ width: `${width}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
          </div>
        </div>

        {/* RED FLAGS & NEW ATTENDANCE BLOCK */}
        <div className="flex flex-col gap-6">
          <div className="bg-white p-5 md:p-6 rounded-3xl border border-slate-200 shadow-sm">
            <SectionTitle icon={AlertOctagon} title="Operational Red Flags" hint="Things that need your attention" color="bg-rose-50 text-rose-600" />
            <div className="grid grid-cols-2 gap-4">
              <div className={`p-4 rounded-2xl border text-center ${analytics.overdueTasks > 0 ? 'bg-rose-50/60 border-rose-100' : 'bg-emerald-50/60 border-emerald-100'}`}>
                <h4 className={`text-3xl font-black ${analytics.overdueTasks > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{analytics.overdueTasks}</h4>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-1">Overdue Tasks</p>
              </div>
              <div className={`p-4 rounded-2xl border text-center ${analytics.totalCriticalIssues > 0 ? 'bg-rose-50/60 border-rose-100' : 'bg-emerald-50/60 border-emerald-100'}`}>
                <h4 className={`text-3xl font-black ${analytics.totalCriticalIssues > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{analytics.totalCriticalIssues}</h4>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-1">Defective Returns</p>
                <p className="text-[9px] text-slate-400 mt-1">({analytics.defectiveItr} ITR / {analytics.gstErrors} GST)</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-5 md:p-6 rounded-3xl border border-slate-200 shadow-sm flex-1 flex flex-col">
             <SectionTitle icon={Users} title="Today's Team Attendance" hint={`${analytics.activeEmployeesCount} active employees`} color="bg-emerald-50 text-emerald-600" />
             <div className="grid grid-cols-3 gap-3">
                <div className="bg-emerald-50/60 p-3 rounded-2xl border border-emerald-100 text-center">
                  <h4 className="text-2xl font-black text-emerald-600">{analytics.presentToday}</h4>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500 mt-1">Present</p>
                </div>
                <div className="bg-rose-50/60 p-3 rounded-2xl border border-rose-100 text-center">
                  <h4 className="text-2xl font-black text-rose-600">{analytics.absentToday + analytics.onLeaveToday}</h4>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500 mt-1">Absent/Leave</p>
                </div>
                <div className="bg-amber-50/60 p-3 rounded-2xl border border-amber-100 text-center">
                  <h4 className="text-2xl font-black text-amber-600">{analytics.notMarkedToday > 0 ? analytics.notMarkedToday : 0}</h4>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500 mt-1">Not Marked</p>
                </div>
             </div>

             <div className="mt-4 pt-4 border-t border-slate-100 flex-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Punched In Today</p>
                <div className="space-y-2 max-h-36 overflow-y-auto custom-scrollbar pr-1">
                   {analytics.presentEmployeesDetails.length === 0 ? (
                       <p className="text-xs text-slate-400 italic">No one has punched in yet.</p>
                   ) : (
                       analytics.presentEmployeesDetails.map((emp, i) => (
                           <div key={i} className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors">
                               <div className="flex items-center gap-2.5">
                                   <div className="h-7 w-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-bold">
                                       {emp.name.charAt(0)}
                                   </div>
                                   <div>
                                       <p className="text-xs font-bold text-slate-700 leading-none">{emp.name}</p>
                                       <p className="text-[9px] font-mono text-slate-400 mt-0.5">{emp.empId}</p>
                                   </div>
                               </div>
                               <div className="text-right">
                                   <span className="text-xs font-bold text-emerald-600 tracking-wide">{emp.checkInTime}</span>
                                   <p className="text-[9px] text-slate-400 uppercase mt-0.5">{emp.status}</p>
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
      <div>
          <SectionTitle icon={Banknote} title="Billing & Invoices Log" hint="Latest invoices and payments recorded" color="bg-emerald-50 text-emerald-600">
             <button onClick={() => navigate('/invoice-generator', { state: { openHistory: true } })} className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-2 rounded-xl transition-colors flex items-center gap-1 border border-indigo-100">
               View All Invoices <ArrowUpRight size={14}/>
             </button>
          </SectionTitle>
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-auto max-h-[420px] custom-scrollbar">
                  <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 border-b border-slate-100 sticky top-0 z-10">
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

      {/* TIER 5: EMPLOYEE LEADERBOARD & LIVE FEED */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2">
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden h-[520px] flex flex-col">
                  <div className="px-5 pt-5 border-b border-slate-100">
                      <SectionTitle icon={Trophy} title="Team Performance Leaderboard" hint={`Work Management + Development · ${periodLabel(perfPeriod)}`} color="bg-amber-50 text-amber-600">
                          <PeriodFilter period={perfPeriod} onChange={setPerfPeriod} />
                      </SectionTitle>
                  </div>
                  <div className="overflow-x-auto flex-1 custom-scrollbar">
                      <table className="w-full text-left text-sm">
                          <thead className="bg-slate-50/80 sticky top-0 z-10">
                              <tr className="border-b border-slate-100 text-slate-500 text-xs font-bold uppercase tracking-wider">
                                  <th className="py-4 px-6">Employee Details</th>
                                  <th className="py-4 px-6 text-center">{perfPeriod.mode === 'all' ? 'Assigned Tasks' : 'Assigned In Period'}</th>
                                  <th className="py-4 px-6 text-center text-emerald-600">{perfPeriod.mode === 'all' ? 'Completed' : 'Completed In Period'}</th>
                                  <th className="py-4 px-6 text-center text-blue-600">Processing</th>
                                  <th className="py-4 px-6 text-center text-rose-600">Overdue</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                              {leaderboard.length === 0 ? (
                                  <tr><td colSpan="5" className="text-center py-10 text-slate-400">No employee data available.</td></tr>
                              ) : (
                                  leaderboard.map((emp, idx) => (
    <tr 
        key={idx} 
        onClick={() => handleOpenEmployeeDetail(emp)}
        className="hover:bg-indigo-50/50 transition-colors cursor-pointer group"
        title="Click to view full workload"
    >
        <td className="py-4 px-6">
            <div className="flex items-center gap-3">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-[10px] ${idx === 0 && emp.score > 0 ? 'bg-amber-100 text-amber-600 ring-2 ring-amber-400' : 'bg-slate-100 text-slate-600 group-hover:bg-indigo-100 group-hover:text-indigo-700 transition-colors'}`}>
                    {idx === 0 && emp.score > 0 ? <Trophy size={12}/> : `${idx + 1}`}
                </div>
                <div>
                    <div className="flex items-center gap-2">
                        <p className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">{emp.name}</p>
                        <span className="text-[9px] font-mono bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100">{emp.empId}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 uppercase mt-0.5">{emp.designation}</p>
                </div>
            </div>
        </td>
        <td className="py-4 px-6 text-center">
            <p className="font-bold text-slate-700">{emp.totalAssigned}</p>
            <p className="text-[9px] font-bold text-slate-400 mt-0.5 whitespace-nowrap">Work {emp.workAssigned}{emp.isDeveloper && <> · <span className="text-emerald-600">Dev {emp.devAssigned}</span></>}</p>
        </td>
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

          {/* EMPLOYEE WORKLOAD PREVIEW MODAL */}
{isEmpModalOpen && selectedEmployee && (
  <div className="fixed inset-0 z-[80] bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
    <div className="bg-slate-50 rounded-3xl w-full max-w-3xl shadow-2xl border border-slate-100 flex flex-col max-h-[85vh] overflow-hidden animate-in fade-in zoom-in-95">
      
      {/* Modal Header */}
      <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 bg-white shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-sm">
            {selectedEmployee.name.charAt(0)}
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
              {selectedEmployee.name} <span className="text-xs font-mono font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{selectedEmployee.empId}</span>
            </h2>
            <p className="text-xs text-slate-500 uppercase font-semibold">{selectedEmployee.designation}</p>
          </div>
        </div>
        <button onClick={() => setIsEmpModalOpen(false)} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"><X size={20} /></button>
      </div>

      {/* Quick Summary Cards */}
      <div className="grid grid-cols-4 gap-3 p-6 bg-white border-b border-slate-100 shrink-0">
        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Assigned</p>
          <p className="text-xl font-black text-slate-800 mt-0.5">{selectedEmployee.totalAssigned}</p>
        </div>
        <div className="bg-emerald-50/50 p-3 rounded-2xl border border-emerald-100 text-center">
          <p className="text-[10px] font-bold text-emerald-600 uppercase">Completed</p>
          <p className="text-xl font-black text-emerald-700 mt-0.5">{selectedEmployee.completed}</p>
        </div>
        <div className="bg-blue-50/50 p-3 rounded-2xl border border-blue-100 text-center">
          <p className="text-[10px] font-bold text-blue-600 uppercase">Pending</p>
          <p className="text-xl font-black text-blue-700 mt-0.5">{selectedEmployee.pending}</p>
        </div>
        <div className="bg-rose-50/50 p-3 rounded-2xl border border-rose-100 text-center">
          <p className="text-[10px] font-bold text-rose-600 uppercase">Overdue</p>
          <p className="text-xl font-black text-rose-700 mt-0.5">{selectedEmployee.overdue}</p>
        </div>
      </div>

      {/* Task List Feed */}
      <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Assigned Work Breakdown (Work Management + Development)</h3>
        {selectedEmployee.tasks.length === 0 ? (
          <div className="text-center py-12 text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200">
            <ClipboardList size={36} className="mx-auto mb-2 opacity-40"/>
            <p className="text-xs font-bold">No specific task records found matching this profile ID.</p>
          </div>
        ) : (
          selectedEmployee.tasks.map((task) => (
            <div key={task._id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-start justify-between gap-4">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${task.source === 'Dev' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>{task.source === 'Dev' ? 'DEV TASK' : `#${task.taskId || 'TASK'}`}</span>
                  <h4 className="text-sm font-bold text-slate-800 truncate">{task.title || task.serviceType || 'Task Item'}</h4>
                </div>
                <p className="text-xs text-slate-500 line-clamp-1">{task.description || task.clientName || 'No description provided.'}</p>
                {task.assignedBy && <p className="text-[10px] font-semibold text-slate-400">Assigned by: {task.assignedBy}</p>}
              </div>
              <div className="text-right shrink-0">
                <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border ${task.currentStatus === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                  {task.currentStatus || 'Pending'}
                </span>
                {task.dueDate && (
                  <p className="text-[10px] font-medium text-slate-400 mt-1">Due: {new Date(task.dueDate).toLocaleDateString('en-IN')}</p>
                )}
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  </div>
)}

          {/* LIVE ACTIVITY LOG WITH FILTER */}
          <div className="lg:col-span-1">
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden h-[520px] flex flex-col">
                  <div className="px-5 pt-5 pb-4 border-b border-slate-100">
                      <SectionTitle icon={History} title="Live Activity Feed" hint={`${periodLabel(activityPeriod)} · ${displayedActivities.length} actions`} color="bg-blue-50 text-blue-600" />
                      <div className="flex flex-wrap items-center gap-2">
                          <div className="relative">
                              <select
                                  value={activityFilter}
                                  onChange={(e) => setActivityFilter(e.target.value)}
                                  className="text-xs font-bold text-slate-600 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 focus:ring-2 focus:ring-blue-500/20 outline-none appearance-none bg-white cursor-pointer hover:bg-slate-50 transition-colors shadow-sm"
                                  style={{ maxWidth: '150px' }}
                              >
                                  <option value="All">All Staff</option>
                                  {analytics.activityUsers.map(user => (
                                      <option key={user} value={user}>{user}</option>
                                  ))}
                              </select>
                              <Filter size={12} className="absolute left-2.5 top-[8px] text-slate-400 pointer-events-none" />
                          </div>
                          <PeriodFilter period={activityPeriod} onChange={setActivityPeriod} />
                      </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                      {displayedActivities.length === 0 ? (
                          <div className="flex flex-col items-center justify-center h-full text-slate-400">
                              <History size={32} className="mb-2 opacity-50"/>
                              <p className="text-xs font-medium">{activityPeriod.mode === 'all' ? 'No recent activity found.' : 'No activity in this period.'}</p>
                          </div>
                      ) : (
                          displayedActivities.map((act) => {
                              const Icon = act.icon;
                              return (
                                  <div key={act.id} className="flex gap-3 animate-in fade-in slide-in-from-right-4">
                                      <div className={`mt-0.5 h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${act.bg} ${act.color}`}>
                                          <Icon size={14} />
                                      </div>
                                      <div className="min-w-0 flex-1">
                                          <p className="text-xs font-medium text-slate-600 leading-snug">
                                              <span className="font-bold text-slate-900">{act.user}</span> {act.action} <span className="font-bold text-slate-800">{act.subject}</span>{act.tail && <> {act.tail}</>}
                                          </p>
                                          {act.detail && <p className="text-[11px] text-slate-500 bg-slate-50 border border-slate-100 rounded-lg px-2 py-1 mt-1 break-words line-clamp-2">{act.detail}</p>}
                                          <p className="text-[10px] font-bold text-slate-400 mt-1">
                                              {act.time.toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                              {act.source && <span className={`ml-2 px-1.5 py-0.5 rounded text-[9px] uppercase ${act.source === 'Dev' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>{act.source === 'Dev' ? 'Development' : 'Work Mgmt'}</span>}
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

      {/* 🔴 MODAL: BUSINESS HEALTH DETAILS (Revenue / Collected / Outstanding / Invoices) */}
      {financeModal && (() => {
        const config = {
          revenue: { title: 'Revenue — Client Wise', total: finance.revenue, color: 'text-slate-900', icon: Wallet, chip: 'bg-indigo-50 text-indigo-600' },
          collected: { title: 'Payments Collected', total: finance.collected, color: 'text-emerald-600', icon: Banknote, chip: 'bg-emerald-50 text-emerald-600' },
          outstanding: { title: 'Outstanding — Client Wise', total: finance.outstanding, color: 'text-rose-600', icon: AlertCircle, chip: 'bg-rose-50 text-rose-600' },
          invoices: { title: 'Invoices Generated', total: finance.billed, color: 'text-slate-900', icon: FileText, chip: 'bg-amber-50 text-amber-600' }
        }[financeModal];
        const ModalIcon = config.icon;
        const statusChip = (status) => status === 'Paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : status === 'Partially Paid' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-rose-50 text-rose-700 border-rose-200';
        const th = "py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-500";
        const empty = (text) => <tr><td colSpan="7" className="text-center py-12 text-slate-400 text-sm">{text}</td></tr>;

        return (
          <div className="fixed inset-0 z-[80] bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-5xl shadow-2xl border border-slate-100 flex flex-col max-h-[88vh] overflow-hidden animate-in fade-in zoom-in-95">
              <div className="flex justify-between items-center gap-4 px-6 py-4 border-b border-slate-200 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${config.chip}`}><ModalIcon size={20}/></div>
                  <div className="min-w-0">
                    <h2 className="text-lg font-black text-slate-800 truncate">{config.title}</h2>
                    <p className="text-[11px] font-semibold text-slate-400">{periodLabel(financePeriod)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <p className={`text-xl font-black ${config.color}`}>{formatInr(config.total)}</p>
                    <p className="text-[10px] font-bold uppercase text-slate-400">Total</p>
                  </div>
                  <button onClick={() => setFinanceModal(null)} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"><X size={20} /></button>
                </div>
              </div>

              <div className="flex-1 overflow-auto custom-scrollbar">
                <table className="w-full text-left text-sm">
                  {/* OUTSTANDING: kis client par kitna baaki hai + uska latest update */}
                  {financeModal === 'outstanding' && (
                    <>
                      <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-100">
                        <tr><th className={th}>Client</th><th className={th}>Pending Invoices</th><th className={`${th} text-right`}>Billed</th><th className={`${th} text-right`}>Received</th><th className={`${th} text-right`}>Outstanding</th><th className={th}>Latest Update</th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {finance.outstandingClients.length === 0 ? empty('No outstanding amount in this period. 🎉') : finance.outstandingClients.map(c => (
                          <tr key={c.client} className="hover:bg-slate-50 align-top">
                            <td className="py-3 px-4">
                              <p className="font-bold text-slate-800">{c.client}</p>
                              {c.phone && <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5"><PhoneCall size={10}/> {c.phone}</p>}
                            </td>
                            <td className="py-3 px-4">
                              {c.invoices.map(inv => (
                                <p key={inv.id} className="text-[11px] text-slate-600 whitespace-nowrap">
                                  <span className="font-mono font-bold text-blue-600">{inv.invoiceNo}</span> · {formatDay(inv.invDate)} · <span className="font-bold text-rose-600">{formatInr(inv.due)}</span>
                                </p>
                              ))}
                            </td>
                            <td className="py-3 px-4 text-right font-semibold text-slate-700 whitespace-nowrap">{formatInr(c.billed)}</td>
                            <td className="py-3 px-4 text-right font-semibold text-emerald-600 whitespace-nowrap">{formatInr(c.received)}</td>
                            <td className="py-3 px-4 text-right font-black text-rose-600 whitespace-nowrap">{formatInr(c.due)}</td>
                            <td className="py-3 px-4 text-[11px] text-slate-600 space-y-1 min-w-[220px]">
                              <p className="font-bold text-slate-700">Pending since {daysSince(c.oldestDate)} day(s)</p>
                              <p>{c.lastPayment ? <>Last payment: <span className="font-bold text-emerald-600">{formatInr(c.lastPayment.amount)}</span> ({c.lastPayment.mode}) on {formatDay(c.lastPayment.date)}</> : <span className="text-rose-500 font-semibold">No payment received yet</span>}</p>
                              <p>{c.lastSent ? <>Invoice sent via {c.lastSent.method} on {formatDay(c.lastSent.sentAt)}{c.lastSent.sentBy?.name ? ` by ${c.lastSent.sentBy.name}` : ''}</> : 'Invoice not sent to client yet'}</p>
                              {c.dailyAlert && <span className="inline-block bg-indigo-50 text-indigo-700 font-bold px-1.5 py-0.5 rounded">Daily reminder ON</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </>
                  )}

                  {/* REVENUE: client wise billing */}
                  {financeModal === 'revenue' && (
                    <>
                      <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-100">
                        <tr><th className={th}>Client</th><th className={th}>Invoices</th><th className={`${th} text-right`}>Billed</th><th className={`${th} text-right`}>Received</th><th className={`${th} text-right`}>Outstanding</th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {finance.revenueClients.length === 0 ? empty('No invoices raised in this period.') : finance.revenueClients.map(c => (
                          <tr key={c.client} className="hover:bg-slate-50 align-top">
                            <td className="py-3 px-4">
                              <p className="font-bold text-slate-800">{c.client}</p>
                              {c.phone && <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5"><PhoneCall size={10}/> {c.phone}</p>}
                            </td>
                            <td className="py-3 px-4">
                              {c.invoices.map(inv => (
                                <p key={inv.id} className="text-[11px] text-slate-600 whitespace-nowrap">
                                  <span className="font-mono font-bold text-blue-600">{inv.invoiceNo}</span> · {formatDay(inv.invDate)} · {formatInr(inv.total)}
                                </p>
                              ))}
                            </td>
                            <td className="py-3 px-4 text-right font-black text-slate-800 whitespace-nowrap">{formatInr(c.billed)}</td>
                            <td className="py-3 px-4 text-right font-semibold text-emerald-600 whitespace-nowrap">{formatInr(c.received)}</td>
                            <td className={`py-3 px-4 text-right font-bold whitespace-nowrap ${c.due > 0 ? 'text-rose-600' : 'text-slate-400'}`}>{c.due > 0 ? formatInr(c.due) : 'Cleared'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </>
                  )}

                  {/* COLLECTED: har payment */}
                  {financeModal === 'collected' && (
                    <>
                      <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-100">
                        <tr><th className={th}>Payment Date</th><th className={th}>Client</th><th className={th}>Invoice</th><th className={th}>Mode</th><th className={`${th} text-right`}>Amount Received</th><th className={`${th} text-right`}>Discount</th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {finance.payments.length === 0 ? empty('No payment received in this period.') : finance.payments.map(p => (
                          <tr key={p.key} className="hover:bg-slate-50">
                            <td className="py-3 px-4 text-xs font-bold text-slate-600 whitespace-nowrap">{formatDay(p.date)}</td>
                            <td className="py-3 px-4 font-bold text-slate-800">{p.client}</td>
                            <td className="py-3 px-4 font-mono text-[11px] font-bold text-blue-600">{p.invoiceNo}</td>
                            <td className="py-3 px-4 text-xs text-slate-600">{p.mode}</td>
                            <td className="py-3 px-4 text-right font-black text-emerald-600 whitespace-nowrap">{formatInr(p.amount)}</td>
                            <td className="py-3 px-4 text-right text-xs font-semibold text-slate-500 whitespace-nowrap">{p.discount > 0 ? formatInr(p.discount) : '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </>
                  )}

                  {/* INVOICES: invoice wise */}
                  {financeModal === 'invoices' && (
                    <>
                      <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-100">
                        <tr><th className={th}>Invoice Date</th><th className={th}>Invoice No</th><th className={th}>Client</th><th className={`${th} text-right`}>Amount</th><th className={`${th} text-right`}>Received</th><th className={`${th} text-right`}>Due</th><th className={th}>Status</th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {finance.raised.length === 0 ? empty('No invoices raised in this period.') : finance.raised.map(inv => (
                          <tr key={inv.id} className="hover:bg-slate-50">
                            <td className="py-3 px-4 text-xs font-bold text-slate-600 whitespace-nowrap">{formatDay(inv.invDate)}</td>
                            <td className="py-3 px-4 font-mono text-[11px] font-bold text-blue-600">{inv.invoiceNo}</td>
                            <td className="py-3 px-4 font-bold text-slate-800">{inv.client}</td>
                            <td className="py-3 px-4 text-right font-black text-slate-800 whitespace-nowrap">{formatInr(inv.total)}</td>
                            <td className="py-3 px-4 text-right font-semibold text-emerald-600 whitespace-nowrap">{formatInr(inv.credited)}</td>
                            <td className={`py-3 px-4 text-right font-bold whitespace-nowrap ${inv.due > 0 ? 'text-rose-600' : 'text-slate-400'}`}>{inv.due > 0 ? formatInr(inv.due) : '-'}</td>
                            <td className="py-3 px-4"><span className={`text-[10px] font-bold px-2 py-0.5 rounded border whitespace-nowrap ${statusChip(inv.status)}`}>{inv.status}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </>
                  )}
                </table>
              </div>

              <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex flex-wrap items-center justify-between gap-3 shrink-0">
                <p className="text-[11px] font-semibold text-slate-500">
                  {financeModal === 'collected' && finance.discountGiven > 0 && `Discount given: ${formatInr(finance.discountGiven)} (not counted as collected). `}
                  {['revenue', 'outstanding'].includes(financeModal) && finance.openingBalance > 0 && `Card total also includes ${formatInr(finance.openingBalance)} opening balance from Client Master, which is not listed here. `}
                  Only clients with invoices are shown.
                </p>
                <button onClick={() => navigate('/invoice-generator', { state: { openHistory: true } })} className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-white hover:bg-indigo-50 px-3 py-2 rounded-xl border border-indigo-100 flex items-center gap-1">
                  Open Invoices <ArrowUpRight size={14}/>
                </button>
              </div>
            </div>
          </div>
        );
      })()}


      {/* NEW MODAL: VIEW ALL SUCCESS LIST (Full Filter View) */}
      {isViewAllTodosOpen && (
        <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-slate-50 rounded-3xl w-full max-w-4xl shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95">
            
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 bg-white shrink-0">
              <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                <ListTodo className="text-indigo-600" size={24}/> All Success List Tasks
              </h2>
              <button onClick={() => setIsViewAllTodosOpen(false)} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"><X size={20} /></button>
            </div>

            <div className="p-4 bg-white border-b border-slate-100 flex flex-col sm:flex-row gap-4 justify-between items-center shrink-0">
               {/* TABS IN MODAL */}
               <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
                 {['All', 'Pending', 'Completed'].map(tab => (
                   <button 
                     key={tab} 
                     onClick={() => setTodoTab(tab)}
                     className={`flex-1 px-4 py-2 text-xs font-bold rounded-lg transition-all ${todoTab === tab ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                   >
                     {tab}
                   </button>
                 ))}
               </div>

               {/* DATE FILTER IN MODAL */}
               <div className="flex items-center gap-2 w-full sm:w-auto">
                 <input type="date" value={popupDateFilter.start} onChange={(e) => setPopupDateFilter({...popupDateFilter, start: e.target.value})} className="p-2 text-xs font-bold text-slate-600 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 outline-none w-full"/>
                 <span className="text-slate-400 font-bold text-xs">to</span>
                 <input type="date" value={popupDateFilter.end} onChange={(e) => setPopupDateFilter({...popupDateFilter, end: e.target.value})} className="p-2 text-xs font-bold text-slate-600 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 outline-none w-full"/>
                 {(popupDateFilter.start || popupDateFilter.end) && (
                   <button onClick={() => setPopupDateFilter({start:'', end:''})} className="p-2 bg-rose-50 text-rose-500 rounded-lg hover:bg-rose-100 transition-colors" title="Clear Dates"><X size={14}/></button>
                 )}
               </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-slate-50/50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {modalFilteredTodos.length === 0 ? (
                    <div className="col-span-1 md:col-span-2 text-center py-16 text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200">
                      <CheckSquare size={48} className="mx-auto mb-3 opacity-50 text-slate-300"/>
                      <p className="font-bold text-slate-600">No tasks found.</p>
                      <p className="text-xs">Adjust your date filters or add a new task.</p>
                    </div>
                 ) : (
                    modalFilteredTodos.map(todo => {
                      const isCompleted = todo.status === 'Completed';
                      const overdue = isTodoOverdue(todo);
                      return (
                        <div key={todo._id} className={`bg-white p-4 rounded-2xl border flex flex-col ${isCompleted ? 'border-slate-200 opacity-60 grayscale-[50%]' : overdue ? 'border-rose-200 shadow-sm bg-rose-50/10' : 'border-slate-200 shadow-sm hover:shadow-md'} transition-all`}>
                          <div className="flex items-start gap-3">
                            <button onClick={() => toggleTodoStatus(todo)} className={`mt-0.5 transition-colors ${isCompleted ? 'text-emerald-500' : 'text-slate-300 hover:text-emerald-500'}`}>
                              {isCompleted ? <CheckCircle2 size={20} className="fill-emerald-50"/> : <Circle size={20} />}
                            </button>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className={`text-sm font-bold truncate ${isCompleted ? 'text-slate-500 line-through' : 'text-slate-800'}`} title={todo.title}>{todo.title}</h3>
                                {/* 🔴 RESCHEDULE / EDIT BUTTON */}
                                <button onClick={() => openEditTodo(todo)} className="text-slate-400 hover:text-indigo-600 ml-auto bg-slate-50 hover:bg-indigo-50 p-1.5 rounded transition-colors" title="Reschedule / Edit"><Edit size={14}/></button>
                                <button onClick={() => deleteTodo(todo._id)} className="text-slate-400 hover:text-rose-600 ml-1 bg-slate-50 hover:bg-rose-50 p-1.5 rounded transition-colors"><Trash2 size={14}/></button>
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
            
          </div>
        </div>
      )}

      {/* NEW TASK / EDIT TASK MODAL */}
      {isTodoModalOpen && (
        <div className="fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/80">
              <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <BellRing className="text-indigo-600" size={20}/> {editingTodoId ? 'Reschedule / Edit Task' : 'Add CEO Task'}
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
                  {todoSaving ? <Loader2 size={16} className="animate-spin"/> : <CheckCircle2 size={16} />} {editingTodoId ? 'Save Changes' : 'Add Task'}
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