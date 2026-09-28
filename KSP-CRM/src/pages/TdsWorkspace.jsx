import React, { useState, useEffect, useContext, useMemo, useRef } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import toast, { Toaster } from 'react-hot-toast';
import { 
  Building2, Search, Plus, X, FileText, CheckCircle2, AlertTriangle,
  AlertCircle, RefreshCw, Eye, Key, ShieldCheck, 
  IndianRupee, Hash, Loader2, Users, Receipt, Download, MapPin, Upload, Trash2,
  ArrowRight, FileDigit, Pencil, Copy
} from 'lucide-react';

const TdsWorkspace = () => {
  const { user } = useContext(AuthContext);
  
  // ==========================================
  // 1. WORKSPACE STATES (M1)
  // ==========================================
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [fetchingPan, setFetchingPan] = useState(false);
  const [panSuggestions, setPanSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  // ==========================================
  // 2. 360 VIEW STATES (TABS)
  // ==========================================
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingData, setViewingData] = useState(null);
  const [activeTab, setActiveTab] = useState('profile'); // 🔴 Default changed to Profile
  const [tabData, setTabData] = useState({ returns: [], deductees: [], challans: [] });
  const [loadingTabData, setLoadingTabData] = useState(false);

  // ==========================================
  // 3. CHILD MODULE STATES (M2, M3, M4, M5)
  // ==========================================
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [returnForm, setReturnForm] = useState({ financialYear: '2026-27', formType: '26Q' });

  const [isDeducteeModalOpen, setIsDeducteeModalOpen] = useState(false);
  const [deducteeForm, setDeducteeForm] = useState({ deducteeName: '', pan: '', panStatus: 'Valid', deducteeType: 'Company', residentialStatus: 'Resident', mobile: '', email: '' });

  const [isChallanModalOpen, setIsChallanModalOpen] = useState(false);
  const [challanForm, setChallanForm] = useState({ challanSerialNo: '', bsrCode: '', depositDate: '', tdsAmount: '', interestAmount: 0, lateFeeAmount: 0, otherAmount: 0, depositMode: 'Online', sectionCode: '194C', quarter: 'Q1', financialYear: '2026-27' });

  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [entries, setEntries] = useState([]);
  const [entryForm, setEntryForm] = useState({ tdsDeducteeId: '', tdsChallanId: '', sectionCode: '194C', paymentDate: '', deductionDate: '', amountPaid: '', tdsRate: '', tdsDeducted: '', tdsDeposited: '' });

  const initialWorkspaceForm = {
    pan: '', companyName: '', tan: '',
    deductorCategory: 'Company', deductorTypeCode: 'Company',
    responsiblePerson: { name: '', designation: '', pan: '' },
    address: '', city: '', state: '', pinCode: '',
    email: '', mobile: '',
    tracesLogin: { userId: '', password: '' },
    efilingLogin: { userId: '', password: '' },
    serviceFee: '', billingCycle: 'Quarterly'
  };
  const [formData, setFormData] = useState(initialWorkspaceForm);

  // ==========================================
  // FETCHING LOGIC
  // ==========================================
  const fetchWorkspaces = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${user.token}` };
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/tds/workspaces`, { headers });
      setWorkspaces(res.data || []);
    } catch (error) {
      toast.error("Failed to load TDS workspaces");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspaces();
    // eslint-disable-next-line
  }, [user.token]);

  const loadTabSpecificData = async (workspaceId, tabName) => {
    if (tabName === 'profile') return; // No need to fetch for profile, data is already in viewingData
    setLoadingTabData(true);
    try {
      const headers = { Authorization: `Bearer ${user.token}` };
      let endpoint = '';
      if (tabName === 'returns') endpoint = `/tds/workspaces/${workspaceId}/returns`;
      if (tabName === 'deductees') endpoint = `/tds/workspaces/${workspaceId}/deductees`;
      if (tabName === 'challans') endpoint = `/tds/workspaces/${workspaceId}/challans`;

      if (endpoint) {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}${endpoint}`, { headers });
        setTabData(prev => ({ ...prev, [tabName]: res.data }));
      }
    } catch (error) {
      toast.error(`Failed to load ${tabName}`);
    } finally {
      setLoadingTabData(false);
    }
  };

  const handleTabChange = (tabName) => {
    setActiveTab(tabName);
    if (viewingData && tabName !== 'profile') loadTabSpecificData(viewingData._id, tabName);
  };

  const handleOpenView = (ws) => {
    setViewingData(ws);
    setIsViewModalOpen(true);
    setActiveTab('profile'); // 🔴 Start with profile tab to show logins
  };

  // ==========================================
  // M1: WORKSPACE HANDLERS
  // ==========================================
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
      companyName: client.name || prev.companyName,
      mobile: client.mobile || prev.mobile,
      email: client.email || prev.email,
      state: client.state || prev.state,
      pinCode: client.pinCode || prev.pinCode
    }));
    setShowSuggestions(false); 
    toast.success("✅ Client Data Auto-Filled!");
  };

  const handleSaveWorkspace = async (e) => {
    e.preventDefault();
    if (!formData.pan || !formData.tan || !formData.companyName) return toast.error("PAN, TAN and Entity Name are required!");
    if (formData.pan.length !== 10) return toast.error("Invalid PAN length. Must be 10 characters.");
    if (formData.tan.length !== 10) return toast.error("Invalid TAN length. Must be 10 characters.");
    
    setSaving(true);
    try {
      const headers = { Authorization: `Bearer ${user.token}` };
      
      if (editingId) {
        // 🔴 YAHAN API CONNECT KAR DI GAYI HAI
        await axios.put(`${import.meta.env.VITE_API_URL}/tds/workspaces/${editingId}`, formData, { headers });
        toast.success("TDS Workspace Updated Successfully!");
      } else {
        await axios.post(`${import.meta.env.VITE_API_URL}/tds/workspaces`, formData, { headers });
        toast.success("TDS Workspace Created Successfully!");
      }
      
      setIsModalOpen(false);
      fetchWorkspaces();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save workspace");
    } finally {
      setSaving(false);
    }
  };

  const handleEditWorkspace = (ws) => {
    setEditingId(ws._id);
    setFormData({
      pan: ws.pan || '',
      companyName: ws.companyName || '',
      tan: ws.tan || '',
      deductorCategory: ws.deductorCategory || 'Company',
      deductorTypeCode: ws.deductorTypeCode || 'Company',
      responsiblePerson: { name: ws.responsiblePerson?.name || '', designation: ws.responsiblePerson?.designation || '', pan: ws.responsiblePerson?.pan || '' },
      address: ws.address || '', city: ws.city || '', state: ws.state || '', pinCode: ws.pinCode || '',
      email: ws.email || '', mobile: ws.mobile || '',
      tracesLogin: { userId: ws.tracesLogin?.userId || '', password: ws.tracesLogin?.password || '' },
      efilingLogin: { userId: ws.efilingLogin?.userId || '', password: ws.efilingLogin?.password || '' },
      serviceFee: ws.serviceFee || '', billingCycle: ws.billingCycle || 'Quarterly'
    });
    setIsModalOpen(true);
  };

  const handleDeleteWorkspace = async (id, companyName) => {
    if (window.confirm(`Do you really want to delete the "${companyName}" deductor?`)) {
      try {
        const headers = { Authorization: `Bearer ${user.token}` };
        await axios.delete(`${import.meta.env.VITE_API_URL}/tds/workspaces/${id}`, { headers });
        toast.success("Deductor successfully delete ho gaya!");
        fetchWorkspaces();
      } catch (error) {
        toast.error("Deductor delete karne mein fail ho gaya.");
      }
    }
  };

  // ==========================================
  // M2: RETURN HANDLERS
  // ==========================================
  const handleInitReturns = async (e) => {
    e.preventDefault();
    try {
      const payload = { 
        tdsWorkspaceId: viewingData._id, 
        financialYear: returnForm.financialYear, 
        formType: returnForm.formType, 
        generateAllQuarters: true 
      };
      await axios.post(`${import.meta.env.VITE_API_URL}/tds/returns`, payload, { headers: { Authorization: `Bearer ${user.token}` } });
      toast.success("Returns initialized successfully!");
      setIsReturnModalOpen(false);
      loadTabSpecificData(viewingData._id, 'returns');
    } catch (error) {
      toast.error(error.response?.data?.message || "Error initializing returns");
    }
  };

  // ==========================================
  // M3: DEDUCTEE HANDLERS
  // ==========================================
  const handleAddDeductee = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...deducteeForm, tdsWorkspaceId: viewingData._id };
      await axios.post(`${import.meta.env.VITE_API_URL}/tds/workspaces/${viewingData._id}/deductees`, payload, { headers: { Authorization: `Bearer ${user.token}` } });
      toast.success("Deductee added successfully!");
      setIsDeducteeModalOpen(false);
      setDeducteeForm({ deducteeName: '', pan: '', panStatus: 'Valid', deducteeType: 'Company', residentialStatus: 'Resident', mobile: '', email: '' });
      loadTabSpecificData(viewingData._id, 'deductees');
    } catch (error) {
      toast.error(error.response?.data?.message || "Error adding deductee");
    }
  };

  // ==========================================
  // M4: CHALLAN HANDLERS
  // ==========================================
  const handleAddChallan = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...challanForm, tdsWorkspaceId: viewingData._id };
      await axios.post(`${import.meta.env.VITE_API_URL}/tds/workspaces/${viewingData._id}/challans`, payload, { headers: { Authorization: `Bearer ${user.token}` } });
      toast.success("Challan added successfully!");
      setIsChallanModalOpen(false);
      setChallanForm({ challanSerialNo: '', bsrCode: '', depositDate: '', tdsAmount: '', interestAmount: 0, lateFeeAmount: 0, otherAmount: 0, depositMode: 'Online', sectionCode: '194C', quarter: 'Q1', financialYear: '2026-27' });
      loadTabSpecificData(viewingData._id, 'challans');
    } catch (error) {
      toast.error(error.response?.data?.message || "Error adding challan");
    }
  };

  // ==========================================
  // M5: DEDUCTION ENTRIES HANDLERS
  // ==========================================
  const openReturnEditor = async (ret) => {
    setSelectedReturn(ret);
    // Ensure Deductees and Challans are loaded for dropdowns
    if(tabData.deductees.length === 0) await loadTabSpecificData(viewingData._id, 'deductees');
    if(tabData.challans.length === 0) await loadTabSpecificData(viewingData._id, 'challans');
    
    try {
      const headers = { Authorization: `Bearer ${user.token}` };
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/tds/returns/${ret._id}/entries`, { headers });
      setEntries(res.data || []);
      setIsEntryModalOpen(true);
    } catch (error) {
      toast.error("Failed to load deduction entries");
    }
  };

  const handleEntryChange = (e) => {
    const { name, value } = e.target;
    setEntryForm(prev => {
      let updated = { ...prev, [name]: value };
      // Auto calculate TDS Deducted & Deposited
      if (name === 'amountPaid' || name === 'tdsRate') {
        const amt = Number(updated.amountPaid || 0);
        const rate = Number(updated.tdsRate || 0);
        updated.tdsDeducted = (amt * rate / 100).toFixed(2);
        updated.tdsDeposited = updated.tdsDeducted;
      }
      return updated;
    });
  };

  const handleAddEntry = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...entryForm, tdsReturnId: selectedReturn._id, tdsWorkspaceId: viewingData._id };
      await axios.post(`${import.meta.env.VITE_API_URL}/tds/returns/${selectedReturn._id}/entries`, payload, { headers: { Authorization: `Bearer ${user.token}` } });
      toast.success("Entry added successfully!");
      
      // Reload Entries
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/tds/returns/${selectedReturn._id}/entries`, { headers: { Authorization: `Bearer ${user.token}` } });
      setEntries(res.data || []);
      
      // Reset Form
      setEntryForm({ tdsDeducteeId: '', tdsChallanId: '', sectionCode: '194C', paymentDate: '', deductionDate: '', amountPaid: '', tdsRate: '', tdsDeducted: '', tdsDeposited: '' });
    } catch (error) {
      toast.error(error.response?.data?.message || "Error adding entry");
    }
  };

  // ==========================================
  // HELPERS
  // ==========================================
  const filteredWorkspaces = useMemo(() => {
    return workspaces.filter(ws => {
      const client = ws.clientMasterId || {};
      const searchStr = searchQuery.toLowerCase();
      const matchesSearch = 
        (ws.companyName?.toLowerCase() || client.name?.toLowerCase() || '').includes(searchStr) || 
        (ws.pan?.toLowerCase() || client.pan?.toLowerCase() || '').includes(searchStr) || 
        (ws.tan?.toLowerCase() || '').includes(searchStr) ||
        (client.clientId?.toLowerCase() || '').includes(searchStr);
      const matchesStatus = statusFilter === 'ALL' || (ws.isActive ? 'Active' : 'Inactive') === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [workspaces, searchQuery, statusFilter]);

  const stats = useMemo(() => ({
    total: workspaces.length,
    active: workspaces.filter(w => w.isActive).length,
  }), [workspaces]);

  const copyToClipboard = (text, type) => {
    if(!text) return;
    navigator.clipboard.writeText(text);
    toast.success(`${type} copied!`, { icon: '📋', style: { borderRadius: '10px', background: '#333', color: '#fff' } });
  };


  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 flex flex-col h-[calc(100vh-80px)] gap-4">
      <Toaster position="top-right" />

      {/* HEADER & METRICS */}
      <div className="flex-none space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
              <FileText size={28} className="text-indigo-600" /> TDS Master Workspace
            </h1>
            <p className="text-sm text-slate-500 mt-1 font-medium">Manage Deductor Profiles, Quarterly Returns, Deductees, and Challans in a unified suite.</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => { setEditingId(null); setFormData(initialWorkspaceForm); setIsModalOpen(true); }} className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold px-5 py-2.5 rounded-xl shadow-md shadow-indigo-500/20 transition-all">
              <Plus size={18} strokeWidth={2.5} /> Onboard Deductor
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 border-l-4 border-l-indigo-500">
            <div className="h-10 w-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold border border-indigo-100 shrink-0"><Building2 size={18} /></div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Deductors</p>
              <h3 className="text-xl font-black text-slate-800">{stats.total}</h3>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 border-l-4 border-l-emerald-500">
            <div className="h-10 w-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold border border-emerald-100 shrink-0"><CheckCircle2 size={18} /></div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Active Profiles</p>
              <h3 className="text-xl font-black text-emerald-700">{stats.active}</h3>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN WORKSPACE AREA */}
      <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden min-h-0">
        <div className="flex-none bg-slate-50/95 backdrop-blur-md z-20 shadow-sm border-b border-slate-200">
          <div className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between bg-white border-b border-slate-100">
            <div className="relative w-full md:w-1/3">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Search by Deductor Name, PAN, TAN or ID..." 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
                className="w-full pl-9 pr-3.5 py-2.5 text-sm font-medium bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-sm" 
              />
            </div>
          </div>
          <div className="w-full text-left bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-wider flex pr-4">
             <div className="py-3 px-8 w-[35%]">Deductor Details</div>
             <div className="py-3 px-5 w-[20%]">Identifiers (PAN/TAN)</div>
             <div className="py-3 px-5 w-[25%]">Contact & Type</div>
             <div className="py-3 px-5 flex-1 text-right">Actions</div>
          </div>
        </div>

        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead className="hidden">
              <tr><th className="w-[35%]"></th><th className="w-[20%]"></th><th className="w-[25%]"></th><th className="flex-1"></th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-700">
              {loading ? (
                <tr><td colSpan="4" className="text-center py-16 text-slate-400"><RefreshCw className="animate-spin inline-block mr-2" size={18}/> Loading Deductor Master...</td></tr>
              ) : filteredWorkspaces.length === 0 ? (
                <tr><td colSpan="4" className="text-center py-16 text-slate-400 flex flex-col items-center"><AlertCircle size={36} className="mb-3 text-slate-300"/> No Deductors found.</td></tr>
              ) : (
                filteredWorkspaces.map((ws) => {
                  const client = ws.clientMasterId || {};
                  return (
                    <tr key={ws._id} className="hover:bg-indigo-50/30 transition-colors group">
                      <td className="py-4 px-6 w-[35%]">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-sm shrink-0 border border-indigo-200">
                            {ws.companyName ? ws.companyName.charAt(0).toUpperCase() : 'C'}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-800 text-base">{ws.companyName}</span>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              {client.clientId && (
                                <span className="text-[10px] font-black uppercase bg-slate-200/70 text-slate-600 px-1.5 py-0.5 rounded border border-slate-300 tracking-wider">
                                  ID: {client.clientId}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-5 w-[20%]">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2 group/copy cursor-pointer" onClick={() => copyToClipboard(ws.tan, 'TAN')}>
                            <span className="text-[10px] font-bold text-slate-400 uppercase w-6">TAN</span>
                            <span className="font-mono font-bold text-indigo-700 uppercase bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 group-hover/copy:bg-indigo-100 transition-colors">{ws.tan || 'N/A'}</span>
                          </div>
                          <div className="flex items-center gap-2 group/copy cursor-pointer" onClick={() => copyToClipboard(ws.pan, 'PAN')}>
                            <span className="text-[10px] font-bold text-slate-400 uppercase w-6">PAN</span>
                            <span className="font-mono font-bold text-slate-600 uppercase bg-slate-100 px-2 py-0.5 rounded border border-slate-200 group-hover/copy:bg-slate-200 transition-colors">{ws.pan || 'N/A'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-5 w-[25%]">
                        <div className="flex flex-col gap-1">
                           <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5"><Users size={12} className="text-slate-400"/> {ws.responsiblePerson?.name || 'N/A'}</span>
                           <span className="text-[10px] font-bold text-slate-500 mt-1 uppercase">Type: {ws.deductorCategory}</span>
                        </div>
                      </td>
                      <td className="py-4 px-5 flex-1 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => handleEditWorkspace(ws)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-transparent" title="Edit Deductor">
                            <Pencil size={16}/>
                          </button>
                          <button onClick={() => handleDeleteWorkspace(ws._id, ws.companyName)} className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-transparent" title="Delete Deductor">
      <Trash2 size={16}/>
    </button>
                          <button onClick={() => handleOpenView(ws)} className="px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white rounded-xl transition-colors border border-indigo-200 text-xs font-bold flex items-center gap-2 shadow-sm" title="View Profile">
                            <Eye size={16} strokeWidth={2.5}/> View Profile
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

      {/* 🔴 FULL VIEW MODAL (THE 360 TDS SUITE) */}
      {isViewModalOpen && viewingData && (
        <div className="fixed inset-0 z-[50] bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-slate-50 rounded-3xl w-full max-w-6xl shadow-2xl border border-slate-100 flex flex-col h-[90vh] overflow-hidden animate-in fade-in zoom-in-95">
            
            {/* Header Area */}
            <div className="relative px-8 pt-6 pb-6 bg-gradient-to-r from-indigo-800 to-blue-900 text-white flex justify-between items-center overflow-hidden shrink-0">
              <div className="absolute top-0 right-0 -mt-10 -mr-10 h-40 w-40 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
              <div className="flex items-center gap-5 z-10">
                <div className="h-14 w-14 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md border border-white/30 shadow-inner shrink-0">
                  <Building2 size={28} className="text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-black tracking-tight flex items-center gap-3">
                    {viewingData.companyName}
                    <span className="text-[10px] font-black uppercase bg-white/20 px-2 py-0.5 rounded-full border border-white/30 tracking-wider">
                      {viewingData.deductorCategory}
                    </span>
                  </h2>
                  <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-indigo-100 font-medium">
                    <span className="flex items-center gap-1 cursor-pointer hover:text-white transition-colors" onClick={() => copyToClipboard(viewingData.tan, 'TAN')}>
                      <span className="opacity-70">TAN:</span> <span className="font-mono font-bold tracking-wider">{viewingData.tan}</span>
                    </span>
                    <span className="opacity-40">|</span>
                    <span className="flex items-center gap-1 cursor-pointer hover:text-white transition-colors" onClick={() => copyToClipboard(viewingData.pan, 'PAN')}>
                      <span className="opacity-70">PAN:</span> <span className="font-mono font-bold tracking-wider">{viewingData.pan}</span>
                    </span>
                  </div>
                </div>
              </div>
              <button onClick={() => setIsViewModalOpen(false)} className="z-10 p-2 rounded-full bg-black/10 hover:bg-black/30 text-white transition-colors shrink-0"><X size={20} strokeWidth={2.5} /></button>
            </div>
            
            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 px-6 bg-white border-b border-slate-200 shrink-0 overflow-x-auto custom-scrollbar pt-2">
              {[
                { id: 'profile', icon: <Building2 size={16}/>, label: 'Master Profile (M1)' }, // 🔴 NEW TAB
                { id: 'returns', icon: <FileText size={16}/>, label: 'Quarterly Returns (M2)' },
                { id: 'deductees', icon: <Users size={16}/>, label: 'Deductee Master (M3)' },
                { id: 'challans', icon: <Receipt size={16}/>, label: 'Challan Bank (M4)' }
              ].map(tab => (
                <button 
                  key={tab.id} 
                  onClick={() => handleTabChange(tab.id)} 
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${activeTab === tab.id ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50' : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 custom-scrollbar relative min-h-0">
              {loadingTabData && (
                <div className="absolute inset-0 bg-slate-50/80 backdrop-blur-sm z-20 flex items-center justify-center">
                  <div className="flex items-center gap-2 text-indigo-600 font-bold bg-white px-4 py-2 rounded-full shadow-lg border border-indigo-100">
                    <Loader2 size={18} className="animate-spin"/> Loading data...
                  </div>
                </div>
              )}

              {/* 🟢 TAB 0: MASTER PROFILE (M1) */}
              {activeTab === 'profile' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Person Responsible */}
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                        <Users size={14}/> Responsible Person
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Name</p>
                          <p className="text-sm font-bold text-slate-800">{viewingData.responsiblePerson?.name || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Designation</p>
                          <p className="text-sm font-semibold text-slate-800">{viewingData.responsiblePerson?.designation || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">PAN</p>
                          <p className="text-sm font-mono font-bold text-indigo-700">{viewingData.responsiblePerson?.pan || 'N/A'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Contact Details */}
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                        <MapPin size={14}/> Contact & Billing
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Mobile</p>
                          <p className="text-sm font-bold text-slate-800">{viewingData.mobile || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Email</p>
                          <p className="text-sm font-semibold text-slate-800">{viewingData.email || 'N/A'}</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Address</p>
                          <p className="text-sm font-semibold text-slate-800">
                            {[viewingData.address, viewingData.city, viewingData.state, viewingData.pinCode].filter(Boolean).join(', ') || 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* TRACES Login */}
                    <div className="bg-rose-50/50 p-5 rounded-2xl shadow-sm border border-rose-100">
                      <h3 className="text-xs font-black uppercase tracking-wider text-rose-800 mb-4 flex items-center gap-2">
                        <Key size={14}/> TRACES Login
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">User ID</p>
                          <p className="text-sm font-bold text-slate-800">{viewingData.tracesLogin?.userId || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Password</p>
                          <p className="text-sm font-mono font-bold text-rose-600 flex items-center gap-2">
                            {viewingData.tracesLogin?.password || 'N/A'}
                            {viewingData.tracesLogin?.password && (
                              <button onClick={() => copyToClipboard(viewingData.tracesLogin.password, 'Password')} className="text-rose-400 hover:text-rose-700 transition-colors"><Copy size={14}/></button>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* E-Filing Login */}
                    <div className="bg-indigo-50/50 p-5 rounded-2xl shadow-sm border border-indigo-100">
                      <h3 className="text-xs font-black uppercase tracking-wider text-indigo-800 mb-4 flex items-center gap-2">
                        <Key size={14}/> E-Filing Login
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">User ID</p>
                          <p className="text-sm font-bold text-slate-800">{viewingData.efilingLogin?.userId || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Password</p>
                          <p className="text-sm font-mono font-bold text-indigo-600 flex items-center gap-2">
                            {viewingData.efilingLogin?.password || 'N/A'}
                            {viewingData.efilingLogin?.password && (
                              <button onClick={() => copyToClipboard(viewingData.efilingLogin.password, 'Password')} className="text-indigo-400 hover:text-indigo-700 transition-colors"><Copy size={14}/></button>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 🟢 TAB 1: RETURNS (M2) */}
              {/* 🟢 TAB 1: RETURNS (M2) */}
{activeTab === 'returns' && (
  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
    <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
      <div>
        <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Financial Year Tracking</h3>
        <p className="text-xs text-slate-500">Manage all Q1-Q4 returns here.</p>
      </div>
      <button onClick={() => setIsReturnModalOpen(true)} className="text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-sm shrink-0">
        <Plus size={14}/> Init New FY Returns
      </button>
    </div>
    
    {tabData.returns.length === 0 ? (
      <div className="text-center py-10 bg-white rounded-2xl border border-slate-200 border-dashed">
        <p className="text-sm font-bold text-slate-400">No returns found. Initialize a financial year to auto-create quarters.</p>
      </div>
    ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {tabData.returns.map(ret => (
          <div key={ret._id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group flex flex-col justify-between relative">
            
            {/* 🔴 DELETE BUTTON FOR RETURN */}
            <button 
              onClick={async () => {
                if(window.confirm('Are you sure you want to delete this return layer?')) {
                  try {
                    const headers = { Authorization: `Bearer ${user.token}` };
                    await axios.delete(`${import.meta.env.VITE_API_URL}/tds/returns/${ret._id}`, { headers });
                    toast.success("Return deleted successfully!");
                    loadTabSpecificData(viewingData._id, 'returns');
                  } catch (err) { toast.error("Failed to delete return"); }
                }
              }} 
              className="absolute top-3 right-3 text-slate-300 hover:text-rose-600 transition-colors p-1" 
              title="Delete Return"
            >
              <Trash2 size={15}/>
            </button>

            <div>
              <div className="flex justify-between items-start mb-3 border-b border-slate-100 pb-3 pr-6">
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400">{ret.financialYear}</span>
                  <h4 className="text-lg font-black text-indigo-700 flex items-center gap-1">{ret.quarter} <span className="text-xs font-bold text-slate-500 bg-slate-100 px-1.5 rounded">{ret.formType}</span></h4>
                </div>
              </div>
              <div className="space-y-2 mb-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-500">Status</span>
                  <span className="text-[9px] font-bold uppercase bg-amber-100 text-amber-700 px-2 py-0.5 rounded border border-amber-200">{ret.status}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-500">Type</span>
                  <span className="font-semibold text-slate-800">{ret.returnType}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-500">Due Date</span>
                  <span className="font-semibold text-rose-600">
                    {ret.dueDate ? new Date(ret.dueDate).toLocaleDateString('en-IN') : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
            
            <button onClick={() => openReturnEditor(ret)} className="w-full mt-2 bg-slate-50 hover:bg-indigo-50 text-indigo-700 border border-slate-200 hover:border-indigo-200 text-xs font-bold py-2 rounded-xl transition-all flex items-center justify-center gap-1 shrink-0">
              Open Editor <ArrowRight size={14}/>
            </button>
          </div>
        ))}
      </div>
    )}
  </div>
)}

              {/* 🟢 TAB 2: DEDUCTEES (M3) */}
              {activeTab === 'deductees' && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-2 flex flex-col min-h-0 h-full">
                  <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2"><Users size={16} className="text-indigo-600"/> Master Deductee List</h3>
                    <div className="flex gap-2">
                      <button onClick={() => setIsDeducteeModalOpen(true)} className="text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg flex items-center gap-1 shadow-sm shrink-0"><Plus size={14}/> Add New Deductee</button>
                    </div>
                  </div>
                  {tabData.deductees.length === 0 ? (
                    <div className="text-center py-10">
                      <p className="text-sm font-bold text-slate-400">No deductees found. Add manually to maintain the register.</p>
                    </div>
                  ) : (
                    <div className="overflow-auto custom-scrollbar flex-1 min-h-0">
                      <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 bg-slate-50 z-10">
                          <tr className="border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                            <th className="py-3 px-4">Deductee Name</th>
                            <th className="py-3 px-4">PAN & Status</th>
                            <th className="py-3 px-4">Classification</th>
                            <th className="py-3 px-4">Contact</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                          {tabData.deductees.map(d => (
                            <tr key={d._id} className="hover:bg-slate-50">
                              <td className="py-3 px-4 font-bold text-slate-800">{d.deducteeName}</td>
                              <td className="py-3 px-4">
                                <span className="font-mono font-bold text-indigo-700 block">{d.pan}</span>
                                <span className={`text-[9px] uppercase font-bold ${d.panStatus === 'Valid' ? 'text-emerald-600' : 'text-rose-500'}`}>{d.panStatus}</span>
                              </td>
                              <td className="py-3 px-4">
                                <span className="block font-bold">{d.deducteeType}</span>
                                <span className="text-[9px] uppercase font-bold text-slate-400">{d.residentialStatus}</span>
                              </td>
                              <td className="py-3 px-4">
                                <p>{d.mobile || '-'}</p>
                                <p className="text-[10px] text-slate-500">{d.email || '-'}</p>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* 🟢 TAB 3: CHALLANS (M4) */}
              {activeTab === 'challans' && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-2 flex flex-col min-h-0 h-full">
                  <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2"><Receipt size={16} className="text-indigo-600"/> Challan Repository</h3>
                    <button onClick={() => setIsChallanModalOpen(true)} className="text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg flex items-center gap-1 shadow-sm shrink-0"><Plus size={14}/> Add Challan</button>
                  </div>
                  {tabData.challans.length === 0 ? (
                    <div className="text-center py-10">
                      <p className="text-sm font-bold text-slate-400">No challans recorded yet.</p>
                    </div>
                  ) : (
                    <div className="overflow-auto custom-scrollbar flex-1 min-h-0">
                      <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 bg-slate-50 z-10">
                          <tr className="border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                            <th className="py-3 px-4">Challan Serial No</th>
                            <th className="py-3 px-4">BSR Code</th>
                            <th className="py-3 px-4">Deposit Date</th>
                            <th className="py-3 px-4">Section & Quarter</th>
                            <th className="py-3 px-4 text-right">Total Amount (₹)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                          {tabData.challans.map(c => (
                            <tr key={c._id} className="hover:bg-slate-50">
                              <td className="py-3 px-4 font-mono font-bold text-indigo-700">{c.challanSerialNo}</td>
                              <td className="py-3 px-4 font-mono font-bold">{c.bsrCode}</td>
                              <td className="py-3 px-4 font-bold">{new Date(c.depositDate).toLocaleDateString('en-IN')}</td>
                              <td className="py-3 px-4">
                                <span className="font-bold bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded border border-slate-300">{c.sectionCode}</span>
                                <span className="ml-2 font-bold text-slate-500">{c.quarter} ({c.financialYear})</span>
                              </td>
                              <td className="py-3 px-4 text-right font-black text-emerald-600 text-sm">{c.totalAmount.toLocaleString('en-IN')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          MODALS FOR M1, M2, M3, M4, M5
          ========================================== */}

      {/* ADD / EDIT TDS WORKSPACE MODAL (M1) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-5xl shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/80 shrink-0">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Building2 className="text-indigo-600" size={20}/> {editingId ? 'Edit Deductor Profile' : 'Onboard Deductor'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors"><X size={18} /></button>
            </div>
            <form onSubmit={handleSaveWorkspace} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-slate-50/30 min-h-0">
              {/* SECTION 1: CORE IDENTIFIERS */}
              <div className="bg-indigo-50/40 p-5 rounded-2xl border border-indigo-100">
                <h3 className="text-xs font-bold text-indigo-800 uppercase tracking-wider border-b border-indigo-200/50 pb-2 mb-4 flex items-center gap-2">
                    <ShieldCheck size={14}/> Core Entity Details (Master Link)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-1 relative">
                    <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Company PAN *</label>
                    <input type="text" required maxLength="10" value={formData.pan} onChange={handlePanChange} onBlur={() => setTimeout(() => setShowSuggestions(false), 200)} autoComplete="off" disabled={editingId} placeholder="ABCDE1234F" className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-black text-slate-800 uppercase tracking-widest bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none disabled:bg-slate-100 disabled:text-slate-400 relative z-10" />
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
                  <div className="md:col-span-1">
                    <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">TAN Number *</label>
                    <input type="text" required maxLength="10" value={formData.tan} onChange={(e) => setFormData({...formData, tan: e.target.value.toUpperCase()})} placeholder="DELA12345B" className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-black text-indigo-700 bg-white uppercase tracking-widest focus:ring-2 focus:ring-indigo-500/20"/>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Deductor Name *</label>
                    <input type="text" required value={formData.companyName} onChange={(e) => setFormData({...formData, companyName: e.target.value})} disabled={editingId} placeholder="e.g. Taxbucket Tech Pvt Ltd" className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-semibold bg-white disabled:bg-slate-100 disabled:text-slate-400 focus:ring-2 focus:ring-indigo-500/20"/>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Deductor Category</label>
                    <select value={formData.deductorCategory} onChange={(e) => setFormData({...formData, deductorCategory: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 bg-white focus:ring-2 focus:ring-indigo-500/20">
                      {['Company', 'Firm', 'Individual', 'HUF', 'AOP/BOI', 'Trust', 'Local Authority', 'Central Govt', 'State Govt', 'Other'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Deductor Type Code (For FVU)</label>
                    <select value={formData.deductorTypeCode} onChange={(e) => setFormData({...formData, deductorTypeCode: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 bg-white focus:ring-2 focus:ring-indigo-500/20">
                      {['Central Govt', 'State Govt', 'Statutory Body', 'Company', 'Other than Company', 'Non-resident'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION 2: RESPONSIBLE PERSON */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-2 mb-4 flex items-center gap-2"><Users size={14}/> Person Responsible For Deduction</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Full Name</label>
                    <input type="text" value={formData.responsiblePerson.name} onChange={(e) => setFormData({...formData, responsiblePerson: {...formData.responsiblePerson, name: e.target.value}})} placeholder="e.g. Ramesh Kumar" className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500/20"/>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Designation</label>
                    <input type="text" value={formData.responsiblePerson.designation} onChange={(e) => setFormData({...formData, responsiblePerson: {...formData.responsiblePerson, designation: e.target.value}})} placeholder="e.g. Director" className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500/20"/>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Person's PAN</label>
                    <input type="text" maxLength="10" value={formData.responsiblePerson.pan} onChange={(e) => setFormData({...formData, responsiblePerson: {...formData.responsiblePerson, pan: e.target.value.toUpperCase()}})} placeholder="ABCDE1234F" className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-mono font-bold uppercase focus:ring-2 focus:ring-indigo-500/20"/>
                  </div>
                </div>
              </div>

              {/* SECTION 3: PORTAL LOGINS (ENCRYPTED) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-rose-50/50 p-5 rounded-2xl border border-rose-100 shadow-sm">
                  <h3 className="text-xs font-bold text-rose-800 uppercase tracking-wider border-b border-rose-200/50 pb-2 mb-4 flex items-center gap-2"><Key size={14}/> TRACES Portal Login</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">User ID</label>
                      <input type="text" value={formData.tracesLogin.userId} onChange={(e) => setFormData({...formData, tracesLogin: {...formData.tracesLogin, userId: e.target.value}})} className="w-full p-2.5 border border-slate-200 bg-white rounded-xl text-sm font-semibold focus:ring-2 focus:ring-rose-500/20"/>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Password (Encrypted Storage)</label>
                      <input type="text" value={formData.tracesLogin.password} onChange={(e) => setFormData({...formData, tracesLogin: {...formData.tracesLogin, password: e.target.value}})} placeholder="••••••••" className="w-full p-2.5 border border-slate-200 bg-white rounded-xl text-sm font-semibold focus:ring-2 focus:ring-rose-500/20"/>
                    </div>
                  </div>
                </div>
                <div className="bg-indigo-50/50 p-5 rounded-2xl border border-indigo-100 shadow-sm">
                  <h3 className="text-xs font-bold text-indigo-800 uppercase tracking-wider border-b border-indigo-200/50 pb-2 mb-4 flex items-center gap-2"><Key size={14}/> E-Filing Portal Login</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">User ID (Usually TAN)</label>
                      <input type="text" value={formData.efilingLogin.userId} onChange={(e) => setFormData({...formData, efilingLogin: {...formData.efilingLogin, userId: e.target.value}})} className="w-full p-2.5 border border-slate-200 bg-white rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500/20"/>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Password (Encrypted Storage)</label>
                      <input type="text" value={formData.efilingLogin.password} onChange={(e) => setFormData({...formData, efilingLogin: {...formData.efilingLogin, password: e.target.value}})} placeholder="••••••••" className="w-full p-2.5 border border-slate-200 bg-white rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500/20"/>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100 shrink-0">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">Cancel</button>
                <button type="submit" disabled={saving} className="px-8 py-2.5 text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md shadow-indigo-500/20 transition-all flex items-center gap-2 disabled:opacity-50">
                  {saving ? <Loader2 size={18} className="animate-spin"/> : <CheckCircle2 size={18} />} 
                  {editingId ? 'Save Changes' : 'Initialize Workspace'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INIT RETURNS MODAL (M2) */}
      {isReturnModalOpen && (
        <div className="fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">Initialize Financial Year</h2>
              <button onClick={() => setIsReturnModalOpen(false)} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/50"><X size={18} /></button>
            </div>
            <form onSubmit={handleInitReturns} className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Financial Year</label>
                <select value={returnForm.financialYear} onChange={(e) => setReturnForm({...returnForm, financialYear: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-bold">
                  <option value="2026-27">2026-27</option>
                  <option value="2025-26">2025-26</option>
                  <option value="2024-25">2024-25</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Form Type</label>
                <select value={returnForm.formType} onChange={(e) => setReturnForm({...returnForm, formType: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-bold">
                  <option value="24Q">24Q (Salary)</option>
                  <option value="26Q">26Q (Non-Salary)</option>
                  <option value="27Q">27Q (Non-Resident)</option>
                  <option value="27EQ">27EQ (TCS)</option>
                </select>
              </div>
              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button type="button" onClick={() => setIsReturnModalOpen(false)} className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 text-xs font-bold bg-indigo-600 text-white rounded-lg">Generate All Quarters</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD DEDUCTEE MODAL (M3) */}
      {isDeducteeModalOpen && (
        <div className="fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800">Add New Deductee</h2>
              <button onClick={() => setIsDeducteeModalOpen(false)} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/50"><X size={18} /></button>
            </div>
            <form onSubmit={handleAddDeductee} className="p-6 grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Deductee Name *</label>
                <input type="text" required value={deducteeForm.deducteeName} onChange={(e) => setDeducteeForm({...deducteeForm, deducteeName: e.target.value})} className="w-full p-2 border rounded-lg text-sm font-semibold"/>
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">PAN *</label>
                <input type="text" required value={deducteeForm.pan} onChange={(e) => setDeducteeForm({...deducteeForm, pan: e.target.value.toUpperCase()})} className="w-full p-2 border rounded-lg text-sm font-bold uppercase"/>
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">PAN Status</label>
                <select value={deducteeForm.panStatus} onChange={(e) => setDeducteeForm({...deducteeForm, panStatus: e.target.value})} className="w-full p-2 border rounded-lg text-sm font-semibold">
                  <option value="Valid">Valid</option>
                  <option value="Invalid">Invalid</option>
                  <option value="Not available">Not available</option>
                  <option value="Applied for">Applied for</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Deductee Type</label>
                <select value={deducteeForm.deducteeType} onChange={(e) => setDeducteeForm({...deducteeForm, deducteeType: e.target.value})} className="w-full p-2 border rounded-lg text-sm font-semibold">
                  <option value="Company">Company</option>
                  <option value="Non-company">Non-company</option>
                  <option value="Non-resident">Non-resident</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Residential Status</label>
                <select value={deducteeForm.residentialStatus} onChange={(e) => setDeducteeForm({...deducteeForm, residentialStatus: e.target.value})} className="w-full p-2 border rounded-lg text-sm font-semibold">
                  <option value="Resident">Resident</option>
                  <option value="Non-resident">Non-resident</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Mobile</label>
                <input type="text" value={deducteeForm.mobile} onChange={(e) => setDeducteeForm({...deducteeForm, mobile: e.target.value})} className="w-full p-2 border rounded-lg text-sm font-semibold"/>
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Email</label>
                <input type="email" value={deducteeForm.email} onChange={(e) => setDeducteeForm({...deducteeForm, email: e.target.value})} className="w-full p-2 border rounded-lg text-sm font-semibold"/>
              </div>
              <div className="col-span-2 pt-4 border-t flex justify-end gap-2">
                <button type="button" onClick={() => setIsDeducteeModalOpen(false)} className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 text-xs font-bold bg-indigo-600 text-white rounded-lg">Save Deductee</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD CHALLAN MODAL (M4) */}
      {isChallanModalOpen && (
        <div className="fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800">Add Challan Record</h2>
              <button onClick={() => setIsChallanModalOpen(false)} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/50"><X size={18} /></button>
            </div>
            <form onSubmit={handleAddChallan} className="p-6 grid grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Serial No *</label>
                <input type="text" required maxLength="5" value={challanForm.challanSerialNo} onChange={(e) => setChallanForm({...challanForm, challanSerialNo: e.target.value})} className="w-full p-2 border rounded-lg text-sm font-mono font-bold"/>
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">BSR Code *</label>
                <input type="text" required maxLength="7" value={challanForm.bsrCode} onChange={(e) => setChallanForm({...challanForm, bsrCode: e.target.value})} className="w-full p-2 border rounded-lg text-sm font-mono font-bold"/>
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Deposit Date *</label>
                <input type="date" required value={challanForm.depositDate} onChange={(e) => setChallanForm({...challanForm, depositDate: e.target.value})} className="w-full p-2 border rounded-lg text-sm font-semibold"/>
              </div>
              
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">TDS Amount (₹) *</label>
                <input type="number" required value={challanForm.tdsAmount} onChange={(e) => setChallanForm({...challanForm, tdsAmount: e.target.value})} className="w-full p-2 border rounded-lg text-sm font-bold text-emerald-600"/>
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Interest (₹)</label>
                <input type="number" value={challanForm.interestAmount} onChange={(e) => setChallanForm({...challanForm, interestAmount: e.target.value})} className="w-full p-2 border rounded-lg text-sm font-semibold"/>
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Late Fee / Other (₹)</label>
                <input type="number" value={challanForm.lateFeeAmount} onChange={(e) => setChallanForm({...challanForm, lateFeeAmount: e.target.value})} className="w-full p-2 border rounded-lg text-sm font-semibold"/>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Section</label>
                <input type="text" value={challanForm.sectionCode} onChange={(e) => setChallanForm({...challanForm, sectionCode: e.target.value.toUpperCase()})} className="w-full p-2 border rounded-lg text-sm font-bold"/>
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Quarter</label>
                <select value={challanForm.quarter} onChange={(e) => setChallanForm({...challanForm, quarter: e.target.value})} className="w-full p-2 border rounded-lg text-sm font-bold">
                  <option value="Q1">Q1</option><option value="Q2">Q2</option><option value="Q3">Q3</option><option value="Q4">Q4</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Fin Year</label>
                <input type="text" value={challanForm.financialYear} onChange={(e) => setChallanForm({...challanForm, financialYear: e.target.value})} className="w-full p-2 border rounded-lg text-sm font-bold"/>
              </div>

              <div className="col-span-3 pt-4 border-t flex justify-end gap-2">
                <button type="button" onClick={() => setIsChallanModalOpen(false)} className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 text-xs font-bold bg-indigo-600 text-white rounded-lg">Save Challan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RETURN EDITOR MODAL (M5 - ENTRIES) */}
      {isEntryModalOpen && selectedReturn && (
        <div className="fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-6xl shadow-2xl border border-slate-100 flex flex-col h-[90vh] overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-indigo-800 text-white shrink-0">
              <div>
                <h2 className="text-lg font-black flex items-center gap-2">
                  <FileDigit size={20}/> Return Editor: {selectedReturn.formType} ({selectedReturn.quarter} {selectedReturn.financialYear})
                </h2>
              </div>
              <button onClick={() => setIsEntryModalOpen(false)} className="p-2 rounded-xl bg-white/10 hover:bg-white/20"><X size={18} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 flex flex-col gap-6 custom-scrollbar min-h-0">
              
              {/* Existing Entries Table */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col flex-1 min-h-[250px]">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Deduction Entries (M5)</h3>
                </div>
                <div className="overflow-auto custom-scrollbar flex-1 min-h-0">
                  <table className="w-full text-left border-collapse relative">
                    <thead className="sticky top-0 bg-white shadow-sm z-10">
                      <tr className="border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                        <th className="py-2 px-4">Deductee</th>
                        <th className="py-2 px-4">Challan Info</th>
                        <th className="py-2 px-4">Section</th>
                        <th className="py-2 px-4">Dates</th>
                        <th className="py-2 px-4 text-right">Amt Paid</th>
                        <th className="py-2 px-4 text-right">TDS (Ded/Dep)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                      {entries.length === 0 ? (
                        <tr><td colSpan="6" className="text-center py-6 text-slate-400">No entries found for this return. Add below.</td></tr>
                      ) : (
                        entries.map(ent => (
                          <tr key={ent._id} className="hover:bg-slate-50">
                            <td className="py-2 px-4">
                              <span className="font-bold text-slate-800 block">{ent.tdsDeducteeId?.deducteeName}</span>
                              <span className="font-mono text-[9px]">{ent.tdsDeducteeId?.pan}</span>
                            </td>
                            <td className="py-2 px-4">
                              <span className="font-mono font-bold text-indigo-700 block">{ent.tdsChallanId?.challanSerialNo}</span>
                              <span className="text-[9px] text-slate-500">BSR: {ent.tdsChallanId?.bsrCode}</span>
                            </td>
                            <td className="py-2 px-4 font-bold">{ent.sectionCode}</td>
                            <td className="py-2 px-4 text-[10px]">
                              <p>Pay: {new Date(ent.paymentDate).toLocaleDateString()}</p>
                              <p>Ded: {new Date(ent.deductionDate).toLocaleDateString()}</p>
                            </td>
                            <td className="py-2 px-4 text-right font-bold text-slate-800">₹{ent.amountPaid}</td>
                            <td className="py-2 px-4 text-right">
                              <p className="font-bold text-rose-600">₹{ent.tdsDeducted} @ {ent.tdsRate}%</p>
                              <p className="font-bold text-emerald-600 text-[10px]">Dep: ₹{ent.tdsDeposited}</p>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Add New Entry Form */}
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 shrink-0">
                <h3 className="text-xs font-bold text-indigo-800 uppercase tracking-wider mb-4 border-b pb-2">Add New Deduction Entry</h3>
                <form onSubmit={handleAddEntry} className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Select Deductee *</label>
                    <select required name="tdsDeducteeId" value={entryForm.tdsDeducteeId} onChange={handleEntryChange} className="w-full p-2 border rounded-lg text-sm font-semibold">
                      <option value="">-- Choose Deductee --</option>
                      {tabData.deductees.map(d => <option key={d._id} value={d._id}>{d.deducteeName} ({d.pan})</option>)}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Select Challan *</label>
                    <select required name="tdsChallanId" value={entryForm.tdsChallanId} onChange={handleEntryChange} className="w-full p-2 border rounded-lg text-sm font-semibold">
                      <option value="">-- Choose Challan --</option>
                      {tabData.challans.map(c => <option key={c._id} value={c._id}>SNo: {c.challanSerialNo} | Amt: ₹{c.totalAmount}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Section</label>
                    <input type="text" required name="sectionCode" value={entryForm.sectionCode} onChange={handleEntryChange} className="w-full p-2 border rounded-lg text-sm font-bold"/>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Payment Date</label>
                    <input type="date" required name="paymentDate" value={entryForm.paymentDate} onChange={handleEntryChange} className="w-full p-2 border rounded-lg text-sm"/>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Deduction Date</label>
                    <input type="date" required name="deductionDate" value={entryForm.deductionDate} onChange={handleEntryChange} className="w-full p-2 border rounded-lg text-sm"/>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Amount Paid (₹)</label>
                    <input type="number" required name="amountPaid" value={entryForm.amountPaid} onChange={handleEntryChange} className="w-full p-2 border rounded-lg text-sm font-bold text-slate-800"/>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">TDS Rate (%)</label>
                    <input type="number" step="0.01" required name="tdsRate" value={entryForm.tdsRate} onChange={handleEntryChange} className="w-full p-2 border rounded-lg text-sm font-bold"/>
                  </div>
                  <div className="md:col-span-1 grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Deducted(₹)</label>
                      <input type="number" required name="tdsDeducted" value={entryForm.tdsDeducted} onChange={handleEntryChange} className="w-full p-2 border rounded-lg text-sm font-bold text-rose-600"/>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Deposited(₹)</label>
                      <input type="number" required name="tdsDeposited" value={entryForm.tdsDeposited} onChange={handleEntryChange} className="w-full p-2 border rounded-lg text-sm font-bold text-emerald-600"/>
                    </div>
                  </div>

                  <div className="md:col-span-5 flex justify-end mt-2 pt-4 border-t border-slate-100">
                    <button type="submit" className="bg-indigo-600 text-white text-xs font-bold px-6 py-2.5 rounded-lg hover:bg-indigo-700">Add Entry +</button>
                  </div>
                </form>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default TdsWorkspace;