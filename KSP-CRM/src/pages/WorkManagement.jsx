import { isAdminRole, isCeoRole } from '../utils/roles';
import { can } from '../utils/permissions';
import { formatIstDate, formatIstTime, istToday, istDateKey, toIstInputValue, istInputToIso } from '../utils/time';
import React, { useState, useEffect, useContext, useMemo } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import toast, { Toaster } from 'react-hot-toast';
import { 
  ClipboardList, Search, Clock, CheckCircle2, AlertCircle, Plus, 
  X, User, Briefcase, Calendar, Flag, FileText, UploadCloud, 
  MessageSquare, UserCircle, Activity, Play, Pause, ChevronRight, RefreshCw, ChevronDown, Phone,
  LayoutGrid, List, BarChart3, Eye, HelpCircle, Pencil, Trash2, Landmark, FilterX, ChevronLeft, CalendarClock
} from 'lucide-react';

const WorkManagement = () => {
  const { user } = useContext(AuthContext);
  
  const [tasks, setTasks] = useState([]);
  const [clients, setClients] = useState([]); 
  const [employees, setEmployees] = useState([]); 
  const [eodReports, setEodReports] = useState([]); 
  const [loading, setLoading] = useState(true);

  const [viewMode, setViewMode] = useState('list'); 

  // Modal & Search States
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [clientTypeFilter, setClientTypeFilter] = useState('All'); 

  // Client Master se "Open in Work Management" dabane par ?search=TaskID aata hai: wahi task seedha dikhe
  const [searchQuery, setSearchQuery] = useState(() => new URLSearchParams(window.location.search).get('search') || '');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [employeeFilter, setEmployeeFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState({ start: '', end: '' });

  // SERVER SIDE PAGINATION & STATS STATE
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [serverStats, setServerStats] = useState({ total: 0, inProgress: 0, pendingClient: 0, underReview: 0, completed: 0, overdue: 0 });
  // Bina filter ka poora hisaab: End of Day report me yahi jata hai (upar ke cards filter ke hisaab se badalte hain)
  const [overallStats, setOverallStats] = useState({ total: 0, inProgress: 0, pendingClient: 0, underReview: 0, completed: 0 });

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isEodModalOpen, setIsEodModalOpen] = useState(false); 
  const [isViewModalOpen, setIsViewModalOpen] = useState(false); 
  const [isEodViewModalOpen, setIsEodViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [taskToView, setTaskToView] = useState(null);
  const [taskToUpdate, setTaskToUpdate] = useState(null);
  const [eodToView, setEodToView] = useState(null);
  const [taskToEdit, setTaskToEdit] = useState(null);

  // 🔴 "Assign & Manage Tasks" ka right: CEO ke paas hamesha, Admin ko CEO deta hai, employee ko Admin deta hai.
  // Jiske paas yeh right hai wahi task de / edit / delete kar sakta hai aur sabke tasks dekh sakta hai.
  const isAdmin = can(user, 'WORK_ASSIGN');
  const isCeo = isCeoRole(user?.role);
  const isTopRole = isAdminRole(user?.role); // CEO / Admin (EOD report nahi bharte)
  const myId = user?._id || user?.id;

  // 🔴 HIERARCHY: CEO -> sirf Admins ko assign karega, Admin -> employees ko (CEO ko nahi)
  // "Assign" right wala employee sirf employees ko de sakta hai (CEO / Admin ko nahi)
  const assignableEmployees = employees.filter(emp => emp._id !== myId && (
    isCeo ? emp.role === 'Admin' : isTopRole ? emp.role !== 'CEO' : !isAdminRole(emp.role)
  ));
  const isMyTask = (task) => !!task && task.assignedTo?._id === myId;

  const initialForm = {
    taskTitle: '',
    taskDate: istToday(),
    clientId: '', serviceCategory: 'GST', subService: '',
    taskDescription: '', assignedTo: '', priority: 'Medium',
    dueDate: '', reviewer: ''
  };
  const [formData, setFormData] = useState(initialForm);

  const [updateForm, setUpdateForm] = useState({
    status: '', govStatus: '', pendingReason: '', remarks: '', 
    followUpDate: '', followUpMode: 'Call'
  });

  const [eodForm, setEodForm] = useState({
    followUpsDone: '', documentsCollected: '', majorAchievement: '',
    majorChallenge: '', supportRequired: '', tomorrowPriority: ''
  });

  const [editForm, setEditForm] = useState({
    taskTitle: '', 
    assignedTo: '', priority: '', dueDate: '', taskDescription: '', reviewer: ''
  });

  // 1. INITIAL LIGHT LOAD (Employees only)
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const headers = { Authorization: `Bearer ${user.token}` };
        const usersRes = await axios.get(`${import.meta.env.VITE_API_URL}/tasks/employees`, { headers });
        const team = Array.isArray(usersRes.data) ? usersRes.data : [];
        setEmployees(team.filter(u => u.role !== 'Client'));
      } catch (error) { console.error("Initial load failed"); }
    };
    fetchInitialData();
  }, [user.token]);

  // 2. SERVER-SIDE PAGINATED TASK FETCH
  const fetchTasks = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${user.token}` };
      const params = {
        page: currentPage,
        limit: viewMode === 'board' ? 500 : 10,
        search: searchQuery,
        status: statusFilter,
        priority: priorityFilter,
        employee: employeeFilter,
        startDate: dateFilter.start,
        endDate: dateFilter.end
      };

      const res = await axios.get(`${import.meta.env.VITE_API_URL}/tasks/paginated`, { headers, params });
      
      setTasks(res.data.tasks || []);
      setTotalPages(res.data.totalPages || 1);
      setServerStats(res.data.stats || { total: 0, inProgress: 0, pendingClient: 0, underReview: 0, completed: 0 });
      setOverallStats(res.data.overallStats || res.data.stats || { total: 0, inProgress: 0, pendingClient: 0, underReview: 0, completed: 0 });

    } catch (error) {
      toast.error("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
    // eslint-disable-next-line
  }, [currentPage, viewMode, searchQuery, statusFilter, priorityFilter, employeeFilter, dateFilter]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, priorityFilter, employeeFilter, dateFilter, viewMode]);

  // 3. EOD FETCH ONLY WHEN NEEDED
  useEffect(() => {
    if (viewMode !== 'eod') return;
    const fetchEods = async () => {
      setLoading(true);
      try {
        const headers = { Authorization: `Bearer ${user.token}` };
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/tasks/eod`, { headers });
        setEodReports(res.data || []); 
      } catch (e) { toast.error("Failed to fetch EODs"); }
      finally { setLoading(false); }
    };
    fetchEods();
  }, [viewMode, user.token]);

  // 4. 🔴 FAIL-SAFE CLIENT FETCHING FOR DROPDOWN
  const fetchClientsForDropdown = async () => {
    if (clients.length > 0) return; 
    try {
      const headers = { Authorization: `Bearer ${user.token}` };
      // 🔴 NAYA LOGIC: Added fetchAll=true to bypass pagination limit
      const [leadsRes, crmRes, masterRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_URL}/leads`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${import.meta.env.VITE_API_URL}/clients`, { headers }).catch(() => ({ data: [] })), 
        axios.get(`${import.meta.env.VITE_API_URL}/client-master?fetchAll=true`, { headers }).catch(() => ({ data: [] })) 
      ]);

      const rawLeads = Array.isArray(leadsRes.data) ? leadsRes.data : (leadsRes.data?.leads || []);
      const rawCrm = Array.isArray(crmRes.data) ? crmRes.data : (crmRes.data?.clients || []);
      
      // 🔴 NAYA LOGIC: Properly parse Client Master Data (it could be in .data or .clients array)
      const masterData = masterRes.data;
      const rawMaster = Array.isArray(masterData) 
        ? masterData 
        : (Array.isArray(masterData?.clients) ? masterData.clients : (Array.isArray(masterData?.data) ? masterData.data : []));

      const formattedLeads = rawLeads.map(l => ({ _id: l._id, clientId: l.clientId || '', name: l.name || 'Unnamed', pan: '', mobile: l.mobile || '', type: 'Lead' }));
      const formattedCrm = rawCrm.map(c => ({ _id: c._id, clientId: c.clientId || '', name: c.assesseeName || c.tradeName || c.name || 'Unnamed', pan: c.pan || '', mobile: c.mobile || '', type: 'Registration CRM' }));
      const formattedMaster = rawMaster.map(m => ({ _id: m._id, clientId: m.clientId || '', name: m.name || m.assesseeName || 'Unnamed', pan: m.pan || '', mobile: m.mobile || '', type: 'Client Master' }));

      const combinedData = [...formattedLeads, ...formattedCrm, ...formattedMaster].map(item => ({
         ...item, clientId: String(item.clientId || ''), name: item.name || '', mobile: String(item.mobile || ''), pan: String(item.pan || '')
      }));

      setClients(combinedData);
    } catch (e) { console.error("Client fetch error"); }
  };

  const handleOpenAddModal = () => {
    setIsAddModalOpen(true);
    fetchClientsForDropdown(); 
  };

  const filteredClientOptions = useMemo(() => {
    let filtered = clients;
    if (clientTypeFilter !== 'All') filtered = filtered.filter(c => c.type === clientTypeFilter);
    if (clientSearchTerm) {
      const lowerSearch = clientSearchTerm.toLowerCase();
      filtered = filtered.filter(c => 
        c.name.toLowerCase().includes(lowerSearch) || 
        c.clientId.toLowerCase().includes(lowerSearch) || 
        c.pan.toLowerCase().includes(lowerSearch) ||
        c.mobile.includes(lowerSearch)
      );
    }
    return filtered;
  }, [clients, clientSearchTerm, clientTypeFilter]);

  const getStatusStyle = (status) => {
    switch (status) {
      case 'Not Started': return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'Started': return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'In Progress': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Pending Client': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Pending Government': return 'bg-purple-50 text-purple-700 border-purple-200'; 
      case 'Pending Internal': return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'Under Review': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'Correction Required': return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'Approved': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Completed': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getPriorityStyle = (priority) => {
    switch (priority) {
      case 'Urgent': return 'text-rose-600 bg-rose-50 border border-rose-200';
      case 'High': return 'text-orange-600 bg-orange-50 border border-orange-200';
      case 'Medium': return 'text-blue-600 bg-blue-50 border border-blue-200';
      case 'Low': return 'text-slate-600 bg-slate-50 border border-slate-200';
      default: return 'text-slate-600 bg-slate-50 border border-slate-200';
    }
  };

  const isTaskOverdue = (task) => {
    if (!task?.dueDate) return false;
    const dueDate = new Date(task.dueDate).getTime();
    if (Number.isNaN(dueDate)) return false;
    return dueDate < Date.now() && !['Completed', 'Cancelled'].includes(task.currentStatus);
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!formData.taskTitle && !formData.clientId) {
      return toast.error("Please enter a Task Title or select a Client!");
    }
    try {
      const headers = { Authorization: `Bearer ${user.token}` };
      const payload = { ...formData }; 
      
      if (payload.clientId) {
        const selectedClientObj = clients.find(c => c._id === formData.clientId);
        if (selectedClientObj) payload.clientName = selectedClientObj.name;
      } else {
        delete payload.clientId;
      }
      if (!payload.reviewer) delete payload.reviewer;
      // Due time India ka hai: server ke timezone se farak na pade isliye pakka instant bhejte hain
      payload.dueDate = istInputToIso(payload.dueDate);

      await axios.post(`${import.meta.env.VITE_API_URL}/tasks`, payload, { headers });
      
      toast.success("New task assigned successfully!");
      setFormData(initialForm);
      setIsAddModalOpen(false);
      fetchTasks();
    } catch (error) { toast.error(error.response?.data?.message || "Failed to create task"); }
  };

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    try {
      const headers = { Authorization: `Bearer ${user.token}` };
      const payload = {
        currentStatus: updateForm.status,
        govStatus: updateForm.status === 'Pending Government' ? updateForm.govStatus : taskToUpdate.govStatus,
        pendingReason: updateForm.pendingReason,
        remarks: updateForm.remarks,
        nextFollowUpDate: updateForm.followUpDate,
        followUpMode: updateForm.followUpMode
      };
      await axios.put(`${import.meta.env.VITE_API_URL}/tasks/${taskToUpdate._id}/status`, payload, { headers });
      toast.success(`Task updated!`);
      setIsUpdateModalOpen(false);
      setUpdateForm({ status: '', govStatus: '', pendingReason: '', remarks: '', followUpDate: '', followUpMode: 'Call' });
      fetchTasks();
    } catch (error) { toast.error("Failed to update status"); }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const headers = { Authorization: `Bearer ${user.token}` };
      await axios.put(`${import.meta.env.VITE_API_URL}/tasks/${taskToEdit._id}`, { ...editForm, dueDate: istInputToIso(editForm.dueDate) }, { headers });
      toast.success("Task updated & re-assigned successfully!");
      setIsEditModalOpen(false);
      fetchTasks();
    } catch (error) { toast.error(error.response?.data?.message || "Failed to update task details"); }
  };

  const handleDeleteTask = async (taskId) => {
    if (window.confirm("Are you sure you want to permanently delete this task?")) {
      try {
        const headers = { Authorization: `Bearer ${user.token}` };
        await axios.delete(`${import.meta.env.VITE_API_URL}/tasks/${taskId}`, { headers });
        toast.success("Task deleted successfully!");
        fetchTasks();
      } catch (error) { toast.error(error.response?.data?.message || "Failed to delete task"); }
    }
  };

  const handleEodSubmit = async (e) => {
    e.preventDefault();
    try {
      const headers = { Authorization: `Bearer ${user.token}` };
      const payload = {
        totalAssigned: overallStats.total,
        totalCompleted: overallStats.completed,
        inProgress: overallStats.inProgress,
        pendingClient: overallStats.pendingClient,
        underReview: overallStats.underReview,
        followUpsDone: parseInt(eodForm.followUpsDone) || 0,
        documentsCollected: parseInt(eodForm.documentsCollected) || 0,
        majorAchievement: eodForm.majorAchievement,
        majorChallenge: eodForm.majorChallenge,
        supportRequired: eodForm.supportRequired,
        tomorrowPriority: eodForm.tomorrowPriority
      };
      await axios.post(`${import.meta.env.VITE_API_URL}/tasks/eod`, payload, { headers });
      toast.success("EOD Report Submitted Successfully!");
      setIsEodModalOpen(false);
      setEodForm({ followUpsDone: '', documentsCollected: '', majorAchievement: '', majorChallenge: '', supportRequired: '', tomorrowPriority: '' });
      if (viewMode === 'eod') {
        const eodRes = await axios.get(`${import.meta.env.VITE_API_URL}/tasks/eod`, { headers });
        setEodReports(eodRes.data || []);
      }
    } catch (error) { toast.error("Failed to submit EOD"); }
  };

  const handleOpenUpdate = (task) => {
    setTaskToUpdate(task);
    setUpdateForm({ 
      status: task.currentStatus,
      govStatus: task.govStatus || '', 
      pendingReason: task.pendingReason || '',
      remarks: '',
      followUpDate: task.nextFollowUpDate ? new Date(task.nextFollowUpDate).toISOString().split('T')[0] : '',
      followUpMode: task.followUpMode || 'Call'
    });
    setIsUpdateModalOpen(true);
  };

  const handleOpenView = (task) => {
    setTaskToView(task);
    setIsViewModalOpen(true);
  };

  const handleOpenEodView = (eod) => {
    setEodToView(eod);
    setIsEodViewModalOpen(true);
  };

  const handleOpenEdit = (task) => {
    setTaskToEdit(task);
    setEditForm({
      taskTitle: task.taskTitle || '',
      assignedTo: task.assignedTo?._id || '',
      priority: task.priority || 'Medium',
      dueDate: toIstInputValue(task.dueDate),
      taskDescription: task.taskDescription || '',
      reviewer: task.reviewer?._id || ''
    });
    setIsEditModalOpen(true);
  };

  // 🔴 UI HELPERS (sirf dikhane ke liye)
  // Due date ka rang: late = laal, aaj = peela, baaki = saada (pehle har date laal dikhti thi)
  const dueInfo = (task) => {
    if (!task.dueDate) return { text: 'No due date', tag: '', style: 'text-slate-400 bg-slate-50 border-slate-200' };
    const text = `${formatIstDate(task.dueDate, { day: '2-digit', month: 'short' })}, ${formatIstTime(task.dueDate)}`;
    if (['Completed', 'Cancelled'].includes(task.currentStatus)) return { text, tag: '', style: 'text-slate-500 bg-slate-50 border-slate-200' };
    if (isTaskOverdue(task)) return { text, tag: 'Overdue', style: 'text-rose-700 bg-rose-50 border-rose-200' };
    if (istDateKey(task.dueDate) === istToday()) return { text, tag: 'Due today', style: 'text-amber-700 bg-amber-50 border-amber-200' };
    return { text, tag: '', style: 'text-slate-600 bg-white border-slate-200' };
  };

  const activeFilterCount = [searchQuery, statusFilter !== 'ALL', priorityFilter !== 'ALL', employeeFilter !== 'ALL', dateFilter.start || dateFilter.end].filter(Boolean).length;
  const clearFilters = () => {
    setSearchQuery(''); setStatusFilter('ALL'); setPriorityFilter('ALL'); setEmployeeFilter('ALL'); setDateFilter({ start: '', end: '' });
  };

  // Upar ke cards: click karne par wahi status filter lag jata hai (dobara click = hat jata hai)
  const statCards = [
    { key: 'total', label: 'Total Tasks', filter: 'ALL', icon: ClipboardList, chip: 'bg-slate-100 text-slate-600', ring: 'ring-slate-400', text: 'text-slate-800' },
    { key: 'inProgress', label: 'In Progress', filter: 'In Progress', icon: Play, chip: 'bg-blue-50 text-blue-600', ring: 'ring-blue-500', text: 'text-blue-700' },
    { key: 'pendingClient', label: 'Pending Client', filter: 'Pending Client', icon: Clock, chip: 'bg-amber-50 text-amber-600', ring: 'ring-amber-500', text: 'text-amber-700' },
    { key: 'underReview', label: 'Under Review', filter: 'Under Review', icon: Eye, chip: 'bg-purple-50 text-purple-600', ring: 'ring-purple-500', text: 'text-purple-700' },
    { key: 'completed', label: 'Completed', filter: 'Completed', icon: CheckCircle2, chip: 'bg-emerald-50 text-emerald-600', ring: 'ring-emerald-500', text: 'text-emerald-700' },
    { key: 'overdue', label: 'Overdue', filter: 'OVERDUE', icon: AlertCircle, chip: 'bg-rose-50 text-rose-600', ring: 'ring-rose-500', text: 'text-rose-700' }
  ];
  const completionRate = serverStats.total ? Math.round((serverStats.completed / serverStats.total) * 100) : 0;

  const boardColumns = [
    ['Not Started', 'bg-slate-400'], ['Started', 'bg-teal-500'], ['In Progress', 'bg-blue-500'], ['Pending Client', 'bg-amber-500'],
    ['Pending Government', 'bg-violet-500'], ['Under Review', 'bg-purple-500'], ['Completed', 'bg-emerald-500']
  ];

  const taskName = (task) => (task.taskTitle ? task.taskTitle : (task.clientName || 'Internal Task'));
  const selectClass = 'text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer hover:border-slate-300 transition-colors';

  const taskViewIsOverdue = isTaskOverdue(taskToView);
  const isReviewMode = isAdmin && !isMyTask(taskToUpdate);

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-10">
      <Toaster position="top-right" />

      {/* HEADER */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 md:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <span className="h-12 w-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/30"><ClipboardList size={22} /></span>
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight leading-tight">Daily Work Management</h1>
            <p className="text-xs md:text-sm text-slate-500 font-medium">Track assigned tasks, monitor deadlines, and submit EOD reports.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            {[['list', 'List', List], ['board', 'Board', LayoutGrid], ['eod', 'EOD Reports', BarChart3]].map(([mode, label, Icon]) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3.5 py-2 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all ${viewMode === mode ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>

          {!isTopRole && (
            <button
              onClick={() => setIsEodModalOpen(true)}
              className="inline-flex items-center gap-2 bg-white text-emerald-600 border border-emerald-200 hover:bg-emerald-50 text-sm font-bold px-4 py-2.5 rounded-xl shadow-sm transition-all"
            >
              <Activity size={16} strokeWidth={2.5} /> Fill EOD
            </button>
          )}

          {isAdmin && (
            <button
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-4 py-2.5 rounded-xl shadow-md shadow-blue-500/20 transition-all"
            >
              <Plus size={16} strokeWidth={2.5} /> Assign Task
            </button>
          )}
        </div>
      </div>

      {viewMode === 'eod' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <h2 className="text-sm font-bold text-slate-800 tracking-tight flex items-center gap-2">
              <BarChart3 size={16} className="text-blue-500" /> Submitted EOD Reports
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-500 text-[11px] font-black uppercase tracking-wider">
                  <th className="py-4 px-5">Date</th>
                  {isAdmin && <th className="py-4 px-5">Employee</th>}
                  <th className="py-4 px-5">Performance Summary</th>
                  <th className="py-4 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="text-center py-16 text-slate-400">
                      <RefreshCw className="animate-spin inline-block mr-2" size={18} />
                      Loading Reports...
                    </td>
                  </tr>
                ) : eodReports.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-16 text-slate-400 flex flex-col items-center">
                      <AlertCircle size={36} className="mb-3 text-slate-300" />
                      No EOD Reports found.
                    </td>
                  </tr>
                ) : (
                  eodReports.map((report) => (
                    <tr key={report._id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-4 px-5 whitespace-nowrap align-top">
                        <span className="font-bold text-slate-800 block">
                          {formatIstDate(report.createdAt, { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                        <div className="text-[10px] text-slate-500 mt-1">
                          {formatIstTime(report.createdAt)}
                        </div>
                      </td>

                      {isAdmin && (
                        <td className="py-4 px-5 align-top">
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 text-[11px] font-bold shrink-0">
                              {report.employee?.name ? report.employee.name.charAt(0).toUpperCase() : 'E'}
                            </div>
                            <div>
                              <span className="text-xs font-bold text-slate-700 block">
                                {report.employee?.name || 'Unknown'}
                              </span>
                              <span className="text-[10px] text-slate-500">{report.employee?.role}</span>
                            </div>
                          </div>
                        </td>
                      )}

                      <td className="py-4 px-5 align-top">
                        <div className="grid grid-cols-2 gap-2 text-[10px] min-w-[200px]">
                          <div className="bg-slate-100 p-1.5 rounded text-slate-600 border border-slate-200">
                            Tasks Done: <strong className="text-slate-800">{report.totalCompleted}/{report.totalAssigned}</strong>
                          </div>
                          <div className="bg-amber-50 p-1.5 rounded text-amber-600 border border-amber-100">
                            Tasks Pend: <strong>{report.pendingClient}</strong>
                          </div>
                          <div className="bg-blue-50 p-1.5 rounded text-blue-600 border border-blue-100 flex items-center gap-1">
                            <Phone size={10} /> Follow-ups: <strong>{report.followUpsDone || 0}</strong>
                          </div>
                          <div className="bg-emerald-50 p-1.5 rounded text-emerald-600 border border-emerald-100 flex items-center gap-1">
                            <FileText size={10} /> Docs Got: <strong>{report.documentsCollected || 0}</strong>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-5 text-right align-top">
                        <button
                          onClick={() => handleOpenEodView(report)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-600 hover:text-white rounded-lg transition-all border border-indigo-200 shadow-sm"
                          title="View Details"
                        >
                          <Eye size={13} strokeWidth={2.5} /> View Details
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {(viewMode === 'list' || viewMode === 'board') && (
        <>
          {/* STAT CARDS: filter ke hisaab se; click karne par us status ka filter lagta hai */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            {statCards.map((card) => {
              const Icon = card.icon;
              const active = card.filter !== 'ALL' && statusFilter === card.filter;
              return (
                <button
                  key={card.key}
                  onClick={() => setStatusFilter(active || card.filter === 'ALL' ? 'ALL' : card.filter)}
                  title={card.filter === 'ALL' ? 'Show all statuses' : active ? 'Click to remove this filter' : `Show only ${card.label}`}
                  className={`text-left bg-white p-4 rounded-2xl border shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 ${active ? `border-transparent ring-2 ${card.ring}` : 'border-slate-200'}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={`h-9 w-9 rounded-xl flex items-center justify-center ${card.chip}`}><Icon size={16} /></span>
                    {active && <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">Filtered</span>}
                  </div>
                  <h3 className={`text-2xl font-black mt-2.5 leading-none ${card.text}`}>{serverStats[card.key] ?? 0}</h3>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-1.5">{card.label}</p>
                  {card.key === 'completed' && serverStats.total > 0 && (
                    <div className="mt-2">
                      <div className="h-1.5 bg-emerald-100 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 rounded-full" style={{ width: `${completionRate}%` }}></div></div>
                      <p className="text-[10px] font-bold text-slate-400 mt-1">{completionRate}% of the list</p>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden mb-4">
            {/* FILTERS */}
            <div className="p-4 border-b border-slate-100 space-y-3">
              <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                <div className="relative w-full lg:w-80 shrink-0">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="text"
                    placeholder="Search Task ID or Title/Client..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-9 py-2.5 text-sm font-medium bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition-colors"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700" title="Clear search"><X size={15} /></button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2.5 w-full">
                  {isAdmin && (
                    <select value={employeeFilter} onChange={(e) => setEmployeeFilter(e.target.value)} className={`${selectClass} ${employeeFilter !== 'ALL' ? 'border-blue-300 bg-blue-50 text-blue-700' : ''}`}>
                      <option value="ALL">All Employees</option>
                      {employees.map((emp) => (
                        <option key={emp._id} value={emp._id}>
                          {emp.name}
                        </option>
                      ))}
                    </select>
                  )}

                  <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={`${selectClass} ${statusFilter !== 'ALL' ? 'border-blue-300 bg-blue-50 text-blue-700' : ''}`}>
                    <option value="ALL">Status: All</option>
                    <option value="Not Started">Not Started</option>
                    <option value="Started">🟢 Started</option>
                    <option value="In Progress">▶️ In Progress</option>
                    <option value="Pending Client">⏳ Pending Client (Waiting for Docs)</option>
                    <option value="Pending Government">🏛️ Pending Government</option>
                    <option value="Pending Internal">⏳ Pending Internal</option>
                    <option value="Under Review">👀 Submit for Review</option>
                    <option value="Completed">✅ Completed</option>
                    <option value="OVERDUE">🚨 Overdue Tasks</option>
                  </select>

                  <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className={`${selectClass} ${priorityFilter !== 'ALL' ? 'border-blue-300 bg-blue-50 text-blue-700' : ''}`}>
                    <option value="ALL">Priority: All</option>
                    <option value="Urgent">Urgent</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>

                  <div className={`flex flex-wrap items-center gap-2 border rounded-xl px-3 py-2 ${dateFilter.start || dateFilter.end ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-white'}`}>
                    <span className="text-[10px] font-bold uppercase text-slate-500 flex items-center gap-1"><Calendar size={12} /> Task Date</span>
                    <input
                      type="date"
                      value={dateFilter.start}
                      onChange={(e) => setDateFilter({ ...dateFilter, start: e.target.value })}
                      className="text-xs font-bold text-slate-700 bg-transparent outline-none cursor-pointer"
                    />
                    <span className="text-slate-400 font-bold text-xs">to</span>
                    <input
                      type="date"
                      value={dateFilter.end}
                      onChange={(e) => setDateFilter({ ...dateFilter, end: e.target.value })}
                      className="text-xs font-bold text-slate-700 bg-transparent outline-none cursor-pointer"
                    />
                    {(dateFilter.start || dateFilter.end) && (
                      <button
                        onClick={() => setDateFilter({ start: '', end: '' })}
                        className="text-rose-500 hover:text-rose-700 ml-1"
                        title="Clear Dates"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold text-slate-500">
                  <span className="font-black text-slate-800">{serverStats.total}</span> task{serverStats.total === 1 ? '' : 's'} {activeFilterCount > 0 ? 'match your filters' : 'in total'}
                </p>
                {activeFilterCount > 0 && (
                  <button onClick={clearFilters} className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-100 px-3 py-1.5 rounded-lg transition-colors">
                    <FilterX size={13} /> Clear {activeFilterCount} filter{activeFilterCount === 1 ? '' : 's'}
                  </button>
                )}
              </div>
            </div>

            {viewMode === 'list' && (
              <div className="flex flex-col">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[980px]">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-black uppercase tracking-widest">
                        <th className="py-3 px-5">Task</th>
                        <th className="py-3 px-4">Title / Client Name</th>
                        <th className="py-3 px-4">Assigned To</th>
                        <th className="py-3 px-4">Priority & Due</th>
                        <th className="py-3 px-4">Our Status</th>
                        <th className="py-3 px-4">Gov. Status</th>
                        <th className="py-3 px-5 text-right">Actions</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-700">
                      {loading ? (
                        <tr>
                          <td colSpan="7" className="text-center py-16 text-slate-400">
                            <RefreshCw className="animate-spin inline-block mr-2" size={18} />
                            Loading Tasks...
                          </td>
                        </tr>
                      ) : tasks.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="py-16 text-slate-400">
                            <div className="flex flex-col items-center text-center">
                              <AlertCircle size={36} className="mb-3 text-slate-300" />
                              <p className="text-sm font-bold text-slate-500">No tasks found.</p>
                              {activeFilterCount > 0 && <button onClick={clearFilters} className="mt-2 text-xs font-bold text-blue-600 hover:underline">Clear filters and show all tasks</button>}
                            </div>
                          </td>
                        </tr>
                      ) : (
                        tasks.map((task) => {
                          const isOverdue = isTaskOverdue(task);
                          const due = dueInfo(task);

                          return (
                            <tr
                              key={task._id}
                              className={`transition-colors group ${isOverdue ? 'bg-rose-50/40 hover:bg-rose-50/70' : 'hover:bg-blue-50/40'}`}
                            >
                              <td className={`py-3.5 px-5 border-l-4 ${isOverdue ? 'border-rose-500' : 'border-transparent'}`}>
                                <div className="flex flex-wrap items-center gap-1.5 mb-1">
                                  <span className="font-bold text-blue-700 font-mono text-xs bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md">{task.taskId}</span>
                                  {isOverdue && <span className="text-[9px] font-bold uppercase text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded-full border border-rose-200">Overdue</span>}
                                  {isCeoRole(task.assignedBy?.role) && <span className="text-[9px] font-bold uppercase text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full border border-amber-200">From CEO</span>}
                                </div>
                                <div className="text-[11px] font-semibold text-slate-500">{task.serviceCategory} <ChevronRight className="inline" size={10}/> {task.subService}</div>
                              </td>

                              <td className="py-3.5 px-4 max-w-[260px]">
                                <button onClick={() => handleOpenView(task)} className="font-bold text-slate-800 text-sm flex items-center gap-2 text-left hover:text-blue-700 transition-colors">
                                  <Briefcase size={14} className="text-slate-400 shrink-0"/>
                                  <span className="line-clamp-2">{taskName(task)}</span>
                                </button>
                                {task.taskTitle && task.clientName && (
                                  <div className="text-[11px] text-slate-500 mt-0.5 font-medium pl-[22px] truncate">Client: {task.clientName}</div>
                                )}
                              </td>

                              <td className="py-3.5 px-4">
                                <div className="flex items-center gap-2">
                                  <div className="h-8 w-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 text-xs font-bold shrink-0">
                                    {task.assignedTo?.name ? task.assignedTo.name.charAt(0).toUpperCase() : 'E'}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-xs font-bold text-slate-700 truncate">{task.assignedTo?.name || 'Unassigned'}</p>
                                    {task.assignedBy?.name && <p className="text-[10px] text-slate-400 font-medium truncate">by {task.assignedBy.name}</p>}
                                  </div>
                                </div>
                              </td>

                              <td className="py-3.5 px-4">
                                <div className="flex flex-col gap-1.5 items-start">
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${getPriorityStyle(task.priority)}`}>
                                    <Flag size={10} className="inline mr-1"/> {task.priority}
                                  </span>
                                  <span className={`text-[11px] font-bold flex items-center gap-1 border px-1.5 py-0.5 rounded-md whitespace-nowrap ${due.style}`}>
                                    <CalendarClock size={12}/> {due.text}{due.tag === 'Due today' ? ' · today' : ''}
                                  </span>
                                </div>
                              </td>

                              <td className="py-3.5 px-4">
                                <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold border whitespace-nowrap ${getStatusStyle(task.currentStatus)}`}>
                                  {task.currentStatus}
                                </span>
                              </td>

                              <td className="py-3.5 px-4">
                                {task.govStatus ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold border border-purple-200 bg-purple-50 text-purple-700 whitespace-nowrap">
                                    <Landmark size={11}/> {task.govStatus}
                                  </span>
                                ) : (
                                  <span className="text-xs text-slate-300 font-medium">—</span>
                                )}
                              </td>

                              <td className="py-3.5 px-5 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {isAdmin && (
                                    <>
                                      <button onClick={(e) => { e.stopPropagation(); handleOpenEdit(task); }} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Edit / Re-assign Task">
                                        <Pencil size={14}/>
                                      </button>
                                      <button onClick={(e) => { e.stopPropagation(); handleDeleteTask(task._id); }} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors" title="Delete Task">
                                        <Trash2 size={14}/>
                                      </button>
                                    </>
                                  )}
                                  <button onClick={() => handleOpenView(task)} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 bg-white hover:bg-slate-100 rounded-lg transition-all border border-slate-200" title="View Details">
                                    <Eye size={13} strokeWidth={2.5}/> View
                                  </button>
                                  <button onClick={() => handleOpenUpdate(task)} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-all shadow-sm" title="Update Status">
                                    <Play size={13} strokeWidth={2.5}/> Update
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {tasks.length > 0 && (
                  <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-50 border-t border-slate-200">
                    <span className="text-xs font-bold text-slate-500">
                      Showing {(currentPage - 1) * 10 + 1} to {Math.min(currentPage * 10, serverStats.total)} of {serverStats.total} tasks
                    </span>

                    {totalPages > 1 && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-white text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-50 transition-colors"
                        >
                          <ChevronLeft size={13}/> Previous
                        </button>

                        <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100">
                          Page {currentPage} of {totalPages}
                        </span>

                        <button
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-blue-600 text-white border border-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                          Next <ChevronRight size={13}/>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {viewMode === 'board' && (
              <div className="flex gap-4 overflow-x-auto p-4 custom-scrollbar items-start bg-slate-50/60">
                {loading && tasks.length === 0 && (
                  <div className="w-full text-center py-16 text-slate-400"><RefreshCw className="animate-spin inline-block mr-2" size={18} /> Loading Tasks...</div>
                )}
                {!(loading && tasks.length === 0) && boardColumns.map(([colStatus, dot]) => {
                  const colTasks = tasks.filter((t) => t.currentStatus === colStatus);

                  return (
                    <div
                      key={colStatus}
                      className="bg-slate-100/80 min-w-[290px] w-[290px] rounded-2xl border border-slate-200 p-3 flex flex-col shrink-0 max-h-[70vh]"
                    >
                      <div className="flex items-center gap-2 mb-3 px-1">
                        <span className={`h-2.5 w-2.5 rounded-full ${dot}`}></span>
                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">{colStatus}</h3>
                        <span className="ml-auto bg-white border border-slate-200 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          {colTasks.length}
                        </span>
                      </div>

                      <div className="flex flex-col gap-2.5 overflow-y-auto custom-scrollbar pr-0.5">
                        {colTasks.length === 0 ? (
                          <div className="text-center p-4 text-xs font-medium text-slate-400 border border-dashed border-slate-300 rounded-xl">
                            No tasks here
                          </div>
                        ) : (
                          colTasks.map((task) => {
                            const isOverdue = isTaskOverdue(task);
                            const due = dueInfo(task);

                            return (
                              <div
                                key={task._id}
                                className={`bg-white p-3.5 rounded-xl border shadow-sm hover:shadow-md transition-all relative group ${isOverdue ? 'border-rose-300' : 'border-slate-200 hover:border-blue-300'}`}
                              >
                                <div className="flex justify-between items-start gap-2 mb-2">
                                  <div className="flex flex-wrap items-center gap-1 cursor-pointer" onClick={() => handleOpenView(task)}>
                                    <span className="font-bold text-blue-700 font-mono text-[10px] bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded">{task.taskId}</span>
                                    {isOverdue && <span className="text-[9px] font-bold uppercase text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded-full">Overdue</span>}
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    {isAdmin && (
                                      <>
                                        <button onClick={(e) => { e.stopPropagation(); handleOpenEdit(task); }} className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50" title="Edit">
                                          <Pencil size={12}/>
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); handleDeleteTask(task._id); }} className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50" title="Delete">
                                          <Trash2 size={12}/>
                                        </button>
                                      </>
                                    )}
                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${getPriorityStyle(task.priority)}`}>{task.priority}</span>
                                  </div>
                                </div>

                                <h4 className="text-sm font-bold text-slate-800 leading-tight mb-1 cursor-pointer hover:text-blue-700" onClick={() => handleOpenView(task)}>
                                  {taskName(task)}
                                </h4>

                                <p className="text-[11px] text-slate-500 font-medium mb-2 cursor-pointer" onClick={() => handleOpenView(task)}>{task.serviceCategory} • {task.subService}</p>

                                {task.govStatus && (
                                  <div className="mb-2">
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold border border-purple-200 bg-purple-50 text-purple-700 whitespace-nowrap">
                                      <Landmark size={10}/> {task.govStatus}
                                    </span>
                                  </div>
                                )}

                                <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-slate-100 cursor-pointer" onClick={() => handleOpenView(task)}>
                                  <div className="flex items-center gap-1.5 min-w-0" title={task.assignedTo?.name}>
                                    <div className="h-6 w-6 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 text-[10px] font-bold shrink-0">
                                      {task.assignedTo?.name ? task.assignedTo.name.charAt(0).toUpperCase() : 'E'}
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-600 truncate">{task.assignedTo?.name}</span>
                                  </div>
                                  <span className={`text-[10px] font-bold flex items-center gap-1 border px-1.5 py-0.5 rounded whitespace-nowrap shrink-0 ${due.style}`}>
                                    <Calendar size={10}/> {task.dueDate ? formatIstDate(task.dueDate, {month:'short', day:'numeric'}) : 'N/A'}
                                  </span>
                                </div>

                                <button onClick={(e) => { e.stopPropagation(); handleOpenUpdate(task); }} className="w-full mt-3 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white text-[11px] font-bold py-1.5 rounded-lg border border-indigo-100 hover:border-indigo-600 transition-colors">
                                  Update Status
                                </button>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* 🔴 MODAL: CREATE / ASSIGN NEW TASK (Lazy Loads Clients Now) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center px-8 py-5 border-b border-slate-100 bg-slate-50/80">
              <div>
                <h2 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
                  <ClipboardList className="text-blue-600" size={24}/> Assign New Task
                </h2>
                <p className="text-xs text-slate-500 mt-1">Allocate work to an executive and set deadlines.</p>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors"><X size={20} /></button>
            </div>

            <form onSubmit={handleCreateTask} className="overflow-y-auto p-8 space-y-6 custom-scrollbar relative">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-1 relative">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Task Title / Name</label>
                  <input type="text" name="taskTitle" placeholder="e.g. Audit Review, Client Meeting" value={formData.taskTitle} onChange={(e) => setFormData({...formData, taskTitle: e.target.value})} className="w-full text-sm font-semibold border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500/20 shadow-sm" />
                </div>

                <div className="md:col-span-1 relative">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Select Client (Optional)</label>
                  <div 
                    className="w-full text-sm font-bold border border-slate-200 rounded-xl p-3 focus-within:ring-2 focus-within:ring-blue-500/20 shadow-sm bg-white cursor-text flex justify-between items-center transition-all"
                    onClick={() => setIsClientDropdownOpen(true)}
                  >
                    {formData.clientId ? (
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={16} className="text-emerald-500"/>
                        <span className="text-slate-800">{clients.find(c => c._id === formData.clientId)?.name || 'Selected'}</span>
                      </div>
                    ) : (
                      <span className="text-slate-400 text-xs">-- Search Client (Leave empty if internal) --</span>
                    )}
                    <ChevronDown size={16} className="text-slate-400"/>
                  </div>
                  {isClientDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-[65]" onClick={() => setIsClientDropdownOpen(false)}></div>
                      <div className="absolute top-[70px] left-0 z-[70] w-full bg-white border border-slate-200 rounded-xl shadow-2xl max-h-72 overflow-hidden flex flex-col animate-in fade-in zoom-in-95">
                        <div className="flex flex-wrap gap-2 px-3 pt-3 pb-2 bg-slate-50 border-b border-slate-100">
                          {['All', 'Lead', 'Registration CRM', 'Client Master'].map((type) => (
                            <button
                              key={type} type="button" onClick={(e) => { e.stopPropagation(); setClientTypeFilter(type); }}
                              className={`text-[10px] font-bold px-2 py-1 rounded-md transition-colors ${clientTypeFilter === type ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}
                            >{type}</button>
                          ))}
                        </div>
                        <div className="p-3 border-b border-slate-100 bg-slate-50/80 sticky top-0">
                          <div className="relative">
                            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500" />
                            <input 
                              autoFocus type="text" placeholder="Search by Name, PAN, ID or Mobile..." 
                              value={clientSearchTerm} onChange={(e) => setClientSearchTerm(e.target.value)}
                              className="w-full pl-9 pr-3 py-2.5 text-sm font-semibold border border-blue-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-sm"
                            />
                          </div>
                        </div>
                        <div className="overflow-y-auto custom-scrollbar p-1">
                          {filteredClientOptions.length > 0 ? (
                            filteredClientOptions.map(c => (
                              <div 
                                key={c._id} 
                                onClick={() => { setFormData({...formData, clientId: c._id}); setIsClientDropdownOpen(false); setClientSearchTerm(''); }}
                                className={`px-4 py-2.5 cursor-pointer rounded-lg flex justify-between items-center transition-colors ${formData.clientId === c._id ? 'bg-blue-50 border border-blue-100' : 'hover:bg-slate-50 border border-transparent'}`}
                              >
                                <div>
                                  <p className="text-sm font-bold text-slate-800">{c.name}</p>
                                  <p className="text-[10px] text-slate-500 font-bold mt-0.5 flex items-center gap-1.5">
                                    <span className={`px-1.5 py-0.5 rounded uppercase tracking-wider ${c.type === 'Lead' ? 'bg-purple-100 text-purple-700' : c.type === 'Registration CRM' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>{c.type}</span>
                                    {c.clientId && <span className="font-mono text-blue-600 bg-blue-50 px-1 rounded border border-blue-100">{c.clientId}</span>}
                                    {c.mobile && <span><Phone size={10} className="inline mr-0.5"/>{c.mobile}</span>}
                                    {c.pan && <span>| PAN/GST: {c.pan}</span>}
                                  </p>
                                </div>
                                {formData.clientId === c._id && <CheckCircle2 size={16} className="text-blue-600"/>}
                              </div>
                            ))
                          ) : (
                            <div className="p-6 text-center text-xs font-semibold text-slate-400 flex flex-col items-center">
                              <AlertCircle size={24} className="mb-2 opacity-50"/>
                              No matching {clientTypeFilter === 'All' ? 'clients' : clientTypeFilter.toLowerCase()} found
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Service Category *</label>
                  <select name="serviceCategory" required value={formData.serviceCategory} onChange={(e) => setFormData({...formData, serviceCategory: e.target.value})} className="w-full text-sm font-semibold border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500/20 shadow-sm">
                    <option value="GST">GST Services</option>
                    <option value="ITR">Income Tax (ITR)</option>
                    <option value="ROC">ROC Compliance</option>
                    <option value="Accounting">Accounting & Audit</option>
                    <option value="Internal">Internal Task</option>
                    <option value="Other">Other Service</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Sub-Service / Form *</label>
                  <input type="text" name="subService" required placeholder="e.g. GSTR-3B, Documentation" value={formData.subService} onChange={(e) => setFormData({...formData, subService: e.target.value})} className="w-full text-sm font-semibold border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500/20 shadow-sm" />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Detailed Task Description *</label>
                  <textarea rows="3" name="taskDescription" required placeholder="Describe what exactly needs to be done..." value={formData.taskDescription} onChange={(e) => setFormData({...formData, taskDescription: e.target.value})} className="w-full text-sm font-medium border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500/20 resize-none shadow-inner" />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-indigo-600 mb-1.5 flex items-center gap-1"><User size={12}/> Assign To *</label>
                  <select name="assignedTo" required value={formData.assignedTo} onChange={(e) => setFormData({...formData, assignedTo: e.target.value})} className="w-full text-sm font-bold border border-indigo-200 bg-indigo-50/50 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500/20 text-indigo-800 shadow-sm">
                    <option value="">{isCeo ? '-- Select Admin --' : '-- Select Employee --'}</option>
                    {assignableEmployees.map(emp => (
                      <option key={emp._id} value={emp._id}>{emp.name} ({emp.role})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-amber-600 mb-1.5">Priority *</label>
                  <select name="priority" required value={formData.priority} onChange={(e) => setFormData({...formData, priority: e.target.value})} className="w-full text-sm font-bold border border-amber-200 bg-amber-50/50 rounded-xl p-3 focus:ring-2 focus:ring-amber-500/20 text-amber-800 shadow-sm">
                    <option value="Urgent">Urgent (Today)</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-rose-600 mb-1.5 flex items-center gap-1"><Calendar size={12}/> Due Date & Time *</label>
                  <input type="datetime-local" name="dueDate" required value={formData.dueDate} onChange={(e) => setFormData({...formData, dueDate: e.target.value})} className="w-full text-sm font-bold border border-rose-200 bg-rose-50/50 rounded-xl p-3 focus:ring-2 focus:ring-rose-500/20 text-rose-800 shadow-sm" />
                </div>
                
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-purple-600 mb-1.5 flex items-center gap-1"><FileText size={12}/> Review Required?</label>
                  <select name="reviewer" value={formData.reviewer} onChange={(e) => setFormData({...formData, reviewer: e.target.value})} className="w-full text-sm font-bold border border-purple-200 bg-purple-50/50 rounded-xl p-3 focus:ring-2 focus:ring-purple-500/20 text-purple-800 shadow-sm">
                    <option value="">No Review Needed</option>
                    <option value={user?._id}>Send to Me for Review</option> 
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-6 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">Cancel</button>
                <button type="submit" className="px-8 py-2.5 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center gap-2">
                  <CheckCircle2 size={18} /> Assign Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🔴 MODAL: EOD REPORT FOR EMPLOYEE */}
      {isEodModalOpen && (
        <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center px-8 py-5 border-b border-slate-100 bg-slate-50/80">
              <div>
                <h2 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
                  <BarChart3 className="text-emerald-600" size={24}/> End of Day (EOD) Report
                </h2>
                <p className="text-xs text-slate-500 mt-1">Submit your daily work summary to your manager.</p>
              </div>
              <button onClick={() => setIsEodModalOpen(false)} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors"><X size={20} /></button>
            </div>

            <form onSubmit={handleEodSubmit} className="overflow-y-auto p-8 space-y-6 custom-scrollbar relative">
              <div className="grid grid-cols-4 gap-3 mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-200 shadow-inner">
                <div className="text-center">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Assigned</p>
                  <p className="text-xl font-black text-slate-800">{overallStats.total}</p>
                </div>
                <div className="text-center border-l border-slate-200">
                  <p className="text-[10px] font-bold text-emerald-500 uppercase">Completed</p>
                  <p className="text-xl font-black text-emerald-600">{overallStats.completed}</p>
                </div>
                <div className="text-center border-l border-slate-200">
                  <p className="text-[10px] font-bold text-amber-500 uppercase">Pending</p>
                  <p className="text-xl font-black text-amber-600">{overallStats.pendingClient}</p>
                </div>
                <div className="text-center border-l border-slate-200">
                  <p className="text-[10px] font-bold text-purple-500 uppercase">In Review</p>
                  <p className="text-xl font-black text-purple-600">{overallStats.underReview}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1"><Phone size={12}/> Follow-ups Done Today</label>
                  <input type="number" min="0" required value={eodForm.followUpsDone} onChange={(e) => setEodForm({...eodForm, followUpsDone: e.target.value})} className="w-full text-sm font-bold border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-emerald-500/20 shadow-sm" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1"><FileText size={12}/> Documents Collected</label>
                  <input type="number" min="0" required value={eodForm.documentsCollected} onChange={(e) => setEodForm({...eodForm, documentsCollected: e.target.value})} className="w-full text-sm font-bold border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-emerald-500/20 shadow-sm" />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-emerald-600 mb-1.5">Major Achievement / Completed Work *</label>
                  <textarea rows="2" required placeholder="What are the biggest tasks you finished today?" value={eodForm.majorAchievement} onChange={(e) => setEodForm({...eodForm, majorAchievement: e.target.value})} className="w-full text-sm font-medium border border-emerald-200 bg-emerald-50/30 rounded-xl p-3 focus:ring-2 focus:ring-emerald-500/20 resize-none shadow-sm" />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-rose-600 mb-1.5">Challenges / Blockers *</label>
                  <textarea rows="2" required placeholder="Any portals not working? Clients not responding?" value={eodForm.majorChallenge} onChange={(e) => setEodForm({...eodForm, majorChallenge: e.target.value})} className="w-full text-sm font-medium border border-rose-200 bg-rose-50/30 rounded-xl p-3 focus:ring-2 focus:ring-rose-500/20 resize-none shadow-sm" />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-indigo-600 mb-1.5">Support Required from Manager</label>
                  <textarea rows="2" placeholder="Need help with technical issue? Need admin approval for something?" value={eodForm.supportRequired} onChange={(e) => setEodForm({...eodForm, supportRequired: e.target.value})} className="w-full text-sm font-medium border border-indigo-200 bg-indigo-50/30 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500/20 resize-none shadow-sm" />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">Priority for Tomorrow *</label>
                  <input type="text" required placeholder="What is the first thing you will do tomorrow morning?" value={eodForm.tomorrowPriority} onChange={(e) => setEodForm({...eodForm, tomorrowPriority: e.target.value})} className="w-full text-sm font-bold border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-slate-500/20 shadow-sm" />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100">
                <button type="button" onClick={() => setIsEodModalOpen(false)} className="px-6 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">Cancel</button>
                <button type="submit" className="px-8 py-2.5 text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md shadow-emerald-500/20 transition-all flex items-center gap-2">
                  <CheckCircle2 size={18} /> Submit Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🔴 MODAL: UPDATE TASK (WITH GOVT STATUS SUPPORT) */}
      {isUpdateModalOpen && taskToUpdate && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/80">
              <div>
                <h2 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
                  <Activity className="text-indigo-600" size={20}/> {isReviewMode ? 'Review & Comment' : 'Update Task Progress'}
                </h2>
                <p className="text-xs text-slate-500 font-mono mt-1">{taskToUpdate.taskId} • {taskToUpdate.taskTitle || taskToUpdate.clientName}</p>
              </div>
              <button onClick={() => setIsUpdateModalOpen(false)} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors"><X size={18} /></button>
            </div>
            
            <form onSubmit={handleUpdateStatus} className="overflow-y-auto p-6 space-y-6 custom-scrollbar">
              
              {taskToUpdate.remarks && (
                <div>
                   <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Previous Remarks History</label>
                   <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl max-h-32 overflow-y-auto text-xs whitespace-pre-wrap font-mono text-slate-600 custom-scrollbar shadow-inner">
                     {taskToUpdate.remarks}
                   </div>
                </div>
              )}

              <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-blue-800 mb-1.5">Change Our Status</label>
                <select 
                  value={updateForm.status} 
                  onChange={(e) => setUpdateForm({...updateForm, status: e.target.value})} 
                  className="w-full text-sm font-bold border border-blue-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500/20 shadow-sm text-slate-800"
                >
                  {isReviewMode ? (
                    <>
                      <option value={taskToUpdate.currentStatus}>Keep Status: {taskToUpdate.currentStatus}</option>
                      <option value="Pending Government">🏛️ Pending Government</option>
                      <option value="Approved">✅ Approve Task</option>
                      <option value="Correction Required">❌ Correction Required</option>
                      <option value="Completed">🏁 Mark Completed</option>
                    </>
                  ) : (
                    <>
                      <option value="Not Started">Not Started</option>
                      <option value="Started">🟢 Started</option>
                      <option value="In Progress">▶️ In Progress</option>
                      <option value="Pending Client">⏳ Pending Client (Waiting for Docs)</option>
                      <option value="Pending Government">🏛️ Pending Government</option>
                      <option value="Pending Internal">⏳ Pending Internal</option>
                      <option value="Under Review">👀 Submit for Review</option>
                      <option value="Completed">✅ Completed</option>
                    </>
                  )}
                </select>
              </div>

              {/* 🔴 GOVT STATUS DROPDOWN (ONLY SHOWS IF PENDING GOVERNMENT SELECTED) */}
              {updateForm.status === 'Pending Government' && (
                <div className="bg-purple-50 p-4 rounded-xl border border-purple-200 animate-in slide-in-from-top-2">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-purple-800 mb-1.5">Select Gov. Status</label>
                  <select 
                    value={updateForm.govStatus} 
                    onChange={(e) => setUpdateForm({...updateForm, govStatus: e.target.value})} 
                    className="w-full text-sm font-bold border border-purple-200 rounded-xl p-3 focus:ring-2 focus:ring-purple-500/20 shadow-sm text-slate-800"
                    required
                  >
                    <option value="">-- Select Govt Stage --</option>
                    <option value="Portal Down / Glitch">Portal Down / Technical Glitch</option>
                    <option value="Application Submitted">Application Submitted</option>
                    <option value="Under Processing">Under Processing by Officer</option>
                    <option value="Query / SCN Raised">Query / SCN Raised</option>
                    <option value="Pending Aadhaar Auth">Pending Aadhaar Authentication</option>
                    <option value="Approved by Dept">Approved by Department</option>
                    <option value="Rejected">Rejected by Department</option>
                  </select>
                </div>
              )}

              {!isReviewMode && updateForm.status === 'Pending Client' && (
                <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 animate-in slide-in-from-top-2 space-y-4">
                  <h4 className="text-xs font-bold text-amber-800 border-b border-amber-200/50 pb-2">Client Follow-up Required</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-[10px] font-bold uppercase text-amber-700 mb-1">Reason for pending</label>
                      <select 
                        value={updateForm.pendingReason} 
                        onChange={(e) => setUpdateForm({...updateForm, pendingReason: e.target.value})}
                        className="w-full text-sm font-medium border border-amber-200 rounded-lg p-2.5 bg-white shadow-sm"
                      >
                        <option value="">Select Reason</option>
                        <option value="Documents Pending">Documents Pending</option>
                        <option value="Information Pending">Information Pending</option>
                        <option value="Client Approval Pending">Client Approval Pending</option>
                        <option value="OTP/Authentication Required">OTP/Authentication Required</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-amber-700 mb-1">Next Follow-up Date</label>
                      <input 
                        type="date" 
                        value={updateForm.followUpDate} 
                        onChange={(e) => setUpdateForm({...updateForm, followUpDate: e.target.value})}
                        className="w-full text-sm font-bold border border-amber-200 rounded-lg p-2.5 bg-white text-slate-700 shadow-sm" 
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-amber-700 mb-1">Mode of Contact</label>
                      <select 
                        value={updateForm.followUpMode} 
                        onChange={(e) => setUpdateForm({...updateForm, followUpMode: e.target.value})}
                        className="w-full text-sm font-bold border border-amber-200 rounded-lg p-2.5 bg-white text-slate-700 shadow-sm"
                      >
                        <option value="Call">Call</option>
                        <option value="WhatsApp">WhatsApp</option>
                        <option value="Email">Email</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-2">
                  <MessageSquare size={14} className="text-slate-400"/> {isReviewMode ? "Add Manager Review/Comment" : "Add Work Log / Remark"}
                </label>
                <textarea 
                  rows="3" 
                  value={updateForm.remarks} 
                  onChange={(e) => setUpdateForm({...updateForm, remarks: e.target.value})} 
                  placeholder={isReviewMode ? "Approve remarks or detail the corrections required..." : "E.g. Called client, they will send documents by evening..."} 
                  className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all resize-none shadow-inner" 
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsUpdateModalOpen(false)} className="px-5 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">Cancel</button>
                <button type="submit" className="px-6 py-2.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md shadow-indigo-500/20 transition-all">
                  Post Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🔴 MODAL: ADMIN EDIT / RE-ASSIGN TASK */}
      {isEditModalOpen && taskToEdit && isAdmin && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/80">
              <div>
                <h2 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
                  <Pencil className="text-blue-600" size={20}/> Edit Task & Re-assign
                </h2>
                <p className="text-xs text-slate-500 font-mono mt-1">{taskToEdit.taskId} • {taskToEdit.taskTitle || taskToEdit.clientName}</p>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors"><X size={18} /></button>
            </div>
            
            <form onSubmit={handleEditSubmit} className="overflow-y-auto p-6 space-y-5 custom-scrollbar">
              
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Task Title / Name</label>
                <input type="text" required name="taskTitle" value={editForm.taskTitle} onChange={(e) => setEditForm({...editForm, taskTitle: e.target.value})} className="w-full text-sm font-semibold border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500/20 shadow-sm" />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-indigo-600 mb-1.5 flex items-center gap-1"><User size={12}/> Re-Assign To</label>
                <select name="assignedTo" required value={editForm.assignedTo} onChange={(e) => setEditForm({...editForm, assignedTo: e.target.value})} className="w-full text-sm font-bold border border-indigo-200 bg-indigo-50/50 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500/20 text-indigo-800 shadow-sm">
                  <option value="">{isCeo ? '-- Select Admin --' : '-- Select Employee --'}</option>
                  {employees
                    .filter(emp => assignableEmployees.includes(emp) || emp._id === taskToEdit.assignedTo?._id)
                    .map(emp => (
                    <option key={emp._id} value={emp._id}>{emp.name} ({emp.role})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-amber-600 mb-1.5">Priority</label>
                  <select name="priority" required value={editForm.priority} onChange={(e) => setEditForm({...editForm, priority: e.target.value})} className="w-full text-sm font-bold border border-amber-200 bg-amber-50/50 rounded-xl p-3 focus:ring-2 focus:ring-amber-500/20 text-amber-800 shadow-sm">
                    <option value="Urgent">Urgent</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-rose-600 mb-1.5 flex items-center gap-1"><Calendar size={12}/> Change Due Date</label>
                  <input type="datetime-local" name="dueDate" required value={editForm.dueDate} onChange={(e) => setEditForm({...editForm, dueDate: e.target.value})} className="w-full text-sm font-bold border border-rose-200 bg-rose-50/50 rounded-xl p-3 focus:ring-2 focus:ring-rose-500/20 text-rose-800 shadow-sm" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-purple-600 mb-1.5 flex items-center gap-1"><FileText size={12}/> Review Required By</label>
                <select name="reviewer" value={editForm.reviewer} onChange={(e) => setEditForm({...editForm, reviewer: e.target.value})} className="w-full text-sm font-bold border border-purple-200 bg-purple-50/50 rounded-xl p-3 focus:ring-2 focus:ring-purple-500/20 text-purple-800 shadow-sm">
                  <option value="">No Review Needed</option>
                  <option value={user?._id}>Keep Me as Reviewer</option> 
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Update Task Description</label>
                <textarea rows="3" name="taskDescription" required value={editForm.taskDescription} onChange={(e) => setEditForm({...editForm, taskDescription: e.target.value})} className="w-full text-sm font-medium border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500/20 resize-none shadow-inner" />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-5 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">Cancel</button>
                <button type="submit" className="px-6 py-2.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md shadow-blue-500/20 transition-all">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🔴 MODAL: VIEW TASK DETAILS (READ ONLY) */}
      {isViewModalOpen && taskToView && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/80">
              <div>
                <h2 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
                  <FileText className="text-blue-600" size={20}/> Task Details
                </h2>
                <span className="font-bold text-blue-600 font-mono text-[10px] bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded mt-1 inline-block">{taskToView.taskId}</span>
              </div>
              <button onClick={() => setIsViewModalOpen(false)} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors"><X size={18} /></button>
            </div>
            
            <div className="overflow-y-auto p-6 space-y-6 custom-scrollbar text-sm">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="col-span-2 md:col-span-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Task Title / Name</p>
                  <p className="font-bold text-slate-800">{taskToView.taskTitle || taskToView.clientName || 'Internal Task'}</p>
                </div>
                {taskToView.clientName && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Associated Client</p>
                    <p className="font-bold text-slate-700">{taskToView.clientName}</p>
                  </div>
                )}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Our Status</p>
                  <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold border shadow-sm ${getStatusStyle(taskToView.currentStatus)}`}>{taskToView.currentStatus}</span>
                </div>
                {/* 🔴 GOVT STATUS DISPLAY */}
                {taskToView.govStatus && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Gov. Status</p>
                    <span className="px-2.5 py-1 rounded-md text-[11px] font-bold border border-purple-200 bg-purple-50 text-purple-700 shadow-sm whitespace-nowrap">
                      🏛️ {taskToView.govStatus}
                    </span>
                  </div>
                )}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Priority & Due Date</p>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${getPriorityStyle(taskToView.priority)}`}>{taskToView.priority}</span>
                    <span className={`text-[11px] font-bold ${taskViewIsOverdue ? 'text-rose-600' : 'text-slate-600'}`}>
                      <Calendar size={12} className="inline mr-1 text-slate-400"/>{taskToView.dueDate ? `${formatIstDate(taskToView.dueDate)}, ${formatIstTime(taskToView.dueDate)}` : 'N/A'}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Assigned To</p>
                  <div className="flex items-center gap-1.5">
                    <div className="h-5 w-5 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 text-[9px] font-bold shrink-0">
                      {taskToView.assignedTo?.name ? taskToView.assignedTo.name.charAt(0).toUpperCase() : 'E'}
                    </div>
                    <span className="font-bold text-slate-700">{taskToView.assignedTo?.name || 'Unassigned'}</span>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Assigned By</p>
                  <p className="font-medium text-slate-600">{taskToView.assignedBy?.name || 'Admin'}{taskToView.assignedBy?.role ? ` (${taskToView.assignedBy.role})` : ''}</p>
                </div>
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 border-b border-slate-200 pb-1">Full Description</p>
                <div className="bg-white p-3 rounded-lg border border-slate-200 text-slate-700 leading-relaxed shadow-sm">
                  {taskToView.taskDescription}
                </div>
              </div>

              {taskToView.outputFileUrl && (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 mb-1.5 border-b border-emerald-100 pb-1">Attached Output</p>
                  <a href={taskToView.outputFileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold hover:bg-emerald-100">
                    <FileText size={14}/> View Document
                  </a>
                </div>
              )}

              {taskToView.remarks && (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 border-b border-slate-200 pb-1">Remarks & Log History</p>
                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl max-h-40 overflow-y-auto text-xs whitespace-pre-wrap font-mono text-slate-600 custom-scrollbar shadow-inner">
                    {taskToView.remarks}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end px-6 py-4 border-t border-slate-100 bg-slate-50">
              <button onClick={() => setIsViewModalOpen(false)} className="px-6 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl transition-colors shadow-sm">Close View</button>
            </div>
          </div>
        </div>
      )}

      {/* 🔴 MODAL: VIEW EOD DETAILS */}
      {isEodViewModalOpen && eodToView && (
        <div className="fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/80">
              <div>
                <h2 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
                  <BarChart3 className="text-blue-600" size={20}/> EOD Report Details
                </h2>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Submitted on {formatIstDate(eodToView.createdAt, {day:'numeric', month:'short', year:'numeric'})} at {formatIstTime(eodToView.createdAt)}
                </span>
              </div>
              <button onClick={() => setIsEodViewModalOpen(false)} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors"><X size={18} /></button>
            </div>
            
            <div className="overflow-y-auto p-6 space-y-6 custom-scrollbar text-sm">
              
              <div className="flex items-center gap-3 bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                <div className="h-10 w-10 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700 font-black text-lg shrink-0">
                  {eodToView.employee?.name ? eodToView.employee.name.charAt(0).toUpperCase() : 'E'}
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 mb-0.5">Report By</p>
                  <p className="font-bold text-indigo-900">{eodToView.employee?.name || 'Unknown'}</p>
                </div>
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">Performance Summary</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-center">
                    <p className="text-[10px] font-bold uppercase text-slate-500">Tasks Assigned</p>
                    <p className="text-xl font-black text-slate-700 mt-1">{eodToView.totalAssigned}</p>
                  </div>
                  <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100 text-center">
                    <p className="text-[10px] font-bold uppercase text-emerald-600">Tasks Done</p>
                    <p className="text-xl font-black text-emerald-700 mt-1">{eodToView.totalCompleted}</p>
                  </div>
                  <div className="bg-amber-50 p-3 rounded-lg border border-amber-100 text-center">
                    <p className="text-[10px] font-bold uppercase text-amber-600">Pending Tasks</p>
                    <p className="text-xl font-black text-amber-700 mt-1">{eodToView.pendingClient}</p>
                  </div>
                  <div className="bg-purple-50 p-3 rounded-lg border border-purple-100 text-center">
                    <p className="text-[10px] font-bold uppercase text-purple-600">In Review</p>
                    <p className="text-xl font-black text-purple-700 mt-1">{eodToView.underReview}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase text-blue-600 flex items-center gap-1"><Phone size={12}/> Follow-ups</p>
                    <p className="text-2xl font-black text-blue-800 mt-1">{eodToView.followUpsDone || 0}</p>
                  </div>
                </div>
                <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase text-emerald-600 flex items-center gap-1"><FileText size={12}/> Docs Collected</p>
                    <p className="text-2xl font-black text-emerald-800 mt-1">{eodToView.documentsCollected || 0}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 border-b border-slate-200 pb-1">Major Achievement / Work Done</p>
                  <div className="bg-white p-3 rounded-lg border border-slate-200 text-slate-700 leading-relaxed shadow-sm">
                    {eodToView.majorAchievement || 'No major achievement logged.'}
                  </div>
                </div>

                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-rose-500 mb-1.5 border-b border-rose-100 pb-1">Challenges & Blockers</p>
                  <div className="bg-rose-50 p-3 rounded-lg border border-rose-100 text-rose-800 leading-relaxed shadow-sm">
                    {eodToView.majorChallenge || 'No challenges faced today.'}
                  </div>
                </div>

                {eodToView.supportRequired && (
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-500 mb-1.5 border-b border-indigo-100 pb-1">Support Required From Admin</p>
                    <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100 text-indigo-800 leading-relaxed shadow-sm">
                      {eodToView.supportRequired}
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 border-b border-slate-200 pb-1">Tomorrow's Priority</p>
                  <div className="bg-white p-3 rounded-lg border border-slate-200 text-slate-700 font-bold shadow-sm">
                    {eodToView.tomorrowPriority || 'Not specified.'}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end px-6 py-4 border-t border-slate-100 bg-slate-50">
                <button onClick={() => setIsEodViewModalOpen(false)} className="px-6 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl transition-colors shadow-sm">Close View</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default WorkManagement;