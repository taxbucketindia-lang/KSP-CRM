import React, { useState, useEffect, useContext, useMemo } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import toast, { Toaster } from 'react-hot-toast';
import { 
  CheckCircle2, Circle, CalendarDays, Plus, X, 
  Trash2, BellRing, AlertCircle, ListTodo, CheckSquare, RefreshCw, Loader2
} from 'lucide-react';

const TodoReminder = () => {
  const { user } = useContext(AuthContext);
  
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('Pending'); // 'All', 'Pending', 'Completed'
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // 🔴 UPDATED: Removed dueTime, Added endDate
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    dueDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    priority: 'Medium' // High, Medium, Low
  });

  const fetchTodos = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${user.token}` };
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/todos`, { headers });
      setTodos(res.data || []);
    } catch (error) {
      toast.error("Failed to load your tasks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodos();
    // eslint-disable-next-line
  }, [user.token]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.dueDate || !formData.endDate) {
      return toast.error("Title, Due Date and End Date are mandatory!");
    }
    
    setSaving(true);
    try {
      const headers = { Authorization: `Bearer ${user.token}` };
      await axios.post(`${import.meta.env.VITE_API_URL}/todos`, formData, { headers });
      
      toast.success("Task Saved Successfully!");
      setIsModalOpen(false);
      setFormData({
        title: '', description: '', 
        dueDate: new Date().toISOString().split('T')[0], 
        endDate: new Date().toISOString().split('T')[0], 
        priority: 'Medium'
      });
      fetchTodos();
    } catch (error) {
      toast.error("Error saving task");
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (todo) => {
    const newStatus = todo.status === 'Completed' ? 'Pending' : 'Completed';
    try {
      const headers = { Authorization: `Bearer ${user.token}` };
      await axios.put(`${import.meta.env.VITE_API_URL}/todos/${todo._id}`, { status: newStatus }, { headers });
      setTodos(prev => prev.map(t => t._id === todo._id ? { ...t, status: newStatus } : t));
      if(newStatus === 'Completed') toast.success("Task Marked as Completed! 🎉");
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const handleDelete = async (id) => {
    if(!window.confirm("Delete this task?")) return;
    try {
      const headers = { Authorization: `Bearer ${user.token}` };
      await axios.delete(`${import.meta.env.VITE_API_URL}/todos/${id}`, { headers });
      setTodos(prev => prev.filter(t => t._id !== id));
      toast.success("Task deleted");
    } catch (error) {
      toast.error("Error deleting task");
    }
  };

  // 🔴 UPDATED: Sort by End Date
  const filteredTodos = useMemo(() => {
    let filtered = todos;
    if (statusFilter !== 'All') {
      filtered = filtered.filter(t => t.status === statusFilter);
    }
    return filtered.sort((a, b) => {
      if (a.status === 'Completed' && b.status !== 'Completed') return 1;
      if (a.status !== 'Completed' && b.status === 'Completed') return -1;
      const dateA = new Date(a.endDate || a.dueDate);
      const dateB = new Date(b.endDate || b.dueDate);
      return dateA - dateB;
    });
  }, [todos, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: todos.length,
      pending: todos.filter(t => t.status === 'Pending').length,
      completed: todos.filter(t => t.status === 'Completed').length,
    };
  }, [todos]);

  const getPriorityColor = (priority) => {
    if (priority === 'High') return 'text-rose-600 bg-rose-50 border-rose-200';
    if (priority === 'Medium') return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-emerald-600 bg-emerald-50 border-emerald-200';
  };

  // 🔴 UPDATED: Check Overdue by End Date
  const isOverdue = (todo) => {
    if (todo.status === 'Completed') return false;
    const end = new Date(todo.endDate || todo.dueDate);
    end.setHours(23, 59, 59, 999);
    return end < new Date();
  };

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 pb-12 space-y-6">
      <Toaster position="top-right" />

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <ListTodo size={28} className="text-indigo-600" /> My To-Do & Reminders
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Manage your personal tasks, follow-ups, and daily work reminders.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold px-5 py-2.5 rounded-xl shadow-md shadow-indigo-500/20 transition-all">
          <Plus size={18} strokeWidth={2.5} /> Create Task
        </button>
      </div>

      {/* METRICS & FILTERS */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex gap-4">
          <div className="text-center px-4 border-r border-slate-200">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pending</p>
            <p className="text-xl font-black text-rose-600">{stats.pending}</p>
          </div>
          <div className="text-center px-4 border-r border-slate-200">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Completed</p>
            <p className="text-xl font-black text-emerald-600">{stats.completed}</p>
          </div>
          <div className="text-center px-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total</p>
            <p className="text-xl font-black text-slate-800">{stats.total}</p>
          </div>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl">
          {['All', 'Pending', 'Completed'].map(status => (
            <button 
              key={status} 
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${statusFilter === status ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* TASK LIST */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-16 text-slate-400"><RefreshCw className="animate-spin inline-block mr-2" size={18}/> Loading your tasks...</div>
        ) : filteredTodos.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 border-dashed flex flex-col items-center">
            <CheckSquare size={48} className="text-slate-200 mb-3" />
            <p className="text-sm font-bold text-slate-500">You're all caught up!</p>
            <p className="text-xs text-slate-400 mt-1">No {statusFilter.toLowerCase()} tasks found.</p>
          </div>
        ) : (
          filteredTodos.map(todo => {
            const overdue = isOverdue(todo);
            const isCompleted = todo.status === 'Completed';

            return (
              <div key={todo._id} className={`bg-white p-4 rounded-2xl border ${isCompleted ? 'border-slate-200 opacity-60' : overdue ? 'border-rose-200 shadow-sm bg-rose-50/10' : 'border-slate-200 shadow-sm'} flex items-start gap-4 transition-all hover:shadow-md`}>
                
                {/* Custom Checkbox */}
                <button onClick={() => toggleStatus(todo)} className={`mt-1 shrink-0 transition-colors ${isCompleted ? 'text-emerald-500' : 'text-slate-300 hover:text-indigo-500'}`}>
                  {isCompleted ? <CheckCircle2 size={24} className="fill-emerald-50" /> : <Circle size={24} />}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className={`text-base font-bold truncate ${isCompleted ? 'text-slate-500 line-through' : 'text-slate-800'}`}>
                      {todo.title}
                    </h3>
                    {!isCompleted && (
                      <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${getPriorityColor(todo.priority)}`}>
                        {todo.priority}
                      </span>
                    )}
                    {overdue && !isCompleted && (
                      <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border bg-rose-100 text-rose-700 border-rose-200 flex items-center gap-1 animate-pulse">
                        <AlertCircle size={10}/> Overdue
                      </span>
                    )}
                  </div>
                  
                  {todo.description && (
                    <p className={`text-xs mt-1 mb-3 line-clamp-2 ${isCompleted ? 'text-slate-400' : 'text-slate-600'}`}>
                      {todo.description}
                    </p>
                  )}

                  {/* 🔴 UPDATED: Date Displays */}
                  <div className="flex items-center gap-5 mt-2">
                    <div className={`flex items-center gap-1.5 text-xs font-semibold text-slate-500`}>
                      <CalendarDays size={14}/> Due: {todo.dueDate ? new Date(todo.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'N/A'}
                    </div>
                    <div className={`flex items-center gap-1.5 text-xs font-semibold ${overdue && !isCompleted ? 'text-rose-600' : 'text-slate-500'}`}>
                      <CalendarDays size={14}/> End: {todo.endDate ? new Date(todo.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'N/A'}
                    </div>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2 pl-2 border-l border-slate-100">
                  <button onClick={() => handleDelete(todo._id)} className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Delete Task">
                    <Trash2 size={16}/>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ADD NEW TASK MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/80">
              <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <BellRing className="text-indigo-600" size={20}/> Set New Task
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/50"><X size={18} /></button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-5">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Task Title *</label>
                <input type="text" name="title" required value={formData.title} onChange={handleChange} placeholder="e.g. Call client for OTP" className="w-full text-sm font-semibold border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500/20 outline-none" />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Details / Description</label>
                <textarea name="description" rows="2" value={formData.description} onChange={handleChange} placeholder="Any specific details..." className="w-full text-sm font-medium border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500/20 outline-none resize-none" />
              </div>

              {/* 🔴 UPDATED: Date Inputs */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1"><CalendarDays size={12}/> Due Date</label>
                  <input type="date" name="dueDate" required value={formData.dueDate} onChange={handleChange} className="w-full text-sm font-bold border border-slate-200 rounded-xl p-3 text-slate-700 focus:ring-2 focus:ring-indigo-500/20 outline-none" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1"><CalendarDays size={12}/> Task End Date *</label>
                  <input type="date" name="endDate" required value={formData.endDate} onChange={handleChange} className="w-full text-sm font-bold border border-slate-200 rounded-xl p-3 text-slate-700 focus:ring-2 focus:ring-indigo-500/20 outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Priority</label>
                <select name="priority" value={formData.priority} onChange={handleChange} className="w-full text-sm font-bold border border-slate-200 rounded-xl p-3 text-slate-700 focus:ring-2 focus:ring-indigo-500/20 outline-none">
                  <option value="High">🔴 High Priority</option>
                  <option value="Medium">🟡 Medium Priority</option>
                  <option value="Low">🟢 Low Priority</option>
                </select>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl">Cancel</button>
                <button type="submit" disabled={saving} className="px-6 py-2.5 text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md transition-all flex items-center gap-2">
                  {saving ? <Loader2 size={16} className="animate-spin"/> : <CheckCircle2 size={16} />} Save Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default TodoReminder;