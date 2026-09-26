import React, { useState, useEffect, useContext, useMemo } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import toast, { Toaster } from 'react-hot-toast';
import { 
  Users, Search, Plus, X, Briefcase, Mail, Phone, 
  IndianRupee, Calendar, CheckCircle2, Edit, AlertCircle, RefreshCw, 
  KeyRound, ShieldCheck, Trash2, AlertTriangle, Clock, CreditCard, Eye, UserMinus
} from 'lucide-react';

const EmployeeMaster = () => {
  const { user } = useContext(AuthContext);
  
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('Active'); 

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingEmployee, setViewingEmployee] = useState(null);

  const [resetPassModal, setResetPassModal] = useState({ open: false, employee: null });
  const [newPassword, setNewPassword] = useState('');

  const [deleteModal, setDeleteModal] = useState({ open: false, employee: null });

  const initialForm = {
    empId: '', 
    name: '', mobile: '', email: '', 
    password: '', role: 'Sales/Executive', 
    designation: '', department: '', 
    employmentType: 'Full Time', joiningDate: '', probationPeriod: '', confirmationDate: '',
    shiftStartTime: '09:30',
    salaryType: 'Salary', basic: 0, hra: 0, otherAllowance: 0,
    pan: '', uanEsi: '', 
    bankName: '', accountNo: '', ifscCode: '', upiId: '',
    status: 'Active', remarks: '',
    resignationDate: '', lastWorkingDate: '', noticePeriod: '', handoverStatus: 'Not Applicable', reasonForLeaving: ''
  };
  
  const [formData, setFormData] = useState(initialForm);

  const grossSalary = Number(formData.basic || 0) + Number(formData.hra || 0) + Number(formData.otherAllowance || 0);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${user.token}` };
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/hr/employees`, { headers });
      setEmployees(res.data || []);
    } catch (error) {
      toast.error("Failed to load employees");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [user.token]);

  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const matchesSearch = emp.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (emp.empId && emp.empId.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesStatus = statusFilter === 'All' || emp.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [employees, searchQuery, statusFilter]);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setLoading(true); 
      const headers = { Authorization: `Bearer ${user.token}` };
      
      const payload = {
        ...formData,
        role: formData.role,
        companyName: 'SkyEdge Taxbucket India', 
        salaryStructure: {
          basic: Number(formData.basic),
          hra: Number(formData.hra),
          otherAllowance: Number(formData.otherAllowance),
          gross: grossSalary
        }
      };

      if (editingId) {
        await axios.put(`${import.meta.env.VITE_API_URL}/hr/employees/${editingId}`, payload, { headers });
        toast.success("Employee Updated Successfully!");
      } else {
        if (formData.password.length < 6) return toast.error("Password must be at least 6 characters.");
        await axios.post(`${import.meta.env.VITE_API_URL}/hr/employees`, payload, { headers });
        toast.success("Employee & Portal Login Created!");
      }
      
      setIsModalOpen(false);
      fetchEmployees();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save employee");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (emp) => {
    setEditingId(emp._id);
    setFormData({
      empId: emp.empId || '', 
      name: emp.name || '', mobile: emp.mobile || '', email: emp.email || '',
      password: '',
      role: emp.userId?.role || emp.role || 'Sales/Executive', 
      designation: emp.designation || '', department: emp.department || '',
      employmentType: emp.employmentType || 'Full Time',
      joiningDate: emp.joiningDate ? emp.joiningDate.split('T')[0] : '',
      probationPeriod: emp.probationPeriod || '',
      confirmationDate: emp.confirmationDate ? emp.confirmationDate.split('T')[0] : '',
      shiftStartTime: emp.shiftStartTime || '09:30', 
      salaryType: emp.salaryType || 'Salary',
      basic: emp.salaryStructure?.basic || 0,
      hra: emp.salaryStructure?.hra || 0,
      otherAllowance: emp.salaryStructure?.otherAllowance || 0,
      pan: emp.pan || '', uanEsi: emp.uanEsi || '',
      bankName: emp.bankName || '', accountNo: emp.accountNo || '', ifscCode: emp.ifscCode || '', upiId: emp.upiId || '',
      status: emp.status || 'Active', remarks: emp.remarks || '',
      resignationDate: emp.resignationDate ? emp.resignationDate.split('T')[0] : '',
      lastWorkingDate: emp.lastWorkingDate ? emp.lastWorkingDate.split('T')[0] : '',
      noticePeriod: emp.noticePeriod || '',
      handoverStatus: emp.handoverStatus || 'Not Applicable',
      reasonForLeaving: emp.reasonForLeaving || ''
    });
    setIsModalOpen(true);
  };

  const openNewModal = () => {
    setEditingId(null);
    setFormData(initialForm);
    setIsModalOpen(true);
  };

  const handleView = (emp) => {
    setViewingEmployee(emp);
    setIsViewModalOpen(true);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${import.meta.env.VITE_API_URL}/hr/employees/${resetPassModal.employee._id}`, 
        { resetPassword: newPassword }, 
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      toast.success("Password reset successfully!");
      setResetPassModal({ open: false, employee: null });
      setNewPassword('');
    } catch (error) {
      toast.error(error.response?.data?.message || "Error resetting password");
    }
  };

  const confirmDelete = (emp) => {
    const isCurrentUser = emp.userId?._id === user._id || emp.email === user.email;
    if (isCurrentUser) {
      return toast.error("Admin cannot delete their own account.");
    }
    setDeleteModal({ open: true, employee: emp });
  };

  const executeDelete = async () => {
    try {
      const headers = { Authorization: `Bearer ${user.token}` };
      await axios.delete(`${import.meta.env.VITE_API_URL}/hr/employees/${deleteModal.employee._id}`, { headers });
      toast.success("Employee deleted permanently.");
      setDeleteModal({ open: false, employee: null });
      if (isViewModalOpen) setIsViewModalOpen(false); 
      fetchEmployees();
    } catch (error) {
      toast.error(error.response?.data?.message || "Error deleting employee");
    }
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'Active': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Notice Period': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Resigned': return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'Terminated': return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'Absconded': return 'bg-slate-700 text-white border-slate-900';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6 pb-12">
      <Toaster position="top-right" />

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <Users size={28} className="text-blue-600" /> Employee Master
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Manage HR details, portal access, and offboarding for your team.</p>
        </div>
        <button onClick={openNewModal} className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-5 py-2.5 rounded-xl shadow-md shadow-blue-500/20 transition-all">
          <Plus size={18} strokeWidth={2.5} /> Onboard New Employee
        </button>
      </div>

      {/* FILTERS */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50/50 flex flex-col md:flex-row gap-4 items-center justify-between border-b border-slate-100">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input type="text" placeholder="Search by Name or Emp ID..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-3.5 py-2 text-sm font-medium bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm" />
          </div>
          
          <div className="w-full md:w-auto">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full md:w-auto text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl px-4 py-2.5 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer">
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Notice Period">Notice Period</option>
              <option value="Resigned">Resigned</option>
              <option value="Terminated">Terminated</option>
              <option value="Absconded">Absconded (Left w/o Info)</option>
            </select>
          </div>
        </div>

        {/* EMPLOYEE LIST TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-500 text-[11px] font-black uppercase tracking-wider">
                <th className="py-4 px-5">Employee Info</th>
                <th className="py-4 px-5">Department & Role</th>
                <th className="py-4 px-5">Contact & Login</th>
                <th className="py-4 px-5">Gross Salary</th>
                <th className="py-4 px-5">Status & Exit Info</th>
                <th className="py-4 px-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr><td colSpan="6" className="text-center py-16 text-slate-400"><RefreshCw className="animate-spin inline-block mr-2" size={18}/> Loading Employees...</td></tr>
              ) : filteredEmployees.length === 0 ? (
                <tr><td colSpan="6" className="text-center py-16 text-slate-400 flex flex-col items-center"><AlertCircle size={36} className="mb-3 text-slate-300"/> No employees found.</td></tr>
              ) : (
                filteredEmployees.map((emp) => {
                  const isCurrentUser = emp.userId?._id === user._id || emp.email === user.email;
                  return (
                  <tr key={emp._id} className="hover:bg-slate-50/70 transition-colors group">
                    <td className="py-3 px-5">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-black text-sm shrink-0 border border-blue-200">
                          {emp.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 flex items-center gap-2">
                            {emp.name}
                            {isCurrentUser && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold uppercase">You</span>}
                          </p>
                          <p className="text-[10px] font-mono text-slate-500 bg-slate-100 inline-block px-1 rounded mt-0.5">{emp.empId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-5">
                      <p className="font-bold text-slate-700 text-xs">{emp.designation || 'N/A'}</p>
                      <p className="text-[11px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-100 inline-block mt-1">
                        {emp.userId?.role || emp.role || 'Sales/Executive'}
                      </p>
                    </td>

                    {/* 🔴 NAYA: HOVER TO UNBLUR CONTACT DETAILS */}
                    <td className="py-3 px-5">
                      <div className="group/blur cursor-pointer" title="Hover to view details">
                        <div className="blur-[5px] group-hover/blur:blur-none transition-all duration-300 select-none group-hover/blur:select-auto">
                          <p className="text-xs font-medium text-slate-700 flex items-center gap-1.5 mb-0.5"><Phone size={12} className="text-slate-400"/> {emp.mobile}</p>
                          {emp.email && <p className="text-[10px] font-bold text-blue-600 flex items-center gap-1.5 bg-blue-50 px-1 py-0.5 rounded border border-blue-100 inline-block"><Mail size={10}/> {emp.email}</p>}
                        </div>
                      </div>
                    </td>

                    {/* 🔴 NAYA: HOVER TO UNBLUR GROSS SALARY */}
                    <td className="py-3 px-5">
                      <div className="group/blur cursor-pointer inline-block" title="Hover to view salary">
                        <div className="blur-[5px] group-hover/blur:blur-none transition-all duration-300 select-none group-hover/blur:select-auto">
                          <p className="font-bold text-emerald-700 text-sm flex items-center gap-0.5">
                            <IndianRupee size={12}/> {(emp.salaryStructure?.gross || 0).toLocaleString('en-IN')}
                          </p>
                          <p className="text-[10px] text-slate-500">{emp.employmentType}</p>
                        </div>
                      </div>
                    </td>
                    
                    <td className="py-3 px-5">
                      <div className="flex flex-col items-start gap-1">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border ${getStatusBadge(emp.status)}`}>
                          {emp.status}
                        </span>
                        {emp.status === 'Notice Period' && emp.lastWorkingDate && (
                          <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100 mt-0.5">
                            Last Day: {new Date(emp.lastWorkingDate).toLocaleDateString('en-GB')}
                          </span>
                        )}
                        {(emp.status === 'Resigned' || emp.status === 'Terminated') && emp.lastWorkingDate && (
                          <span className="text-[9px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100 mt-0.5">
                            Left on: {new Date(emp.lastWorkingDate).toLocaleDateString('en-GB')}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handleView(emp)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent" title="View Profile">
                          <Eye size={16}/>
                        </button>
                        <button onClick={() => setResetPassModal({ open: true, employee: emp })} className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors border border-transparent" title="Reset Password">
                          <KeyRound size={16}/>
                        </button>
                        <button onClick={() => handleEdit(emp)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-transparent" title="Edit Employee">
                          <Edit size={16}/>
                        </button>
                        {!isCurrentUser ? (
                          <button onClick={() => confirmDelete(emp)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-transparent" title="Delete Employee">
                            <Trash2 size={16}/>
                          </button>
                        ) : (
                          <button disabled className="p-2 text-slate-200 cursor-not-allowed">
                            <Trash2 size={16}/>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* VIEW PROFILE MODAL */}
      {isViewModalOpen && viewingEmployee && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95">
            
            <div className="flex justify-between items-center px-8 py-5 border-b border-slate-100 bg-slate-50/80">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-black text-xl shadow-inner border border-blue-200">
                  {viewingEmployee.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800 tracking-tight">{viewingEmployee.name}</h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] font-mono font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">{viewingEmployee.empId}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider border ${getStatusBadge(viewingEmployee.status)}`}>
                      {viewingEmployee.status}
                    </span>
                  </div>
                </div>
              </div>
              <button onClick={() => setIsViewModalOpen(false)} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors"><X size={20} /></button>
            </div>

            <div className="overflow-y-auto p-8 space-y-6 custom-scrollbar bg-slate-50/30">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Contact & System */}
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                  <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-400 border-b border-slate-50 pb-2">Contact & System Access</h3>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Mobile Number</p>
                    <p className="text-sm font-semibold text-slate-800 flex items-center gap-2"><Phone size={14} className="text-blue-500"/> {viewingEmployee.mobile || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Official Email</p>
                    <p className="text-sm font-semibold text-slate-800 flex items-center gap-2"><Mail size={14} className="text-blue-500"/> {viewingEmployee.email || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">System Access Role</p>
                    <p className="text-sm font-bold text-indigo-700 bg-indigo-50 px-2 py-1 rounded border border-indigo-100 inline-block mt-1">
                      <ShieldCheck size={14} className="inline mr-1"/>
                      {viewingEmployee.userId?.role || viewingEmployee.role || 'Sales/Executive'}
                    </p>
                  </div>
                </div>

                {/* Job Details */}
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                  <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-400 border-b border-slate-50 pb-2">Job Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Designation</p>
                      <p className="text-sm font-semibold text-slate-800">{viewingEmployee.designation || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Department</p>
                      <p className="text-sm font-semibold text-slate-800">{viewingEmployee.department || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Shift Time</p>
                      <p className="text-sm font-bold text-purple-700 flex items-center gap-1"><Clock size={12}/> {viewingEmployee.shiftStartTime || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Employment</p>
                      <p className="text-sm font-semibold text-slate-800">{viewingEmployee.employmentType || 'N/A'}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Joining Date</p>
                      <p className="text-sm font-semibold text-slate-800">{viewingEmployee.joiningDate ? new Date(viewingEmployee.joiningDate).toLocaleDateString('en-IN') : 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* OFFBOARDING / EXIT DETAILS */}
                {viewingEmployee.status !== 'Active' && (
                  <div className="bg-rose-50/50 p-5 rounded-2xl border border-rose-100 shadow-sm space-y-4 md:col-span-2 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-rose-100/50 rounded-full blur-3xl -mr-10 -mt-10"></div>
                    <h3 className="text-[11px] font-bold uppercase tracking-widest text-rose-600 border-b border-rose-100 pb-2 relative z-10 flex items-center gap-1"><UserMinus size={14}/> Exit & Offboarding Details</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 relative z-10">
                      <div>
                        <p className="text-[10px] font-bold text-rose-500 uppercase">Resignation Date</p>
                        <p className="text-sm font-bold text-rose-900">{viewingEmployee.resignationDate ? new Date(viewingEmployee.resignationDate).toLocaleDateString('en-IN') : 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-rose-500 uppercase">Last Working Day</p>
                        <p className="text-sm font-bold text-rose-900">{viewingEmployee.lastWorkingDate ? new Date(viewingEmployee.lastWorkingDate).toLocaleDateString('en-IN') : 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-rose-500 uppercase">Notice Period</p>
                        <p className="text-sm font-bold text-rose-900">{viewingEmployee.noticePeriod || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-rose-500 uppercase">Handover Status</p>
                        <p className="text-sm font-bold text-rose-900">{viewingEmployee.handoverStatus || 'N/A'}</p>
                      </div>
                      <div className="md:col-span-4 mt-2 pt-2 border-t border-rose-100">
                        <p className="text-[10px] font-bold text-rose-500 uppercase">Reason for Leaving / Remarks</p>
                        <p className="text-sm font-medium text-rose-900 mt-1">{viewingEmployee.reasonForLeaving || 'No specific reason provided.'}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Salary Details */}
                <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm space-y-4 md:col-span-2 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full blur-3xl -mr-10 -mt-10"></div>
                  <h3 className="text-[11px] font-bold uppercase tracking-widest text-emerald-600 border-b border-emerald-50 pb-2 relative z-10 flex items-center gap-1"><IndianRupee size={14}/> Salary Structure</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 relative z-10">
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase">Salary Type</p>
                      <p className="text-sm font-bold text-slate-800">{viewingEmployee.salaryType || 'Salary'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase">Basic</p>
                      <p className="text-sm font-bold text-slate-800">₹ {(viewingEmployee.salaryStructure?.basic || 0).toLocaleString('en-IN')}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase">HRA</p>
                      <p className="text-sm font-bold text-slate-800">₹ {(viewingEmployee.salaryStructure?.hra || 0).toLocaleString('en-IN')}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase">Other Allowance</p>
                      <p className="text-sm font-bold text-slate-800">₹ {(viewingEmployee.salaryStructure?.otherAllowance || 0).toLocaleString('en-IN')}</p>
                    </div>
                    <div className="md:col-span-4 mt-2 pt-3 border-t border-emerald-100 flex justify-between items-center">
                      <span className="text-xs font-bold text-emerald-800 uppercase">Total Gross Salary</span>
                      <span className="text-xl font-black text-emerald-600">₹ {(viewingEmployee.salaryStructure?.gross || 0).toLocaleString('en-IN')} / month</span>
                    </div>
                  </div>
                </div>

                {/* Bank Details */}
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                  <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-400 border-b border-slate-50 pb-2 flex items-center gap-1"><CreditCard size={14}/> Bank Account</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Bank Name</p>
                      <p className="text-sm font-semibold text-slate-800">{viewingEmployee.bankName || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Account No</p>
                      <p className="text-sm font-mono font-semibold text-slate-800">{viewingEmployee.accountNo || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">IFSC Code</p>
                      <p className="text-sm font-mono font-semibold text-slate-800 uppercase">{viewingEmployee.ifscCode || 'N/A'}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">UPI ID</p>
                      <p className="text-sm font-semibold text-slate-800">{viewingEmployee.upiId || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* KYC Details */}
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                  <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-400 border-b border-slate-50 pb-2">KYC & Others</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">PAN Number</p>
                      <p className="text-sm font-mono font-bold text-slate-800 uppercase">{viewingEmployee.pan || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">UAN / ESI No.</p>
                      <p className="text-sm font-mono font-bold text-slate-800 uppercase">{viewingEmployee.uanEsi || 'N/A'}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Internal Remarks</p>
                      <p className="text-sm font-medium text-slate-600">{viewingEmployee.remarks || 'No remarks added.'}</p>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            <div className="flex justify-between items-center p-5 border-t border-slate-100 bg-white">
              <div>
                {!(viewingEmployee.userId?._id === user._id || viewingEmployee.email === user.email) ? (
                  <button onClick={() => { setIsViewModalOpen(false); confirmDelete(viewingEmployee); }} className="px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors border border-rose-200 flex items-center gap-2">
                    <Trash2 size={16} /> Delete Account
                  </button>
                ) : (
                  <span className="text-[10px] text-slate-400 italic">Cannot delete own account</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => setIsViewModalOpen(false)} className="px-6 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">Close</button>
                <button 
                  onClick={() => { setIsViewModalOpen(false); handleEdit(viewingEmployee); }} 
                  className="px-6 py-2.5 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center gap-2"
                >
                  <Edit size={16} /> Edit Details
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT EMPLOYEE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95">
            
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/80">
              <div>
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Users className="text-blue-600" size={20}/> {editingId ? 'Edit Employee Details' : 'Onboard New Employee'}
                </h2>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors"><X size={18} /></button>
            </div>

            <form onSubmit={handleSave} className="overflow-y-auto p-6 space-y-6 custom-scrollbar">
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                
                {/* Portal Login & Access Control */}
                <div className="md:col-span-4 bg-blue-50/40 p-5 rounded-2xl border border-blue-100">
                  <h3 className="text-xs font-bold text-blue-700 uppercase tracking-wider border-b border-blue-200/50 pb-2 mb-4 flex items-center gap-2">
                    <ShieldCheck size={14}/> Portal Login Credentials
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Company Emp ID *</label>
<input 
   type="text" 
   required 
   value={formData.empId} 
   onChange={(e) => setFormData({...formData, empId: e.target.value})} 
   placeholder="e.g. EMP-001" 
   className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-semibold bg-white focus:ring-2 focus:ring-blue-500/20 outline-none"
/>                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Official Email (Login ID) *</label>
                      <input type="email" required value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-semibold bg-white"/>
                    </div>
                    {!editingId && (
                      <div>
                        <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1 flex items-center gap-1"><KeyRound size={12}/> Initial Password *</label>
                        <input type="text" required minLength="6" placeholder="Set temporary password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-semibold bg-white"/>
                      </div>
                    )}
                    <div className={editingId ? "md:col-span-2" : ""}>
                      <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">System Access Role *</label>
                      <select required value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 bg-white">
                        <option value="Sales/Executive">Sales / Executive</option>
                        <option value="HR">HR</option>
                        <option value="Accountant">Accountant</option>
                        <option value="Manager">Manager</option>
                        <option value="Developer">Developer</option>
                        <option value="Admin">Admin (Full Access)</option>
                      </select>
                    </div>
                  </div>
                  {editingId && <p className="text-[10px] text-blue-500 mt-2 font-medium italic">* To reset password, use the Key icon in the employee table list.</p>}
                </div>

                {/* SECTION 1: Personal & Job Details */}
                <div className="md:col-span-4 mt-2">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b pb-2 mb-4 flex items-center gap-2"><Briefcase size={14}/> Job Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Full Name *</label>
                      <input type="text" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-semibold"/>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Mobile Number *</label>
                      <input type="text" required value={formData.mobile} onChange={(e) => setFormData({...formData, mobile: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-semibold"/>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Designation</label>
                      <input type="text" placeholder="e.g. Sr. Accountant" value={formData.designation} onChange={(e) => setFormData({...formData, designation: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-semibold"/>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Department</label>
                      <input type="text" placeholder="e.g. Accounts" value={formData.department} onChange={(e) => setFormData({...formData, department: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-semibold"/>
                    </div>
                    
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-purple-600 mb-1 flex items-center gap-1"><Clock size={12}/> Shift Time (In)</label>
                      <input type="time" value={formData.shiftStartTime} onChange={(e) => setFormData({...formData, shiftStartTime: e.target.value})} className="w-full p-2.5 border border-purple-200 bg-purple-50/50 rounded-xl text-sm font-bold text-purple-700"/>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Employment Type</label>
                      <select value={formData.employmentType} onChange={(e) => setFormData({...formData, employmentType: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-semibold">
                        <option value="Full Time">Full Time</option>
                        <option value="Part Time">Part Time</option>
                        <option value="Intern">Intern</option>
                        <option value="Freelancer">Freelancer</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1 flex items-center gap-1"><Calendar size={12}/> Joining Date</label>
                      <input type="date" value={formData.joiningDate} onChange={(e) => setFormData({...formData, joiningDate: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700"/>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Probation Period</label>
                      <input type="text" placeholder="e.g. 3 Months" value={formData.probationPeriod} onChange={(e) => setFormData({...formData, probationPeriod: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-semibold"/>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1 flex items-center gap-1"><Calendar size={12}/> Confirmation Date</label>
                      <input type="date" value={formData.confirmationDate} onChange={(e) => setFormData({...formData, confirmationDate: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700"/>
                    </div>
                  </div>
                </div>

                {/* SECTION 2: Salary Structure */}
                <div className="md:col-span-4 mt-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b pb-2 mb-4 flex items-center gap-2"><IndianRupee size={14}/> Current Salary Structure</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-5 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-emerald-700 mb-1">Salary Type</label>
                      <select value={formData.salaryType} onChange={(e) => setFormData({...formData, salaryType: e.target.value})} className="w-full p-2.5 border border-emerald-200 rounded-lg text-sm font-bold text-slate-700 shadow-sm">
                        <option value="Salary">Salary</option>
                        <option value="Stipend">Stipend</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-emerald-700 mb-1">Basic Salary (Monthly) *</label>
                      <input type="number" min="0" required value={formData.basic} onChange={(e) => setFormData({...formData, basic: e.target.value})} className="w-full p-2.5 border border-emerald-200 rounded-lg text-sm font-bold text-slate-700 shadow-sm"/>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-emerald-700 mb-1">HRA (Monthly)</label>
                      <input type="number" min="0" value={formData.hra} onChange={(e) => setFormData({...formData, hra: e.target.value})} className="w-full p-2.5 border border-emerald-200 rounded-lg text-sm font-bold text-slate-700 shadow-sm"/>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-emerald-700 mb-1">Other Allowance</label>
                      <input type="number" min="0" value={formData.otherAllowance} onChange={(e) => setFormData({...formData, otherAllowance: e.target.value})} className="w-full p-2.5 border border-emerald-200 rounded-lg text-sm font-bold text-slate-700 shadow-sm"/>
                    </div>
                    <div className="md:col-span-4 flex items-center justify-between border-t border-emerald-200 pt-3 mt-1">
                      <span className="text-xs font-bold text-emerald-800 uppercase">Auto Calculated Gross Salary:</span>
                      <span className="text-2xl font-black text-emerald-600 flex items-center"><IndianRupee size={20}/> {grossSalary.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>

                {/* BANK DETAILS */}
                <div className="md:col-span-4 mt-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b pb-2 mb-4 flex items-center gap-2"><CreditCard size={14}/> Bank Account Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-5 bg-slate-50/50 rounded-2xl border border-slate-200">
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Bank Name</label>
                      <input type="text" placeholder="e.g. HDFC Bank" value={formData.bankName} onChange={(e) => setFormData({...formData, bankName: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-semibold"/>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Account Number</label>
                      <input type="text" placeholder="Account No." value={formData.accountNo} onChange={(e) => setFormData({...formData, accountNo: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-mono font-semibold"/>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">IFSC Code</label>
                      <input type="text" placeholder="HDFC0001234" value={formData.ifscCode} onChange={(e) => setFormData({...formData, ifscCode: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-mono uppercase font-semibold"/>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">UPI ID</label>
                      <input type="text" placeholder="user@upi" value={formData.upiId} onChange={(e) => setFormData({...formData, upiId: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-semibold"/>
                    </div>
                  </div>
                </div>

                {/* SECTION 3: KYC, Status & Offboarding */}
                <div className="md:col-span-4 mt-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b pb-2 mb-4">KYC & Account Status</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">PAN Number</label>
                      <input type="text" value={formData.pan} onChange={(e) => setFormData({...formData, pan: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-semibold uppercase"/>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">UAN / ESI No.</label>
                      <input type="text" value={formData.uanEsi} onChange={(e) => setFormData({...formData, uanEsi: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-semibold uppercase"/>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Internal Remarks</label>
                      <input type="text" placeholder="General notes" value={formData.remarks} onChange={(e) => setFormData({...formData, remarks: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-semibold"/>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-rose-500 mb-1">Current Status</label>
                      <select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})} className="w-full p-2.5 border border-rose-200 bg-rose-50/50 rounded-xl text-sm font-bold text-rose-700 shadow-sm">
                        <option value="Active">Active</option>
                        <option value="Notice Period">Notice Period</option>
                        <option value="Resigned">Resigned</option>
                        <option value="Terminated">Terminated</option>
                        <option value="Absconded">Absconded (Left w/o Info)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* OFFBOARDING DETAILS (Shows only if status is not 'Active') */}
                {formData.status !== 'Active' && (
                  <div className="md:col-span-4 mt-2 animate-in fade-in slide-in-from-top-2">
                    <h3 className="text-xs font-bold text-rose-500 uppercase tracking-wider border-b border-rose-100 pb-2 mb-4 flex items-center gap-2">
                      <UserMinus size={14}/> Offboarding & Exit Details
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-5 bg-rose-50/30 rounded-2xl border border-rose-100">
                      <div>
                        <label className="block text-[11px] font-bold uppercase text-rose-600 mb-1">Resignation Date</label>
                        <input type="date" value={formData.resignationDate} onChange={(e) => setFormData({...formData, resignationDate: e.target.value})} className="w-full p-2.5 border border-rose-200 rounded-xl text-sm font-semibold text-rose-900 bg-white"/>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold uppercase text-rose-600 mb-1">Last Working Day</label>
                        <input type="date" value={formData.lastWorkingDate} onChange={(e) => setFormData({...formData, lastWorkingDate: e.target.value})} className="w-full p-2.5 border border-rose-200 rounded-xl text-sm font-semibold text-rose-900 bg-white"/>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold uppercase text-rose-600 mb-1">Notice Period</label>
                        <input type="text" placeholder="e.g. 30 Days" value={formData.noticePeriod} onChange={(e) => setFormData({...formData, noticePeriod: e.target.value})} className="w-full p-2.5 border border-rose-200 rounded-xl text-sm font-semibold text-rose-900 bg-white"/>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold uppercase text-rose-600 mb-1">Handover Status</label>
                        <select value={formData.handoverStatus} onChange={(e) => setFormData({...formData, handoverStatus: e.target.value})} className="w-full p-2.5 border border-rose-200 rounded-xl text-sm font-bold text-rose-900 bg-white">
                          <option value="Not Applicable">Not Applicable</option>
                          <option value="Pending">Pending</option>
                          <option value="Completed">Completed</option>
                        </select>
                      </div>
                      <div className="md:col-span-4">
                        <label className="block text-[11px] font-bold uppercase text-rose-600 mb-1">Reason For Leaving (Remarks) *</label>
                        <textarea rows="2" placeholder="Why did the employee leave? (Absconded, found better opportunity, performance issue, etc.)" value={formData.reasonForLeaving} onChange={(e) => setFormData({...formData, reasonForLeaving: e.target.value})} className="w-full p-2.5 border border-rose-200 rounded-xl text-sm font-semibold text-rose-900 bg-white resize-none"/>
                      </div>
                    </div>
                  </div>
                )}

              </div>

              <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">Cancel</button>
                <button type="submit" className="px-8 py-2.5 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center gap-2">
                  <CheckCircle2 size={18} /> {editingId ? 'Update Employee' : 'Onboard Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {resetPassModal.open && (
        <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl border border-slate-100 p-8 animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="h-16 w-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 mb-4"><KeyRound size={32}/></div>
              <h3 className="text-xl font-bold text-slate-800 tracking-tight">Reset Password</h3>
              <p className="text-sm font-medium text-slate-500 mt-1">For <span className="font-bold text-slate-700">{resetPassModal.employee?.name}</span></p>
            </div>
            
            <form onSubmit={handleResetPassword} className="space-y-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2 text-left">New Security Password</label>
                <input type="text" required minLength="6" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full text-sm font-bold border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" placeholder="Enter new password" />
              </div>
              <div className="flex justify-between gap-3 pt-2">
                <button type="button" onClick={() => setResetPassModal({ open: false, employee: null })} className="w-1/2 py-3 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all">Cancel</button>
                <button type="submit" className="w-1/2 py-3 text-sm font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-md transition-all active:scale-95">Update</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteModal.open && (
        <div className="fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 p-8 text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="mx-auto h-16 w-16 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100 mb-2">
              <AlertTriangle size={32} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800 tracking-tight">Delete Employee?</h3>
              <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                Are you sure you want to permanently delete <span className="font-bold text-slate-700">{deleteModal.employee?.name}</span>? This will also remove their portal login access immediately.
              </p>
            </div>
            <div className="flex justify-center gap-3 pt-4">
              <button onClick={() => setDeleteModal({ open: false, employee: null })} className="px-6 py-2.5 text-sm font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors">Cancel</button>
              <button onClick={executeDelete} className="px-6 py-2.5 text-sm font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-md shadow-rose-500/20 transition-all active:scale-95">Yes, Delete</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default EmployeeMaster;