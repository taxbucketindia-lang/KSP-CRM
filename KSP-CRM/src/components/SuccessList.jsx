import React, { useState, useEffect, useContext, useMemo } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { AuthContext } from '../context/AuthContext';
import { CheckCircle2, Circle, CalendarDays, Plus, X, Trash2, BellRing, AlertCircle, ListTodo, CheckSquare, Loader2, Pencil, Maximize2, Search } from 'lucide-react';

// 🔴 SUCCESS LIST (personal to-do): My Portal ke andar dikhta hai.
// Backend wahi purana hai (/todos) aur fields bhi wahi (title, description, dueDate, endDate, priority, status),
// isliye pehle se bana hua saara data aur uske reminders waise hi chalte rehte hain.

const todayInput = () => new Date().toISOString().split('T')[0];
const emptyForm = () => ({ title: '', description: '', dueDate: todayInput(), endDate: todayInput(), priority: 'Medium' });
const dateInput = (value) => (value ? new Date(value).toISOString().split('T')[0] : todayInput());
const shortDate = (value) => (value ? new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'N/A');

const priorityColor = (priority) => {
  if (priority === 'High') return 'text-rose-600 bg-rose-50 border-rose-200';
  if (priority === 'Medium') return 'text-amber-600 bg-amber-50 border-amber-200';
  return 'text-emerald-600 bg-emerald-50 border-emerald-200';
};

const isOverdue = (todo) => {
  if (todo.status === 'Completed') return false;
  const end = new Date(todo.endDate || todo.dueDate);
  end.setHours(23, 59, 59, 999);
  return end < new Date();
};

// openSignal: My Portal ke quick button dabne par badalta hai -> naya task wala form khul jata hai
const SuccessList = ({ onCount, openSignal = 0 }) => {
  const { user } = useContext(AuthContext);
  const headers = useMemo(() => ({ Authorization: `Bearer ${user.token}` }), [user.token]);
  const api = `${import.meta.env.VITE_API_URL}/todos`;

  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState('Pending'); // 'All', 'Pending', 'Completed'
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(emptyForm());
  // 🔴 VIEW ALL: poori list badi screen (popup) me, search ke saath
  const [viewAll, setViewAll] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    axios.get(api, { headers })
      .then(res => { if (!cancelled) setTodos(res.data || []); })
      .catch(() => { if (!cancelled) toast.error("Failed to load your success list"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [api, headers]);

  const stats = useMemo(() => ({
    total: todos.length,
    pending: todos.filter(t => t.status === 'Pending').length,
    completed: todos.filter(t => t.status === 'Completed').length,
    overdue: todos.filter(isOverdue).length
  }), [todos]);

  // My Portal ke upar wale cards ko ginti batana
  useEffect(() => { if (onCount) onCount(stats); }, [stats, onCount]);

  const openNew = () => { setEditingId(null); setFormData(emptyForm()); setIsModalOpen(true); };
  const openEdit = (todo) => {
    setEditingId(todo._id);
    setFormData({ title: todo.title || '', description: todo.description || '', dueDate: dateInput(todo.dueDate), endDate: dateInput(todo.endDate || todo.dueDate), priority: todo.priority || 'Medium' });
    setIsModalOpen(true);
  };
  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  useEffect(() => {
    if (openSignal > 0) openNew();
  }, [openSignal]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (saving) return;
    if (!formData.title || !formData.dueDate || !formData.endDate) return toast.error("Title, Due Date and End Date are mandatory!");
    if (formData.endDate < formData.dueDate) return toast.error("End Date cannot be before Due Date");

    setSaving(true);
    try {
      if (editingId) {
        const res = await axios.put(`${api}/${editingId}`, formData, { headers });
        setTodos(prev => prev.map(t => (t._id === editingId ? res.data : t)));
        toast.success("Task updated");
      } else {
        const res = await axios.post(api, formData, { headers });
        setTodos(prev => [...prev, res.data]);
        toast.success("Task Saved Successfully!");
      }
      setIsModalOpen(false);
    } catch {
      toast.error("Error saving task");
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (todo) => {
    const newStatus = todo.status === 'Completed' ? 'Pending' : 'Completed';
    try {
      await axios.put(`${api}/${todo._id}`, { status: newStatus }, { headers });
      setTodos(prev => prev.map(t => (t._id === todo._id ? { ...t, status: newStatus } : t)));
      if (newStatus === 'Completed') toast.success("Task Marked as Completed! 🎉");
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this task?")) return;
    try {
      await axios.delete(`${api}/${id}`, { headers });
      setTodos(prev => prev.filter(t => t._id !== id));
      toast.success("Task deleted");
    } catch {
      toast.error("Error deleting task");
    }
  };

  const filteredTodos = useMemo(() => {
    const filtered = statusFilter === 'All' ? [...todos] : todos.filter(t => t.status === statusFilter);
    return filtered.sort((a, b) => {
      if (a.status === 'Completed' && b.status !== 'Completed') return 1;
      if (a.status !== 'Completed' && b.status === 'Completed') return -1;
      return new Date(a.endDate || a.dueDate) - new Date(b.endDate || b.dueDate);
    });
  }, [todos, statusFilter]);

  const renderTodo = (todo) => {
          const overdue = isOverdue(todo);
          const isCompleted = todo.status === 'Completed';
          return (
            <div key={todo._id} className={`group p-3 rounded-2xl border flex items-start gap-3 transition-all hover:shadow-sm ${isCompleted ? 'border-slate-200 bg-slate-50/60 opacity-70' : overdue ? 'border-rose-200 bg-rose-50/30' : 'border-slate-200 bg-white'}`}>
              <button onClick={() => toggleStatus(todo)} className={`mt-0.5 shrink-0 transition-colors ${isCompleted ? 'text-emerald-500' : 'text-slate-300 hover:text-indigo-500'}`} title={isCompleted ? 'Mark as pending' : 'Mark as completed'}>
                {isCompleted ? <CheckCircle2 size={22} className="fill-emerald-50" /> : <Circle size={22} />}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <h4 className={`text-sm font-bold truncate ${isCompleted ? 'text-slate-500 line-through' : 'text-slate-800'}`}>{todo.title}</h4>
                  {!isCompleted && <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${priorityColor(todo.priority)}`}>{todo.priority}</span>}
                  {overdue && <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border bg-rose-100 text-rose-700 border-rose-200 flex items-center gap-1"><AlertCircle size={10} /> Overdue</span>}
                </div>
                {todo.description && <p className={`text-xs mt-0.5 line-clamp-2 ${isCompleted ? 'text-slate-400' : 'text-slate-600'}`}>{todo.description}</p>}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 mt-1.5 text-[11px] font-semibold text-slate-500">
                  <span className="flex items-center gap-1"><CalendarDays size={12} /> Due: {shortDate(todo.dueDate)}</span>
                  <span className={`flex items-center gap-1 ${overdue ? 'text-rose-600' : ''}`}><CalendarDays size={12} /> End: {shortDate(todo.endDate)}</span>
                </div>
              </div>
              <div className="shrink-0 flex items-center gap-0.5 md:opacity-60 md:group-hover:opacity-100 transition-opacity">
                <button onClick={() => openEdit(todo)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg" title="Edit"><Pencil size={14} /></button>
                <button onClick={() => handleDelete(todo._id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg" title="Delete"><Trash2 size={14} /></button>
              </div>
            </div>
          );
  };

  // View All popup ki list: filter + search
  const searchText = search.trim().toLowerCase();
  const allTodos = searchText
    ? filteredTodos.filter(t => `${t.title} ${t.description || ''}`.toLowerCase().includes(searchText))
    : filteredTodos;

  const filterTabs = (
    <div className="flex bg-slate-100 p-0.5 rounded-xl">
      {['Pending', 'Completed', 'All'].map(status => (
        <button key={status} onClick={() => setStatusFilter(status)} className={`px-2.5 py-1.5 text-[11px] font-bold rounded-lg transition-all ${statusFilter === status ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{status}</button>
      ))}
    </div>
  );

  const inputClass = 'w-full text-sm font-semibold border border-slate-200 rounded-xl p-3 text-slate-700 focus:ring-2 focus:ring-indigo-500/20 outline-none';
  const labelClass = 'block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5';

  return (
    <div id="success-list" className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 sm:p-5 md:p-6 flex flex-col h-full scroll-mt-24 min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <span className="h-10 w-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center"><ListTodo size={18} /></span>
          <div>
            <h3 className="text-base font-black text-slate-800">Success List</h3>
            <p className="text-[11px] text-slate-400 font-medium">{stats.pending} pending · {stats.completed} done{stats.overdue > 0 ? ` · ${stats.overdue} overdue` : ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {filterTabs}
          <button onClick={() => setViewAll(true)} title="See the full list on a big screen" className="inline-flex items-center gap-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-bold px-3 py-2 rounded-xl transition-all"><Maximize2 size={13} /> View All</button>
          <button onClick={openNew} className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3 py-2 rounded-xl shadow-sm transition-all"><Plus size={14} strokeWidth={2.5} /> Add</button>
        </div>
      </div>

      <div className="space-y-2.5 overflow-y-auto max-h-[420px] pr-1 custom-scrollbar flex-1">
        {loading ? (
          <div className="text-center py-12 text-slate-400"><Loader2 className="animate-spin inline-block" size={20} /></div>
        ) : filteredTodos.length === 0 ? (
          <div className="text-center py-10 rounded-2xl border border-dashed border-slate-200 flex flex-col items-center">
            <CheckSquare size={36} className="text-slate-200 mb-2" />
            <p className="text-sm font-bold text-slate-500">{statusFilter === 'Pending' ? "You're all caught up!" : 'Nothing here yet.'}</p>
            <p className="text-xs text-slate-400 mt-0.5">No {statusFilter === 'All' ? '' : statusFilter.toLowerCase()} tasks found.</p>
          </div>
        ) : filteredTodos.map(renderTodo)}
      </div>

      {/* VIEW ALL POPUP */}
      {viewAll && (
        <div className="fixed inset-0 z-[45] bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-2 sm:p-4" onClick={() => setViewAll(false)}>
          <div className="bg-slate-50 rounded-3xl w-full max-w-3xl h-[92vh] shadow-2xl border border-slate-100 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="bg-white px-4 sm:px-6 py-4 border-b border-slate-100">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="h-10 w-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0"><ListTodo size={18} /></span>
                  <div className="min-w-0">
                    <h2 className="text-lg font-black text-slate-800">Success List</h2>
                    <p className="text-[11px] text-slate-400 font-medium">{stats.pending} pending · {stats.completed} done · {stats.total} total{stats.overdue > 0 ? ` · ${stats.overdue} overdue` : ''}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={openNew} className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3 py-2 rounded-xl shadow-sm"><Plus size={14} strokeWidth={2.5} /> Add</button>
                  <button onClick={() => setViewAll(false)} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"><X size={18} /></button>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <div className="relative flex-1 min-w-[160px]">
                  <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                  <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tasks..." className="w-full text-xs font-semibold border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20" />
                </div>
                {filterTabs}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-2.5 custom-scrollbar">
              {allTodos.length === 0 ? (
                <div className="text-center py-16 flex flex-col items-center">
                  <CheckSquare size={40} className="text-slate-200 mb-2" />
                  <p className="text-sm font-bold text-slate-500">No tasks found.</p>
                </div>
              ) : allTodos.map(renderTodo)}
            </div>
            <div className="bg-white px-4 sm:px-6 py-2.5 border-t border-slate-100 text-[11px] font-semibold text-slate-400">Showing {allTodos.length} task{allTodos.length === 1 ? '' : 's'}</div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/80">
              <h2 className="text-lg font-black text-slate-800 flex items-center gap-2"><BellRing className="text-indigo-600" size={20} /> {editingId ? 'Edit Task' : 'Set New Task'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/50"><X size={18} /></button>
            </div>
            <form onSubmit={handleSave} className="p-4 sm:p-6 space-y-4 sm:space-y-5">
              <div>
                <label className={labelClass}>Task Title *</label>
                <input type="text" name="title" required value={formData.title} onChange={handleChange} placeholder="e.g. Call client for OTP" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Details / Description</label>
                <textarea name="description" rows="2" value={formData.description} onChange={handleChange} placeholder="Any specific details..." className={`${inputClass} resize-none font-medium`} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Due Date *</label>
                  <input type="date" name="dueDate" required value={formData.dueDate} onChange={handleChange} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Task End Date *</label>
                  <input type="date" name="endDate" required min={formData.dueDate} value={formData.endDate} onChange={handleChange} className={inputClass} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Priority</label>
                <select name="priority" value={formData.priority} onChange={handleChange} className={inputClass}>
                  <option value="High">🔴 High Priority</option>
                  <option value="Medium">🟡 Medium Priority</option>
                  <option value="Low">🟢 Low Priority</option>
                </select>
              </div>
              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl">Cancel</button>
                <button type="submit" disabled={saving} className="px-6 py-2.5 text-sm font-bold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-xl shadow-md transition-all flex items-center gap-2">
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} {editingId ? 'Save Changes' : 'Save Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuccessList;
