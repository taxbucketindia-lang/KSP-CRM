import React, { useState, useEffect, useContext, useMemo } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { isAdminRole } from '../utils/roles';
import toast, { Toaster } from 'react-hot-toast';
import {
  Bell, Plus, CheckCircle2, Clock, AlertCircle, Send, X, MessageSquare, RefreshCw,
  ArrowRight, Play, RotateCcw, Trash2, Search, Inbox, BellRing, ChevronDown
} from 'lucide-react';

const PRIORITY_STYLE = {
  Urgent: 'bg-rose-50 text-rose-700 border-rose-200',
  High: 'bg-orange-50 text-orange-700 border-orange-200',
  Medium: 'bg-amber-50 text-amber-700 border-amber-200',
  Low: 'bg-slate-100 text-slate-600 border-slate-200'
};

const PRIORITY_BAR = {
  Urgent: 'bg-rose-500', High: 'bg-orange-400', Medium: 'bg-amber-400', Low: 'bg-slate-300'
};

const STATUS_STYLE = {
  Pending: 'bg-rose-50 text-rose-700 border-rose-200',
  'In Progress': 'bg-blue-50 text-blue-700 border-blue-200',
  Resolved: 'bg-emerald-50 text-emerald-700 border-emerald-200'
};

const timeAgo = (date) => {
  if (!date) return '';
  const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  return `${Math.floor(hours / 24)} day(s) ago`;
};

const formatDateTime = (date) => new Date(date).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

const TaskHandoverWorkspace = () => {
  const { user } = useContext(AuthContext);
  const isAdmin = isAdminRole(user?.role);

  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [form, setForm] = useState({
    title: '',
    description: '',
    assignedTo: '',
    priority: 'Medium'
  });

  const [activeTab, setActiveTab] = useState('received'); // 'received' (Mujhe mile), 'sent' (Maine diye), 'all' (CEO / Admin)
  const [statusFilter, setStatusFilter] = useState('Open');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [remarks, setRemarks] = useState({}); // { [taskId]: 'typed remark' }

  const headers = { Authorization: `Bearer ${user.token}` };

  const fetchData = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const [tasksRes, usersRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_URL}/taskhandover/handovers${isAdmin ? '?scope=all' : ''}`, { headers }),
        axios.get(`${import.meta.env.VITE_API_URL}/users/empls`, { headers }).catch(() => ({ data: [] })) // Saare employees + Admin + CEO
      ]);
      setTasks(tasksRes.data.data || []);
      setEmployees(usersRes.data || []);
    } catch (error) {
      toast.error("Failed to load handovers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Naye task / update apne aap dikhte rahein
    const intervalId = setInterval(() => fetchData(false), 60000);
    return () => clearInterval(intervalId);
    // eslint-disable-next-line
  }, [user.token]);

  const isMine = (task) => task.assignedTo?._id === user._id;
  const isSentByMe = (task) => task.assignedBy?._id === user._id;

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!form.title || !form.assignedTo) return toast.error("Title and Assignee are required!");
    setSaving(true);
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/taskhandover/handovers`, form, { headers });
      toast.success("Task handed over & notification sent!");
      setIsModalOpen(false);
      setForm({ title: '', description: '', assignedTo: '', priority: 'Medium' });
      setActiveTab('sent');
      setStatusFilter('Open');
      fetchData(false);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to assign task");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (task, { status, withRemark = true } = {}) => {
    const remark = withRemark ? (remarks[task._id] || '').trim() : '';
    if (!status && !remark) return toast.error("Write an update first.");
    try {
      await axios.put(`${import.meta.env.VITE_API_URL}/taskhandover/handovers/${task._id}`, { status, remark }, { headers });
      toast.success(status ? `Status updated to ${status}` : "Update sent!");
      setRemarks(prev => ({ ...prev, [task._id]: '' }));
      fetchData(false);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update task");
    }
  };

  const handleDelete = async (task) => {
    if (!window.confirm(`Delete "${task.title}"? This will also stop its reminders.`)) return;
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/taskhandover/handovers/${task._id}`, { headers });
      toast.success("Task deleted.");
      fetchData(false);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete task");
    }
  };

  const stats = useMemo(() => {
    const received = tasks.filter(isMine);
    const sent = tasks.filter(isSentByMe);
    return {
      needsMyUpdate: received.filter(t => t.status === 'Pending').length,
      myInProgress: received.filter(t => t.status === 'In Progress').length,
      waitingOnOthers: sent.filter(t => t.status !== 'Resolved').length,
      resolved: [...received, ...sent].filter(t => t.status === 'Resolved').length,
      receivedOpen: received.filter(t => t.status !== 'Resolved').length,
      sentOpen: sent.filter(t => t.status !== 'Resolved').length,
      allOpen: tasks.filter(t => t.status !== 'Resolved').length
    };
    // eslint-disable-next-line
  }, [tasks, user._id]);

  const filteredTasks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return tasks.filter(t => {
      if (activeTab === 'received' && !isMine(t)) return false;
      if (activeTab === 'sent' && !isSentByMe(t)) return false;

      if (statusFilter === 'Open' && t.status === 'Resolved') return false;
      if (!['Open', 'All'].includes(statusFilter) && t.status !== statusFilter) return false;

      if (query) {
        const haystack = `${t.title} ${t.description} ${t.assignedBy?.name || ''} ${t.assignedTo?.name || ''}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
    // eslint-disable-next-line
  }, [tasks, activeTab, statusFilter, searchQuery, user._id]);

  const assignablePeople = employees.filter(emp => emp._id !== user._id && emp.status !== 'Inactive');

  const tabs = [
    { id: 'received', label: 'Assigned To Me', count: stats.receivedOpen },
    { id: 'sent', label: 'Assigned By Me', count: stats.sentOpen },
    ...(isAdmin ? [{ id: 'all', label: 'All Team Handovers', count: stats.allOpen }] : [])
  ];

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6 pb-12">
      <Toaster position="top-right" />

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <BellRing size={28} className="text-indigo-600" /> Task Handover & Pending Updates
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Hand over pending work to anyone in the team. They get reminded every hour until they update it.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => fetchData()} className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 text-sm font-bold px-4 py-2.5 rounded-xl shadow-sm transition-all" title="Refresh">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button onClick={() => setIsModalOpen(true)} className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold px-5 py-2.5 rounded-xl shadow-md shadow-indigo-500/20 transition-all">
            <Plus size={18} strokeWidth={2.5}/> Hand Over Task
          </button>
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button onClick={() => { setActiveTab('received'); setStatusFilter('Pending'); }} className="text-left bg-white p-4 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-rose-500 hover:shadow-md transition-all">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1"><AlertCircle size={12}/> Needs My Update</p>
          <h3 className="text-2xl font-black text-rose-600 mt-1">{stats.needsMyUpdate}</h3>
        </button>
        <button onClick={() => { setActiveTab('received'); setStatusFilter('In Progress'); }} className="text-left bg-white p-4 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-blue-500 hover:shadow-md transition-all">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1"><Play size={12}/> I'm Working On</p>
          <h3 className="text-2xl font-black text-blue-600 mt-1">{stats.myInProgress}</h3>
        </button>
        <button onClick={() => { setActiveTab('sent'); setStatusFilter('Open'); }} className="text-left bg-white p-4 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-amber-500 hover:shadow-md transition-all">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1"><Clock size={12}/> Waiting On Others</p>
          <h3 className="text-2xl font-black text-amber-600 mt-1">{stats.waitingOnOthers}</h3>
        </button>
        <button onClick={() => { setActiveTab('received'); setStatusFilter('Resolved'); }} className="text-left bg-white p-4 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-emerald-500 hover:shadow-md transition-all">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1"><CheckCircle2 size={12}/> Resolved</p>
          <h3 className="text-2xl font-black text-emerald-600 mt-1">{stats.resolved}</h3>
        </button>
      </div>

      {/* TABS + FILTERS */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5 bg-slate-100 p-1.5 rounded-xl w-max max-w-full">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${activeTab === tab.id ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              {tab.label}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeTab === tab.id ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-600'}`}>{tab.count}</span>
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input type="text" placeholder="Search task or person..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full sm:w-56 pl-9 pr-3 py-2 text-sm font-medium bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer">
            <option value="Open">Open (Pending + In Progress)</option>
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
            <option value="All">All</option>
          </select>
        </div>
      </div>

      {/* TASK LIST */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        {loading ? (
          <div className="lg:col-span-2 text-center py-16 text-slate-400"><RefreshCw className="animate-spin inline-block mr-2" size={18}/> Loading handovers...</div>
        ) : filteredTasks.length === 0 ? (
          <div className="lg:col-span-2 text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200 text-slate-400">
            <Inbox size={40} className="mx-auto text-slate-300 mb-3"/>
            <p className="text-sm font-bold text-slate-500">Nothing here.</p>
            <p className="text-xs mt-1">{activeTab === 'received' ? 'No one has handed over a task to you in this view.' : 'No tasks found in this view.'}</p>
          </div>
        ) : (
          filteredTasks.map(task => {
            const mine = isMine(task);
            const sentByMe = isSentByMe(task);
            const isExpanded = expandedId === task._id;
            const isReminding = task.status === 'Pending' && task.awaitingResponse !== false;
            const updates = task.updates || [];

            return (
              <div key={task._id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden flex ${task.status === 'Resolved' ? 'border-slate-200 opacity-80' : mine && task.status === 'Pending' ? 'border-rose-200' : 'border-slate-200'}`}>
                <div className={`w-1.5 shrink-0 ${task.status === 'Resolved' ? 'bg-emerald-400' : PRIORITY_BAR[task.priority] || 'bg-slate-300'}`}></div>

                <div className="flex-1 min-w-0 p-5 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${PRIORITY_STYLE[task.priority] || PRIORITY_STYLE.Medium}`}>
                      {task.priority}
                    </span>
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${STATUS_STYLE[task.status] || STATUS_STYLE.Pending}`}>
                      {task.status}
                    </span>
                    {isReminding && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded border bg-indigo-50 text-indigo-700 border-indigo-200 flex items-center gap-1" title="Reminder goes every hour until the assignee updates this task">
                        <Bell size={10}/> Hourly reminder on{task.reminderCount > 0 ? ` · ${task.reminderCount} sent` : ''}
                      </span>
                    )}
                    <span className="ml-auto text-[10px] font-semibold text-slate-400" title={formatDateTime(task.createdAt)}>{timeAgo(task.createdAt)}</span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-slate-800 break-words">{task.title}</h3>
                    <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 mt-2 whitespace-pre-wrap break-words">{task.description}</p>
                  </div>

                  {/* FROM -> TO */}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-700 font-bold px-2.5 py-1 rounded-lg">
                      {sentByMe ? 'You' : task.assignedBy?.name || 'Unknown'}
                      {!sentByMe && task.assignedBy?.role && <span className="text-[9px] font-semibold text-slate-400">({task.assignedBy.role})</span>}
                    </span>
                    <ArrowRight size={14} className="text-slate-400"/>
                    <span className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 font-bold px-2.5 py-1 rounded-lg">
                      {mine ? 'You' : task.assignedTo?.name || 'Unknown'}
                      {!mine && task.assignedTo?.role && <span className="text-[9px] font-semibold text-indigo-400">({task.assignedTo.role})</span>}
                    </span>
                  </div>

                  {/* UPDATES THREAD */}
                  <button onClick={() => setExpandedId(isExpanded ? null : task._id)} className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 hover:text-indigo-600 transition-colors">
                    <MessageSquare size={13}/> {updates.length} update{updates.length === 1 ? '' : 's'}
                    <ChevronDown size={13} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}/>
                    {!isExpanded && updates.length > 0 && (
                      <span className="font-medium text-slate-400 truncate max-w-[220px]">— {updates[updates.length - 1].message}</span>
                    )}
                  </button>

                  {isExpanded && (
                    <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                      {updates.length === 0 ? (
                        <p className="text-[11px] text-slate-400 italic">No updates yet.</p>
                      ) : updates.map((u, idx) => (
                        <div key={u._id || idx} className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2">
                          <div className="flex justify-between items-center gap-2 text-[10px] font-bold text-slate-500">
                            <span>{u.updatedBy?._id === user._id ? 'You' : u.updatedBy?.name || 'User'}</span>
                            <span className="font-medium text-slate-400">{formatDateTime(u.date)}</span>
                          </div>
                          <p className="text-xs text-slate-700 mt-0.5 whitespace-pre-wrap break-words">{u.message}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* ACTIONS */}
                  {(mine || sentByMe || isAdmin) && (
                    <div className="border-t border-slate-100 pt-3 space-y-2">
                      {task.status !== 'Resolved' && (mine || sentByMe) && (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={remarks[task._id] || ''}
                            onChange={(e) => setRemarks(prev => ({ ...prev, [task._id]: e.target.value }))}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleUpdate(task); }}
                            placeholder={mine ? "Write your update / reply..." : "Add a note or follow-up..."}
                            className="flex-1 min-w-0 text-xs font-medium border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                          />
                          <button onClick={() => handleUpdate(task)} className="inline-flex items-center gap-1 bg-slate-800 hover:bg-slate-900 text-white px-3 py-2 rounded-lg text-xs font-bold transition-all" title="Send update">
                            <Send size={13}/> Send
                          </button>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center justify-end gap-2">
                        {(sentByMe || isAdmin) && (
                          <button onClick={() => handleDelete(task)} className="mr-auto inline-flex items-center gap-1 text-slate-400 hover:text-rose-600 text-[11px] font-bold transition-colors" title="Delete this handover">
                            <Trash2 size={13}/> Delete
                          </button>
                        )}
                        {mine && task.status === 'Pending' && (
                          <button onClick={() => handleUpdate(task, { status: 'In Progress' })} className="inline-flex items-center gap-1 bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white border border-blue-200 px-3 py-1.5 rounded-lg text-xs font-bold transition-all">
                            <Play size={13}/> Start Working
                          </button>
                        )}
                        {(mine || sentByMe) && task.status !== 'Resolved' && (
                          <button onClick={() => handleUpdate(task, { status: 'Resolved' })} className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm">
                            <CheckCircle2 size={13}/> Mark Resolved
                          </button>
                        )}
                        {(mine || sentByMe) && task.status === 'Resolved' && (
                          <button onClick={() => handleUpdate(task, { status: 'Pending', withRemark: false })} className="inline-flex items-center gap-1 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold transition-all">
                            <RotateCcw size={13}/> Re-open
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL: CREATE HANDOVER */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <BellRing size={18} className="text-indigo-600"/> Hand Over a Pending Task
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 rounded-xl text-slate-400 hover:bg-slate-200/50"><X size={18}/></button>
            </div>

            <form onSubmit={handleCreateTask} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Assign To (Employee / Admin / CEO) *</label>
                <select required value={form.assignedTo} onChange={(e) => setForm({...form, assignedTo: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl text-sm font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
                  <option value="">-- Select Person --</option>
                  {assignablePeople.map(emp => (
                    <option key={emp._id} value={emp._id}>{emp.name} ({emp.role || 'Staff'})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Task Title / Issue *</label>
                <input type="text" required value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} placeholder="e.g. Verify client PAN document..." className="w-full p-3 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"/>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Description / What is pending *</label>
                <textarea rows="3" required value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} placeholder="Explain what is pending and what needs to be done..." className="w-full p-3 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20"/>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Priority</label>
                <div className="grid grid-cols-4 gap-2">
                  {['Low', 'Medium', 'High', 'Urgent'].map(p => (
                    <button type="button" key={p} onClick={() => setForm({ ...form, priority: p })} className={`py-2 text-xs font-bold rounded-xl border transition-all ${form.priority === p ? `${PRIORITY_STYLE[p]} ring-2 ring-indigo-500/30` : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 flex items-start gap-2 text-[11px] font-semibold text-indigo-700">
                <Bell size={14} className="shrink-0 mt-0.5"/>
                <span>They will get a notification right now, and a reminder every hour until they update this task.</span>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl">Cancel</button>
                <button type="submit" disabled={saving} className="px-6 py-2.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md disabled:opacity-50 inline-flex items-center gap-2">
                  {saving ? <RefreshCw size={14} className="animate-spin"/> : <Send size={14}/>} Send Task & Notification
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskHandoverWorkspace;
