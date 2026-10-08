import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import toast, { Toaster } from 'react-hot-toast';
import { Bell, Plus, CheckCircle2, Clock, AlertCircle, Send, X, UserCheck, MessageSquare, RefreshCw  } from 'lucide-react';

const TaskHandoverWorkspace = () => {
  const { user } = useContext(AuthContext);
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [form, setForm] = useState({
    title: '',
    description: '',
    assignedTo: '',
    priority: 'Medium'
  });

  const [activeTab, setActiveTab] = useState('received'); // 'received' (Mujhe mile) ya 'sent' (Maine diye)

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${user.token}` };
      const [tasksRes, usersRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_URL}/taskhandover/handovers`, { headers }),
        axios.get(`${import.meta.env.VITE_API_URL}/users/empls`, { headers }).catch(() => ({ data: [] })) // Saare employees ki list
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
  }, [user.token]);

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!form.title || !form.assignedTo) return toast.error("Title and Assignee are required!");
    try {
      const headers = { Authorization: `Bearer ${user.token}` };
      await axios.post(`${import.meta.env.VITE_API_URL}/taskhandover/handovers`, form, { headers });
      toast.success("Task handed over successfully!");
      setIsModalOpen(false);
      setForm({ title: '', description: '', assignedTo: '', priority: 'Medium' });
      fetchData();
    } catch (error) {
      toast.error("Failed to assign task");
    }
  };

  const handleStatusUpdate = async (taskId, newStatus) => {
    try {
      const headers = { Authorization: `Bearer ${user.token}` };
      await axios.put(`${import.meta.env.VITE_API_URL}/tasks/handovers/${taskId}`, { status: newStatus }, { headers });
      toast.success(`Status updated to ${newStatus}`);
      fetchData();
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const filteredTasks = tasks.filter(t => {
    if (activeTab === 'received') return t.assignedTo?._id === user._id;
    return t.assignedBy?._id === user._id;
  });

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <Toaster position="top-right" />
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-3">
            <Bell className="text-indigo-600 animate-bounce" size={26} /> Internal Task Handover & Updates
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Coordinate pending items between team members with real-time tracking.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-5 py-3 rounded-xl shadow-md transition-all flex items-center gap-2">
          <Plus size={16} strokeWidth={2.5}/> Handover Task to Peer
        </button>
      </div>

      {/* TABS */}
      <div className="flex gap-2 bg-slate-100 p-1.5 rounded-2xl w-max">
        <button onClick={() => setActiveTab('received')} className={`px-5 py-2 text-xs font-bold rounded-xl transition-all ${activeTab === 'received' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'}`}>
          Pending From Peers ({tasks.filter(t => t.assignedTo?._id === user._id && t.status !== 'Resolved').length})
        </button>
        <button onClick={() => setActiveTab('sent')} className={`px-5 py-2 text-xs font-bold rounded-xl transition-all ${activeTab === 'sent' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'}`}>
          Assigned By Me ({tasks.filter(t => t.assignedBy?._id === user._id).length})
        </button>
      </div>

      {/* TASK LIST */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-2 text-center py-12 text-slate-400"><RefreshCw className="animate-spin inline-block mr-2" size={18}/> Loading notifications...</div>
        ) : filteredTasks.length === 0 ? (
          <div className="col-span-2 text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200 text-slate-400">
            <CheckCircle2 size={36} className="mx-auto text-slate-300 mb-2"/>
            <p className="text-sm font-bold">No tasks found in this view.</p>
          </div>
        ) : (
          filteredTasks.map(task => (
            <div key={task._id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between gap-4 relative">
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${task.priority === 'Urgent' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                    {task.priority} Priority
                  </span>
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${task.status === 'Resolved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                    {task.status}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-800">{task.title}</h3>
                <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">{task.description}</p>
              </div>

              <div className="border-t border-slate-100 pt-3 flex justify-between items-center text-xs text-slate-500">
                <div>
                  {activeTab === 'received' ? (
                    <p>From: <strong className="text-slate-700">{task.assignedBy?.name}</strong></p>
                  ) : (
                    <p>To: <strong className="text-slate-700">{task.assignedTo?.name}</strong></p>
                  )}
                </div>
                {activeTab === 'received' && task.status !== 'Resolved' && (
                  <button onClick={() => handleStatusUpdate(task._id, 'Resolved')} className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm">
                    Mark Resolved
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* MODAL: CREATE HANDOVER */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Bell size={18} className="text-indigo-600"/> Handover Task to Peer
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 rounded-xl text-slate-400 hover:bg-slate-200/50"><X size={18}/></button>
            </div>
            
            <form onSubmit={handleCreateTask} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Assign To Employee *</label>
                <select required value={form.assignedTo} onChange={(e) => setForm({...form, assignedTo: e.target.value})} className="w-full p-3 border rounded-xl text-sm font-semibold bg-white">
                  <option value="">-- Select Employee --</option>
                  {employees.filter(emp => emp._id !== user._id).map(emp => (
                    <option key={emp._id} value={emp._id}>{emp.name} ({emp.role || 'Staff'})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Task Title / Issue *</label>
                <input type="text" required value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} placeholder="e.g. Verify client PAN document..." className="w-full p-3 border rounded-xl text-sm font-semibold"/>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Description / Instructions *</label>
                <textarea rows="3" required value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} placeholder="Explain what needs to be done..." className="w-full p-3 border rounded-xl text-sm resize-none"/>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Priority</label>
                <select value={form.priority} onChange={(e) => setForm({...form, priority: e.target.value})} className="w-full p-3 border rounded-xl text-sm font-bold">
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Urgent">Urgent</option>
                </select>
              </div>

              <div className="pt-4 border-t flex justify-end gap-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 rounded-xl">Cancel</button>
                <button type="submit" className="px-6 py-2.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md">Send Task & Notification</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskHandoverWorkspace;