import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { 
  Users, KeyRound, ShieldAlert, Power, PowerOff, 
  Trash2, Mail, ShieldCheck, X, CheckCircle2, 
  AlertTriangle, AlertCircle, SlidersHorizontal
} from 'lucide-react';

const Settings = () => {
  const { user } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('employees');
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // Modals State
  const [resetPassModal, setResetPassModal] = useState({ open: false, employee: null });
  const [deleteModal, setDeleteModal] = useState({ open: false, employee: null });
  const [newPassword, setNewPassword] = useState('');

  const [permModal, setPermModal] = useState({ open: false, employee: null, selectedPerms: [] });

  // 🔴 NAYA UPDATE: Added LEADS and GST to available modules
  const availableModules = [
    { id: 'LEADS', label: 'Leads & Prospects' },
    { id: 'GST_SCAN', label: 'GST Health Reports' },
    { id: 'HR', label: 'HR Ops (Employee, Attendance, Salary)' },
    { id: 'BAS', label: 'Business Associates' },
    { id: 'WORK', label: 'Work Management' },
    { id: 'INVOICE', label: 'Invoice Generator' }
  ];

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
  };

  const fetchEmployees = async () => {
    try {
      const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/users/employees`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setEmployees(data);
    } catch (error) {
      showToast("Error fetching employees.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
    // eslint-disable-next-line
  }, []);

  const handleToggleStatus = async (employee) => {
    if (employee._id === user._id) {
      return showToast("You cannot deactivate your own account.", "error");
    }
    try {
      const newStatus = employee.status === 'Active' ? 'Inactive' : 'Active';
      await axios.put(`${import.meta.env.VITE_API_URL}/users/${employee._id}/status`, { status: newStatus }, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      showToast(`Account is now ${newStatus}.`, "success");
      fetchEmployees();
    } catch (error) {
      showToast(error.response?.data?.message || "Error updating status", "error");
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${import.meta.env.VITE_API_URL}/users/${resetPassModal.employee._id}/reset-password`, 
        { newPassword }, 
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      showToast("Password reset successfully!", "success");
      setResetPassModal({ open: false, employee: null });
      setNewPassword('');
    } catch (error) {
      showToast(error.response?.data?.message || "Error resetting password", "error");
    }
  };

  const confirmDelete = (employee) => {
    if (employee._id === user._id) {
      return showToast("Admin cannot delete their own account.", "error");
    }
    setDeleteModal({ open: true, employee });
  };

  const executeDelete = async () => {
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/users/${deleteModal.employee._id}`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      showToast("Employee deleted permanently.", "success");
      setDeleteModal({ open: false, employee: null });
      fetchEmployees();
    } catch (error) {
      showToast(error.response?.data?.message || "Error deleting employee", "error");
    }
  };

  const openPermissionModal = (emp) => {
    if (emp.role === 'Admin') {
      return showToast("Admin already has full access to all modules.", "error");
    }
    setPermModal({ 
      open: true, 
      employee: emp, 
      selectedPerms: emp.permissions || [] 
    });
  };

  const handlePermToggle = (permId) => {
    const isSelected = permModal.selectedPerms.includes(permId);
    if (isSelected) {
      setPermModal({ ...permModal, selectedPerms: permModal.selectedPerms.filter(id => id !== permId) });
    } else {
      setPermModal({ ...permModal, selectedPerms: [...permModal.selectedPerms, permId] });
    }
  };

  const handleSavePermissions = async () => {
    try {
      await axios.put(`${import.meta.env.VITE_API_URL}/users/${permModal.employee._id}/permissions`, { 
        permissions: permModal.selectedPerms 
      }, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      showToast("Access permissions updated successfully!", "success");
      setPermModal({ open: false, employee: null, selectedPerms: [] });
      fetchEmployees();
    } catch (error) {
      showToast(error.response?.data?.message || "Error updating permissions", "error");
    }
  };

  if (user?.role !== 'Admin') {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <ShieldAlert size={48} className="text-rose-500 mb-4" />
        <h2 className="text-xl font-bold text-slate-800">Unauthorized Access</h2>
        <p className="text-sm text-slate-500 mt-2">Only Administrators can view system settings.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 relative">
      
      <div className={`fixed bottom-6 right-6 z-[100] transition-all duration-300 ease-in-out transform ${toast.show ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'}`}>
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border ${toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
          {toast.type === 'success' ? <CheckCircle2 size={20} className="text-emerald-500" /> : <AlertCircle size={20} className="text-rose-500" />}
          <p className="text-sm font-semibold">{toast.message}</p>
          <button onClick={() => setToast({ ...toast, show: false })} className="ml-2 text-slate-400 hover:text-slate-600"><X size={16}/></button>
        </div>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">System Settings</h1>
        <p className="text-sm text-slate-500 mt-1">Manage portal configurations, access levels, and employee accounts.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        <div className="w-full md:w-64 shrink-0 space-y-2">
          <button 
            onClick={() => setActiveTab('employees')}
            className={`w-full flex items-center gap-3 px-4 py-3.5 text-sm font-bold rounded-xl transition-all ${activeTab === 'employees' ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
          >
            <ShieldCheck size={18} /> Access Control
          </button>
        </div>

        <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 min-h-[500px]">
          {activeTab === 'employees' && (
            <div className="animate-in fade-in duration-300">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-800">Module Access Control</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Control which modules each employee can view in their sidebar.</p>
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                      <th className="py-4 px-5">EMP ID</th>
                      <th className="py-4 px-5">Employee Details</th>
                      <th className="py-4 px-5">Access Role</th>
                      <th className="py-4 px-5">Status</th>
                      <th className="py-4 px-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {loading ? (
                      <tr><td colSpan="5" className="text-center py-12 text-slate-400">Loading accounts...</td></tr>
                    ) : employees.length === 0 ? (
                      <tr><td colSpan="5" className="text-center py-12 text-slate-400">No employee accounts found.</td></tr>
                    ) : (
                      employees.map((emp) => {
                        const isCurrentUser = emp._id === user._id;
                        const isAdmin = emp.role === 'Admin';
                        return (
                          <tr key={emp._id} className={`hover:bg-slate-50 transition-colors ${emp.status === 'Inactive' ? 'opacity-60 bg-slate-50/50' : ''}`}>
                            <td className="py-4 px-5 font-mono text-xs font-bold text-blue-600">{emp.empId || 'EMP---'}</td>
                            <td className="py-4 px-5">
                              <div className="font-bold text-slate-800 flex items-center gap-2">
                                {emp.name} 
                                {isCurrentUser && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold uppercase">You</span>}
                              </div>
                              <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-1"><Mail size={12} className="text-slate-400"/> {emp.email}</div>
                            </td>
                            <td className="py-4 px-5">
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md border border-slate-200">
                                <ShieldCheck size={12} className="text-slate-400"/> {emp.role}
                              </span>
                            </td>
                            <td className="py-4 px-5">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${emp.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                                {emp.status === 'Active' ? <CheckCircle2 size={12}/> : <PowerOff size={12}/>} 
                                {emp.status}
                              </span>
                            </td>
                            <td className="py-4 px-5 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button 
                                  onClick={() => openPermissionModal(emp)} 
                                  className={`p-2 rounded-lg transition-colors border border-transparent ${isAdmin ? 'text-slate-300 cursor-not-allowed' : 'text-blue-600 hover:bg-blue-50'}`} 
                                  title={isAdmin ? "Admin has all permissions" : "Manage Access"}
                                >
                                  <SlidersHorizontal size={16} />
                                </button>
                                
                                <button onClick={() => setResetPassModal({ open: true, employee: emp })} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Reset Password">
                                  <KeyRound size={16} />
                                </button>
                                
                                {!isCurrentUser ? (
                                  <>
                                    <button onClick={() => handleToggleStatus(emp)} className={`p-2 rounded-lg transition-colors ${emp.status === 'Active' ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50' : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'}`} title={emp.status === 'Active' ? 'Deactivate Account' : 'Re-activate Account'}>
                                      <Power size={16} />
                                    </button>
                                    <button onClick={() => confirmDelete(emp)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Delete Account">
                                      <Trash2 size={16} />
                                    </button>
                                  </>
                                ) : (
                                  <div className="flex gap-1.5 opacity-30 cursor-not-allowed">
                                    <span className="p-2 text-slate-400"><Power size={16} /></span>
                                    <span className="p-2 text-slate-400"><Trash2 size={16} /></span>
                                  </div>
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
          )}
        </div>
      </div>

      {/* --- MODALS BELOW --- */}

      {permModal.open && (
        <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-slate-50 border-b border-slate-100 p-6 pb-4">
              <div className="flex items-center gap-3 mb-1">
                <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center border border-blue-200"><SlidersHorizontal size={20}/></div>
                <div>
                  <h3 className="text-base font-bold text-slate-800 tracking-tight">Access Control</h3>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">{permModal.employee?.name}</p>
                </div>
              </div>
            </div>
            
            <div className="p-6 space-y-3">
              <p className="text-xs text-slate-500 mb-2">Select which modules this employee can see in their sidebar menu:</p>
              {availableModules.map(mod => (
                <label key={mod.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${permModal.selectedPerms.includes(mod.id) ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                  <input 
                    type="checkbox" 
                    checked={permModal.selectedPerms.includes(mod.id)} 
                    onChange={() => handlePermToggle(mod.id)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className={`text-sm font-semibold ${permModal.selectedPerms.includes(mod.id) ? 'text-blue-800' : 'text-slate-700'}`}>{mod.label}</span>
                </label>
              ))}
            </div>

            <div className="flex justify-end gap-2 p-5 bg-slate-50 border-t border-slate-100">
              <button type="button" onClick={() => setPermModal({ open: false, employee: null, selectedPerms: [] })} className="px-5 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-all">Cancel</button>
              <button type="button" onClick={handleSavePermissions} className="px-6 py-2 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md shadow-blue-500/20 transition-all active:scale-95">Save Changes</button>
            </div>
          </div>
        </div>
      )}

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

      {deleteModal.open && (
        <div className="fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 p-8 text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
             <div className="mx-auto h-16 w-16 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100 mb-2">
               <AlertTriangle size={32} />
             </div>
             <div>
               <h3 className="text-xl font-bold text-slate-800 tracking-tight">Delete Employee?</h3>
               <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                 Are you sure you want to permanently delete <span className="font-bold text-slate-700">{deleteModal.employee?.name}</span>?
               </p>
             </div>
             <div className="flex justify-center gap-3 pt-4">
               <button onClick={() => setDeleteModal({ open: false, employee: null })} className="px-6 py-2.5 text-sm font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors">Cancel</button>
               <button onClick={executeDelete} className="px-6 py-2.5 text-sm font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-md shadow-rose-500/20 transition-all active:scale-95">Yes, Delete</button>
             </div>
           </div>
        </div>
      )}

    </div>
  );
};

export default Settings;