import React, { useState, useEffect, useContext, useMemo } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import toast, { Toaster } from 'react-hot-toast';
import { 
  Building2, Search, Plus, X, Briefcase, FileText, CheckCircle2, AlertTriangle,
  AlertCircle, RefreshCw, Trash2, Eye, Edit, Award, ShieldCheck, 
  CalendarDays, IndianRupee, Hash, Loader2, Pencil, Users, Trash, Percent, FileDigit, UserCheck, Key
} from 'lucide-react';

const RocWorkspace = () => {
  const { user } = useContext(AuthContext);
  
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [fetchingPan, setFetchingPan] = useState(false);
  const [panSuggestions, setPanSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('Active');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingData, setViewingData] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ open: false, client: null });
  
  // 🔴 UPDATED INITIAL FORM (Directors & Shareholders both)
  const initialForm = {
    pan: '', name: '', clientType: 'Private Limited',
    cinOrLlpIn: '', dateOfIncorporation: '',
    tan: '', udyamNumber: '', importExportCode: '', 
    authorizedCapital: '', paidUpCapital: '',
    auditorName: '', auditorMembershipNo: '', auditorFrn: '', auditorPlace: '', auditorAppointmentDate: '', auditorTenureEndDate: '', 
    startupIndia: { isRegistered: false, dpiitNumber: '', recognitionDate: '', certificateNo: '', status: 'N/A' },
    shareholders: [], 
    directors: [], // 🔴 NEW: Directors Array
    status: 'Active'
  };
  
  const [formData, setFormData] = useState(initialForm);

  const fetchWorkspaces = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${user.token}` };
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/roc/workspaces`, { headers });
      setWorkspaces(res.data || []);
    } catch (error) {
      toast.error("Failed to load ROC workspaces");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspaces();
    // eslint-disable-next-line
  }, [user.token]);

  const handlePanChange = async (e) => {
    const val = e.target.value.toUpperCase();
    setFormData(prev => ({ ...prev, pan: val }));

    if (val.length >= 2) {
      setFetchingPan(true);
      try {
        const headers = { Authorization: `Bearer ${user.token}` };
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/client-master?search=${val}`, { headers });
        setPanSuggestions(res.data || []);
        setShowSuggestions(true);
      } catch (error) {
        console.error("Error fetching PAN details", error);
      } finally {
        setFetchingPan(false);
      }
    } else {
      setPanSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSelectSuggestion = (client) => {
    setFormData(prev => ({
      ...prev,
      pan: client.pan,
      name: client.name || prev.name,
      clientType: client.clientType || prev.clientType,
      cinOrLlpIn: client.cinOrLlpIn || prev.cinOrLlpIn 
    }));
    setShowSuggestions(false); 
    toast.success("✅ Existing Client Selected! Data Auto-Filled.");
  };

  // ==========================================
  // SHAREHOLDER DYNAMIC HANDLERS
  // ==========================================
  const handleAddShareholder = () => {
    setFormData(prev => ({
      ...prev,
      shareholders: [
        ...prev.shareholders, 
        { name: '', address: '', state: '', pinCode: '', sharePercentage: '', faceValue: '', noOfShares: '', totalValue: '', remarks: '' }
      ]
    }));
  };

  const handleRemoveShareholder = (index) => {
    setFormData(prev => ({
      ...prev,
      shareholders: prev.shareholders.filter((_, i) => i !== index)
    }));
  };

  const handleShareholderChange = (index, field, value) => {
    setFormData(prev => {
      const updatedShareholders = [...prev.shareholders];
      updatedShareholders[index][field] = value;
      
      if (field === 'faceValue' || field === 'noOfShares') {
        const faceVal = Number(updatedShareholders[index].faceValue) || 0;
        const shares = Number(updatedShareholders[index].noOfShares) || 0;
        updatedShareholders[index].totalValue = faceVal * shares;
      }
      
      return { ...prev, shareholders: updatedShareholders };
    });
  };

  // ==========================================
  // 🔴 DIRECTOR DYNAMIC HANDLERS (NEW)
  // ==========================================
  const handleAddDirector = () => {
    setFormData(prev => ({
      ...prev,
      directors: [
        ...prev.directors, 
        { name: '', dinOrDpin: '', pan: '', dob: '', mobile: '', email: '', appointmentDate: '', resigningDate: '', dscStatus: 'Not Available', dscValidUpto: '' }
      ]
    }));
  };

  const handleRemoveDirector = (index) => {
    setFormData(prev => ({
      ...prev,
      directors: prev.directors.filter((_, i) => i !== index)
    }));
  };

  const handleDirectorChange = (index, field, value) => {
    setFormData(prev => {
      const updatedDirectors = [...prev.directors];
      updatedDirectors[index][field] = value;
      return { ...prev, directors: updatedDirectors };
    });
  };


  const filteredWorkspaces = useMemo(() => {
    return workspaces.filter(ws => {
      const client = ws.clientMasterId || {};
      const searchStr = searchQuery.toLowerCase();
      const matchesSearch = 
        (client.name?.toLowerCase() || '').includes(searchStr) || 
        (client.pan?.toLowerCase() || '').includes(searchStr) || 
        (ws.cinOrLlpIn?.toLowerCase() || '').includes(searchStr) ||
        (client.clientId?.toLowerCase() || '').includes(searchStr);

      const matchesStatus = statusFilter === 'ALL' || ws.status === statusFilter;
      const matchesType = typeFilter === 'ALL' || client.clientType === typeFilter;
      
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [workspaces, searchQuery, statusFilter, typeFilter]);

  const stats = useMemo(() => {
    return {
      total: workspaces.length,
      active: workspaces.filter(w => w.status === 'Active').length,
      startups: workspaces.filter(w => w.startupIndia?.isRegistered).length,
      strikeOff: workspaces.filter(w => w.status === 'Strike Off').length
    };
  }, [workspaces]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.pan || !formData.name) return toast.error("PAN and Entity Name are required!");
    if (formData.pan.length !== 10) return toast.error("Invalid PAN length. Must be 10 characters.");
    
    setSaving(true);
    try {
      const headers = { Authorization: `Bearer ${user.token}` };
      
      if (editingId) {
        await axios.put(`${import.meta.env.VITE_API_URL}/roc/workspaces/${editingId}`, formData, { headers });
        toast.success("ROC Workspace Updated Successfully!");
      } else {
        await axios.post(`${import.meta.env.VITE_API_URL}/roc/workspaces`, formData, { headers });
        toast.success("ROC Workspace Created Successfully!");
      }
      
      setIsModalOpen(false);
      fetchWorkspaces();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save workspace");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (ws) => {
    setEditingId(ws._id);
    const parseDate = (d) => d ? new Date(d).toISOString().split('T')[0] : '';
    
    // Convert dates inside directors array before setting state
    const formattedDirectors = (ws.directors || []).map(dir => ({
      ...dir,
      dob: parseDate(dir.dob),
      appointmentDate: parseDate(dir.appointmentDate),
      resigningDate: parseDate(dir.resigningDate),
      dscValidUpto: parseDate(dir.dscValidUpto)
    }));

    setFormData({
      pan: ws.clientMasterId?.pan || '',
      name: ws.clientMasterId?.name || '',
      clientType: ws.clientMasterId?.clientType || 'Private Limited',
      cinOrLlpIn: ws.cinOrLlpIn || '',
      dateOfIncorporation: parseDate(ws.dateOfIncorporation),
      tan: ws.tan || '',
      udyamNumber: ws.udyamNumber || '',
      importExportCode: ws.importExportCode || '',
      authorizedCapital: ws.authorizedCapital || '',
      paidUpCapital: ws.paidUpCapital || '',
      auditorName: ws.auditorName || '',
      auditorMembershipNo: ws.auditorMembershipNo || '',
      auditorFrn: ws.auditorFrn || '',
      auditorPlace: ws.auditorPlace || '',
      auditorAppointmentDate: parseDate(ws.auditorAppointmentDate),
      auditorTenureEndDate: parseDate(ws.auditorTenureEndDate),
      startupIndia: {
        isRegistered: ws.startupIndia?.isRegistered || false,
        dpiitNumber: ws.startupIndia?.dpiitNumber || '',
        recognitionDate: parseDate(ws.startupIndia?.recognitionDate),
        certificateNo: ws.startupIndia?.certificateNo || '',
        status: ws.startupIndia?.status || 'N/A'
      },
      shareholders: ws.shareholders || [],
      directors: formattedDirectors, // 🔴 Set Formatted Directors
      status: ws.status || 'Active'
    });
    setIsModalOpen(true);
  };

  const executeDelete = async () => {
    try {
      const headers = { Authorization: `Bearer ${user.token}` };
      await axios.delete(`${import.meta.env.VITE_API_URL}/roc/workspaces/${deleteModal.client._id}`, { headers });
      toast.success("ROC Workspace Removed.");
      setDeleteModal({ open: false, client: null });
      fetchWorkspaces();
    } catch (error) {
      toast.error(error.response?.data?.message || "Error removing workspace");
    }
  };

  const openNewModal = () => {
    setEditingId(null);
    setFormData(initialForm);
    setShowSuggestions(false);
    setIsModalOpen(true);
  };

  const handleOpenView = (ws) => {
    setViewingData(ws);
    setIsViewModalOpen(true);
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'Active': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Strike Off': return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'Under Process': return 'bg-amber-50 text-amber-700 border-amber-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 flex flex-col h-[calc(100vh-80px)] gap-4">
      <Toaster position="top-right" />

      {/* 1. HEADER & METRICS */}
      <div className="flex-none space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
              <Building2 size={28} className="text-indigo-600" /> ROC Client Workspace
            </h1>
            <p className="text-sm text-slate-500 mt-1 font-medium">Manage Corporate Entities, CIN, Capital, Shareholders, Directors, and Startup India profiles.</p>
          </div>
          <button onClick={openNewModal} className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold px-5 py-2.5 rounded-xl shadow-md shadow-indigo-500/20 transition-all">
            <Plus size={18} strokeWidth={2.5} /> Add Corporate Client
          </button>
        </div>

        {/* METRICS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-slate-50 text-slate-600 flex items-center justify-center font-bold border border-slate-100 shrink-0"><Building2 size={18} /></div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Entities</p>
              <h3 className="text-xl font-black text-slate-800">{stats.total}</h3>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 border-l-4 border-l-emerald-500">
            <div className="h-10 w-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold border border-emerald-100 shrink-0"><CheckCircle2 size={18} /></div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Active Entities</p>
              <h3 className="text-xl font-black text-emerald-700">{stats.active}</h3>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 border-l-4 border-l-orange-500">
            <div className="h-10 w-10 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center font-bold border border-orange-100 shrink-0"><Award size={18} /></div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">DPIIT Startups</p>
              <h3 className="text-xl font-black text-orange-700">{stats.startups}</h3>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 border-l-4 border-l-rose-500">
            <div className="h-10 w-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center font-bold border border-rose-100 shrink-0"><AlertTriangle size={18} /></div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Strike Off</p>
              <h3 className="text-xl font-black text-rose-700">{stats.strikeOff}</h3>
            </div>
          </div>
        </div>
      </div>

      {/* 2. MAIN WORKSPACE AREA */}
      <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden min-h-0">
        
        {/* STICKY FILTERS & HEADER */}
        <div className="flex-none bg-slate-50/95 backdrop-blur-md z-20 shadow-sm border-b border-slate-200">
          <div className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between bg-white border-b border-slate-100">
            <div className="relative w-full md:w-1/3">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Search by Entity Name, PAN, ID or CIN..." 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
                className="w-full pl-9 pr-3.5 py-2.5 text-sm font-medium bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-sm" 
              />
            </div>
            
            <div className="flex items-center gap-3 w-full md:w-auto">
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl px-4 py-2.5 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer w-full md:w-auto">
                <option value="ALL">All Entity Types</option>
                <option value="Private Limited">Private Limited</option>
                <option value="Public Limited">Public Limited</option>
                <option value="LLP">LLP</option>
                <option value="OPC">OPC</option>
                <option value="Section 8">Section 8</option>
              </select>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl px-4 py-2.5 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer w-full md:w-auto">
                <option value="ALL">All Status</option>
                <option value="Active">Active</option>
                <option value="Under Process">Under Process</option>
                <option value="Strike Off">Strike Off</option>
              </select>
            </div>
          </div>
          
          <div className="w-full text-left bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-wider flex pr-4">
             <div className="py-3 px-5 w-[30%]">Entity Details</div>
             <div className="py-3 px-5 w-[20%]">Registration Info</div>
             <div className="py-3 px-5 w-[20%]">Management Structure</div>
             <div className="py-3 px-5 w-[15%]">Status</div>
             <div className="py-3 px-5 flex-1 text-right">Actions</div>
          </div>
        </div>

        {/* SCROLLABLE TABLE BODY */}
        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead className="hidden">
              <tr>
                <th className="w-[30%]"></th><th className="w-[20%]"></th><th className="w-[20%]"></th><th className="w-[15%]"></th><th className="flex-1"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-700">
              {loading ? (
                <tr><td colSpan="5" className="text-center py-16 text-slate-400"><RefreshCw className="animate-spin inline-block mr-2" size={18}/> Loading ROC Data...</td></tr>
              ) : filteredWorkspaces.length === 0 ? (
                <tr><td colSpan="5" className="text-center py-16 text-slate-400 flex flex-col items-center"><AlertCircle size={36} className="mb-3 text-slate-300"/> No corporate entities found.</td></tr>
              ) : (
                filteredWorkspaces.map((ws) => {
                  const client = ws.clientMasterId || {};
                  return (
                    <tr key={ws._id} className="hover:bg-indigo-50/30 transition-colors group">
                      <td className="py-4 px-5 w-[30%]">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-sm shrink-0 border border-indigo-200">
                            {client.name ? client.name.charAt(0).toUpperCase() : 'C'}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-800 text-base">{client.name || 'Unknown Entity'}</span>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              {client.clientId && (
                                <span className="text-[10px] font-black uppercase bg-slate-200/70 text-slate-600 px-1.5 py-0.5 rounded border border-slate-300 tracking-wider">
                                  ID: {client.clientId}
                                </span>
                              )}
                              <span className="text-[10px] font-black uppercase bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200 tracking-wider">
                                {client.pan || 'NO PAN'}
                              </span>
                              {ws.startupIndia?.isRegistered && (
                                <span className="text-[9px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-200 flex items-center gap-1">
                                  <Award size={10}/> DPIIT
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-5 w-[20%]">
                        <div className="flex flex-col gap-1">
                          <span className="text-[11px] font-bold text-slate-400 uppercase">CIN / LLPIN</span>
                          <span className="font-mono font-bold text-indigo-700 uppercase">{ws.cinOrLlpIn || 'N/A'}</span>
                          <span className="text-[10px] font-medium text-slate-500 mt-0.5">
                            Inc: {ws.dateOfIncorporation ? new Date(ws.dateOfIncorporation).toLocaleDateString('en-IN') : 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-5 w-[20%]">
                        <div className="flex flex-col gap-1">
                           <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1"><IndianRupee size={10}/> Paid Cap: {(ws.paidUpCapital||0).toLocaleString('en-IN')}</span>
                           <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1 mt-1"><Users size={10}/> Shareholders: {ws.shareholders?.length || 0}</span>
                           <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1 mt-1"><UserCheck size={10}/> Directors: {ws.directors?.length || 0}</span>
                        </div>
                      </td>
                      <td className="py-4 px-5 w-[15%]">
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${getStatusStyle(ws.status)}`}>
                          {ws.status}
                        </span>
                      </td>
                      <td className="py-4 px-5 flex-1 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => handleEdit(ws)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-transparent" title="Edit Client">
                            <Edit size={16}/>
                          </button>
                          <button onClick={() => handleOpenView(ws)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent" title="View Workspace">
                            <Eye size={16}/>
                          </button>
                          <button onClick={() => setDeleteModal({ open: true, client: ws })} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-transparent" title="Delete Workspace">
                            <Trash2 size={16}/>
                          </button>
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

      {/* ADD / EDIT ROC WORKSPACE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-5xl shadow-2xl border border-slate-100 flex flex-col max-h-[95vh] overflow-hidden animate-in fade-in zoom-in-95">
            
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/80">
              <div>
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Building2 className="text-indigo-600" size={20}/> {editingId ? 'Edit ROC Entity Details' : 'Onboard ROC Entity'}
                </h2>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors"><X size={18} /></button>
            </div>

            <form onSubmit={handleSave} className="overflow-y-auto p-6 space-y-6 custom-scrollbar bg-slate-50/30">
              
              {/* SECTION 1: MASTER DETAILS */}
              <div className="bg-indigo-50/40 p-5 rounded-2xl border border-indigo-100">
                <h3 className="text-xs font-bold text-indigo-800 uppercase tracking-wider border-b border-indigo-200/50 pb-2 mb-4 flex items-center gap-2">
                    <ShieldCheck size={14}/> Core Entity Details (Master Link)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  
                  {/* PAN AUTOCOMPLETE */}
                  <div className="md:col-span-1 relative">
                    <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Company PAN *</label>
                    <input 
                      type="text" required maxLength="10" value={formData.pan} 
                      onChange={handlePanChange} onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                      autoComplete="off" disabled={editingId} 
                      placeholder="ABCDE1234F" 
                      className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-black text-slate-800 uppercase tracking-widest bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none disabled:bg-slate-100 disabled:text-slate-400 relative z-10"
                    />
                    {fetchingPan && !editingId && <Loader2 size={14} className="absolute right-3 top-9 animate-spin text-indigo-500 z-20"/>}
                    {showSuggestions && !editingId && panSuggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto custom-scrollbar">
                        {panSuggestions.map((client) => (
                          <div key={client._id} onClick={() => handleSelectSuggestion(client)} className="p-3 border-b border-slate-50 hover:bg-indigo-50 cursor-pointer transition-colors">
                            <p className="text-xs font-black text-slate-800 tracking-wider uppercase">{client.pan}</p>
                            <p className="text-[10px] font-bold text-slate-500 truncate">{client.name}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Entity Name *</label>
                    <input type="text" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} disabled={editingId} placeholder="e.g. Taxbucket Tech Pvt Ltd" className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-semibold bg-white disabled:bg-slate-100 disabled:text-slate-400 focus:ring-2 focus:ring-indigo-500/20"/>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Entity Type</label>
                    <select value={formData.clientType} onChange={(e) => setFormData({...formData, clientType: e.target.value})} disabled={editingId} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 bg-white disabled:bg-slate-100 disabled:text-slate-400">
                      <option value="Private Limited">Private Limited</option>
                      <option value="Public Limited">Public Limited</option>
                      <option value="OPC">One Person Company (OPC)</option>
                      <option value="LLP">Limited Liability Partnership</option>
                      <option value="Section 8">Section 8 Company</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">CIN / LLPIN *</label>
                    <input type="text" required value={formData.cinOrLlpIn} onChange={(e) => setFormData({...formData, cinOrLlpIn: e.target.value.toUpperCase()})} placeholder="U12345DL2024PTC123456" className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-mono font-bold text-indigo-700 bg-white uppercase"/>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Date of Incorporation</label>
                    <input type="date" value={formData.dateOfIncorporation} onChange={(e) => setFormData({...formData, dateOfIncorporation: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-semibold bg-white text-slate-700"/>
                  </div>
                </div>
              </div>

              {/* 🔴 SECTION 2: ADDITIONAL IDENTIFIERS */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-2 mb-4 flex items-center gap-2">
                  <FileDigit size={14}/> Additional Identifiers
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">TAN Number</label>
                    <input type="text" value={formData.tan} onChange={(e) => setFormData({...formData, tan: e.target.value.toUpperCase()})} placeholder="ABCD12345E" className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-mono font-bold uppercase focus:ring-2 focus:ring-indigo-500/20"/>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">UDYAM Number (MSME)</label>
                    <input type="text" value={formData.udyamNumber} onChange={(e) => setFormData({...formData, udyamNumber: e.target.value.toUpperCase()})} placeholder="UDYAM-XX-00-0000000" className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-mono font-bold uppercase focus:ring-2 focus:ring-indigo-500/20"/>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Import Export Code (IEC)</label>
                    <input type="text" value={formData.importExportCode} onChange={(e) => setFormData({...formData, importExportCode: e.target.value.toUpperCase()})} placeholder="Enter IEC" className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-mono font-bold uppercase focus:ring-2 focus:ring-indigo-500/20"/>
                  </div>
                </div>
              </div>

              {/* SECTION 3: CAPITAL STRUCTURE & AUDITOR */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Capital Structure */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-2 mb-4 flex items-center gap-2"><IndianRupee size={14}/> Capital Structure</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Authorized Capital (₹)</label>
                      <input type="number" min="0" value={formData.authorizedCapital} onChange={(e) => setFormData({...formData, authorizedCapital: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500/20"/>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Paid-Up Capital (₹)</label>
                      <input type="number" min="0" value={formData.paidUpCapital} onChange={(e) => setFormData({...formData, paidUpCapital: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500/20"/>
                    </div>
                  </div>
                </div>

                {/* Auditors */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-2 mb-4 flex items-center gap-2"><Briefcase size={14}/> Statutory Auditor</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Auditor Firm / Name</label>
                        <input type="text" value={formData.auditorName} onChange={(e) => setFormData({...formData, auditorName: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500/20"/>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Membership No.</label>
                        <input type="text" value={formData.auditorMembershipNo} onChange={(e) => setFormData({...formData, auditorMembershipNo: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500/20"/>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">FRN (Firm Reg. No)</label>
                        <input type="text" value={formData.auditorFrn} onChange={(e) => setFormData({...formData, auditorFrn: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500/20"/>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Place</label>
                        <input type="text" value={formData.auditorPlace} onChange={(e) => setFormData({...formData, auditorPlace: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500/20"/>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Appt. Date</label>
                        <input type="date" value={formData.auditorAppointmentDate} onChange={(e) => setFormData({...formData, auditorAppointmentDate: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700"/>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Valid Till</label>
                        <input type="date" value={formData.auditorTenureEndDate} onChange={(e) => setFormData({...formData, auditorTenureEndDate: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700"/>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 🔴 SECTION 4: DIRECTORS (NEW) */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <UserCheck size={16} className="text-indigo-600"/> Name of Directors
                  </h3>
                  <button type="button" onClick={handleAddDirector} className="text-xs font-bold bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-indigo-100 transition-colors">
                    <Plus size={14}/> Add Director
                  </button>
                </div>

                {formData.directors.length === 0 ? (
                  <div className="text-center py-6 bg-slate-50 rounded-xl border border-slate-100 border-dashed">
                    <p className="text-xs font-bold text-slate-400">No directors added yet. Click 'Add Director' to maintain the register.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {formData.directors.map((dir, index) => (
                      <div key={index} className="bg-slate-50 border border-slate-200 rounded-xl p-4 relative group">
                        <div className="absolute -top-3 -left-3 h-6 w-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs font-bold border-2 border-white shadow-sm">
                          {index + 1}
                        </div>
                        <button type="button" onClick={() => handleRemoveDirector(index)} className="absolute top-3 right-3 text-slate-400 hover:text-rose-500 transition-colors" title="Remove Director">
                          <Trash size={16}/>
                        </button>
                        
                        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mt-2">
                          <div className="md:col-span-2">
                            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Director Name *</label>
                            <input type="text" required value={dir.name} onChange={(e) => handleDirectorChange(index, 'name', e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500/20"/>
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">DIN / DPIN</label>
                            <input type="text" value={dir.dinOrDpin} onChange={(e) => handleDirectorChange(index, 'dinOrDpin', e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500/20 uppercase"/>
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">PAN</label>
                            <input type="text" value={dir.pan} onChange={(e) => handleDirectorChange(index, 'pan', e.target.value.toUpperCase())} className="w-full p-2 border border-slate-200 rounded-lg text-xs font-semibold uppercase focus:ring-2 focus:ring-indigo-500/20"/>
                          </div>
                          
                          <div className="md:col-span-2">
                            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">DOB</label>
                            <input type="date" value={dir.dob} onChange={(e) => handleDirectorChange(index, 'dob', e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-indigo-500/20"/>
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Mobile</label>
                            <input type="text" value={dir.mobile} onChange={(e) => handleDirectorChange(index, 'mobile', e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500/20"/>
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Email</label>
                            <input type="email" value={dir.email} onChange={(e) => handleDirectorChange(index, 'email', e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500/20"/>
                          </div>

                          <div className="md:col-span-2">
                            <label className="block text-[10px] font-bold uppercase text-emerald-600 mb-1">Appointment Date</label>
                            <input type="date" value={dir.appointmentDate} onChange={(e) => handleDirectorChange(index, 'appointmentDate', e.target.value)} className="w-full p-2 border border-emerald-200 rounded-lg text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-emerald-500/20"/>
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-[10px] font-bold uppercase text-rose-600 mb-1">Resigning Date</label>
                            <input type="date" value={dir.resigningDate} onChange={(e) => handleDirectorChange(index, 'resigningDate', e.target.value)} className="w-full p-2 border border-rose-200 rounded-lg text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-rose-500/20"/>
                          </div>
                          
                          <div className="md:col-span-2 bg-indigo-50/50 p-2 border border-indigo-100 rounded-lg flex gap-3">
                            <div className="flex-1">
                              <label className="block text-[9px] font-bold uppercase text-indigo-700 mb-1 flex items-center gap-1"><Key size={10}/> DSC Status</label>
                              <select value={dir.dscStatus} onChange={(e) => handleDirectorChange(index, 'dscStatus', e.target.value)} className="w-full p-1.5 border border-indigo-200 rounded text-[11px] font-bold text-slate-700 focus:outline-none">
                                <option value="Valid">Valid</option>
                                <option value="Expired">Expired</option>
                                <option value="Not Available">Not Available</option>
                              </select>
                            </div>
                            <div className="flex-1">
                              <label className="block text-[9px] font-bold uppercase text-indigo-700 mb-1">Valid Upto</label>
                              <input type="date" value={dir.dscValidUpto} onChange={(e) => handleDirectorChange(index, 'dscValidUpto', e.target.value)} className="w-full p-1.5 border border-indigo-200 rounded text-[11px] font-semibold text-slate-700 focus:outline-none"/>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 🔴 SECTION 5: SHAREHOLDERS */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <Users size={16} className="text-indigo-600"/> List of Shareholders
                  </h3>
                  <button type="button" onClick={handleAddShareholder} className="text-xs font-bold bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-indigo-100 transition-colors">
                    <Plus size={14}/> Add Shareholder
                  </button>
                </div>

                {formData.shareholders.length === 0 ? (
                  <div className="text-center py-6 bg-slate-50 rounded-xl border border-slate-100 border-dashed">
                    <p className="text-xs font-bold text-slate-400">No shareholders added yet. Click 'Add Shareholder' to maintain the register.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {formData.shareholders.map((sh, index) => (
                      <div key={index} className="bg-slate-50 border border-slate-200 rounded-xl p-4 relative group">
                        <div className="absolute -top-3 -left-3 h-6 w-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs font-bold border-2 border-white shadow-sm">
                          {index + 1}
                        </div>
                        <button type="button" onClick={() => handleRemoveShareholder(index)} className="absolute top-3 right-3 text-slate-400 hover:text-rose-500 transition-colors" title="Remove Shareholder">
                          <Trash size={16}/>
                        </button>
                        
                        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mt-2">
                          <div className="md:col-span-2">
                            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Name of Shareholder</label>
                            <input type="text" required value={sh.name} onChange={(e) => handleShareholderChange(index, 'name', e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500/20"/>
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Address / State / PIN</label>
                            <input type="text" value={sh.address} onChange={(e) => handleShareholderChange(index, 'address', e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500/20"/>
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Remarks</label>
                            <input type="text" value={sh.remarks} onChange={(e) => handleShareholderChange(index, 'remarks', e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500/20"/>
                          </div>
                          
                          <div>
                            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1 flex items-center gap-1"><Percent size={10}/> of Share</label>
                            <input type="number" step="0.01" value={sh.sharePercentage} onChange={(e) => handleShareholderChange(index, 'sharePercentage', e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg text-xs font-bold text-indigo-700 focus:ring-2 focus:ring-indigo-500/20"/>
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Face Value Per Share (₹)</label>
                            <input type="number" value={sh.faceValue} onChange={(e) => handleShareholderChange(index, 'faceValue', e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500/20"/>
                          </div>
                          <div className="md:col-span-1">
                            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">No. of Shares</label>
                            <input type="number" value={sh.noOfShares} onChange={(e) => handleShareholderChange(index, 'noOfShares', e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500/20"/>
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-[10px] font-bold uppercase text-emerald-600 mb-1">Total Value (₹)</label>
                            <input type="number" readOnly value={sh.totalValue || ''} className="w-full p-2 border border-emerald-200 bg-emerald-50 rounded-lg text-xs font-black text-emerald-700 cursor-not-allowed"/>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Startup India Recognition */}
              <div className="bg-orange-50/30 p-5 rounded-2xl border border-orange-100">
                 <div className="flex justify-between items-center border-b border-orange-200/50 pb-2 mb-4">
                   <h3 className="text-xs font-bold text-orange-800 uppercase tracking-wider flex items-center gap-2">
                      <Award size={14}/> Startup India (DPIIT)
                   </h3>
                   <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={formData.startupIndia.isRegistered} onChange={(e) => setFormData({...formData, startupIndia: {...formData.startupIndia, isRegistered: e.target.checked}})} className="w-4 h-4 text-orange-600 rounded border-orange-300 focus:ring-orange-500"/>
                      <span className="text-xs font-bold text-orange-700">Recognized Startup</span>
                   </label>
                 </div>
                 
                 {formData.startupIndia.isRegistered && (
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in slide-in-from-top-2">
                     <div>
                       <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">DPIIT Number</label>
                       <input type="text" value={formData.startupIndia.dpiitNumber} onChange={(e) => setFormData({...formData, startupIndia: {...formData.startupIndia, dpiitNumber: e.target.value}})} className="w-full p-2 border border-slate-200 rounded-xl text-sm font-semibold"/>
                     </div>
                     <div>
                       <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Recognition Date</label>
                       <input type="date" value={formData.startupIndia.recognitionDate} onChange={(e) => setFormData({...formData, startupIndia: {...formData.startupIndia, recognitionDate: e.target.value}})} className="w-full p-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700"/>
                     </div>
                     <div>
                       <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Status</label>
                       <select value={formData.startupIndia.status} onChange={(e) => setFormData({...formData, startupIndia: {...formData.startupIndia, status: e.target.value}})} className="w-full p-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-700">
                         <option value="Active">Active</option>
                         <option value="Expired">Expired</option>
                       </select>
                     </div>
                   </div>
                 )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">Cancel</button>
                <button type="submit" disabled={saving} className="px-8 py-2.5 text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md shadow-indigo-500/20 transition-all flex items-center gap-2 disabled:opacity-50">
                  {saving ? <RefreshCw size={18} className="animate-spin"/> : <CheckCircle2 size={18} />} 
                  {editingId ? 'Save Changes' : 'Initialize Workspace'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW WORKSPACE MODAL */}
      {isViewModalOpen && viewingData && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-slate-50 rounded-3xl w-full max-w-5xl shadow-2xl border border-slate-100 flex flex-col max-h-[95vh] overflow-hidden animate-in fade-in zoom-in-95">
            
            <div className="relative px-8 pt-6 pb-16 bg-gradient-to-r from-indigo-700 to-blue-800 text-white rounded-t-3xl flex justify-between items-start overflow-hidden">
              <div className="absolute top-0 right-0 -mt-10 -mr-10 h-40 w-40 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
              
              <div className="flex items-center gap-5 z-10">
                <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md border border-white/30 shadow-inner">
                  <Building2 size={32} className="text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-black tracking-tight">{viewingData.clientMasterId?.name || 'Unknown Entity'}</h2>
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-indigo-100 font-medium">
                    {viewingData.clientMasterId?.clientId && (
                      <span className="flex items-center gap-1.5 bg-white/20 px-2.5 py-1 rounded-md border border-white/30 font-mono tracking-wider text-white font-bold">
                        ID: {viewingData.clientMasterId.clientId}
                      </span>
                    )}
                    <span className="flex items-center gap-1.5 bg-black/20 px-2.5 py-1 rounded-md border border-white/10 font-mono tracking-wider text-white">
                      <Hash size={12} className="opacity-70"/> {viewingData.cinOrLlpIn || 'N/A'}
                    </span>
                    <span className="flex items-center gap-1.5 bg-black/20 px-2.5 py-1 rounded-md border border-white/10 font-mono tracking-wider text-white">
                      PAN: {viewingData.clientMasterId?.pan || 'N/A'}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${viewingData.status === 'Active' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'}`}>
                      {viewingData.status}
                    </span>
                  </div>
                </div>
              </div>
              <button onClick={() => setIsViewModalOpen(false)} className="z-10 p-2 rounded-full bg-black/10 hover:bg-black/20 text-white transition-colors"><X size={20} strokeWidth={2.5} /></button>
            </div>
            
            <div className="overflow-y-auto p-6 md:p-8 space-y-6 custom-scrollbar">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Registration & Identifiers Card */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                    <CalendarDays size={14}/> Registration & Identifiers
                  </h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Date of Incorporation</p>
                        <p className="text-sm font-bold text-slate-800">{viewingData.dateOfIncorporation ? new Date(viewingData.dateOfIncorporation).toLocaleDateString('en-IN', {day:'numeric', month:'short', year:'numeric'}) : 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">TAN Number</p>
                        <p className="text-sm font-mono font-bold text-indigo-700">{viewingData.tan || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">UDYAM Number</p>
                        <p className="text-sm font-mono font-bold text-slate-800">{viewingData.udyamNumber || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Import Export Code (IEC)</p>
                        <p className="text-sm font-mono font-bold text-slate-800">{viewingData.importExportCode || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-100">
                      <div>
                        <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Authorized Capital</p>
                        <p className="text-sm font-black text-emerald-700 flex items-center gap-0.5"><IndianRupee size={14}/> {(viewingData.authorizedCapital||0).toLocaleString('en-IN')}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Paid-Up Capital</p>
                        <p className="text-sm font-black text-emerald-700 flex items-center gap-0.5"><IndianRupee size={14}/> {(viewingData.paidUpCapital||0).toLocaleString('en-IN')}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Statutory Auditor Card */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                    <Briefcase size={14}/> Statutory Auditor
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Auditor Firm/Name</p>
                      <p className="text-sm font-bold text-slate-800">{viewingData.auditorName || 'Not Assigned'}</p>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Membership No</p>
                        <p className="text-xs font-semibold text-slate-700">{viewingData.auditorMembershipNo || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">FRN</p>
                        <p className="text-xs font-semibold text-slate-700">{viewingData.auditorFrn || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Place</p>
                        <p className="text-xs font-semibold text-slate-700">{viewingData.auditorPlace || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-100">
                      <div>
                        <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Appointed On</p>
                        <p className="text-sm font-medium text-slate-700">{viewingData.auditorAppointmentDate ? new Date(viewingData.auditorAppointmentDate).toLocaleDateString('en-IN') : 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Valid Till</p>
                        <p className="text-sm font-medium text-slate-700">{viewingData.auditorTenureEndDate ? new Date(viewingData.auditorTenureEndDate).toLocaleDateString('en-IN') : 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* 🔴 VIEW DIRECTORS (NEW) */}
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 mb-4 flex items-center gap-2">
                  <UserCheck size={16} className="text-indigo-600"/> Register of Directors
                </h3>
                {viewingData.directors && viewingData.directors.length > 0 ? (
                  <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                          <th className="py-2 px-3">S.No.</th>
                          <th className="py-2 px-3">Name & Contact</th>
                          <th className="py-2 px-3">DIN & PAN</th>
                          <th className="py-2 px-3">Appointment</th>
                          <th className="py-2 px-3">Resignation</th>
                          <th className="py-2 px-3">DSC Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                        {viewingData.directors.map((dir, index) => (
                          <tr key={index} className="hover:bg-slate-50/50">
                            <td className="py-2 px-3 font-bold">{index + 1}</td>
                            <td className="py-2 px-3">
                              <p className="font-bold text-slate-800">{dir.name}</p>
                              <p className="text-[10px] text-slate-500">{dir.mobile} • {dir.email}</p>
                            </td>
                            <td className="py-2 px-3">
                              <p className="font-bold text-indigo-700">{dir.dinOrDpin || '-'}</p>
                              <p className="text-[10px] text-slate-500 font-mono uppercase">{dir.pan || '-'}</p>
                            </td>
                            <td className="py-2 px-3">{dir.appointmentDate ? new Date(dir.appointmentDate).toLocaleDateString('en-IN') : '-'}</td>
                            <td className="py-2 px-3 text-rose-600 font-bold">{dir.resigningDate ? new Date(dir.resigningDate).toLocaleDateString('en-IN') : 'Active'}</td>
                            <td className="py-2 px-3">
                              <div className="flex flex-col">
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded w-max ${dir.dscStatus === 'Valid' ? 'bg-emerald-50 text-emerald-700' : dir.dscStatus === 'Expired' ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-500'}`}>
                                  {dir.dscStatus}
                                </span>
                                {dir.dscStatus === 'Valid' && dir.dscValidUpto && (
                                  <span className="text-[9px] text-slate-400 mt-0.5">Till: {new Date(dir.dscValidUpto).toLocaleDateString('en-IN')}</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-4 bg-slate-50 rounded-xl border border-slate-100 border-dashed">
                    <p className="text-xs font-bold text-slate-400">No directors documented for this entity.</p>
                  </div>
                )}
              </div>

              {/* 🔴 VIEW SHAREHOLDERS */}
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 mb-4 flex items-center gap-2">
                  <Users size={16} className="text-indigo-600"/> Register of Shareholders
                </h3>
                {viewingData.shareholders && viewingData.shareholders.length > 0 ? (
                  <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                          <th className="py-2 px-3">S.No.</th>
                          <th className="py-2 px-3">Name & Address</th>
                          <th className="py-2 px-3">% of Share</th>
                          <th className="py-2 px-3">Face Value</th>
                          <th className="py-2 px-3">No. of Shares</th>
                          <th className="py-2 px-3">Total Value</th>
                          <th className="py-2 px-3">Remarks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                        {viewingData.shareholders.map((sh, index) => (
                          <tr key={index} className="hover:bg-slate-50/50">
                            <td className="py-2 px-3 font-bold">{index + 1}</td>
                            <td className="py-2 px-3">
                              <p className="font-bold text-slate-800">{sh.name}</p>
                              <p className="text-[10px] text-slate-500 truncate max-w-[200px]" title={sh.address}>{sh.address}</p>
                            </td>
                            <td className="py-2 px-3 font-bold text-indigo-600">{sh.sharePercentage}%</td>
                            <td className="py-2 px-3">₹{sh.faceValue}</td>
                            <td className="py-2 px-3">{sh.noOfShares}</td>
                            <td className="py-2 px-3 font-black text-emerald-600">₹{sh.totalValue}</td>
                            <td className="py-2 px-3 text-[10px] italic text-slate-500">{sh.remarks || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-4 bg-slate-50 rounded-xl border border-slate-100 border-dashed">
                    <p className="text-xs font-bold text-slate-400">No shareholders documented for this entity.</p>
                  </div>
                )}
              </div>

              {/* Startup India Notice */}
              {viewingData.startupIndia?.isRegistered && (
                <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5 flex items-center gap-5 relative overflow-hidden">
                  <div className="absolute right-0 top-0 text-orange-200 opacity-20 -mt-10 -mr-4"><Award size={120}/></div>
                  <div className="h-12 w-12 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center shrink-0 z-10"><Award size={24}/></div>
                  <div className="z-10">
                    <h4 className="text-sm font-black text-orange-800 uppercase tracking-tight">DPIIT Recognized Startup</h4>
                    <div className="flex items-center gap-4 mt-1 text-[11px] font-bold text-orange-700">
                      <span>DPIIT No: {viewingData.startupIndia.dpiitNumber || 'N/A'}</span>
                      <span>Recognized: {viewingData.startupIndia.recognitionDate ? new Date(viewingData.startupIndia.recognitionDate).toLocaleDateString('en-IN') : 'N/A'}</span>
                      <span className={`px-1.5 py-0.5 rounded text-white ${viewingData.startupIndia.status==='Active' ? 'bg-orange-500' : 'bg-slate-400'}`}>{viewingData.startupIndia.status}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-slate-100/50 border border-slate-200 border-dashed rounded-2xl p-6 text-center">
                 <h4 className="text-sm font-bold text-slate-600">Compliance Form Filings</h4>
                 <p className="text-xs text-slate-400 mt-1">Form Filings (AOC-4, MGT-7, ADT-1) will be managed inside their respective dedicated tabs for this workspace.</p>
              </div>

            </div>
            
            <div className="flex justify-between items-center px-6 py-4 border-t border-slate-100 bg-white rounded-b-3xl">
              <div>
                <button 
                  onClick={() => { setIsViewModalOpen(false); setDeleteModal({ open: true, client: viewingData }); }} 
                  className="px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors border border-transparent hover:border-rose-200 flex items-center gap-1.5"
                >
                  <Trash2 size={15} /> Remove Workspace
                </button>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => setIsViewModalOpen(false)} className="px-5 py-2.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors">
                  Close Profile
                </button>
                <button 
                  onClick={() => { setIsViewModalOpen(false); handleEdit(viewingData); }} 
                  className="px-5 py-2.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md shadow-indigo-500/20 transition-all flex items-center gap-2"
                >
                  <Pencil size={15} strokeWidth={2.5}/> Edit Details
                </button>
              </div>
            </div>
            
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
              <h3 className="text-xl font-bold text-slate-800 tracking-tight">Delete Workspace?</h3>
              <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                Are you sure you want to permanently delete <span className="font-bold text-slate-700">{deleteModal.client?.clientMasterId?.name || 'this workspace'}</span>? 
                <br/><span className="text-[10px] text-rose-500 font-bold">*Note: Client Master data will remain safe.</span>
              </p>
            </div>
            <div className="flex justify-center gap-3 pt-4">
              <button onClick={() => setDeleteModal({ open: false, client: null })} className="px-6 py-2.5 text-sm font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors">Cancel</button>
              <button onClick={executeDelete} className="px-6 py-2.5 text-sm font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-md shadow-rose-500/20 transition-all active:scale-95">Yes, Delete</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default RocWorkspace;