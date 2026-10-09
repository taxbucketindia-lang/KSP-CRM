import React, { useState, useEffect, useContext } from 'react';
import { Code, Plus, Layers, AlertCircle, Clock, CheckCircle2, User, FileText, Loader2, Edit3, X, MessageSquare, Trash2, Edit } from 'lucide-react';
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
  const [developers, setDevelopers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);

  // Filter States
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('');

  // Update Status Modal State
  const [updateModal, setUpdateModal] = useState({ isOpen: false, task: null, status: '', remark: '' });
  const [updateLoading, setUpdateLoading] = useState(false);

  // Edit Task Modal State
  const [editModal, setEditModal] = useState({ isOpen: false, task: null });
  const [editFormData, setEditFormData] = useState({});
  const [editLoading, setEditLoading] = useState(false);

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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const headers = user?.token ? { Authorization: `Bearer ${user.token}` } : {};
        const taskRes = await axios.get(`${import.meta.env.VITE_API_URL}/devtasks`, { headers });
        setTasks(taskRes.data.data || []);

        const userRes = await axios.get(`${import.meta.env.VITE_API_URL}/users/all-developers`, { headers });
        const allUsers = userRes.data.data || userRes.data || [];
        
        const devsOnly = allUsers.filter(u => 
          u.role?.toLowerCase() === 'developer' || 
          u.department?.toLowerCase() === 'development' ||
          u.designation?.toLowerCase()?.includes('developer')
        );
        setDevelopers(devsOnly.length > 0 ? devsOnly : allUsers);
      } catch (error) {
        toast.error("Failed to load data");
      } finally {
        setFetchLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const headers = user?.token ? { Authorization: `Bearer ${user.token}` } : {};
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/devtasks`, formData, { headers });
      setTasks([res.data.data, ...tasks]);
      toast.success("Development Task Assigned!");
      setFormData({ title: '', taskType: 'New Feature', priority: 'Medium', module: '', description: '', assignedTo: '', startDate: '', dueDate: '', estimatedHours: '', status: 'Backlog' });
    } catch (error) {
      toast.error("Failed to assign task");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTask = async (id) => {
    if (!window.confirm("Are you sure you want to delete this task?")) return;
    try {
      const headers = user?.token ? { Authorization: `Bearer ${user.token}` } : {};
      await axios.delete(`${import.meta.env.VITE_API_URL}/devtasks/${id}`, { headers });
      setTasks(tasks.filter(t => t._id !== id));
      toast.success("Task deleted successfully");
    } catch (error) {
      toast.error("Failed to delete task");
    }
  };

  const openEditModal = (task) => {
    setEditModal({ isOpen: true, task });
    setEditFormData({
      title: task.title,
      module: task.module,
      assignedTo: task.assignedTo,
      priority: task.priority,
      taskType: task.taskType,
      description: task.description,
      estimatedHours: task.estimatedHours
    });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    try {
      const headers = user?.token ? { Authorization: `Bearer ${user.token}` } : {};
      const res = await axios.put(`${import.meta.env.VITE_API_URL}/devtasks/${editModal.task._id}/edit`, editFormData, { headers });
      const updated = res.data.data;
      setTasks(tasks.map(t => t._id === updated._id ? updated : t));
      toast.success("Task updated successfully!");
      setEditModal({ isOpen: false, task: null });
    } catch (error) {
      toast.error("Failed to update task");
    } finally {
      setEditLoading(false);
    }
  };

  const handleUpdateProgress = async (e) => {
    e.preventDefault();
    if (!updateModal.status) return toast.error("Please select a status");
    setUpdateLoading(true);
    try {
      const headers = user?.token ? { Authorization: `Bearer ${user.token}` } : {};
      const payload = {
        status: updateModal.status,
        remarkMessage: updateModal.remark,
        employeeName: user?.name || user?.username,
        employeeId: user?._id
      };
      const res = await axios.put(`${import.meta.env.VITE_API_URL}/devtasks/${updateModal.task._id}`, payload, { headers });
      const updatedTask = res.data.data;
      setTasks(tasks.map(t => (t._id === updatedTask._id ? updatedTask : t)));
      toast.success("Task Progress Updated!");
      setUpdateModal({ isOpen: false, task: null, status: '', remark: '' });
    } catch (error) {
      toast.error("Failed to update progress");
    } finally {
      setUpdateLoading(false);
    }
  };

  // Filter Logic Implementation
  const filteredTasks = tasks.filter((task) => {
    const matchesStatus = statusFilter === 'All' || task.status === statusFilter;
    
    let matchesDate = true;
    if (dateFilter) {
      const taskDate = new Date(task.createdAt || task.startDate).toISOString().split('T')[0];
      matchesDate = taskDate === dateFilter;
    }

    return matchesStatus && matchesDate;
  });

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8 relative">
      <Toaster position="top-right" />

      {/* --- STATUS UPDATE MODAL --- */}
      {updateModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 relative">
            <button onClick={() => setUpdateModal({ isOpen: false, task: null, status: '', remark: '' })} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X size={20} /></button>
            <h3 className="text-lg font-black text-slate-800 mb-4 border-b pb-2">Update Task Progress</h3>
            <form onSubmit={handleUpdateProgress} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Update Status</label>
                <select value={updateModal.status} onChange={(e) => setUpdateModal({...updateModal, status: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-bold">
                  <option>Backlog</option><option>Start</option><option>In Progress</option><option>Testing / Review</option><option>Completed</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Add Remark *</label>
                <textarea required rows="3" placeholder="What progress was made?" value={updateModal.remark} onChange={(e) => setUpdateModal({...updateModal, remark: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm resize-none"></textarea>
              </div>
              <button type="submit" disabled={updateLoading} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex justify-center items-center gap-2">
                {updateLoading && <Loader2 size={18} className="animate-spin" />} Update Progress
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- EDIT TASK MODAL --- */}
      {editModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl p-6 relative">
            <button onClick={() => setEditModal({ isOpen: false, task: null })} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X size={20} /></button>
            <h3 className="text-lg font-black text-slate-800 mb-4 border-b pb-2">Edit Task Details</h3>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Task Title</label>
                <input type="text" required value={editFormData.title || ''} onChange={(e) => setEditFormData({...editFormData, title: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Module</label>
                  <input type="text" required value={editFormData.module || ''} onChange={(e) => setEditFormData({...editFormData, module: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Assigned To</label>
                  <select value={editFormData.assignedTo || ''} onChange={(e) => setEditFormData({...editFormData, assignedTo: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm">
                    {developers.map(dev => {
                      const name = dev.name || dev.username;
                      const empId = dev.employeeId || dev._id.slice(-6);
                      return (
                        <option key={dev._id} value={name}>
                          {name} (ID: {empId})
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Priority</label>
                  <select value={editFormData.priority || ''} onChange={(e) => setEditFormData({...editFormData, priority: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm">
                    <option>Urgent</option><option>High</option><option>Medium</option><option>Low</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Est. Hours</label>
                  <input type="number" value={editFormData.estimatedHours || 0} onChange={(e) => setEditFormData({...editFormData, estimatedHours: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Description</label>
                <textarea rows="3" value={editFormData.description || ''} onChange={(e) => setEditFormData({...editFormData, description: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm resize-none"></textarea>
              </div>
              <button type="submit" disabled={editLoading} className="w-full py-3 bg-blue-900 hover:bg-blue-800 text-white rounded-xl font-bold flex justify-center items-center gap-2">
                {editLoading && <Loader2 size={18} className="animate-spin" />} Save Changes
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2"><Code className="text-blue-600" /> Development Tasks Tracker</h1>
        <p className="text-sm text-slate-500 mt-1">Manage project modules, assign tasks, update progress and filter records easily.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* ADD TASK FORM */}
        <div className="xl:col-span-1 bg-white p-6 rounded-3xl border border-slate-200 shadow-lg self-start">
          <h2 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">Assign New Task</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Task Title *</label>
              <input type="text" name="title" required value={formData.title} onChange={handleChange} placeholder="e.g. Fix Appwrite Login Error" className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-semibold" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Module</label>
                <input type="text" name="module" required placeholder="e.g. CRM, React" value={formData.module} onChange={handleChange} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Assigned To *</label>
                <select name="assignedTo" required value={formData.assignedTo} onChange={handleChange} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-bold text-blue-700">
                  <option value="">Select Developer</option>
                  {developers.map(dev => {
                    const name = dev.name || dev.username;
                    const empId = dev.employeeId || dev._id.slice(-6);
                    return (
                      <option key={dev._id} value={name}>
                        {name} (ID: {empId})
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Task Type</label>
                <select name="taskType" value={formData.taskType} onChange={handleChange} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm">
                  <option>Bug Fix</option><option>New Feature</option><option>UI Improvement</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Priority</label>
                <select name="priority" value={formData.priority} onChange={handleChange} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm">
                  <option>Urgent</option><option>High</option><option>Medium</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Est. Hours</label>
              <input type="number" name="estimatedHours" placeholder="0" value={formData.estimatedHours} onChange={handleChange} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Detailed Description *</label>
              <textarea name="description" required rows="3" placeholder="Describe task details..." value={formData.description} onChange={handleChange} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm resize-none"></textarea>
            </div>
            <button type="submit" disabled={loading} className="w-full py-3 mt-2 bg-blue-900 hover:bg-blue-800 text-white rounded-xl font-bold flex items-center justify-center gap-2">
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />} Assign Task
            </button>
          </form>
        </div>

        {/* TASK LIST TABLE */}
        <div className="xl:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-lg overflow-hidden flex flex-col h-[85vh]">
          
          {/* Filters Header Bar */}
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-wrap justify-between items-center gap-3 shrink-0">
            <h2 className="text-base font-bold text-slate-800">Active Development Tasks</h2>
            
            <div className="flex flex-wrap items-center gap-2">
              {/* Status Filter Dropdown */}
              <select 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)}
                className="p-2 border border-slate-200 rounded-xl text-xs font-semibold bg-white text-slate-700"
              >
                <option value="All">All Status</option>
                <option value="Backlog">Backlog</option>
                <option value="Start">Start</option>
                <option value="In Progress">In Progress</option>
                <option value="Testing / Review">Testing / Review</option>
                <option value="Completed">Completed</option>
              </select>

              {/* Date Filter Input */}
              <input 
                type="date" 
                value={dateFilter} 
                onChange={(e) => setDateFilter(e.target.value)}
                className="p-2 border border-slate-200 rounded-xl text-xs font-semibold bg-white text-slate-700"
              />

              {dateFilter && (
                <button 
                  onClick={() => setDateFilter('')} 
                  className="text-xs text-red-600 font-bold hover:underline"
                >
                  Clear Date
                </button>
              )}

              <span className="text-xs font-bold bg-white px-3 py-1.5 border border-slate-200 rounded-full text-slate-600">
                {filteredTasks.length} Tasks
              </span>
            </div>
          </div>
          
          <div className="overflow-y-auto flex-1 p-4 space-y-4 bg-slate-50/50">
            {fetchLoading ? (
              <div className="text-center py-12 text-slate-500 font-medium"><Loader2 size={32} className="animate-spin mx-auto mb-3 text-blue-500" />Loading Tasks...</div>
            ) : filteredTasks.length > 0 ? (
              filteredTasks.map((task) => {
                const isAssignedToMe = user?.name === task.assignedTo || user?.username === task.assignedTo;
                
                return (
                  <div key={task._id} className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex flex-col gap-4">
                    <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase">{task.module}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${priorityColors[task.priority]}`}>{task.priority}</span>
                          {task.estimatedHours > 0 && (
                            <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1">
                              <Layers size={12}/> {task.estimatedHours} Hrs
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400 font-medium ml-1">
                            Assigned on: {new Date(task.createdAt || task.startDate).toLocaleDateString('en-IN')}
                          </span>
                        </div>
                        <h3 className="text-lg font-bold text-slate-800">{task.title}</h3>
                        <p className="text-sm text-slate-600">{task.description}</p>
                        <div className="flex items-center gap-4 text-xs text-slate-500 mt-2">
                          <span className="flex items-center gap-1.5 font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded"><User size={14}/> {task.assignedTo}</span>
                          {task.assignedByName && <span className="font-medium text-slate-500">Assigned by: <strong className="text-slate-700">{task.assignedByName}</strong></span>}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-3 shrink-0">
                        <div className="flex items-center gap-2">
                          <span className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${statusColors[task.status]}`}>{task.status}</span>
                          
                          <button onClick={() => openEditModal(task)} className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors" title="Edit Task"><Edit size={14}/></button>
                          <button onClick={() => handleDeleteTask(task._id)} className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors" title="Delete Task"><Trash2 size={14}/></button>
                        </div>
                        
                        {isAssignedToMe ? (
                          <button onClick={() => setUpdateModal({ isOpen: true, task, status: task.status, remark: '' })} className="flex items-center gap-1.5 text-xs font-bold bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors">
                            <Edit3 size={14} /> Update Progress
                          </button>
                        ) : (
                          <span className="text-[10px] font-medium text-slate-400">Locked to {task.assignedTo}</span>
                        )}
                      </div>
                    </div>

                    {task.remarks && task.remarks.length > 0 && (
                      <div className="mt-2 pt-3 border-t border-slate-100 bg-slate-50/50 p-3 rounded-xl space-y-2">
                        <p className="text-xs font-bold text-slate-500 flex items-center gap-1.5"><MessageSquare size={14}/> Progress Remarks:</p>
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                          {task.remarks.map((rmk, idx) => (
                            <div key={idx} className="bg-white border border-slate-200 p-2 rounded-lg text-xs">
                              <p className="font-semibold text-slate-800">{rmk.message}</p>
                              <div className="flex justify-between items-center mt-1 text-[10px] text-slate-400 font-medium">
                                <span>By: {rmk.employeeName}</span>
                                <span>{new Date(rmk.date).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="text-center py-12 text-slate-400 font-medium">No tasks found matching the filter.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DevTask;