import React, { useState, useEffect, useContext } from 'react';
import { Code, Plus, Layers, AlertCircle, Clock, CheckCircle2, User, FileText, Loader2 } from 'lucide-react';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import { AuthContext } from '../context/AuthContext';

const DevTask = () => {
  const { user } = useContext(AuthContext);

  const [formData, setFormData] = useState({
    title: '', taskType: 'New Feature', priority: 'Medium', module: '', 
    description: '', assignedTo: '', startDate: '', dueDate: '', 
    estimatedHours: '', status: 'Backlog'
  });

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);

  // Status & Priority Colors Mapping
  const statusColors = {
    'Backlog': 'bg-slate-100 text-slate-600 border-slate-200',
    'Start': 'bg-blue-50 text-blue-600 border-blue-200',
    'In Progress': 'bg-purple-50 text-purple-600 border-purple-200',
    'Testing / Review': 'bg-amber-50 text-amber-600 border-amber-200',
    'Completed': 'bg-emerald-50 text-emerald-600 border-emerald-200'
  };

  const priorityColors = {
    'Urgent': 'text-red-600 bg-red-50', 'High': 'text-orange-600 bg-orange-50',
    'Medium': 'text-blue-600 bg-blue-50', 'Low': 'text-slate-600 bg-slate-50'
  };

  const fetchTasks = async () => {
    try {
      const headers = user?.token ? { Authorization: `Bearer ${user.token}` } : {};
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/devtasks`, { headers });
      setTasks(res.data.data || []);
    } catch (error) {
      toast.error("Failed to load tasks");
    } finally {
      setFetchLoading(false);
    }
  };

  useEffect(() => { fetchTasks(); }, []);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const headers = user?.token ? { Authorization: `Bearer ${user.token}` } : {};
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/devtasks`, formData, { headers });
      
      setTasks([res.data.data, ...tasks]);
      toast.success("Development Task Created!");
      
      setFormData({
        title: '', taskType: 'New Feature', priority: 'Medium', module: '', 
        description: '', assignedTo: '', startDate: '', dueDate: '', 
        estimatedHours: '', status: 'Backlog'
      });
    } catch (error) {
      toast.error("Failed to create task");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      <Toaster position="top-right" />

      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
          <Code className="text-blue-600" /> Development Tasks Tracker
        </h1>
        <p className="text-sm text-slate-500 mt-1">Manage project modules, bugs, and feature rollouts.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* ADD TASK FORM */}
        <div className="xl:col-span-1 bg-white p-6 rounded-3xl border border-slate-200 shadow-lg self-start">
          <h2 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">Create New Task</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Task Title *</label>
              <input type="text" name="title" required value={formData.title} onChange={handleChange} placeholder="e.g. Fix ITR Import Excel Bug" className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500/20" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Task Type</label>
                <select name="taskType" value={formData.taskType} onChange={handleChange} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20">
                  <option>Bug Fix</option>
                  <option>New Feature</option>
                  <option>UI Improvement</option>
                  <option>Database Optimization</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Priority</label>
                <select name="priority" value={formData.priority} onChange={handleChange} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20">
                  <option>Urgent</option>
                  <option>High</option>
                  <option>Medium</option>
                  <option>Low</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Module</label>
                <input type="text" name="module" required placeholder="e.g. GST, ITR, HR" value={formData.module} onChange={handleChange} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Assigned To</label>
                <input type="text" name="assignedTo" required placeholder="Developer Name" value={formData.assignedTo} onChange={handleChange} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-1">
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Est. Hours</label>
                <input type="number" name="estimatedHours" placeholder="0" value={formData.estimatedHours} onChange={handleChange} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Initial Status</label>
                <select name="status" value={formData.status} onChange={handleChange} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500/20">
                  <option>Backlog</option>
                  <option>Start</option>
                  <option>In Progress</option>
                  <option>Testing / Review</option>
                  <option>Completed</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Start Date</label>
                <input type="date" name="startDate" value={formData.startDate} onChange={handleChange} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Due Date</label>
                <input type="date" name="dueDate" value={formData.dueDate} onChange={handleChange} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Detailed Description</label>
              <textarea name="description" required rows="3" placeholder="Describe the task, bugs, or steps required..." value={formData.description} onChange={handleChange} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 resize-none"></textarea>
            </div>

            <button type="submit" disabled={loading} className="w-full py-3 mt-2 bg-blue-900 hover:bg-blue-800 disabled:opacity-70 text-white rounded-xl font-bold shadow-md transition-all flex items-center justify-center gap-2">
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />} 
              {loading ? 'Saving Task...' : 'Create Task'}
            </button>
          </form>
        </div>

        {/* TASK LIST TABLE */}
        <div className="xl:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-lg overflow-hidden flex flex-col h-[85vh]">
          <div className="p-6 border-b border-slate-200 bg-slate-50 flex justify-between items-center shrink-0">
            <h2 className="text-lg font-bold text-slate-800">Active Development Tasks</h2>
            <span className="text-xs font-bold bg-white px-3 py-1 border border-slate-200 rounded-full text-slate-500">
              {tasks.length} Tasks
            </span>
          </div>
          
          <div className="overflow-y-auto flex-1 p-4 space-y-4 bg-slate-50/50">
            {fetchLoading ? (
              <div className="text-center py-12 text-slate-500 font-medium">
                <Loader2 size={32} className="animate-spin mx-auto mb-3 text-blue-500" />
                Loading Tasks...
              </div>
            ) : tasks.length > 0 ? (
              tasks.map((task) => (
                <div key={task._id} className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                  
                  {/* Left: Info */}
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                        {task.module}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${priorityColors[task.priority]}`}>
                        {task.priority} Priority
                      </span>
                      <span className="text-xs text-slate-400 font-medium ml-2">{task.taskType}</span>
                    </div>
                    
                    <h3 className="text-lg font-bold text-slate-800 leading-tight">{task.title}</h3>
                    
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1.5 font-medium"><User size={14}/> {task.assignedTo}</span>
                      {task.dueDate && <span className="flex items-center gap-1.5"><Clock size={14}/> Due: {new Date(task.dueDate).toLocaleDateString('en-IN')}</span>}
                      {task.estimatedHours > 0 && <span className="flex items-center gap-1.5"><Layers size={14}/> {task.estimatedHours} Hrs</span>}
                    </div>
                  </div>

                  {/* Right: Status & Actions */}
                  <div className="flex flex-col items-end gap-3 shrink-0">
                    <span className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${statusColors[task.status]}`}>
                      {task.status}
                    </span>
                    <button className="text-xs font-bold text-blue-600 hover:text-blue-800 underline underline-offset-2">
                      View Details & Remarks
                    </button>
                  </div>

                </div>
              ))
            ) : (
              <div className="text-center py-12 text-slate-400 font-medium">
                No development tasks found. Start adding tasks for your team.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default DevTask;