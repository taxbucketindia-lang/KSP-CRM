import { useState, useEffect, useContext, useMemo } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import toast, { Toaster } from 'react-hot-toast';
import { 
  ClipboardList, Search, Clock, CheckCircle2, AlertCircle, Plus, 
  X, User, Briefcase, Calendar, Flag, FileText, UploadCloud, 
  MessageSquare, UserCircle, Activity, Play, Pause, ChevronRight, RefreshCw, ChevronDown, Phone,
  LayoutGrid, List, BarChart3, Eye, HelpCircle, Pencil
} from 'lucide-react';

const WorkManagement = () => {
  const { user } = useContext(AuthContext);
  
  const [tasks, setTasks] = useState([]);
  const [clients, setClients] = useState([]); 
  const [employees, setEmployees] = useState([]); 
  const [eodReports, setEodReports] = useState([]); 
  const [loading, setLoading] = useState(true);

  const [viewMode, setViewMode] = useState('list'); 

  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [clientTypeFilter, setClientTypeFilter] = useState('All'); 

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [employeeFilter, setEmployeeFilter] = useState('ALL');

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

  const isAdmin = user?.role === 'Admin';

  const initialForm = {
    taskDate: new Date().toISOString().split('T')[0],
    clientId: '', serviceCategory: 'GST', subService: '',
    taskDescription: '', assignedTo: '', priority: 'Medium',
    dueDate: '', reviewer: ''
  };
  const [formData, setFormData] = useState(initialForm);

  const [updateForm, setUpdateForm] = useState({
    status: '', pendingReason: '', remarks: '', 
    followUpDate: '', followUpMode: 'Call',
    outputFile: null
  });

  const [eodForm, setEodForm] = useState({
    followUpsDone: '', documentsCollected: '', majorAchievement: '',
    majorChallenge: '', supportRequired: '', tomorrowPriority: ''
  });

  const [editForm, setEditForm] = useState({
    assignedTo: '', priority: '', dueDate: '', taskDescription: '', reviewer: ''
  });

  const fetchData = async () => {
    setLoading(true);
    const headers = { Authorization: `Bearer ${user.token}` };
    
    try {
      const [tasksRes, clientsRes, leadsRes, usersRes, gstRes, itrRes, eodRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_URL}/tasks`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${import.meta.env.VITE_API_URL}/clients`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${import.meta.env.VITE_API_URL}/leads`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${import.meta.env.VITE_API_URL}/tasks/employees`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${import.meta.env.VITE_API_URL}/gst`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${import.meta.env.VITE_API_URL}/itr`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${import.meta.env.VITE_API_URL}/tasks/eod`, { headers }).catch(() => ({ data: [] })) 
      ]);

      setTasks(tasksRes.data || []);
      setEodReports(eodRes.data || []); 
      
      const rawClients = Array.isArray(clientsRes.data) ? clientsRes.data : (clientsRes.data?.clients || []);
      const rawLeads = Array.isArray(leadsRes.data) ? leadsRes.data : (leadsRes.data?.leads || []);
      const rawGst = Array.isArray(gstRes.data) ? gstRes.data : [];
      const rawItr = Array.isArray(itrRes.data) ? itrRes.data : [];

      const formattedClients = rawClients.map(c => ({ _id: c._id, clientId: c.clientId || '', name: c.assesseeName || c.tradeName || c.name || 'Unnamed', pan: c.pan || '', mobile: c.mobile || '', type: 'CRM Client' }));
      const formattedLeads = rawLeads.map(l => ({ _id: l._id, clientId: l.clientId || '', name: l.name || 'Unnamed', pan: '', mobile: l.mobile || '', type: 'Lead' }));
      const formattedGst = rawGst.map(g => ({ _id: g._id, clientId: g.clientId || '', name: g.tradeName ? `${g.assesseeName} (${g.tradeName})` : g.assesseeName || 'Unnamed GST Client', pan: g.gstin || '', mobile: g.mobile || '', type: 'GST Client' }));
      const formattedItr = rawItr.map(i => ({ _id: i._id, clientId: i.clientId || '', name: i.assesseeName || 'Unnamed ITR Client', pan: i.pan || '', mobile: i.mobile || '', type: 'ITR Client' }));

      const combinedData = [...formattedClients, ...formattedLeads, ...formattedGst, ...formattedItr].map(item => ({
         ...item, clientId: String(item.clientId || ''), name: item.name || '', mobile: String(item.mobile || ''), pan: String(item.pan || '')
      }));

      setClients(combinedData);
      
      const team = Array.isArray(usersRes.data) ? usersRes.data : [];
      setEmployees(team.filter(u => u.role !== 'Client'));

    } catch (error) {
      toast.error("Failed to load workspace data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user.token]);

  const filteredClientOptions = useMemo(() => {
    let filtered = clients;
    if (clientTypeFilter !== 'All') filtered = filtered.filter(c => c.type === clientTypeFilter);
    if (clientSearchTerm) {
      const lowerSearch = clientSearchTerm.toLowerCase();
      filtered = filtered.filter(c => 
        c.name.toLowerCase().includes(lowerSearch) || 
        c.clientId.toLowerCase().includes(lowerSearch) || 
        c.mobile.includes(lowerSearch) || 
        c.pan.toLowerCase().includes(lowerSearch)
      );
    }
    return filtered;
  }, [clients, clientSearchTerm, clientTypeFilter]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const searchStr = searchQuery.toLowerCase();
      const clientObj = clients.find(c => c._id === (typeof task.client === 'object' ? task.client?._id : task.client));
      const customClientId = clientObj ? clientObj.clientId : '';

      const matchesSearch = 
        (task.taskId?.toLowerCase().includes(searchStr)) || 
        ((task.clientName || '').toLowerCase().includes(searchStr)) ||
        (customClientId.toLowerCase().includes(searchStr));

      const matchesStatus = statusFilter === 'ALL' 
        ? true 
        : statusFilter === 'OVERDUE' 
          ? task.isOverdue // Backend virtual field check
          : task.currentStatus === statusFilter;      
      const matchesPriority = priorityFilter === 'ALL' || task.priority === priorityFilter;
      const matchesEmployee = employeeFilter === 'ALL' || (task.assignedTo && task.assignedTo._id === employeeFilter);

      return matchesSearch && matchesStatus && matchesPriority && matchesEmployee;
    });
  }, [tasks, searchQuery, statusFilter, priorityFilter, employeeFilter, clients]);

  const stats = useMemo(() => {
    return {
      total: filteredTasks.length,
      inProgress: filteredTasks.filter(t => t.currentStatus === 'In Progress').length,
      pendingClient: filteredTasks.filter(t => t.currentStatus === 'Pending Client').length,
      underReview: filteredTasks.filter(t => t.currentStatus === 'Under Review').length,
      completed: filteredTasks.filter(t => t.currentStatus === 'Completed').length,
    };
  }, [filteredTasks]);

  const getStatusStyle = (status) => {
    switch (status) {
      case 'Not Started': return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'In Progress': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Pending Client': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Pending Internal': return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'Under Review': return 'bg-purple-50 text-purple-700 border-purple-200';
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

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!formData.clientId) return toast.error("Please select a client from the dropdown!");

    const selectedClientObj = clients.find(c => c._id === formData.clientId);
    if (!selectedClientObj) return toast.error("Invalid client selected!");
    
    try {
      const headers = { Authorization: `Bearer ${user.token}` };
      const payload = { ...formData, clientName: selectedClientObj.name }; 
      
      if (!payload.reviewer) {
        delete payload.reviewer;
      }

      await axios.post(`${import.meta.env.VITE_API_URL}/tasks`, payload, { headers });
      
      toast.success("New task assigned successfully!");
      setFormData(initialForm);
      setIsAddModalOpen(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create task");
    }
  };

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    try {
      // 🔴 FIX: Removed 'multipart/form-data', back to standard JSON
      const headers = { 
        Authorization: `Bearer ${user.token}`,
        'Content-Type': 'application/json' 
      };
      
      const payload = {
        currentStatus: updateForm.status,
        pendingReason: updateForm.pendingReason,
        remarks: updateForm.remarks,
        nextFollowUpDate: updateForm.followUpDate,
        followUpMode: updateForm.followUpMode
      };

      // Handle output file ONLY if you have an S3/Cloudinary URL flow 
      // otherwise, omit it until multer is perfectly configured on backend.
      // We are dropping `outputFile` from payload to prevent server crash.

      await axios.put(`${import.meta.env.VITE_API_URL}/tasks/${taskToUpdate._id}/status`, payload, { headers });
      
      toast.success(`Task updated!`);
      setIsUpdateModalOpen(false);
      setUpdateForm({ status: '', pendingReason: '', remarks: '', followUpDate: '', followUpMode: 'Call', outputFile: null });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update status");
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const headers = { Authorization: `Bearer ${user.token}` };
      await axios.put(`${import.meta.env.VITE_API_URL}/tasks/${taskToEdit._id}`, editForm, { headers });
      
      toast.success("Task updated & re-assigned successfully!");
      setIsEditModalOpen(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update task details");
    }
  };

  const handleEodSubmit = async (e) => {
    e.preventDefault();
    try {
      const headers = { Authorization: `Bearer ${user.token}` };
      const payload = {
        totalAssigned: stats.total,
        totalCompleted: stats.completed,
        inProgress: stats.inProgress,
        pendingClient: stats.pendingClient,
        underReview: stats.underReview,
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
      fetchData(); 
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to submit EOD");
    }
  };

  const handleOpenUpdate = (task) => {
    setTaskToUpdate(task);
    setUpdateForm({ 
      status: task.currentStatus,
      pendingReason: task.pendingReason || '',
      remarks: '',
      followUpDate: task.nextFollowUpDate ? new Date(task.nextFollowUpDate).toISOString().split('T')[0] : '',
      followUpMode: task.followUpMode || 'Call',
      outputFile: null
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
      assignedTo: task.assignedTo?._id || '',
      priority: task.priority || 'Medium',
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().slice(0,16) : '',
      taskDescription: task.taskDescription || '',
      reviewer: task.reviewer?._id || ''
    });
    setIsEditModalOpen(true);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <Toaster position="top-right" />

      {/* HEADER & TOGGLE TABS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <ClipboardList size={28} className="text-blue-600" /> Daily Work Management
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Track assigned tasks, monitor deadlines, and submit EOD reports.</p>
        </div>
        <div className="flex items-center gap-3">
          
          <div className="flex bg-slate-200/60 p-1 rounded-xl mr-2">
            <button onClick={() => setViewMode('list')} className={`px-4 py-2 text-xs font-bold rounded-lg flex items-center gap-2 transition-all ${viewMode === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              <List size={14}/> List
            </button>
            <button onClick={() => setViewMode('board')} className={`px-4 py-2 text-xs font-bold rounded-lg flex items-center gap-2 transition-all ${viewMode === 'board' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              <LayoutGrid size={14}/> Board
            </button>
            <button onClick={() => setViewMode('eod')} className={`px-4 py-2 text-xs font-bold rounded-lg flex items-center gap-2 transition-all ${viewMode === 'eod' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              <BarChart3 size={14}/> EOD Reports
            </button>
          </div>

          {!isAdmin && (
            <button onClick={() => setIsEodModalOpen(true)} className="inline-flex items-center gap-2 bg-white text-emerald-600 border border-emerald-200 hover:bg-emerald-50 text-sm font-bold px-5 py-2.5 rounded-xl shadow-sm transition-all">
              <Activity size={18} strokeWidth={2.5} /> Fill EOD
            </button>
          )}

          {isAdmin && (
            <button onClick={() => setIsAddModalOpen(true)} className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-5 py-2.5 rounded-xl shadow-md shadow-blue-500/20 transition-all">
              <Plus size={18} strokeWidth={2.5} /> Assign Task
            </button>
          )}
        </div>
      </div>

      {/* ===================== VIEW: EOD REPORTS ===================== */}
      {viewMode === 'eod' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <h2 className="text-sm font-bold text-slate-800 tracking-tight flex items-center gap-2">
              <BarChart3 size={16} className="text-blue-500"/> Submitted EOD Reports
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
                  <tr><td colSpan="6" className="text-center py-16 text-slate-400"><RefreshCw className="animate-spin inline-block mr-2" size={18}/> Loading Reports...</td></tr>
                ) : eodReports.length === 0 ? (
                  <tr><td colSpan="6" className="text-center py-16 text-slate-400 flex flex-col items-center"><AlertCircle size={36} className="mb-3 text-slate-300"/> No EOD Reports found.</td></tr>
                ) : (
                  eodReports.map((report) => (
                    <tr key={report._id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-4 px-5 whitespace-nowrap align-top">
                        <span className="font-bold text-slate-800 block">{new Date(report.createdAt).toLocaleDateString('en-IN', {day:'numeric', month:'short', year:'numeric'})}</span>
                        <div className="text-[10px] text-slate-500 mt-1">{new Date(report.createdAt).toLocaleTimeString('en-IN')}</div>
                      </td>
                      {isAdmin && (
                        <td className="py-4 px-5 align-top">
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 text-[11px] font-bold shrink-0">
                              {report.employee?.name ? report.employee.name.charAt(0).toUpperCase() : 'E'}
                            </div>
                            <div>
                              <span className="text-xs font-bold text-slate-700 block">{report.employee?.name || 'Unknown'}</span>
                              <span className="text-[10px] text-slate-500">{report.employee?.role}</span>
                            </div>
                          </div>
                        </td>
                      )}
                      <td className="py-4 px-5 align-top">
                        <div className="grid grid-cols-2 gap-2 text-[10px] min-w-[200px]">
                          <div className="bg-slate-100 p-1.5 rounded text-slate-600 border border-slate-200">Tasks Done: <strong className="text-slate-800">{report.totalCompleted}/{report.totalAssigned}</strong></div>
                          <div className="bg-amber-50 p-1.5 rounded text-amber-600 border border-amber-100">Tasks Pend: <strong>{report.pendingClient}</strong></div>
                          <div className="bg-blue-50 p-1.5 rounded text-blue-600 border border-blue-100 flex items-center gap-1"><Phone size={10}/> Follow-ups: <strong>{report.followUpsDone || 0}</strong></div>
                          <div className="bg-emerald-50 p-1.5 rounded text-emerald-600 border border-emerald-100 flex items-center gap-1"><FileText size={10}/> Docs Got: <strong>{report.documentsCollected || 0}</strong></div>
                        </div>
                      </td>
                      <td className="py-4 px-5 text-right align-top">
                        <button onClick={() => handleOpenEodView(report)} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-600 hover:text-white rounded-lg transition-all border border-indigo-200 shadow-sm" title="View Details">
                          <Eye size={13} strokeWidth={2.5}/> View Details
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

      {/* ===================== VIEW: LIST OR BOARD ===================== */}
      {(viewMode === 'list' || viewMode === 'board') && (
        <>
          {/* KPI DASHBOARD CARDS */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between border-l-4 border-l-slate-400">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Assigned</p>
                <h3 className="text-2xl font-black text-slate-800 mt-1">{stats.total}</h3>
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between border-l-4 border-l-blue-500">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">In Progress</p>
                <h3 className="text-2xl font-black text-blue-600 mt-1">{stats.inProgress}</h3>
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between border-l-4 border-l-amber-500">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Pending Client</p>
                <h3 className="text-2xl font-black text-amber-600 mt-1">{stats.pendingClient}</h3>
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between border-l-4 border-l-purple-500">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Under Review</p>
                <h3 className="text-2xl font-black text-purple-600 mt-1">{stats.underReview}</h3>
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between border-l-4 border-l-emerald-500">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Completed</p>
                <h3 className="text-2xl font-black text-emerald-600 mt-1">{stats.completed}</h3>
              </div>
            </div>
          </div>

          {/* FILTER ROW */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col xl:flex-row xl:items-center gap-4">
              <div className="relative w-full xl:w-72 shrink-0">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input type="text" placeholder="Search Task ID or Client..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-3.5 py-2 text-sm font-medium bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm" />
              </div>
              
              <div className="flex flex-wrap items-center gap-3 w-full">
                {isAdmin && (
                  <select value={employeeFilter} onChange={(e) => setEmployeeFilter(e.target.value)} className="text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer shadow-sm">
                    <option value="ALL">All Employees</option>
                    {employees.map(emp => (
                      <option key={emp._id} value={emp._id}>{emp.name}</option>
                    ))}
                  </select>
                )}

                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer shadow-sm">
                  <option value="ALL">Status: All</option>
                  <option value="Not Started">Not Started</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Pending Client">Pending Client</option>
                  <option value="Under Review">Under Review</option>
                  <option value="Completed">Completed</option>
                  <option value="OVERDUE">🚨 Overdue Tasks</option>
                </select>

                <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer shadow-sm">
                  <option value="ALL">Priority: All</option>
                  <option value="Urgent">Urgent</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
            </div>

            {/* 🔴 LIST VIEW TABLE */}
            {viewMode === 'list' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-500 text-[11px] font-black uppercase tracking-wider">
                      <th className="py-4 px-5">Task Details</th>
                      <th className="py-4 px-5">Client Name</th>
                      <th className="py-4 px-5">Assignment</th>
                      <th className="py-4 px-5">Priority & Due</th>
                      <th className="py-4 px-5">Live Status</th>
                      <th className="py-4 px-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-700">
                    {loading ? (
                      <tr><td colSpan="6" className="text-center py-16 text-slate-400"><RefreshCw className="animate-spin inline-block mr-2" size={18}/> Loading Tasks...</td></tr>
                    ) : filteredTasks.length === 0 ? (
                      <tr><td colSpan="6" className="text-center py-16 text-slate-400 flex flex-col items-center"><AlertCircle size={36} className="mb-3 text-slate-300"/> No tasks found.</td></tr>
                    ) : (
                      filteredTasks.map((task) => (
                        <tr key={task._id} className={`hover:bg-slate-50/70 transition-colors group ${task.isOverdue ? 'bg-red-50/40 border-l-4 border-rose-500' : ''}`}>
                          <td className="py-4 px-5">
                            <div className="font-bold text-blue-600 font-mono text-xs bg-blue-50 border border-blue-100 px-2 py-0.5 rounded inline-block mb-1">
                              {task.taskId} 
                              {task.isOverdue && <span className="ml-2 text-[9px] text-rose-600 bg-rose-100 px-1 rounded-full border border-rose-200">Overdue</span>}
                            </div>
                            <div className="text-[11px] font-bold text-slate-800">{task.serviceCategory} <ChevronRight className="inline" size={10}/> {task.subService}</div>
                          </td>

                          <td className="py-4 px-5">
                            <div className="font-bold text-slate-800 text-sm flex items-center gap-2">
                              <Briefcase size={14} className="text-slate-400"/> {task.clientName || 'N/A'}
                            </div>
                          </td>
                          
                          <td className="py-4 px-5">
                            <div className="flex items-center gap-2">
                              <div className="h-7 w-7 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 text-[11px] font-bold shrink-0">
                                {task.assignedTo?.name ? task.assignedTo.name.charAt(0).toUpperCase() : 'E'}
                              </div>
                              <span className="text-xs font-bold text-slate-700">{task.assignedTo?.name || 'Unassigned'}</span>
                            </div>
                          </td>

                          <td className="py-4 px-5">
                            <div className="flex flex-col gap-1.5 items-start">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${getPriorityStyle(task.priority)}`}>
                                <Flag size={10} className="inline mr-1"/> {task.priority}
                              </span>
                              <span className={`text-[11px] font-bold flex items-center gap-1 border px-1.5 py-0.5 rounded ${task.isOverdue ? 'text-rose-700 bg-rose-100 border-rose-200' : 'text-rose-600 bg-rose-50 border-rose-100'}`}>
                                <Calendar size={12}/> Due: {task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-IN') : 'N/A'}
                              </span>
                            </div>
                          </td>
                          
                          <td className="py-4 px-5">
                            <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold border shadow-sm ${getStatusStyle(task.currentStatus)}`}>
                              {task.currentStatus}
                            </span>
                          </td>

                          <td className="py-4 px-5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {isAdmin && (
                                <button onClick={() => handleOpenEdit(task)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-200" title="Edit / Re-assign Task">
                                  <Pencil size={15} strokeWidth={2.5}/>
                                </button>
                              )}
                              <button onClick={() => handleOpenView(task)} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 bg-white hover:bg-slate-100 rounded-lg transition-all border border-slate-200 shadow-sm" title="View Details">
                                <Eye size={13} strokeWidth={2.5}/> View
                              </button>
                              <button onClick={() => handleOpenUpdate(task)} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-600 hover:text-white rounded-lg transition-all border border-indigo-200 shadow-sm" title="Update Status">
                                <Play size={13} strokeWidth={2.5}/> Update
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 🔴 BOARD VIEW (KANBAN) */}
          {viewMode === 'board' && (
            <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar items-start">
              {['Not Started', 'In Progress', 'Pending Client', 'Under Review', 'Completed'].map(colStatus => {
                const colTasks = filteredTasks.filter(t => t.currentStatus === colStatus);
                return (
                  <div key={colStatus} className="bg-slate-100/50 min-w-[300px] w-[300px] rounded-2xl border border-slate-200 p-4 flex flex-col shrink-0">
                    <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-2">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-600">{colStatus}</h3>
                      <span className="bg-slate-200 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full">{colTasks.length}</span>
                    </div>

                    <div className="flex flex-col gap-3">
                      {colTasks.length === 0 ? (
                        <div className="text-center p-4 text-xs font-medium text-slate-400 border border-dashed border-slate-300 rounded-xl">No tasks here</div>
                      ) : (
                        colTasks.map(task => (
                          <div key={task._id} className={`bg-white p-4 rounded-xl border shadow-sm hover:shadow-md transition-all relative group ${task.isOverdue ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'}`}>
                            
                            <div className="flex justify-between items-start mb-2" onClick={() => handleOpenView(task)}>
                              <span className="font-bold text-blue-600 font-mono text-[10px] bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded cursor-pointer">{task.taskId}</span>
                              <div className="flex gap-1.5">
                                {isAdmin && (
                                  <button onClick={(e) => { e.stopPropagation(); handleOpenEdit(task); }} className="text-slate-400 hover:text-blue-600 hidden group-hover:block" title="Edit">
                                    <Pencil size={12}/>
                                  </button>
                                )}
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase cursor-pointer ${getPriorityStyle(task.priority)}`}>{task.priority}</span>
                              </div>
                            </div>
                            <h4 className="text-sm font-bold text-slate-800 leading-tight mb-1 cursor-pointer" onClick={() => handleOpenView(task)}>{task.clientName || 'N/A'}</h4>
                            <p className="text-[11px] text-slate-500 font-medium mb-3 cursor-pointer" onClick={() => handleOpenView(task)}>{task.serviceCategory} • {task.subService}</p>
                            
                            <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100" onClick={() => handleOpenView(task)}>
                              <div className="flex items-center gap-1.5 cursor-pointer" title={task.assignedTo?.name}>
                                <div className="h-6 w-6 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 text-[10px] font-bold shrink-0">
                                  {task.assignedTo?.name ? task.assignedTo.name.charAt(0).toUpperCase() : 'E'}
                                </div>
                                <span className="text-[10px] font-bold text-slate-600 truncate w-20">{task.assignedTo?.name}</span>
                              </div>
                              <span className={`text-[10px] font-bold flex items-center gap-1 cursor-pointer ${task.isOverdue ? 'text-rose-700 bg-rose-100 px-1 rounded' : 'text-rose-500'}`}>
                                <Calendar size={10}/> {task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-IN', {month:'short', day:'numeric'}) : 'N/A'}
                              </span>
                            </div>

                            <button onClick={(e) => { e.stopPropagation(); handleOpenUpdate(task); }} className="w-full mt-3 bg-slate-50 hover:bg-indigo-50 text-indigo-600 text-[10px] font-bold py-1.5 rounded-lg border border-slate-200 hover:border-indigo-200 transition-colors">
                              Update Status
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* 🔴 MODAL: CREATE / ASSIGN NEW TASK */}
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
                <div className="md:col-span-2 relative">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Select Client / Lead *</label>
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
                      <span className="text-slate-400">-- Click to Search Clients, GST, ITR or Leads --</span>
                    )}
                    <ChevronDown size={16} className="text-slate-400"/>
                  </div>
                  {isClientDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-[65]" onClick={() => setIsClientDropdownOpen(false)}></div>
                      <div className="absolute top-[70px] left-0 z-[70] w-full bg-white border border-slate-200 rounded-xl shadow-2xl max-h-72 overflow-hidden flex flex-col animate-in fade-in zoom-in-95">
                        <div className="flex flex-wrap gap-2 px-3 pt-3 pb-2 bg-slate-50 border-b border-slate-100">
                          {['All', 'CRM Client', 'GST Client', 'ITR Client', 'Lead'].map((type) => (
                             <button
                                key={type} type="button" onClick={(e) => { e.stopPropagation(); setClientTypeFilter(type); }}
                                className={`text-[10px] font-bold px-2 py-1 rounded-md transition-colors ${clientTypeFilter === type ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}
                             >{type.replace(' Client', '')}</button>
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
                                        <span className={`px-1.5 py-0.5 rounded uppercase tracking-wider ${c.type === 'Lead' ? 'bg-purple-100 text-purple-700' : c.type === 'GST Client' ? 'bg-indigo-100 text-indigo-700' : c.type === 'ITR Client' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{c.type}</span>
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
                                No matching {clientTypeFilter === 'All' ? 'clients/leads' : clientTypeFilter} found
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
                    <option value="Other">Other Service</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Sub-Service / Form *</label>
                  <input type="text" name="subService" required placeholder="e.g. GSTR-3B, ITR-4" value={formData.subService} onChange={(e) => setFormData({...formData, subService: e.target.value})} className="w-full text-sm font-semibold border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500/20 shadow-sm" />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Detailed Task Description *</label>
                  <textarea rows="3" name="taskDescription" required placeholder="Describe what exactly needs to be done..." value={formData.taskDescription} onChange={(e) => setFormData({...formData, taskDescription: e.target.value})} className="w-full text-sm font-medium border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500/20 resize-none shadow-inner" />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-indigo-600 mb-1.5 flex items-center gap-1"><User size={12}/> Assign To *</label>
                  <select name="assignedTo" required value={formData.assignedTo} onChange={(e) => setFormData({...formData, assignedTo: e.target.value})} className="w-full text-sm font-bold border border-indigo-200 bg-indigo-50/50 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500/20 text-indigo-800 shadow-sm">
                    <option value="">-- Select Employee --</option>
                    {employees
                      .filter(emp => emp._id !== user?._id && emp._id !== user?.id) 
                      .map(emp => (
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
                  <p className="text-xl font-black text-slate-800">{stats.total}</p>
                </div>
                <div className="text-center border-l border-slate-200">
                  <p className="text-[10px] font-bold text-emerald-500 uppercase">Completed</p>
                  <p className="text-xl font-black text-emerald-600">{stats.completed}</p>
                </div>
                <div className="text-center border-l border-slate-200">
                  <p className="text-[10px] font-bold text-amber-500 uppercase">Pending</p>
                  <p className="text-xl font-black text-amber-600">{stats.pendingClient}</p>
                </div>
                <div className="text-center border-l border-slate-200">
                  <p className="text-[10px] font-bold text-purple-500 uppercase">In Review</p>
                  <p className="text-xl font-black text-purple-600">{stats.underReview}</p>
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

      {/* 🔴 MODAL: UPDATE TASK (Employee View & Basic Status Update) */}
      {isUpdateModalOpen && taskToUpdate && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/80">
              <div>
                <h2 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
                  <Activity className="text-indigo-600" size={20}/> {isAdmin ? 'Review & Comment' : 'Update Task Progress'}
                </h2>
                <p className="text-xs text-slate-500 font-mono mt-1">{taskToUpdate.taskId} • {taskToUpdate.clientName}</p>
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
                <label className="block text-[11px] font-bold uppercase tracking-wider text-blue-800 mb-1.5">Change Live Status</label>
                <select 
                  value={updateForm.status} 
                  onChange={(e) => setUpdateForm({...updateForm, status: e.target.value})} 
                  className="w-full text-sm font-bold border border-blue-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500/20 shadow-sm text-slate-800"
                >
                  {isAdmin ? (
                    <>
                      <option value={taskToUpdate.currentStatus}>Keep Status: {taskToUpdate.currentStatus}</option>
                      <option value="Approved">✅ Approve Task</option>
                      <option value="Correction Required">❌ Correction Required</option>
                      <option value="Completed">🏁 Mark Completed</option>
                    </>
                  ) : (
                    <>
                      <option value="Not Started">Not Started</option>
                      <option value="In Progress">▶️ In Progress</option>
                      <option value="Pending Client">⏳ Pending Client (Waiting for Docs)</option>
                      <option value="Pending Internal">⏳ Pending Internal</option>
                      <option value="Under Review">👀 Submit for Review</option>
                      <option value="Completed">✅ Completed</option>
                    </>
                  )}
                </select>
              </div>

              {!isAdmin && updateForm.status === 'Pending Client' && (
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

              {/* 🔴 Output Upload Input Fixed with onChange */}
              {!isAdmin && (updateForm.status === 'Completed' || updateForm.status === 'Under Review') && (
                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 animate-in slide-in-from-top-2">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-emerald-800 mb-1.5 flex items-center gap-1"><UploadCloud size={14}/> Upload Final Output/Acknowledgement</label>
                  <input 
                    type="file" 
                    onChange={(e) => setUpdateForm({...updateForm, outputFile: e.target.files[0]})}
                    className="w-full text-sm font-medium border border-emerald-200 rounded-lg p-2.5 bg-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-emerald-100 file:text-emerald-700 hover:file:bg-emerald-200" 
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-2">
                  <MessageSquare size={14} className="text-slate-400"/> {isAdmin ? "Add Manager Review/Comment" : "Add Work Log / Remark"}
                </label>
                <textarea 
                  rows="3" 
                  value={updateForm.remarks} 
                  onChange={(e) => setUpdateForm({...updateForm, remarks: e.target.value})} 
                  placeholder={isAdmin ? "Approve remarks or detail the corrections required..." : "E.g. Called client, they will send documents by evening..."} 
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
                <p className="text-xs text-slate-500 font-mono mt-1">{taskToEdit.taskId} • {taskToEdit.clientName}</p>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors"><X size={18} /></button>
            </div>
            
            <form onSubmit={handleEditSubmit} className="overflow-y-auto p-6 space-y-5 custom-scrollbar">
              
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-indigo-600 mb-1.5 flex items-center gap-1"><User size={12}/> Re-Assign To</label>
                <select name="assignedTo" required value={editForm.assignedTo} onChange={(e) => setEditForm({...editForm, assignedTo: e.target.value})} className="w-full text-sm font-bold border border-indigo-200 bg-indigo-50/50 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500/20 text-indigo-800 shadow-sm">
                  <option value="">-- Select Employee --</option>
                  {employees
                    .filter(emp => emp._id !== user?._id && emp._id !== user?.id) 
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
                 <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Client Name</p>
                    <p className="font-bold text-slate-800">{taskToView.clientName || 'N/A'}</p>
                 </div>
                 <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Live Status</p>
                    <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold border shadow-sm ${getStatusStyle(taskToView.currentStatus)}`}>{taskToView.currentStatus}</span>
                 </div>
                 <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Service & Form</p>
                    <p className="font-bold text-slate-800">{taskToView.serviceCategory} <ChevronRight className="inline text-slate-400" size={12}/> {taskToView.subService}</p>
                 </div>
                 <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Priority & Due Date</p>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${getPriorityStyle(taskToView.priority)}`}>{taskToView.priority}</span>
                      <span className={`text-[11px] font-bold ${taskToView.isOverdue ? 'text-rose-600' : 'text-slate-600'}`}><Calendar size={12} className="inline mr-1 text-slate-400"/>{taskToView.dueDate ? new Date(taskToView.dueDate).toLocaleDateString('en-IN') : 'N/A'}</span>
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
                    <p className="font-medium text-slate-600">{taskToView.assignedBy?.name || 'Admin'}</p>
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
                  Submitted on {new Date(eodToView.createdAt).toLocaleDateString('en-IN', {day:'numeric', month:'short', year:'numeric'})} at {new Date(eodToView.createdAt).toLocaleTimeString('en-IN')}
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

            </div>

            <div className="flex items-center justify-end px-6 py-4 border-t border-slate-100 bg-slate-50">
              <button onClick={() => setIsEodViewModalOpen(false)} className="px-6 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl transition-colors shadow-sm">Close View</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default WorkManagement;