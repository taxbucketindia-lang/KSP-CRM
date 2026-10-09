import React, { useState, useEffect, useContext, useMemo } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { isCeoRole } from '../utils/roles';
import { PERMISSION_CATALOG, ALL_PERMISSION_ITEMS, ALL_PERMISSION_KEYS } from '../utils/permissions';
import {
  ShieldCheck, KeyRound, Trash2, Power, PowerOff, X, CheckCircle2, AlertCircle, AlertTriangle,
  Mail, SlidersHorizontal, Search, Crown, UserCog, UserMinus, Info, Zap, Users, Layers, RefreshCw, Save
} from 'lucide-react';

// 🔴 ACCESS CONTROL
//   CEO   : Admin banata / hatata hai aur tay karta hai Admin ko kaunse rights milenge.
//   Admin : employees ko wahi rights de sakta hai jo khud ke paas hain (kaunsa tab dikhe + khaas kaam jaise "Assign Tasks").
const EMPLOYEE_ROLES = ['Manager', 'Sales/Executive', 'Accounts', 'Accountant', 'HR', 'Developer'];
const ACTION_KEYS = ALL_PERMISSION_ITEMS.filter(item => item.action).map(item => item.key);

const Settings = () => {
  const { user, refreshUser } = useContext(AuthContext);
  const isCeo = isCeoRole(user?.role);
  const headers = { Authorization: `Bearer ${user.token}` };

  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');

  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [accessModal, setAccessModal] = useState(null);   // { person, selected: [], fullAccess }
  const [roleModal, setRoleModal] = useState(null);       // { person, makeAdmin, role }
  const [resetPassModal, setResetPassModal] = useState({ open: false, employee: null });
  const [deleteModal, setDeleteModal] = useState({ open: false, employee: null });
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);

  // Main jo rights de sakta hoon: CEO sab, Admin sirf apne
  const myKeys = useMemo(() => (isCeo ? ALL_PERMISSION_KEYS : (user?.permissions || [])), [isCeo, user?.permissions]);

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
  };
  const fail = (error, fallback) => showToast(error.response?.data?.message || fallback, 'error');

  const fetchPeople = async () => {
    try {
      const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/users/employees`, { headers });
      setPeople(Array.isArray(data) ? data : []);
    } catch (error) {
      fail(error, 'Error fetching accounts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPeople();
    // eslint-disable-next-line
  }, []);

  const rightsOf = (person) => person.effectivePermissions || [];
  const isFullAccess = (person) => person.role === 'CEO' || (person.role === 'Admin' && person.fullAccess !== false);
  const isSelf = (person) => person._id === user._id;
  // CEO sabko manage karta hai (khud ko chhod kar); Admin sirf employees ko
  const canManage = (person) => !isSelf(person) && person.role !== 'CEO' && (isCeo || person.role !== 'Admin');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const order = { CEO: 0, Admin: 1 };
    return people
      .filter(p => roleFilter === 'All' || (roleFilter === 'Employees' ? !['CEO', 'Admin'].includes(p.role) : p.role === roleFilter))
      .filter(p => !q || `${p.name} ${p.email} ${p.empId || ''} ${p.role}`.toLowerCase().includes(q))
      .sort((a, b) => (order[a.role] ?? 2) - (order[b.role] ?? 2) || a.name.localeCompare(b.name));
  }, [people, search, roleFilter]);

  const stats = useMemo(() => ({
    admins: people.filter(p => p.role === 'Admin').length,
    employees: people.filter(p => !['CEO', 'Admin'].includes(p.role)).length,
    assigners: people.filter(p => p.role !== 'CEO' && rightsOf(p).includes('WORK_ASSIGN')).length,
    inactive: people.filter(p => p.status === 'Inactive').length
  }), [people]);

  // ================= ACCESS RIGHTS =================
  const openAccess = (person) => setAccessModal({ person, selected: [...rightsOf(person)], fullAccess: person.role === 'Admin' && person.fullAccess !== false });

  const toggleKey = (key) => setAccessModal(prev => {
    const item = ALL_PERMISSION_ITEMS.find(i => i.key === key);
    let selected = prev.selected.includes(key) ? prev.selected.filter(k => k !== key) : [...prev.selected, key];
    // "Assign Tasks" jaisa khaas kaam apne tab ke bina nahi chal sakta
    if (item?.parent && selected.includes(key) && !selected.includes(item.parent)) selected.push(item.parent);
    if (!selected.includes(key)) selected = selected.filter(k => ALL_PERMISSION_ITEMS.find(i => i.key === k)?.parent !== key);
    return { ...prev, selected, fullAccess: false };
  });

  const toggleGroup = (group) => setAccessModal(prev => {
    const keys = group.items.map(i => i.key).filter(k => myKeys.includes(k));
    const allOn = keys.every(k => prev.selected.includes(k));
    const selected = allOn ? prev.selected.filter(k => !keys.includes(k)) : [...new Set([...prev.selected, ...keys])];
    return { ...prev, selected, fullAccess: false };
  });

  const saveAccess = async () => {
    setSaving(true);
    try {
      const { person, selected, fullAccess } = accessModal;
      await axios.put(`${import.meta.env.VITE_API_URL}/users/${person._id}/permissions`,
        { permissions: fullAccess ? ALL_PERMISSION_KEYS : selected, fullAccess }, { headers });
      showToast(`Access rights of ${person.name} updated.`);
      setAccessModal(null);
      fetchPeople();
      refreshUser();
    } catch (error) {
      fail(error, 'Error updating access rights');
    } finally {
      setSaving(false);
    }
  };

  // ================= ROLE (Admin banana / hatana: sirf CEO) =================
  const saveRole = async () => {
    setSaving(true);
    try {
      const { person, makeAdmin, role } = roleModal;
      const { data } = await axios.put(`${import.meta.env.VITE_API_URL}/users/${person._id}/role`, { role: makeAdmin ? 'Admin' : role }, { headers });
      showToast(data.message);
      setRoleModal(null);
      await fetchPeople();
      // Naya Admin bana: turant uske rights tay karne ki screen
      if (makeAdmin && data.user) openAccess(data.user);
    } catch (error) {
      fail(error, 'Error changing role');
    } finally {
      setSaving(false);
    }
  };

  // ================= STATUS / PASSWORD / DELETE =================
  const handleToggleStatus = async (employee) => {
    try {
      const newStatus = employee.status === 'Active' ? 'Inactive' : 'Active';
      await axios.put(`${import.meta.env.VITE_API_URL}/users/${employee._id}/status`, { status: newStatus }, { headers });
      showToast(`Account is now ${newStatus}.`);
      fetchPeople();
    } catch (error) {
      fail(error, 'Error updating status');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${import.meta.env.VITE_API_URL}/users/${resetPassModal.employee._id}/reset-password`, { newPassword }, { headers });
      showToast('Password reset successfully!');
      setResetPassModal({ open: false, employee: null });
      setNewPassword('');
    } catch (error) {
      fail(error, 'Error resetting password');
    }
  };

  const executeDelete = async () => {
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/users/${deleteModal.employee._id}`, { headers });
      showToast('Account deleted permanently.');
      setDeleteModal({ open: false, employee: null });
      fetchPeople();
    } catch (error) {
      fail(error, 'Error deleting account');
    }
  };

  const roleChip = (role) => role === 'CEO' ? 'bg-amber-50 text-amber-700 border-amber-200'
    : role === 'Admin' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-slate-100 text-slate-700 border-slate-200';

  return (
    <div className="max-w-7xl mx-auto space-y-6 relative pb-12">

      {/* TOAST */}
      <div className={`fixed bottom-6 right-6 z-[100] transition-all duration-300 ease-in-out transform ${toast.show ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'}`}>
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border ${toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
          {toast.type === 'success' ? <CheckCircle2 size={20} className="text-emerald-500" /> : <AlertCircle size={20} className="text-rose-500" />}
          <p className="text-sm font-semibold">{toast.message}</p>
          <button onClick={() => setToast({ ...toast, show: false })} className="ml-2 text-slate-400 hover:text-slate-600"><X size={16}/></button>
        </div>
      </div>

      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
          <ShieldCheck size={28} className="text-indigo-600" /> Access Control
        </h1>
        <p className="text-sm text-slate-500 mt-1 font-medium">Decide who can see which tab and who can do which special work.</p>
      </div>

      {/* HOW IT WORKS */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex items-start gap-3 text-xs font-semibold text-indigo-800">
        <Info size={16} className="shrink-0 mt-0.5"/>
        <div className="space-y-1">
          <p><span className="font-black">CEO</span> makes / removes Admins and decides which rights each Admin gets.</p>
          <p><span className="font-black">Admin</span> can give any of their own rights to employees: which tabs they see, and special rights like <span className="font-black">Assign &amp; Manage Tasks</span>.</p>
          <p>{isCeo ? 'You are the CEO: you can manage Admins and employees.' : 'You are an Admin: you can manage employees. You can only give rights that the CEO has given to you.'}</p>
        </div>
      </div>

      {/* SUMMARY */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {isCeo && (
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-indigo-500">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1"><UserCog size={12}/> Admins</p>
            <h3 className="text-2xl font-black text-indigo-600 mt-1">{stats.admins}</h3>
          </div>
        )}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-blue-500">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1"><Users size={12}/> Employees</p>
          <h3 className="text-2xl font-black text-blue-600 mt-1">{stats.employees}</h3>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-emerald-500">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1"><Zap size={12}/> Can Assign Tasks</p>
          <h3 className="text-2xl font-black text-emerald-600 mt-1">{stats.assigners}</h3>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-rose-500">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1"><PowerOff size={12}/> Inactive Accounts</p>
          <h3 className="text-2xl font-black text-rose-600 mt-1">{stats.inactive}</h3>
        </div>
      </div>

      {/* LIST */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center gap-3">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input type="text" placeholder="Search name, email, ID or role..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-3.5 py-2 text-sm font-medium bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-sm" />
          </div>
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer shadow-sm">
            <option value="All">All Accounts</option>
            {isCeo && <option value="Admin">Admins</option>}
            <option value="Employees">Employees</option>
            {EMPLOYEE_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <span className="md:ml-auto text-xs font-bold text-slate-400">{filtered.length} account(s)</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-white border-b border-slate-200 text-slate-500 text-[11px] font-black uppercase tracking-wider">
                <th className="py-4 px-5">Account</th>
                <th className="py-4 px-5">Role</th>
                <th className="py-4 px-5">Access Given</th>
                <th className="py-4 px-5">Status</th>
                <th className="py-4 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr><td colSpan="5" className="text-center py-16 text-slate-400"><RefreshCw className="animate-spin inline-block mr-2" size={18}/> Loading accounts...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan="5" className="text-center py-16 text-slate-400">No accounts found.</td></tr>
              ) : filtered.map(person => {
                const rights = rightsOf(person);
                const tabCount = rights.filter(k => !ACTION_KEYS.includes(k)).length;
                const actions = ALL_PERMISSION_ITEMS.filter(i => i.action && rights.includes(i.key));
                const manageable = canManage(person);

                return (
                  <tr key={person._id} className={`hover:bg-slate-50 transition-colors ${person.status === 'Inactive' ? 'opacity-60 bg-slate-50/50' : ''}`}>
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <div className={`h-9 w-9 rounded-full flex items-center justify-center font-black text-sm shrink-0 ${person.role === 'CEO' ? 'bg-amber-100 text-amber-700' : person.role === 'Admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
                          {person.role === 'CEO' ? <Crown size={16}/> : person.name?.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800 flex items-center gap-2">
                            {person.name}
                            {isSelf(person) && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold uppercase">You</span>}
                          </p>
                          <p className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5 truncate"><Mail size={11} className="text-slate-400 shrink-0"/> {person.email} <span className="font-mono text-blue-600">{person.empId ? `· ${person.empId}` : ''}</span></p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-5">
                      <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-md border ${roleChip(person.role)}`}>
                        {person.role === 'CEO' ? <Crown size={12}/> : <ShieldCheck size={12}/>} {person.role}
                      </span>
                    </td>
                    <td className="py-4 px-5">
                      {isFullAccess(person) ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-md"><CheckCircle2 size={12}/> Full access</span>
                      ) : (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-md border ${tabCount ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}><Layers size={12}/> {tabCount} tab{tabCount === 1 ? '' : 's'}</span>
                          {actions.map(a => <span key={a.key} className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-1 rounded-md"><Zap size={11}/> {a.label}</span>)}
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-5">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${person.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                        {person.status === 'Active' ? <CheckCircle2 size={12}/> : <PowerOff size={12}/>} {person.status}
                      </span>
                    </td>
                    <td className="py-4 px-5">
                      <div className="flex items-center justify-end gap-1.5">
                        {manageable ? (
                          <>
                            <button onClick={() => openAccess(person)} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-600 hover:text-white rounded-lg transition-all border border-indigo-200" title="Choose tabs and special rights">
                              <SlidersHorizontal size={14}/> Manage Access
                            </button>
                            {isCeo && (person.role === 'Admin' ? (
                              <button onClick={() => setRoleModal({ person, makeAdmin: false, role: 'Manager' })} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Remove Admin (make employee)"><UserMinus size={16}/></button>
                            ) : (
                              <button onClick={() => setRoleModal({ person, makeAdmin: true, role: 'Admin' })} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Make Admin"><UserCog size={16}/></button>
                            ))}
                            <button onClick={() => setResetPassModal({ open: true, employee: person })} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Reset Password"><KeyRound size={16}/></button>
                            <button onClick={() => handleToggleStatus(person)} className={`p-2 rounded-lg transition-colors text-slate-400 ${person.status === 'Active' ? 'hover:text-amber-600 hover:bg-amber-50' : 'hover:text-emerald-600 hover:bg-emerald-50'}`} title={person.status === 'Active' ? 'Deactivate Account' : 'Re-activate Account'}><Power size={16}/></button>
                            <button onClick={() => setDeleteModal({ open: true, employee: person })} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Delete Account"><Trash2 size={16}/></button>
                          </>
                        ) : isSelf(person) ? (
                          <button onClick={() => setResetPassModal({ open: true, employee: person })} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg" title="Change my password"><KeyRound size={14}/> My Password</button>
                        ) : (
                          <span className="text-[11px] font-semibold text-slate-400">Managed by CEO</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============================ MODAL: MANAGE ACCESS ============================ */}
      {accessModal && (() => {
        const { person, selected, fullAccess } = accessModal;
        const targetIsAdmin = person.role === 'Admin';
        const tabsOn = selected.filter(k => !ACTION_KEYS.includes(k)).length;

        return (
          <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl border border-slate-100 flex flex-col max-h-[92vh] overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center border border-indigo-200 shrink-0"><SlidersHorizontal size={20}/></div>
                  <div className="min-w-0">
                    <h3 className="text-base font-bold text-slate-800 tracking-tight truncate">Access Rights · {person.name}</h3>
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">{person.role} · {fullAccess ? 'Full access' : `${tabsOn} tab(s) selected`}</p>
                  </div>
                </div>
                <button onClick={() => setAccessModal(null)} className="p-2 rounded-xl text-slate-400 hover:bg-slate-200/50"><X size={18}/></button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-5">
                {/* CEO -> Admin: poora access ek click me */}
                {targetIsAdmin && isCeo && (
                  <label className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${fullAccess ? 'bg-emerald-50 border-emerald-300' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                    <input type="checkbox" checked={fullAccess} onChange={(e) => setAccessModal({ ...accessModal, fullAccess: e.target.checked, selected: e.target.checked ? [...ALL_PERMISSION_KEYS] : selected })} className="w-4 h-4 mt-0.5 text-emerald-600 rounded" />
                    <div>
                      <p className="text-sm font-black text-slate-800">Full access (all tabs and all rights)</p>
                      <p className="text-[11px] font-medium text-slate-500">This Admin gets everything, including tabs added in future. Untick to choose specific rights below.</p>
                    </div>
                  </label>
                )}

                {PERMISSION_CATALOG.map(group => {
                  // Admin ko wahi rights dikhte hain jo wo de sakta hai (ya jo is employee ke paas pehle se hain)
                  const items = group.items.filter(item => myKeys.includes(item.key) || selected.includes(item.key));
                  if (items.length === 0) return null;
                  const grantable = items.filter(item => myKeys.includes(item.key));
                  const allOn = grantable.length > 0 && grantable.every(item => selected.includes(item.key));

                  return (
                    <div key={group.group} className={`rounded-2xl border border-slate-200 overflow-hidden ${fullAccess ? 'opacity-60' : ''}`}>
                      <div className="flex items-center justify-between bg-slate-50 px-4 py-2.5 border-b border-slate-200">
                        <p className="text-xs font-black uppercase tracking-wider text-slate-600">{group.group}</p>
                        {grantable.length > 0 && (
                          <button type="button" disabled={fullAccess} onClick={() => toggleGroup(group)} className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 disabled:text-slate-400">
                            {allOn ? 'Remove all' : 'Select all'}
                          </button>
                        )}
                      </div>
                      <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {items.map(item => {
                          const checked = selected.includes(item.key);
                          const locked = !myKeys.includes(item.key); // yeh right mere paas nahi (CEO ne diya tha)
                          return (
                            <label key={item.key} className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${item.action ? 'sm:col-span-2' : ''} ${locked || fullAccess ? 'cursor-not-allowed' : 'cursor-pointer'} ${checked ? (item.action ? 'bg-amber-50 border-amber-300' : 'bg-indigo-50 border-indigo-200') : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                              <input type="checkbox" checked={checked} disabled={locked || fullAccess} onChange={() => toggleKey(item.key)} className="w-4 h-4 mt-0.5 text-indigo-600 rounded focus:ring-indigo-500" />
                              <div className="min-w-0">
                                <p className={`text-sm font-bold flex flex-wrap items-center gap-2 ${checked ? 'text-slate-900' : 'text-slate-700'}`}>
                                  {item.action && <Zap size={13} className="text-amber-500"/>}
                                  {item.label}
                                  {item.action && <span className="text-[9px] font-black uppercase bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">Special right</span>}
                                  {locked && <span className="text-[9px] font-black uppercase bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded">Given by CEO</span>}
                                </p>
                                {item.hint && <p className="text-[11px] font-medium text-slate-500 mt-0.5">{item.hint}</p>}
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {!isCeo && myKeys.length < ALL_PERMISSION_KEYS.length && (
                  <p className="text-[11px] font-semibold text-slate-500 flex items-start gap-2"><Info size={13} className="shrink-0 mt-0.5"/> You only see the rights that the CEO has given to you. To give a right that is missing here, ask the CEO to give it to you first.</p>
                )}
              </div>

              <div className="flex items-center justify-between gap-2 px-6 py-4 bg-slate-50 border-t border-slate-100 shrink-0">
                <p className="text-[11px] font-semibold text-slate-500">Dashboard, My Portal and Success List are always available to every employee.</p>
                <div className="flex gap-2 shrink-0">
                  <button type="button" onClick={() => setAccessModal(null)} className="px-5 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-all">Cancel</button>
                  <button type="button" disabled={saving} onClick={saveAccess} className="px-6 py-2 text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md disabled:opacity-50 inline-flex items-center gap-2">
                    {saving ? <RefreshCw size={15} className="animate-spin"/> : <Save size={15}/>} Save Access
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ============================ MODAL: MAKE / REMOVE ADMIN (CEO) ============================ */}
      {roleModal && (
        <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 p-8 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center">
              <div className={`h-16 w-16 rounded-full flex items-center justify-center border mb-4 ${roleModal.makeAdmin ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                {roleModal.makeAdmin ? <UserCog size={32}/> : <UserMinus size={32}/>}
              </div>
              <h3 className="text-xl font-bold text-slate-800 tracking-tight">{roleModal.makeAdmin ? 'Make Admin?' : 'Remove Admin?'}</h3>
              <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                {roleModal.makeAdmin
                  ? <><span className="font-bold text-slate-700">{roleModal.person.name}</span> will become an Admin. Next, you choose which rights this Admin gets. They can then pass those rights to employees.</>
                  : <><span className="font-bold text-slate-700">{roleModal.person.name}</span> will no longer be an Admin and cannot manage anyone's access.</>}
              </p>
            </div>

            {!roleModal.makeAdmin && (
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">New role</label>
                <select value={roleModal.role} onChange={(e) => setRoleModal({ ...roleModal, role: e.target.value })} className="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold bg-white">
                  {EMPLOYEE_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            )}

            <div className="flex justify-center gap-3 pt-2">
              <button onClick={() => setRoleModal(null)} className="px-6 py-2.5 text-sm font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl">Cancel</button>
              <button disabled={saving} onClick={saveRole} className={`px-6 py-2.5 text-sm font-semibold text-white rounded-xl shadow-md disabled:opacity-50 ${roleModal.makeAdmin ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-rose-600 hover:bg-rose-700'}`}>
                {roleModal.makeAdmin ? 'Yes, Make Admin' : 'Yes, Remove Admin'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================ MODAL: RESET PASSWORD ============================ */}
      {resetPassModal.open && (
        <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl border border-slate-100 p-8 animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="h-16 w-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 mb-4"><KeyRound size={32}/></div>
              <h3 className="text-xl font-bold text-slate-800 tracking-tight">Reset Password</h3>
              <p className="text-sm font-medium text-slate-500 mt-1">For <span className="font-bold text-slate-700">{resetPassModal.employee?.name}</span></p>
            </div>
            <form onSubmit={handleResetPassword} className="space-y-6">
              <input type="text" required minLength="6" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full text-sm font-bold border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" placeholder="Enter new password (min 6 characters)" />
              <div className="flex justify-between gap-3 pt-2">
                <button type="button" onClick={() => { setResetPassModal({ open: false, employee: null }); setNewPassword(''); }} className="w-1/2 py-3 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl">Cancel</button>
                <button type="submit" className="w-1/2 py-3 text-sm font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-md">Update</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================ MODAL: DELETE ============================ */}
      {deleteModal.open && (
        <div className="fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 p-8 text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="mx-auto h-16 w-16 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100 mb-2"><AlertTriangle size={32} /></div>
            <div>
              <h3 className="text-xl font-bold text-slate-800 tracking-tight">Delete Account?</h3>
              <p className="text-sm text-slate-500 mt-2 leading-relaxed">Are you sure you want to permanently delete the login of <span className="font-bold text-slate-700">{deleteModal.employee?.name}</span>? To only stop their access, use Deactivate instead.</p>
            </div>
            <div className="flex justify-center gap-3 pt-4">
              <button onClick={() => setDeleteModal({ open: false, employee: null })} className="px-6 py-2.5 text-sm font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl">Cancel</button>
              <button onClick={executeDelete} className="px-6 py-2.5 text-sm font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-md">Yes, Delete</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Settings;
