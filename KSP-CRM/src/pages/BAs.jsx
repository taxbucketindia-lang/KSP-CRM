import { useState, useEffect, useContext, useMemo } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { 
  Briefcase, Plus, X, Search, Building2, Phone, Mail, Award, Users, 
  MapPin, AlertCircle, CheckCircle2, TrendingUp, Pencil, Trash2, Eye, 
  AlertTriangle, UserCircle, Activity, Link, IndianRupee
} from 'lucide-react';

const BAs = () => {
  const { user } = useContext(AuthContext);
  const [bas, setBAs] = useState([]);
  const [leads, setLeads] = useState([]);     
  const [clients, setClients] = useState([]); 
  
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState('ALL');

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  
  const [currentBaId, setCurrentBaId] = useState(null);
  const [baToView, setBaToView] = useState(null);

  // Delete Confirmation Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [baToDelete, setBaToDelete] = useState(null);

  // 🔴 Check if current user is Admin
  const isAdmin = user?.role === 'Admin';

  const initialForm = {
    name: '',
    contactPerson: '',
    mobile: '',
    email: '',
    city: '',
    state: '',
    baLevel: 'Level 1 - Referral Associate',
    status: 'Active' 
  };
  const [formData, setFormData] = useState(initialForm);

  const fetchData = async () => {
    try {
      const headers = { Authorization: `Bearer ${user.token}` };
      const [basRes, leadsRes, clientsRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_URL}/bas`, { headers }),
        axios.get(`${import.meta.env.VITE_API_URL}/leads`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${import.meta.env.VITE_API_URL}/clients`, { headers }).catch(() => ({ data: [] }))
      ]);
      setBAs(basRes.data || []);
      setLeads(leadsRes.data || []);
      setClients(clientsRes.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleOpenAdd = () => {
    setEditMode(false);
    setCurrentBaId(null);
    setFormData(initialForm);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (ba) => {
    setEditMode(true);
    setCurrentBaId(ba._id);
    setFormData({
      name: ba.name || ba.baName || '',
      contactPerson: ba.contactPerson || '',
      mobile: ba.mobile || '',
      email: ba.email || '',
      city: ba.city || '',
      state: ba.state || '',
      baLevel: ba.baLevel || 'Level 1 - Referral Associate',
      status: ba.status || 'Active'
    });
    setIsModalOpen(true);
  };

  const handleOpenView = (ba) => {
    setBaToView(ba);
    setIsViewModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const headers = { Authorization: `Bearer ${user.token}` };
      if (editMode) {
        await axios.put(`${import.meta.env.VITE_API_URL}/bas/${currentBaId}`, formData, { headers });
      } else {
        await axios.post(`${import.meta.env.VITE_API_URL}/bas`, formData, { headers });
      }
      setIsModalOpen(false);
      setFormData(initialForm);
      fetchData();
    } catch (error) {
      alert(`Error ${editMode ? 'updating' : 'adding'} BA: ` + (error.response?.data?.message || error.message));
    }
  };

  const confirmDelete = (ba) => {
    setBaToDelete(ba);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!baToDelete) return;
    try {
      const headers = { Authorization: `Bearer ${user.token}` };
      await axios.delete(`${import.meta.env.VITE_API_URL}/bas/${baToDelete._id}`, { headers });
      setIsDeleteModalOpen(false);
      setBaToDelete(null);
      fetchData();
    } catch (error) {
      alert("Error deleting BA: " + (error.response?.data?.message || error.message));
    }
  };

  const getLinkedReferrals = (baId) => {
    const allLinkedLeads = leads.filter(l => l.referredByBA === baId || l.referredByBA?._id === baId);
    
    // Sirf wahi leads dikhao jo abhi tak convert nahi hui hain
    const activeLeads = allLinkedLeads.filter(l => l.status !== 'Converted');
    
    // Converted leads Client list me automatic yahan aa jayengi
    const linkedClients = clients.filter(c => c.referredByBA === baId || c.referredByBA?._id === baId);
    
    return { activeLeads, linkedClients };
  };

  const filteredBAs = useMemo(() => {
    return bas.filter((ba) => {
      const matchesSearch = 
        (ba.name || ba.baName)?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ba.contactPerson?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ba.baId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ba.mobile?.toString().includes(searchQuery);
        
      const matchesLevel = levelFilter === 'ALL' || ba.baLevel.includes(levelFilter);
      return matchesSearch && matchesLevel;
    });
  }, [bas, searchQuery, levelFilter]);

  const stats = useMemo(() => ({
    total: bas.length,
    level1: bas.filter(b => b.baLevel.includes('Level 1')).length,
    premium: bas.filter(b => b.baLevel.includes('Level 4') || b.baLevel.includes('Level 3')).length,
    active: bas.filter(b => b.status === 'Active' || !b.status).length
  }), [bas]);

  const getLevelBadge = (level) => {
    if (!level) return 'bg-slate-100 text-slate-700 border-slate-200/60';
    if (level.includes('Level 4')) return 'bg-purple-50 text-purple-700 border-purple-200/60 ring-purple-500/10 shadow-sm';
    if (level.includes('Level 3')) return 'bg-blue-50 text-blue-700 border-blue-200/60 ring-blue-500/10';
    if (level.includes('Level 2')) return 'bg-cyan-50 text-cyan-700 border-cyan-200/60 ring-cyan-500/10';
    return 'bg-slate-100 text-slate-700 border-slate-200/60 ring-slate-500/10';
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'New': return 'text-blue-700 bg-blue-50 border-blue-200';
      case 'Converted': return 'text-emerald-700 bg-emerald-50 border-emerald-200';
      case 'Follow-up': return 'text-purple-700 bg-purple-50 border-purple-200';
      case 'Paid': return 'text-emerald-700 bg-emerald-50 border-emerald-200';
      case 'Dues': return 'text-rose-700 bg-rose-50 border-rose-200';
      default: return 'text-slate-700 bg-slate-100 border-slate-200';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* Network Stats / KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-[0_2px_4px_rgba(0,0,0,0.02)]">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total BAs</p>
          <div className="flex items-center justify-between mt-2">
            <span className="text-2xl font-bold text-slate-800">{stats.total}</span>
            <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold"><Users size={16} /></div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-[0_2px_4px_rgba(0,0,0,0.02)]">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Referral (L1)</p>
          <div className="flex items-center justify-between mt-2">
            <span className="text-2xl font-bold text-slate-700">{stats.level1}</span>
            <div className="h-8 w-8 rounded-lg bg-slate-50 text-slate-600 flex items-center justify-center font-bold"><TrendingUp size={16} /></div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-[0_2px_4px_rgba(0,0,0,0.02)]">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Strategic & Premium</p>
          <div className="flex items-center justify-between mt-2">
            <span className="text-2xl font-bold text-purple-600">{stats.premium}</span>
            <div className="h-8 w-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold"><Award size={16} /></div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-[0_2px_4px_rgba(0,0,0,0.02)] border-l-4 border-l-emerald-500">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Active Partners</p>
          <div className="flex items-center justify-between mt-2">
            <span className="text-2xl font-bold text-emerald-600">{stats.active}</span>
            <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold"><CheckCircle2 size={16} /></div>
          </div>
        </div>
      </div>

      {/* Main Content Box */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
              <Briefcase size={20} className="text-blue-600" /> Business Associates
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">Manage your channel partners and referral network</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input type="text" placeholder="Search firm, name, ID..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
            </div>

            <div className="relative">
              <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)} className="text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none">
                <option value="ALL">All Levels</option>
                <option value="Level 1">Level 1 - Referral</option>
                <option value="Level 2">Level 2 - Business</option>
                <option value="Level 3">Level 3 - Strategic</option>
                <option value="Level 4">Level 4 - Premium</option>
              </select>
            </div>

            <button onClick={handleOpenAdd} className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-sm transition-all duration-150">
              <Plus size={16} strokeWidth={2.5} /> <span>Add Partner</span>
            </button>
          </div>
        </div>

        {/* BA Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                <th className="py-3.5 px-6">BA ID</th>
                <th className="py-3.5 px-6">Firm & Contact Person</th>
                <th className="py-3.5 px-6">Contact Details</th>
                <th className="py-3.5 px-6 text-center">Referrals</th>
                <th className="py-3.5 px-6">Partnership Level</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm font-normal text-slate-700">
              {loading ? (
                <tr><td colSpan="6" className="text-center py-16 text-slate-400">Loading network data...</td></tr>
              ) : filteredBAs.length === 0 ? (
                <tr><td colSpan="6" className="text-center py-16 text-slate-400">No associates found.</td></tr>
              ) : (
                filteredBAs.map((ba) => {
                  const { activeLeads, linkedClients } = getLinkedReferrals(ba._id);
                  return (
                    <tr key={ba._id} className="hover:bg-slate-50/70 transition-colors group">
                      <td className="py-4 px-6 font-semibold text-blue-600 text-xs tracking-wide">
                        {ba.baId || '—'}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 p-1.5 bg-slate-100 text-slate-400 rounded-md border border-slate-200">
                            <Building2 size={14} />
                          </div>
                          <div>
                            <div className="font-bold text-slate-800">{ba.name || ba.baName}</div>
                            <div className="text-xs text-slate-500 font-medium mt-0.5">
                              {ba.contactPerson || 'No specific contact'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex flex-col gap-1.5 text-xs text-slate-600 font-medium">
                          <span className="flex items-center gap-1.5"><Phone size={12} className="text-slate-400" />{ba.mobile}</span>
                          {ba.email && <span className="flex items-center gap-1.5"><Mail size={12} className="text-slate-400" />{ba.email}</span>}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <div className="inline-flex flex-col items-center justify-center">
                          <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 mb-1" title="Active/Pending Leads">
                            {activeLeads.length} Active Leads
                          </span>
                          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100" title="Converted Clients">
                            {linkedClients.length} Clients
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex flex-col gap-2 items-start">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border ring-1 ${getLevelBadge(ba.baLevel)}`}>
                            {ba.baLevel}
                          </span>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            ba.status === 'Active' || !ba.status 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                              : 'bg-rose-50 text-rose-600 border border-rose-200'
                          }`}>
                            {ba.status || 'Active'}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => handleOpenView(ba)} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="View Business Associated Details">
                            <Eye size={16} />
                          </button>
                          
                          {/* 🔴 EMPLOYEES CANNOT SEE EDIT OR DELETE BUTTONS */}
                          {isAdmin && (
                            <>
                              <button onClick={() => handleOpenEdit(ba)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit Partner">
                                <Pencil size={16} />
                              </button>
                              <button onClick={() => confirmDelete(ba)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Delete Partner">
                                <Trash2 size={16} />
                              </button>
                            </>
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

      {/* VIEW BA MODAL WITH REFERRAL TRACKING */}
      {isViewModalOpen && baToView && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95">
            
            {/* View Header */}
            <div className="flex justify-between items-center px-8 py-5 border-b border-slate-100 bg-slate-50/80">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                  <Briefcase size={26} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
                    {baToView.name || baToView.baName}
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${baToView.status === 'Active' || !baToView.status ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-600 border-rose-200'}`}>
                      {baToView.status || 'Active'}
                    </span>
                  </h2>
                  <p className="text-xs font-semibold text-indigo-600 tracking-wider uppercase mt-0.5">{baToView.baId}</p>
                </div>
              </div>
              <button onClick={() => setIsViewModalOpen(false)} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors"><X size={20} /></button>
            </div>

            {/* View Body */}
            <div className="overflow-y-auto p-8 space-y-6 custom-scrollbar">
              
              {/* Info Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-5 bg-slate-50 p-5 rounded-2xl border border-slate-100">
                <div className="col-span-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Contact Details</p>
                  <div className="text-sm font-semibold text-slate-800 mb-1">{baToView.contactPerson || 'N/A'}</div>
                  <div className="text-xs font-medium text-slate-600 flex items-center gap-2 mb-1"><Phone size={12} className="text-slate-400"/> {baToView.mobile}</div>
                  {baToView.email && <div className="text-xs font-medium text-slate-600 flex items-center gap-2"><Mail size={12} className="text-slate-400"/> {baToView.email}</div>}
                </div>
                
                <div className="col-span-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Location</p>
                  <div className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <MapPin size={14} className="text-slate-400"/> 
                    {baToView.city ? `${baToView.city}${baToView.state ? `, ${baToView.state}` : ''}` : 'Not provided'}
                  </div>
                </div>

                <div className="col-span-4 h-px bg-slate-200 my-1"></div>

                <div className="col-span-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Partnership Tier</p>
                  <span className={`inline-flex px-3 py-1 rounded-lg text-xs font-bold border shadow-sm ${getLevelBadge(baToView.baLevel)}`}>
                    {baToView.baLevel}
                  </span>
                </div>
              </div>

              {/* Referred Leads & Clients Tracker */}
              {(() => {
                const { activeLeads, linkedClients } = getLinkedReferrals(baToView._id);
                
                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* LEADS COLUMN */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                      <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                          <Activity size={16} className="text-indigo-500"/> Active Leads (Pending)
                        </h3>
                        <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-0.5 rounded-full">{activeLeads.length}</span>
                      </div>
                      
                      <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                        {activeLeads.length === 0 ? (
                          <p className="text-xs text-slate-400 italic text-center py-4">No active leads at the moment.</p>
                        ) : (
                          activeLeads.map(lead => (
                            <div key={lead._id} className="bg-slate-50 border border-slate-100 p-3 rounded-xl hover:bg-slate-100 transition-colors">
                              <div className="flex justify-between items-start mb-1">
                                <span className="font-bold text-xs text-slate-800">{lead.name}</span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getStatusBadge(lead.status)}`}>{lead.status}</span>
                              </div>
                              <div className="text-[11px] text-slate-500 flex justify-between">
                                <span>{lead.leadId}</span>
                                <span>{new Date(lead.date || lead.createdAt).toLocaleDateString()}</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* CLIENTS COLUMN */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                      <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                          <Link size={16} className="text-emerald-500"/> Converted Clients
                        </h3>
                        <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-full">{linkedClients.length}</span>
                      </div>
                      
                      <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                        {linkedClients.length === 0 ? (
                          <p className="text-xs text-slate-400 italic text-center py-4">No successful conversions yet.</p>
                        ) : (
                          linkedClients.map(client => (
                            <div key={client._id} className="bg-slate-50 border border-slate-100 p-3 rounded-xl hover:bg-slate-100 transition-colors">
                              <div className="flex justify-between items-start mb-1">
                                <span className="font-bold text-xs text-slate-800">{client.assesseeName}</span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getStatusBadge(client.feeStatus)}`}>{client.feeStatus} Fee</span>
                              </div>
                              <div className="text-[11px] text-slate-500 flex justify-between items-center">
                                <span>{client.clientId}</span>
                                <span className="font-bold flex items-center text-slate-700"><IndianRupee size={10}/> {client.feeAmount || 0} Value</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}

            </div>

            {/* 🔴 EMPLOYEES ONLY SEE "CLOSE", ADMINS SEE "EDIT" */}
            <div className="flex justify-end p-5 border-t border-slate-100 bg-slate-50 rounded-b-3xl">
              {isAdmin ? (
                <button onClick={() => { setIsViewModalOpen(false); handleOpenEdit(baToView); }} className="px-5 py-2.5 text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl transition-colors flex items-center gap-2">
                  <Pencil size={15} /> Edit Partner Settings
                </button>
              ) : (
                <button onClick={() => setIsViewModalOpen(false)} className="px-5 py-2.5 text-xs font-bold bg-slate-200 text-slate-700 hover:bg-slate-300 rounded-xl transition-colors">
                  Close
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Add / Edit BA Modal (Only Admins will ever trigger Edit, Employees can trigger Add) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-100 transform transition-all flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center px-8 py-5 border-b border-slate-100 bg-slate-50/80 rounded-t-3xl">
              <div>
                <h2 className="text-lg font-bold text-slate-800 tracking-tight">{editMode ? 'Edit Associate Details' : 'Add New Business Associate'}</h2>
                <p className="text-xs text-slate-500 mt-0.5">Register or update partner info in your network</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="overflow-y-auto p-8 space-y-6 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    BA / Firm Name <span className="text-rose-500">*</span>
                  </label>
                  <input type="text" name="name" required placeholder="e.g. Sharma Tax Consultancy" value={formData.name} onChange={handleChange} className="w-full text-sm border border-slate-200 rounded-xl p-3 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Primary Contact Person</label>
                  <input type="text" name="contactPerson" placeholder="e.g. Amit Sharma" value={formData.contactPerson} onChange={handleChange} className="w-full text-sm border border-slate-200 rounded-xl p-3 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Mobile / WhatsApp <span className="text-rose-500">*</span>
                  </label>
                  <input type="tel" name="mobile" required placeholder="10-digit number" value={formData.mobile} onChange={handleChange} className="w-full text-sm border border-slate-200 rounded-xl p-3 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Email Address</label>
                  <input type="email" name="email" placeholder="contact@firm.com" value={formData.email} onChange={handleChange} className="w-full text-sm border border-slate-200 rounded-xl p-3 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Partnership Level</label>
                  <select name="baLevel" value={formData.baLevel} onChange={handleChange} className="w-full text-sm border border-slate-200 rounded-xl p-3 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-700">
                    <option value="Level 1 - Referral Associate">Level 1 - Referral Associate</option>
                    <option value="Level 2 - Business Associate">Level 2 - Business Associate</option>
                    <option value="Level 3 - Strategic Associate">Level 3 - Strategic Associate</option>
                    <option value="Level 4 - Premium Partner">Level 4 - Premium Partner</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">City</label>
                  <input type="text" name="city" placeholder="e.g. New Delhi" value={formData.city} onChange={handleChange} className="w-full text-sm border border-slate-200 rounded-xl p-3 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">State</label>
                  <input type="text" name="state" placeholder="e.g. Delhi" value={formData.state} onChange={handleChange} className="w-full text-sm border border-slate-200 rounded-xl p-3 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
                </div>

                {/* STATUS TOGGLE */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Partner Status</label>
                  <select name="status" value={formData.status} onChange={handleChange} className="w-full text-sm border border-slate-200 rounded-xl p-3 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold text-slate-700">
                    <option value="Active">🟢 Active (Working)</option>
                    <option value="Inactive">🔴 Inactive (Suspended/Left)</option>
                  </select>
                </div>

              </div>
              
              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 pt-4 mt-2 border-t border-slate-100 bg-white sticky bottom-0 py-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
                  Cancel
                </button>
                <button type="submit" className="px-6 py-2.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md shadow-blue-500/20 transition-all">
                  {editMode ? 'Update Associate' : 'Save Associate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION POPUP MODAL */}
      {isDeleteModalOpen && baToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 p-8 text-center space-y-4 animate-in fade-in zoom-in-95">
            <div className="mx-auto h-14 w-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle size={26} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 tracking-tight">Remove Business Associate?</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Are you sure you want to remove <span className="font-bold text-slate-700">{baToDelete.name || baToDelete.baName}</span>? This will not delete their historical referrals, but they will be removed from this list.
              </p>
            </div>
            <div className="flex justify-center gap-3 pt-3">
              <button onClick={() => setIsDeleteModalOpen(false)} className="px-5 py-2.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors">Cancel</button>
              <button onClick={handleDelete} className="px-5 py-2.5 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-md shadow-rose-500/20 transition-colors">Yes, Remove</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default BAs;
