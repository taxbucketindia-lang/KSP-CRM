import { isAdminRole } from '../utils/roles';
import React, { useState, useEffect, useContext, useMemo, useRef } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import toast, { Toaster } from 'react-hot-toast';
import { 
  Briefcase, Search, Plus, X, FileText, CheckCircle2, AlertCircle, 
  RefreshCw, Eye, Building2, Calendar, FileDigit, UploadCloud, Users, 
  Settings, CheckSquare, Pencil, Trash2, Loader2, Link, MessageSquare 
} from 'lucide-react';

const AuditWorkspace = () => {
  const { user } = useContext(AuthContext);
  
  // STATES
  const [audits, setAudits] = useState([]);
  const [clients, setClients] = useState([]);
  const [auditorsMaster, setAuditorsMaster] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  
  const [fetchingPan, setFetchingPan] = useState(false);
  const [panSuggestions, setPanSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // 🔴 Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const itemsPerPage = 10;

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('engagement');
  
  const [isAuditorModalOpen, setIsAuditorModalOpen] = useState(false);
  const [isUdinModalOpen, setIsUdinModalOpen] = useState(false);
  const [isFilingModalOpen, setIsFilingModalOpen] = useState(false);
  const [isChecklistModalOpen, setIsChecklistModalOpen] = useState(false);
  const [isAddAuditorMasterOpen, setIsAddAuditorMasterOpen] = useState(false);
  
  const [isEditEngagementModalOpen, setIsEditEngagementModalOpen] = useState(false);
  const [isEditClientModalOpen, setIsEditClientModalOpen] = useState(false); 

  const [quickRemarksModal, setQuickRemarksModal] = useState({ open: false, audit: null, newRemark: '' });

  const [editingIds, setEditingIds] = useState({ auditor: null, udin: null, filing: null, checklist: null });

  const [viewingAudit, setViewingAudit] = useState(null);
  const [tabData, setTabData] = useState({ auditors: [], udins: [], filings: [], checklists: [] });
  const [loadingTabData, setLoadingTabData] = useState(false);

  // Forms
  const initialAuditForm = {
    client_id: '', pan: '', clientName: '', audit_type: 'Tax Audit', financial_year: '2026-27', 
    books_period_from: '', books_period_to: '', applicability_reason: 'Turnover above limit',
    engagement_status: 'Data pending', fee_status: 'Pending', turnover_gross_receipts: ''
  };
  const [auditForm, setAuditForm] = useState(initialAuditForm);

  const initialAuditorForm = { auditor_id: '', role: 'Signing', appointment_date: '', appointment_mode: 'Engagement letter', appointment_form_srn: '', tenure_from: '', tenure_to: '', remuneration: '' };
  const [auditorForm, setAuditorForm] = useState(initialAuditorForm);
  
  const initialUdinForm = { document_type: 'Tax Audit Report', document_date: '', udin_no: '', udin_generated_date: '', udin_status: 'Generated', remarks: '', signed_copy_file: null };
  const [udinForm, setUdinForm] = useState(initialUdinForm);
  
  const initialFilingForm = { form_name: 'Tax audit report', filing_portal: 'Income Tax portal', filing_status: 'Pending', acknowledgement_srn_no: '', uploaded_by_auditor_date: '', client_approval_date: '', filed_date: '', late_fee: '', remarks: '', proof_file: null };
  const [filingForm, setFilingForm] = useState(initialFilingForm);
  
  const initialChecklistForm = { item: 'Trial balance', status: 'Pending', received_date: '', remarks: '', file: null };
  const [checklistForm, setChecklistForm] = useState(initialChecklistForm);

  const [newAuditorForm, setNewAuditorForm] = useState({
    firm_name: '', firm_frn: '', signing_person_name: '', designation: 'Partner',
    membership_no: '', auditor_pan: '', address: '', city: '', state: '', pincode: '',
    email: '', mobile: '', is_internal: false
  });

  const [editEngagementForm, setEditEngagementForm] = useState({
    audit_type: '', financial_year: '', assessment_year: '', books_period_from: '', books_period_to: '',
    applicability_reason: '', due_date: '', engagement_status: '',
    turnover_gross_receipts: '', audit_fee: '', fee_status: 'Pending',
    engagement_letter_date: '', data_received_date: '', audit_start_date: '', 
    draft_report_date: '', report_signing_date: '', remarks: ''
  });

  const [editClientForm, setEditClientForm] = useState({
    constitution: '', cin_llpin: '', gstin: '', date_of_incorporation: '',
    nature_of_business: '', registered_office_address: '', books_kept_at: '', accounting_method: ''
  });

  // 🔴 FETCH DATA (PAGINATED)
  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${user.token}` };
      
      const params = new URLSearchParams({
        page: currentPage,
        limit: itemsPerPage,
        search: searchQuery,
        status: statusFilter
      }).toString();

      const [clientsRes, auditsRes, auditorsRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_URL}/client-master?fetchAll=true`, { headers }).catch(() => ({ data: { data: [] } })),
        axios.get(`${import.meta.env.VITE_API_URL}/audit/engagements?${params}`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${import.meta.env.VITE_API_URL}/audit/auditors`, { headers }).catch(() => ({ data: [] }))
      ]);

      const clientArr = clientsRes.data?.clients || clientsRes.data?.data || clientsRes.data || [];
      setClients(Array.isArray(clientArr) ? clientArr : []);

      if (auditsRes.data && auditsRes.data.data) {
        setAudits(auditsRes.data.data);
        setTotalPages(auditsRes.data.totalPages || 1);
        setTotalRecords(auditsRes.data.totalCount || 0);
      } else {
        setAudits(auditsRes.data || []);
      }

      setAuditorsMaster(auditorsRes.data || []);
    } catch (error) { toast.error("Failed to load audit dashboard data"); } finally { setLoading(false); }
  };

  useEffect(() => { 
    const timeoutId = setTimeout(() => {
      fetchInitialData(); 
    }, 500); 
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line
  }, [user.token, currentPage, searchQuery, statusFilter]);

  // Reset page to 1 if any filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);


  const loadChildData = async (auditId, tabName) => {
    if (tabName === 'profile' || tabName === 'engagement') return;
    setLoadingTabData(true);
    try {
      const headers = { Authorization: `Bearer ${user.token}` };
      let endpoint = '';
      if (tabName === 'auditors') endpoint = `/audit/links/audit/${auditId}`;
      if (tabName === 'udins') endpoint = `/audit/udins/audit/${auditId}`;
      if (tabName === 'filings') endpoint = `/audit/filings/audit/${auditId}`;
      if (tabName === 'checklists') endpoint = `/audit/checklists/audit/${auditId}`;
      if (endpoint) {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}${endpoint}`, { headers });
        setTabData(prev => ({ ...prev, [tabName]: res.data }));
      }
    } catch (error) { toast.error(`Failed to load ${tabName} data`); } finally { setLoadingTabData(false); }
  };

  const handleTabChange = (tabName) => {
    setActiveTab(tabName);
    if (viewingAudit) loadChildData(viewingAudit._id, tabName);
  };

  const handleOpenView = (audit) => {
    setViewingAudit(audit);
    setIsViewModalOpen(true);
    setActiveTab('engagement');
  };

  const openQuickRemarks = (audit) => {
    setQuickRemarksModal({
      open: true,
      audit: audit,
      newRemark: '' 
    });
  };

  const handleSaveQuickRemarks = async (e) => {
    e.preventDefault();
    if (!quickRemarksModal.newRemark.trim()) return;

    const timestamp = new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const empName = user.name || 'User';
    const empRole = isAdminRole(user.role) ? 'Admin' : 'Staff';
    
    const formattedNewRemark = `➤ ${empName} (${empRole}) - [${timestamp}]\n${quickRemarksModal.newRemark.trim()}`;
    const existingRemarks = quickRemarksModal.audit.remarks || '';
    const finalRemarksString = existingRemarks 
      ? `${formattedNewRemark}\n\n-------------------------\n\n${existingRemarks}`
      : formattedNewRemark;

    try {
      const headers = { Authorization: `Bearer ${user.token}` };
      await axios.put(`${import.meta.env.VITE_API_URL}/audit/engagements/${quickRemarksModal.audit._id}`, 
        { remarks: finalRemarksString }, 
        { headers }
      );
      toast.success("Remark added to history successfully!");
      setQuickRemarksModal({ open: false, audit: null, newRemark: '' });
      fetchInitialData(); 
    } catch (error) {
      toast.error("Failed to update remarks history");
    }
  };

  // 🔴 BULLETPROOF PAN SEARCH LOGIC FOR AUDIT WORKSPACE
  const handlePanChange = async (e) => {
    const val = e.target.value.toUpperCase();
    setAuditForm(prev => ({ ...prev, pan: val, client_id: '' })); 

    if (val.length >= 2) {
      setFetchingPan(true);
      try {
        const headers = { Authorization: `Bearer ${user.token}` };
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/client-master?search=${val}&fetchAll=true`, { headers });
        
        // Fail-Safe Array Extraction
        let clientsArray = [];
        if (Array.isArray(res.data)) {
          clientsArray = res.data;
        } else if (res.data && Array.isArray(res.data.clients)) {
          clientsArray = res.data.clients;
        } else if (res.data && Array.isArray(res.data.data)) {
          clientsArray = res.data.data;
        }

        setPanSuggestions(clientsArray);
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
    setAuditForm(prev => ({ ...prev, pan: client.pan, clientName: client.name || client.assesseeName, client_id: client._id }));
    setShowSuggestions(false); toast.success("✅ Client Data Auto-Filled!");
  };

  const formatDateForInput = (dateStr) => dateStr ? new Date(dateStr).toISOString().split('T')[0] : '';

  const handleCreateAudit = async (e) => {
    e.preventDefault();
    if (!auditForm.pan || !auditForm.clientName) return toast.error("PAN and Client Name required!");
    setSaving(true);
    try {
      const headers = { Authorization: `Bearer ${user.token}` };
      const payload = { ...auditForm };
      if (payload.turnover_gross_receipts === '') delete payload.turnover_gross_receipts;

      await axios.post(`${import.meta.env.VITE_API_URL}/audit/engagements`, payload, { headers });
      toast.success("Engagement created!");
      setIsAddModalOpen(false); setAuditForm(initialAuditForm); fetchInitialData();
    } catch (error) { toast.error(error.response?.data?.message || "Failed"); } finally { setSaving(false); }
  };

  const handleDeleteMainAudit = async (auditId) => {
    if(!window.confirm("Are you sure you want to permanently delete this entire Audit Engagement?")) return;
    try {
      const headers = { Authorization: `Bearer ${user.token}` };
      await axios.delete(`${import.meta.env.VITE_API_URL}/audit/engagements/${auditId}`, { headers });
      toast.success("Audit Engagement deleted!");
      fetchInitialData();
    } catch (error) { toast.error("Failed to delete audit"); }
  };

  const handleUpdateEngagement = async (e) => {
    e.preventDefault();
    try {
      const headers = { Authorization: `Bearer ${user.token}` };
      const payload = { ...editEngagementForm };
      
      Object.keys(payload).forEach(key => {
        if (payload[key] === '') payload[key] = null;
      });

      const res = await axios.put(`${import.meta.env.VITE_API_URL}/audit/engagements/${viewingAudit._id}`, payload, { headers });
      toast.success("Engagement details updated permanently!");
      
      const updatedData = res.data?.data || res.data;
      const mergedAudit = { ...viewingAudit, ...updatedData, client_id: viewingAudit.client_id };
      
      setViewingAudit(mergedAudit); 
      setIsEditEngagementModalOpen(false);
      fetchInitialData();
    } catch (error) { 
      console.error(error);
      toast.error("Failed to update engagement details"); 
    }
  };

  const handleUpdateClient = async (e) => {
    e.preventDefault();
    try {
      const headers = { Authorization: `Bearer ${user.token}` };
      
      const payload = { ...editClientForm };
      
      Object.keys(payload).forEach(key => {
        if (payload[key] === '') payload[key] = null;
      });

      const res = await axios.put(`${import.meta.env.VITE_API_URL}/audit/clients/${viewingAudit.client_id._id}`, payload, { headers });
      
      toast.success("Client details successfully saved in Database!");
      
      const updatedClientData = res.data?.data || res.data || payload;
      const updatedAudit = { ...viewingAudit, client_id: { ...viewingAudit.client_id, ...updatedClientData } };
      
      setViewingAudit(updatedAudit);
      setIsEditClientModalOpen(false);
      fetchInitialData(); 
    } catch (error) { 
      console.error("Client Update Error:", error);
      toast.error(error.response?.data?.message || "Failed to save client details"); 
    }
  };

  const handleOpenEditEngagement = () => {
    setEditEngagementForm({
      audit_type: viewingAudit.audit_type || '',
      financial_year: viewingAudit.financial_year || '',
      assessment_year: viewingAudit.assessment_year || '',
      books_period_from: formatDateForInput(viewingAudit.books_period_from),
      books_period_to: formatDateForInput(viewingAudit.books_period_to),
      applicability_reason: viewingAudit.applicability_reason || '',
      due_date: formatDateForInput(viewingAudit.due_date),
      engagement_status: viewingAudit.engagement_status || 'Data pending',
      turnover_gross_receipts: viewingAudit.turnover_gross_receipts?.$numberDecimal || viewingAudit.turnover_gross_receipts || '',
      audit_fee: viewingAudit.audit_fee?.$numberDecimal || viewingAudit.audit_fee || '',
      fee_status: viewingAudit.fee_status || 'Pending',
      engagement_letter_date: formatDateForInput(viewingAudit.engagement_letter_date),
      data_received_date: formatDateForInput(viewingAudit.data_received_date),
      audit_start_date: formatDateForInput(viewingAudit.audit_start_date),
      draft_report_date: formatDateForInput(viewingAudit.draft_report_date),
      report_signing_date: formatDateForInput(viewingAudit.report_signing_date),
      remarks: viewingAudit.remarks || ''
    });
    setIsEditEngagementModalOpen(true);
  };

  const handleOpenEditClient = () => {
    const client = viewingAudit.client_id;
    setEditClientForm({
      constitution: client.constitution || '', cin_llpin: client.cin_llpin || '', gstin: client.gstin || '',
      date_of_incorporation: formatDateForInput(client.date_of_incorporation), nature_of_business: client.nature_of_business || '',
      registered_office_address: client.registered_office_address || '', books_kept_at: client.books_kept_at || '', accounting_method: client.accounting_method || ''
    });
    setIsEditClientModalOpen(true);
  };

  const handleCreateAuditorMaster = async (e) => {
    e.preventDefault();
    try {
      const headers = { Authorization: `Bearer ${user.token}` };
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/audit/auditors`, newAuditorForm, { headers });
      toast.success("New Auditor added to Master Data!");
      setIsAddAuditorMasterOpen(false);
      setAuditorsMaster(prev => [res.data, ...prev]); 
      setAuditorForm(prev => ({ ...prev, auditor_id: res.data._id })); 
      setNewAuditorForm({ firm_name: '', firm_frn: '', signing_person_name: '', designation: 'Partner', membership_no: '', auditor_pan: '', address: '', city: '', state: '', pincode: '', email: '', mobile: '', is_internal: false });
    } catch (error) { toast.error("Failed to add auditor"); }
  };

  const saveChildRecord = async (endpoint, payload, isEdit, editId, tabName, setModalOpen, setForm, initialFormStr) => {
    try {
      const headers = { Authorization: `Bearer ${user.token}` };
      if (isEdit) {
        await axios.put(`${import.meta.env.VITE_API_URL}/audit/${endpoint}/${editId}`, payload, { headers });
        toast.success("Record updated!");
      } else {
        await axios.post(`${import.meta.env.VITE_API_URL}/audit/${endpoint}`, payload, { headers });
        toast.success("Record added!");
      }
      setModalOpen(false);
      setForm(initialFormStr);
      setEditingIds(prev => ({ ...prev, [tabName]: null }));
      loadChildData(viewingAudit._id, tabName === 'links' ? 'auditors' : tabName);
    } catch (error) { toast.error(error.response?.data?.message || "Failed to save record"); }
  };

  const deleteChildRecord = async (endpoint, id, tabName) => {
    if(!window.confirm("Are you sure you want to delete this record?")) return;
    try {
      const headers = { Authorization: `Bearer ${user.token}` };
      await axios.delete(`${import.meta.env.VITE_API_URL}/audit/${endpoint}/${id}`, { headers });
      toast.success("Deleted successfully!");
      loadChildData(viewingAudit._id, tabName);
    } catch (error) { toast.error("Failed to delete record. Please check your backend routes."); }
  };

  const handleLinkAuditor = (e) => { e.preventDefault(); saveChildRecord('links', { ...auditorForm, audit_id: viewingAudit._id }, !!editingIds.auditor, editingIds.auditor, 'auditors', setIsAuditorModalOpen, setAuditorForm, initialAuditorForm); };
  const handleAddUdin = (e) => { 
    e.preventDefault(); 
    if (!editingIds.udin) {
      const currentAuditorLink = tabData.auditors.find(a => a.is_current && (a.role === 'Signing' || a.role === 'Joint'));
      if (!currentAuditorLink) return toast.error("Please link a 'Signing' or 'Joint' Auditor first.");
      udinForm.auditor_id = currentAuditorLink.auditor_id._id;
    }
    saveChildRecord('udins', { ...udinForm, audit_id: viewingAudit._id }, !!editingIds.udin, editingIds.udin, 'udins', setIsUdinModalOpen, setUdinForm, initialUdinForm); 
  };
  const handleAddFiling = (e) => { e.preventDefault(); saveChildRecord('filings', { ...filingForm, audit_id: viewingAudit._id }, !!editingIds.filing, editingIds.filing, 'filings', setIsFilingModalOpen, setFilingForm, initialFilingForm); };
  const handleAddChecklist = (e) => { e.preventDefault(); saveChildRecord('checklists', { ...checklistForm, audit_id: viewingAudit._id }, !!editingIds.checklist, editingIds.checklist, 'checklists', setIsChecklistModalOpen, setChecklistForm, initialChecklistForm); };

  const openEditAuditor = (data) => {
    setAuditorForm({
      auditor_id: data.auditor_id._id, role: data.role, appointment_mode: data.appointment_mode || '', appointment_form_srn: data.appointment_form_srn || '',
      appointment_date: formatDateForInput(data.appointment_date), tenure_from: formatDateForInput(data.tenure_from), tenure_to: formatDateForInput(data.tenure_to), remuneration: data.remuneration?.$numberDecimal || data.remuneration || ''
    });
    setEditingIds(prev => ({ ...prev, auditor: data._id }));
    setIsAuditorModalOpen(true);
  };

  const openEditUdin = (data) => {
    setUdinForm({
      document_type: data.document_type, document_date: formatDateForInput(data.document_date), udin_no: data.udin_no,
      udin_generated_date: formatDateForInput(data.udin_generated_date), udin_status: data.udin_status, remarks: data.remarks || '', signed_copy_file: null
    });
    setEditingIds(prev => ({ ...prev, udin: data._id }));
    setIsUdinModalOpen(true);
  };

  const openEditFiling = (data) => {
    setFilingForm({
      form_name: data.form_name, filing_portal: data.filing_portal, filing_status: data.filing_status, acknowledgement_srn_no: data.acknowledgement_srn_no || '',
      uploaded_by_auditor_date: formatDateForInput(data.uploaded_by_auditor_date), client_approval_date: formatDateForInput(data.client_approval_date), filed_date: formatDateForInput(data.filed_date),
      late_fee: data.late_fee?.$numberDecimal || data.late_fee || '', remarks: data.remarks || '', proof_file: null
    });
    setEditingIds(prev => ({ ...prev, filing: data._id }));
    setIsFilingModalOpen(true);
  };

  const openEditChecklist = (data) => {
    setChecklistForm({ item: data.item, status: data.status, received_date: formatDateForInput(data.received_date), remarks: data.remarks || '', file: null });
    setEditingIds(prev => ({ ...prev, checklist: data._id }));
    setIsChecklistModalOpen(true);
  };

  // We are using directly audits list since search and filtering is applied via backend.
  const filteredAudits = audits; 

  const getStatusBadge = (status) => {
    if (status === 'Closed' || status === 'Filed') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    if (status === 'Audit in progress') return 'bg-blue-100 text-blue-700 border-blue-200';
    if (status?.includes('pending')) return 'bg-amber-100 text-amber-700 border-amber-200';
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 flex flex-col h-[calc(100vh-80px)] gap-4">
      <Toaster position="top-right" />

      {/* HEADER & METRICS */}
      <div className="flex-none space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div><h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3"><Briefcase size={28} className="text-blue-600" /> Audit Master Workspace</h1></div>
          <button onClick={() => setIsAddModalOpen(true)} className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-5 py-2.5 rounded-xl shadow-md shadow-blue-500/20"><Plus size={18} strokeWidth={2.5} /> Onboard New Audit</button>
        </div>
      </div>

      {/* MAIN WORKSPACE AREA */}
      <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden min-h-0">
        <div className="flex-none bg-slate-50/95 backdrop-blur-md z-20 shadow-sm border-b border-slate-200">
          <div className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between bg-white border-b border-slate-100">
            <div className="relative w-full md:w-1/3">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input type="text" placeholder="Search by Client Name or ID..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-3.5 py-2.5 text-sm font-medium bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm" />
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full md:w-48 text-sm font-bold border border-slate-200 rounded-xl p-2.5 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20">
              <option value="ALL">All Statuses</option><option value="Data pending">Data pending</option><option value="Audit in progress">Audit in progress</option><option value="Client approved">Client approved</option><option value="Filed">Filed</option>
            </select>
          </div>
          <div className="w-full text-left bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-wider flex pr-4">
             <div className="py-3 px-6 w-[35%]">Audit Details (A1)</div><div className="py-3 px-5 w-[20%]">Financial Year</div><div className="py-3 px-5 w-[25%]">Current Status</div><div className="py-3 px-5 flex-1 text-right">Actions</div>
          </div>
        </div>

        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead className="hidden"><tr><th className="w-[35%]"></th><th className="w-[20%]"></th><th className="w-[25%]"></th><th className="flex-1"></th></tr></thead>
            <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-700">
              {loading ? (
                <tr><td colSpan="4" className="text-center py-16 text-slate-400"><RefreshCw className="animate-spin inline-block mr-2" size={18}/> Loading Audits...</td></tr>
              ) : filteredAudits.length === 0 ? (
                <tr><td colSpan="4" className="text-center py-16 text-slate-400 flex flex-col items-center"><AlertCircle size={36} className="mb-3 text-slate-300"/> No active audits found.</td></tr>
              ) : (
                filteredAudits.map((a) => (
                  <tr key={a._id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="py-4 px-6 w-[35%]">
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800 text-base">{a.client_id?.name || 'Unknown Client'}</span>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <span className="text-[10px] font-black uppercase text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded tracking-wider" title="Client ID">
                              {a.client_id?.clientId || a.client_id?.pan || 'NO ID'}
                            </span>
                            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{a.audit_type}</span>
                            
                            {/* Short Preview of Remarks */}
                            {a.remarks && (
                                <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 truncate max-w-[120px]" title="Latest Remark">
                                  {a.remarks.split('\n')[0]} 
                                </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-5 w-[20%]">
                      <p className="font-mono font-bold text-slate-700">{a.financial_year}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">AY: {a.assessment_year}</p>
                    </td>
                    <td className="py-4 px-5 w-[25%]">
                      <span className={`px-2 py-1 border rounded-md text-[10px] font-bold uppercase tracking-wider ${getStatusBadge(a.engagement_status)}`}>{a.engagement_status}</span>
                    </td>
                    <td className="py-4 px-5 flex-1 text-right">
                      <div className="flex items-center justify-end gap-2">
                        
                        {/* 🔴 NAYA BUTTON: QUICK REMARKS */}
                        <button onClick={() => openQuickRemarks(a)} className="p-2 text-amber-500 hover:bg-amber-50 border border-transparent hover:border-amber-200 rounded-xl transition-colors shadow-sm hidden group-hover:flex" title="Update Quick Remarks">
                          <MessageSquare size={16} strokeWidth={2.5}/>
                        </button>
                        
                        {/* Only Admin can delete an audit engagement entirely */}
                        {isAdminRole(user?.role) && (
                          <button onClick={() => handleDeleteMainAudit(a._id)} className="p-2 text-rose-500 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-xl transition-colors shadow-sm hidden group-hover:flex" title="Delete Audit">
                            <Trash2 size={16} strokeWidth={2.5}/>
                          </button>
                        )}

                        <button onClick={() => handleOpenView(a)} className="px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white rounded-xl transition-colors border border-blue-200 text-xs font-bold flex items-center gap-2 shadow-sm inline-flex">
                          <Eye size={16} strokeWidth={2.5}/> Open Workspace
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* SERVER-SIDE PAGINATION CONTROLS */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 bg-slate-50 border-t border-slate-200">
            <span className="text-xs font-bold text-slate-500">
              Showing Page {currentPage} of {totalPages} (Total {totalRecords} records)
            </span>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                disabled={currentPage === 1 || loading}
                className="px-4 py-2 text-xs font-bold bg-white text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-50 transition-colors shadow-sm"
              >
                Previous
              </button>
              <span className="text-xs font-bold text-blue-700 bg-blue-50 px-3 py-2 rounded-lg border border-blue-100">
                {currentPage} / {totalPages}
              </span>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                disabled={currentPage === totalPages || loading}
                className="px-4 py-2 text-xs font-bold bg-blue-600 text-white border border-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 🔴 NAYA MODAL: QUICK REMARKS HISTORY MODAL */}
      {quickRemarksModal.open && quickRemarksModal.audit && (
        <div className="fixed inset-0 z-[80] bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50 shrink-0">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <MessageSquare size={18} className="text-amber-500"/> Update Internal Remarks
              </h2>
              <button onClick={() => setQuickRemarksModal({open: false, audit: null, newRemark: ''})} className="text-slate-400 hover:text-slate-700"><X size={18} /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30 custom-scrollbar flex flex-col gap-4">
              <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl shrink-0">
                <p className="text-[10px] font-bold text-slate-500 uppercase">Selected Client</p>
                <div className="flex justify-between items-start mt-1">
                  <p className="font-bold text-slate-800">{quickRemarksModal.audit.client_id?.name || 'N/A'}</p>
                  <p className="text-[10px] font-bold text-blue-700 bg-white px-2 py-0.5 rounded border border-blue-200 uppercase tracking-wider">{quickRemarksModal.audit.engagement_status}</p>
                </div>
              </div>
              
              {/* PAST REMARKS HISTORY (Read-only) */}
              <div className="flex-1 flex flex-col gap-1 min-h-[150px]">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1 mb-1">Previous Remarks History</label>
                <div className="bg-slate-100/50 border border-slate-200 p-4 rounded-xl flex-1 overflow-y-auto custom-scrollbar whitespace-pre-wrap text-sm text-slate-700 font-medium">
                  {quickRemarksModal.audit.remarks || <span className="text-slate-400 italic font-normal">No previous remarks found. Be the first to add one!</span>}
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveQuickRemarks} className="p-5 border-t border-slate-100 bg-white shrink-0 shadow-[0_-10px_20px_rgba(0,0,0,0.03)] z-10">
              <div className="space-y-2 mb-4">
                <label className="block text-xs font-bold text-slate-500">Add New Remark</label>
                <textarea 
                  rows="3" 
                  maxLength="500" 
                  required
                  value={quickRemarksModal.newRemark} 
                  onChange={(e) => setQuickRemarksModal({...quickRemarksModal, newRemark: e.target.value})} 
                  className="w-full p-3 border border-slate-200 rounded-xl text-sm resize-none focus:ring-2 focus:ring-amber-500/20 outline-none shadow-inner bg-amber-50/20" 
                  placeholder="Type your new note, update, or reason here..." 
                />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setQuickRemarksModal({open: false, audit: null, newRemark: ''})} className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-sm font-bold transition-colors">Cancel</button>
                <button type="submit" className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-bold shadow-md shadow-amber-500/20 transition-all flex items-center gap-2">
                  <CheckCircle2 size={16}/> Save to History
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD AUDIT ENGAGEMENT */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/80 shrink-0">
              <div><h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Briefcase className="text-blue-600" size={20}/> Onboard New Audit Engagement</h2></div>
              <button onClick={() => setIsAddModalOpen(false)} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/50"><X size={18} /></button>
            </div>
            
            <form onSubmit={handleCreateAudit} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar min-h-0 bg-slate-50/30">
              <div className="bg-blue-50/40 p-5 rounded-2xl border border-blue-100">
                <h3 className="text-xs font-bold text-blue-800 uppercase tracking-wider border-b border-blue-200/50 pb-2 mb-4 flex items-center gap-2"><Building2 size={14}/> Client Master Lookup</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="relative">
                    <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Company PAN *</label>
                    <input type="text" required maxLength="10" value={auditForm.pan} onChange={handlePanChange} onBlur={() => setTimeout(() => setShowSuggestions(false), 200)} autoComplete="off" placeholder="ABCDE1234F" className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-black text-slate-800 uppercase tracking-widest bg-white focus:ring-2 focus:ring-blue-500/20 outline-none relative z-10" />
                    {fetchingPan && <Loader2 size={14} className="absolute right-3 top-9 animate-spin text-blue-500 z-20"/>}
                    {showSuggestions && panSuggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto custom-scrollbar">
                        {panSuggestions.map((c) => (
                          <div key={c._id} onClick={() => handleSelectSuggestion(c)} className="p-3 border-b border-slate-50 hover:bg-blue-50 cursor-pointer transition-colors">
                            <p className="text-xs font-black text-slate-800 tracking-wider uppercase">{c.pan}</p>
                            <p className="text-[10px] font-bold text-slate-500 truncate">{c.name || c.assesseeName}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Client Name *</label>
                    <input type="text" required value={auditForm.clientName} onChange={(e) => setAuditForm({...auditForm, clientName: e.target.value})} placeholder="e.g. Taxbucket Tech Pvt Ltd" className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-semibold bg-white focus:ring-2 focus:ring-blue-500/20" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Audit Type *</label>
                  <select required value={auditForm.audit_type} onChange={(e) => setAuditForm({...auditForm, audit_type: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-semibold bg-white shadow-sm focus:ring-2 focus:ring-blue-500/20">
                    <option value="Tax Audit">Tax Audit</option><option value="Statutory Audit">Statutory Audit</option><option value="LLP Audit">LLP Audit</option><option value="GST Audit / Reconciliation">GST Audit / Reconciliation</option><option value="Internal Audit">Internal Audit</option><option value="Stock Audit">Stock Audit</option><option value="Concurrent Audit">Concurrent Audit</option><option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Financial Year *</label>
                  <input type="text" required value={auditForm.financial_year} onChange={(e) => setAuditForm({...auditForm, financial_year: e.target.value})} placeholder="e.g. 2026-27" className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-semibold bg-white shadow-sm focus:ring-2 focus:ring-blue-500/20" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Applicability Reason *</label>
                  <select required value={auditForm.applicability_reason} onChange={(e) => setAuditForm({...auditForm, applicability_reason: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-semibold bg-white shadow-sm focus:ring-2 focus:ring-blue-500/20">
                    <option value="Turnover above limit">Turnover above limit</option><option value="Profit below presumptive limit">Profit below presumptive limit</option><option value="Companies Act requirement">Companies Act requirement</option><option value="LLP Act requirement">LLP Act requirement</option><option value="Trust / Society requirement">Trust / Society requirement</option><option value="Voluntary">Voluntary</option><option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Turnover / Gross Receipts</label>
                  <input type="number" step="0.01" value={auditForm.turnover_gross_receipts} onChange={(e) => setAuditForm({...auditForm, turnover_gross_receipts: e.target.value})} placeholder="Amount in ₹" className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-semibold bg-white shadow-sm focus:ring-2 focus:ring-blue-500/20" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Books Period From *</label>
                  <input type="date" required value={auditForm.books_period_from} onChange={(e) => setAuditForm({...auditForm, books_period_from: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-semibold bg-white shadow-sm focus:ring-2 focus:ring-blue-500/20" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Books Period To *</label>
                  <input type="date" required value={auditForm.books_period_to} onChange={(e) => setAuditForm({...auditForm, books_period_to: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-semibold bg-white shadow-sm focus:ring-2 focus:ring-blue-500/20" />
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100 shrink-0">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-6 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">Cancel</button>
                <button type="submit" disabled={saving} className="px-8 py-2.5 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center gap-2 disabled:opacity-50">
                  {saving ? <Loader2 size={18} className="animate-spin"/> : <CheckCircle2 size={18} />} Create Engagement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🔴 MODAL: 360 DEGREE AUDIT VIEW */}
      {isViewModalOpen && viewingAudit && (
        <div className="fixed inset-0 z-[50] bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-slate-50 rounded-3xl w-full max-w-6xl shadow-2xl border border-slate-100 flex flex-col h-[90vh] overflow-hidden animate-in fade-in zoom-in-95">
            
            {/* Header */}
            <div className="relative px-8 pt-6 pb-6 bg-gradient-to-r from-blue-800 to-indigo-900 text-white flex justify-between items-center overflow-hidden shrink-0">
              <div className="absolute top-0 right-0 -mt-10 -mr-10 h-40 w-40 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
              <div className="flex items-center gap-5 z-10">
                <div className="h-14 w-14 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md border border-white/30 shadow-inner shrink-0">
                  <Briefcase size={28} className="text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-black tracking-tight flex items-center gap-3">
                    {viewingAudit.client_id?.name || 'Client Name'}
                    <span className="text-[10px] font-black uppercase bg-white/20 px-2 py-0.5 rounded-full border border-white/30 tracking-wider">
                      {viewingAudit.audit_type} ({viewingAudit.financial_year})
                    </span>
                  </h2>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-blue-100 font-medium font-mono">
                    <span title="Client ID from Master" className="bg-indigo-500/40 px-2 py-0.5 rounded-full border border-indigo-400">
                      ID: {viewingAudit.client_id?.clientId || viewingAudit.client_id?.pan || 'NO ID'}
                    </span> | 
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${viewingAudit.engagement_status === 'Closed' ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200' : 'bg-amber-500/20 border-amber-400 text-amber-200'}`}>
                      {viewingAudit.engagement_status}
                    </span>
                  </div>
                </div>
              </div>
              <button onClick={() => setIsViewModalOpen(false)} className="z-10 p-2 rounded-full bg-black/10 hover:bg-black/30 text-white transition-colors shrink-0"><X size={20} strokeWidth={2.5} /></button>
            </div>
            
            {/* Tabs */}
            <div className="flex items-center gap-2 px-6 bg-white border-b border-slate-200 shrink-0 overflow-x-auto custom-scrollbar pt-2">
              {[
                { id: 'engagement', icon: <FileText size={16}/>, label: 'Engagement (A1)' },
                { id: 'profile', icon: <Building2 size={16}/>, label: 'Client Details (A0)' },
                { id: 'auditors', icon: <Users size={16}/>, label: 'Auditor Link (A3)' },
                { id: 'udins', icon: <FileDigit size={16}/>, label: 'UDIN Register (A4)' },
                { id: 'filings', icon: <UploadCloud size={16}/>, label: 'Filing Tracker (A5)' },
                { id: 'checklists', icon: <CheckSquare size={16}/>, label: 'Checklist (A6)' }
              ].map(tab => (
                <button key={tab.id} onClick={() => handleTabChange(tab.id)} className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${activeTab === tab.id ? 'border-blue-600 text-blue-700 bg-blue-50/50' : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}>
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Contents */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 custom-scrollbar relative min-h-0">
              
              {loadingTabData && (
                <div className="absolute inset-0 bg-slate-50/80 backdrop-blur-sm z-20 flex items-center justify-center">
                  <div className="flex items-center gap-2 text-blue-600 font-bold bg-white px-4 py-2 rounded-full shadow-lg border border-blue-100">
                    <Loader2 size={18} className="animate-spin"/> Loading table data...
                  </div>
                </div>
              )}

              {/* ENGAGEMENT TAB (A1) */}
              {activeTab === 'engagement' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Engagement Details</h3>
                    <button onClick={handleOpenEditEngagement} className="text-xs font-bold bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded-lg flex items-center gap-1 border border-blue-200"><Pencil size={14}/> Edit Extra Details</button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div><p className="text-[10px] font-bold text-slate-400 uppercase">Audit Type</p><p className="font-bold text-slate-800">{viewingAudit.audit_type}</p></div>
                    <div><p className="text-[10px] font-bold text-slate-400 uppercase">Financial Year</p><p className="font-mono font-bold text-blue-700">{viewingAudit.financial_year}</p></div>
                    <div><p className="text-[10px] font-bold text-slate-400 uppercase">Assessment Year</p><p className="font-mono font-bold text-slate-800">{viewingAudit.assessment_year}</p></div>
                    <div><p className="text-[10px] font-bold text-slate-400 uppercase">Books Period</p><p className="font-bold text-slate-800">{viewingAudit.books_period_from ? new Date(viewingAudit.books_period_from).toLocaleDateString() : 'N/A'} to {viewingAudit.books_period_to ? new Date(viewingAudit.books_period_to).toLocaleDateString() : 'N/A'}</p></div>
                    <div><p className="text-[10px] font-bold text-slate-400 uppercase">Applicability Reason</p><p className="font-bold text-slate-800">{viewingAudit.applicability_reason}</p></div>
                    <div><p className="text-[10px] font-bold text-slate-400 uppercase">Due Date (A7)</p><p className="font-bold text-rose-600">{viewingAudit.due_date ? new Date(viewingAudit.due_date).toLocaleDateString() : 'Pending verification'}</p></div>
                    
                    <div><p className="text-[10px] font-bold text-slate-400 uppercase">Turnover (₹)</p><p className="font-bold text-emerald-700">{viewingAudit.turnover_gross_receipts?.$numberDecimal || viewingAudit.turnover_gross_receipts || 'N/A'}</p></div>
                    <div><p className="text-[10px] font-bold text-slate-400 uppercase">Audit Fee (₹)</p><p className="font-bold text-emerald-700">{viewingAudit.audit_fee?.$numberDecimal || viewingAudit.audit_fee || 'N/A'}</p></div>
                    <div><p className="text-[10px] font-bold text-slate-400 uppercase">Fee Status</p><p className="font-bold text-slate-800">{viewingAudit.fee_status || 'Pending'}</p></div>
                    
                    <div><p className="text-[10px] font-bold text-slate-400 uppercase">Engagement Letter Date</p><p className="font-bold text-slate-800">{viewingAudit.engagement_letter_date ? new Date(viewingAudit.engagement_letter_date).toLocaleDateString() : 'N/A'}</p></div>
                    <div><p className="text-[10px] font-bold text-slate-400 uppercase">Data Received Date</p><p className="font-bold text-slate-800">{viewingAudit.data_received_date ? new Date(viewingAudit.data_received_date).toLocaleDateString() : 'N/A'}</p></div>
                    <div><p className="text-[10px] font-bold text-slate-400 uppercase">Audit Start Date</p><p className="font-bold text-slate-800">{viewingAudit.audit_start_date ? new Date(viewingAudit.audit_start_date).toLocaleDateString() : 'N/A'}</p></div>
                    <div><p className="text-[10px] font-bold text-slate-400 uppercase">Draft Report Date</p><p className="font-bold text-slate-800">{viewingAudit.draft_report_date ? new Date(viewingAudit.draft_report_date).toLocaleDateString() : 'N/A'}</p></div>
                    <div><p className="text-[10px] font-bold text-slate-400 uppercase">Report Signing Date</p><p className="font-bold text-slate-800">{viewingAudit.report_signing_date ? new Date(viewingAudit.report_signing_date).toLocaleDateString() : 'N/A'}</p></div>
                  </div>
                </div>
              )}

              {/* PROFILE TAB (A0) */}
              {activeTab === 'profile' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                   <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
                     <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Client Base Details (A0)</h3>
                     <button onClick={handleOpenEditClient} className="text-xs font-bold bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded-lg flex items-center gap-1 border border-blue-200"><Pencil size={14}/> Edit Client Details</button>
                   </div>
                   <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                      <div><p className="text-[10px] font-bold text-slate-400 uppercase">Client ID</p><p className="font-mono font-bold text-indigo-700">{viewingAudit.client_id?.clientId || 'N/A'}</p></div>
                      <div><p className="text-[10px] font-bold text-slate-400 uppercase">PAN</p><p className="font-mono font-bold text-slate-800">{viewingAudit.client_id?.pan || 'N/A'}</p></div>
                      <div><p className="text-[10px] font-bold text-slate-400 uppercase">Constitution (A0)</p><p className="font-bold text-slate-800">{viewingAudit.client_id?.constitution || 'Not Set'}</p></div>
                      <div><p className="text-[10px] font-bold text-slate-400 uppercase">CIN / LLPIN (A0)</p><p className="font-mono font-bold text-slate-800">{viewingAudit.client_id?.cin_llpin || 'N/A'}</p></div>
                      <div><p className="text-[10px] font-bold text-slate-400 uppercase">GSTIN (A0)</p><p className="font-mono font-bold text-slate-800">{viewingAudit.client_id?.gstin || 'N/A'}</p></div>
                      <div><p className="text-[10px] font-bold text-slate-400 uppercase">Nature of Business</p><p className="font-bold text-slate-800">{viewingAudit.client_id?.nature_of_business || 'N/A'}</p></div>
                      <div><p className="text-[10px] font-bold text-slate-400 uppercase">Date of Incorporation</p><p className="font-bold text-slate-800">{viewingAudit.client_id?.date_of_incorporation ? new Date(viewingAudit.client_id?.date_of_incorporation).toLocaleDateString() : 'N/A'}</p></div>
                      <div><p className="text-[10px] font-bold text-slate-400 uppercase">Accounting Method</p><p className="font-bold text-slate-800">{viewingAudit.client_id?.accounting_method || 'N/A'}</p></div>
                      <div className="col-span-2 md:col-span-3"><p className="text-[10px] font-bold text-slate-400 uppercase">Registered Address / Books Kept At</p><p className="font-bold text-slate-800">{viewingAudit.client_id?.registered_office_address || viewingAudit.client_id?.books_kept_at || 'N/A'}</p></div>
                   </div>
                </div>
              )}

              {/* AUDITORS TAB (A3) */}
              {activeTab === 'auditors' && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-2">
                  <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Assigned Auditors</h3>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setIsAddAuditorMasterOpen(true)} className="text-xs font-bold bg-white text-blue-600 border border-blue-200 hover:bg-blue-50 px-3 py-1.5 rounded-lg flex items-center gap-1 shadow-sm"><Users size={14}/> Add New to Master</button>
                      <button onClick={() => { setAuditorForm(initialAuditorForm); setEditingIds(prev => ({...prev, auditor: null})); setIsAuditorModalOpen(true); }} className="text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg flex items-center gap-1 shadow-sm"><Link size={14}/> Link Auditor</button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                        <tr><th className="p-3">Auditor Firm</th><th className="p-3">Role</th><th className="p-3">Signing Person</th><th className="p-3">Appt. Date</th><th className="p-3 text-right">Actions</th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                        {tabData.auditors.length === 0 ? (<tr><td colSpan="5" className="text-center p-6 text-slate-400">No auditors linked yet.</td></tr>) : tabData.auditors.map(link => (
                          <tr key={link._id}>
                            <td className="p-3 font-bold">{link.auditor_id?.firm_name}</td>
                            <td className="p-3"><span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-bold uppercase text-[9px]">{link.role}</span> {link.is_current && <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-bold uppercase text-[9px] ml-1">Current</span>}</td>
                            <td className="p-3">{link.auditor_id?.signing_person_name} <br/><span className="text-[10px] text-slate-500">(Mem: {link.auditor_id?.membership_no})</span></td>
                            <td className="p-3">{link.appointment_date ? new Date(link.appointment_date).toLocaleDateString() : 'N/A'}</td>
                            <td className="p-3 text-right">
                              <button onClick={() => openEditAuditor(link)} className="p-1.5 text-slate-400 hover:text-blue-600 mr-1"><Pencil size={14}/></button>
                              <button onClick={() => deleteChildRecord('links', link._id, 'auditors')} className="p-1.5 text-slate-400 hover:text-rose-600"><Trash2 size={14}/></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* UDINS TAB (A4) */}
              {activeTab === 'udins' && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-2">
                  <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">UDIN Register</h3>
                    <button onClick={() => { setUdinForm(initialUdinForm); setEditingIds(prev => ({...prev, udin: null})); setIsUdinModalOpen(true); }} className="text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg flex items-center gap-1 shadow-sm"><Plus size={14}/> Add UDIN</button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                        <tr><th className="p-3">UDIN No.</th><th className="p-3">Document Type</th><th className="p-3">Generated Date</th><th className="p-3">Status</th><th className="p-3 text-right">Actions</th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                        {tabData.udins.length === 0 ? (<tr><td colSpan="5" className="text-center p-6 text-slate-400">No UDIN generated yet.</td></tr>) : tabData.udins.map(udin => (
                          <tr key={udin._id}>
                            <td className="p-3 font-mono font-bold text-blue-700 tracking-wider">{udin.udin_no}</td>
                            <td className="p-3 font-bold">{udin.document_type}</td>
                            <td className="p-3">{new Date(udin.udin_generated_date).toLocaleDateString()}</td>
                            <td className="p-3"><span className={`px-2 py-0.5 rounded font-bold uppercase text-[9px] ${udin.udin_status === 'Generated' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{udin.udin_status}</span></td>
                            <td className="p-3 text-right">
                              <button onClick={() => openEditUdin(udin)} className="p-1.5 text-slate-400 hover:text-blue-600 mr-1"><Pencil size={14}/></button>
                              <button onClick={() => deleteChildRecord('udins', udin._id, 'udins')} className="p-1.5 text-slate-400 hover:text-rose-600"><Trash2 size={14}/></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* FILINGS TAB (A5) */}
              {activeTab === 'filings' && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-2">
                  <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Filing Tracker</h3>
                    <button onClick={() => { setFilingForm(initialFilingForm); setEditingIds(prev => ({...prev, filing: null})); setIsFilingModalOpen(true); }} className="text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg flex items-center gap-1 shadow-sm"><Plus size={14}/> Add Filing</button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                        <tr><th className="p-3">Form Name</th><th className="p-3">Portal</th><th className="p-3">Status</th><th className="p-3">Acknowledgement</th><th className="p-3 text-right">Actions</th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                        {tabData.filings.length === 0 ? (<tr><td colSpan="5" className="text-center p-6 text-slate-400">No filings recorded yet.</td></tr>) : tabData.filings.map(filing => (
                          <tr key={filing._id}>
                            <td className="p-3 font-bold">{filing.form_name}</td>
                            <td className="p-3">{filing.filing_portal}</td>
                            <td className="p-3"><span className="bg-slate-100 px-2 py-0.5 rounded font-bold uppercase text-[9px] border">{filing.filing_status}</span></td>
                            <td className="p-3 font-mono">{filing.acknowledgement_srn_no || 'N/A'}</td>
                            <td className="p-3 text-right">
                              <button onClick={() => openEditFiling(filing)} className="p-1.5 text-slate-400 hover:text-blue-600 mr-1"><Pencil size={14}/></button>
                              <button onClick={() => deleteChildRecord('filings', filing._id, 'filings')} className="p-1.5 text-slate-400 hover:text-rose-600"><Trash2 size={14}/></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* CHECKLIST TAB (A6) */}
              {activeTab === 'checklists' && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-2">
                  <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Document Checklist</h3>
                    <button onClick={() => { setChecklistForm(initialChecklistForm); setEditingIds(prev => ({...prev, checklist: null})); setIsChecklistModalOpen(true); }} className="text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg flex items-center gap-1 shadow-sm"><Plus size={14}/> Add Item</button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                        <tr><th className="p-3">Required Document</th><th className="p-3">Status</th><th className="p-3">Received Date</th><th className="p-3 text-right">Actions</th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                        {tabData.checklists.length === 0 ? (<tr><td colSpan="4" className="text-center p-6 text-slate-400">No checklist items created.</td></tr>) : tabData.checklists.map(item => (
                          <tr key={item._id}>
                            <td className="p-3 font-bold">{item.item}</td>
                            <td className="p-3"><span className={`px-2 py-0.5 rounded font-bold uppercase text-[9px] ${item.status === 'Received' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{item.status}</span></td>
                            <td className="p-3">{item.received_date ? new Date(item.received_date).toLocaleDateString() : 'N/A'}</td>
                            <td className="p-3 text-right">
                              <button onClick={() => openEditChecklist(item)} className="p-1.5 text-slate-400 hover:text-blue-600 mr-1"><Pencil size={14}/></button>
                              <button onClick={() => deleteChildRecord('checklists', item._id, 'checklists')} className="p-1.5 text-slate-400 hover:text-rose-600"><Trash2 size={14}/></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          🔴 MODALS (A1 Edit, A0 Edit & Child Tabs)
          ========================================== */}

      {/* A1: Edit Engagement Extra Details */}
      {isEditEngagementModalOpen && (
        <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Pencil size={18} className="text-blue-600"/> Edit Engagement Details</h2>
              <button onClick={() => setIsEditEngagementModalOpen(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleUpdateEngagement} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
              
              <h3 className="text-[10px] font-black uppercase text-blue-600 tracking-wider mb-2 border-b pb-1">Core Audit Info</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Audit Type</label>
                  <select value={editEngagementForm.audit_type} onChange={(e) => setEditEngagementForm({...editEngagementForm, audit_type: e.target.value})} className="w-full p-2.5 border rounded-xl text-sm font-semibold bg-white shadow-sm focus:ring-2 focus:ring-blue-500/20">
                    <option value="Tax Audit">Tax Audit</option><option value="Statutory Audit">Statutory Audit</option><option value="LLP Audit">LLP Audit</option><option value="GST Audit / Reconciliation">GST Audit / Reconciliation</option><option value="Internal Audit">Internal Audit</option><option value="Stock Audit">Stock Audit</option><option value="Concurrent Audit">Concurrent Audit</option><option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Financial Year</label>
                  <input type="text" value={editEngagementForm.financial_year} onChange={(e) => setEditEngagementForm({...editEngagementForm, financial_year: e.target.value})} className="w-full p-2.5 border rounded-xl text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Assessment Year</label>
                  <input type="text" value={editEngagementForm.assessment_year} onChange={(e) => setEditEngagementForm({...editEngagementForm, assessment_year: e.target.value})} className="w-full p-2.5 border rounded-xl text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Applicability Reason</label>
                  <select value={editEngagementForm.applicability_reason} onChange={(e) => setEditEngagementForm({...editEngagementForm, applicability_reason: e.target.value})} className="w-full p-2.5 border rounded-xl text-sm bg-white shadow-sm focus:ring-2 focus:ring-blue-500/20">
                    <option value="Turnover above limit">Turnover above limit</option><option value="Profit below presumptive limit">Profit below presumptive limit</option><option value="Companies Act requirement">Companies Act requirement</option><option value="LLP Act requirement">LLP Act requirement</option><option value="Trust / Society requirement">Trust / Society requirement</option><option value="Voluntary">Voluntary</option><option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Books Period From</label>
                  <input type="date" value={editEngagementForm.books_period_from} onChange={(e) => setEditEngagementForm({...editEngagementForm, books_period_from: e.target.value})} className="w-full p-2.5 border rounded-xl text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Books Period To</label>
                  <input type="date" value={editEngagementForm.books_period_to} onChange={(e) => setEditEngagementForm({...editEngagementForm, books_period_to: e.target.value})} className="w-full p-2.5 border rounded-xl text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Due Date</label>
                  <input type="date" value={editEngagementForm.due_date} onChange={(e) => setEditEngagementForm({...editEngagementForm, due_date: e.target.value})} className="w-full p-2.5 border rounded-xl text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Engagement Status</label>
                  <select value={editEngagementForm.engagement_status} onChange={(e) => setEditEngagementForm({...editEngagementForm, engagement_status: e.target.value})} className="w-full p-2.5 border rounded-xl text-sm font-bold text-slate-700">
                    <option value="Data pending">Data pending</option><option value="Audit in progress">Audit in progress</option><option value="Client approved">Client approved</option><option value="Filed">Filed</option><option value="Closed">Closed</option>
                  </select>
                </div>
              </div>

              <h3 className="text-[10px] font-black uppercase text-blue-600 tracking-wider mb-2 border-b pb-1 mt-4">Fees & Timeline</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Turnover (₹)</label>
                  <input type="number" step="0.01" value={editEngagementForm.turnover_gross_receipts} onChange={(e) => setEditEngagementForm({...editEngagementForm, turnover_gross_receipts: e.target.value})} className="w-full p-2.5 border rounded-xl text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Audit Fee (₹)</label>
                  <input type="number" step="0.01" value={editEngagementForm.audit_fee} onChange={(e) => setEditEngagementForm({...editEngagementForm, audit_fee: e.target.value})} className="w-full p-2.5 border rounded-xl text-sm font-bold text-emerald-700" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Fee Status</label>
                  <select value={editEngagementForm.fee_status} onChange={(e) => setEditEngagementForm({...editEngagementForm, fee_status: e.target.value})} className="w-full p-2.5 border rounded-xl text-sm font-semibold"><option value="Pending">Pending</option><option value="Partly received">Partly received</option><option value="Received">Received</option></select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Engagement Letter Date</label>
                  <input type="date" value={editEngagementForm.engagement_letter_date} onChange={(e) => setEditEngagementForm({...editEngagementForm, engagement_letter_date: e.target.value})} className="w-full p-2.5 border rounded-xl text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Data Received Date</label>
                  <input type="date" value={editEngagementForm.data_received_date} onChange={(e) => setEditEngagementForm({...editEngagementForm, data_received_date: e.target.value})} className="w-full p-2.5 border rounded-xl text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Audit Start Date</label>
                  <input type="date" value={editEngagementForm.audit_start_date} onChange={(e) => setEditEngagementForm({...editEngagementForm, audit_start_date: e.target.value})} className="w-full p-2.5 border rounded-xl text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Draft Report Date</label>
                  <input type="date" value={editEngagementForm.draft_report_date} onChange={(e) => setEditEngagementForm({...editEngagementForm, draft_report_date: e.target.value})} className="w-full p-2.5 border rounded-xl text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Report Signing Date</label>
                  <input type="date" value={editEngagementForm.report_signing_date} onChange={(e) => setEditEngagementForm({...editEngagementForm, report_signing_date: e.target.value})} className="w-full p-2.5 border rounded-xl text-sm" />
                </div>
              </div>
              <div className="flex justify-end pt-4"><button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-md">Update Details</button></div>
            </form>
          </div>
        </div>
      )}

      {/* A0: Edit Client Extra Details */}
      {isEditClientModalOpen && (
        <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Building2 size={18} className="text-blue-600"/> Edit Client Details (A0)</h2>
              <button onClick={() => setIsEditClientModalOpen(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleUpdateClient} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Constitution</label>
                  <select value={editClientForm.constitution} onChange={(e) => setEditClientForm({...editClientForm, constitution: e.target.value})} className="w-full p-2.5 border rounded-xl text-sm">
                    <option value="">-- Select --</option><option value="Private Limited Company">Private Limited Company</option><option value="Public Limited Company">Public Limited Company</option><option value="LLP">LLP</option><option value="Partnership Firm">Partnership Firm</option><option value="Proprietorship">Proprietorship</option><option value="HUF">HUF</option><option value="Trust">Trust</option><option value="Society">Society</option><option value="AOP/BOI">AOP/BOI</option><option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">CIN / LLPIN</label>
                  <input type="text" maxLength="21" value={editClientForm.cin_llpin} onChange={(e) => setEditClientForm({...editClientForm, cin_llpin: e.target.value.toUpperCase()})} className="w-full p-2.5 border rounded-xl text-sm font-mono" placeholder="U74999DL2020PTC123456" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">GSTIN</label>
                  <input type="text" maxLength="15" value={editClientForm.gstin} onChange={(e) => setEditClientForm({...editClientForm, gstin: e.target.value.toUpperCase()})} className="w-full p-2.5 border rounded-xl text-sm font-mono" placeholder="07AABCA1234F1Z5" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Accounting Method</label>
                  <select value={editClientForm.accounting_method} onChange={(e) => setEditClientForm({...editClientForm, accounting_method: e.target.value})} className="w-full p-2.5 border rounded-xl text-sm"><option value="">-- Select --</option><option value="Mercantile">Mercantile</option><option value="Cash">Cash</option></select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Date of Incorporation / Comm.</label>
                  <input type="date" value={editClientForm.date_of_incorporation} onChange={(e) => setEditClientForm({...editClientForm, date_of_incorporation: e.target.value})} className="w-full p-2.5 border rounded-xl text-sm" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 mb-1">Nature of Business</label>
                  <input type="text" maxLength="200" value={editClientForm.nature_of_business} onChange={(e) => setEditClientForm({...editClientForm, nature_of_business: e.target.value})} className="w-full p-2.5 border rounded-xl text-sm" placeholder="e.g. Trading of garments" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 mb-1">Registered Office Address</label>
                  <textarea rows="2" maxLength="250" value={editClientForm.registered_office_address} onChange={(e) => setEditClientForm({...editClientForm, registered_office_address: e.target.value})} className="w-full p-2.5 border rounded-xl text-sm resize-none" placeholder="Address..." />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 mb-1">Books Kept At</label>
                  <input type="text" maxLength="200" value={editClientForm.books_kept_at} onChange={(e) => setEditClientForm({...editClientForm, books_kept_at: e.target.value})} className="w-full p-2.5 border rounded-xl text-sm" placeholder="Place where books are maintained" />
                </div>
              </div>
              <div className="flex justify-end pt-4"><button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-md">Update Master Data</button></div>
            </form>
          </div>
        </div>
      )}

      {/* A3: Link Auditor Modal */}
      {isAuditorModalOpen && (
        <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50"><h2 className="text-lg font-bold text-slate-800">{editingIds.auditor ? 'Edit Auditor Link' : 'Link Auditor to Engagement'}</h2><button onClick={() => setIsAuditorModalOpen(false)}><X size={18} /></button></div>
            <form onSubmit={handleLinkAuditor} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 mb-1">Select Auditor from Master *</label>
                  <select required disabled={!!editingIds.auditor} value={auditorForm.auditor_id} onChange={(e) => setAuditorForm({...auditorForm, auditor_id: e.target.value})} className="w-full p-2.5 border rounded-xl text-sm font-semibold disabled:bg-slate-100 disabled:text-slate-500">
                    <option value="">-- Choose Auditor --</option>
                    {auditorsMaster.map(a => <option key={a._id} value={a._id}>{a.firm_name} ({a.signing_person_name})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Role *</label>
                  <select value={auditorForm.role} onChange={(e) => setAuditorForm({...auditorForm, role: e.target.value})} className="w-full p-2.5 border rounded-xl text-sm font-semibold"><option value="Signing">Signing</option><option value="Joint">Joint</option><option value="Previous">Previous</option><option value="Predecessor">Predecessor</option></select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Appt. Mode</label>
                  <select value={auditorForm.appointment_mode} onChange={(e) => setAuditorForm({...auditorForm, appointment_mode: e.target.value})} className="w-full p-2.5 border rounded-xl text-sm"><option value="AGM">AGM</option><option value="Board (casual vacancy)">Board (casual vacancy)</option><option value="Engagement letter">Engagement letter</option><option value="Other">Other</option></select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Appt. Date</label>
                  <input type="date" value={auditorForm.appointment_date} onChange={(e) => setAuditorForm({...auditorForm, appointment_date: e.target.value})} className="w-full p-2.5 border rounded-xl text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Appt. Form SRN (if applicable)</label>
                  <input type="text" maxLength="30" value={auditorForm.appointment_form_srn} onChange={(e) => setAuditorForm({...auditorForm, appointment_form_srn: e.target.value})} className="w-full p-2.5 border rounded-xl text-sm" placeholder="ROC SRN" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Tenure From</label>
                  <input type="date" value={auditorForm.tenure_from} onChange={(e) => setAuditorForm({...auditorForm, tenure_from: e.target.value})} className="w-full p-2.5 border rounded-xl text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Tenure To</label>
                  <input type="date" value={auditorForm.tenure_to} onChange={(e) => setAuditorForm({...auditorForm, tenure_to: e.target.value})} className="w-full p-2.5 border rounded-xl text-sm" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 mb-1">Remuneration Agreed (₹)</label>
                  <input type="number" step="0.01" value={auditorForm.remuneration} onChange={(e) => setAuditorForm({...auditorForm, remuneration: e.target.value})} className="w-full p-2.5 border rounded-xl text-sm font-bold text-emerald-700" placeholder="e.g. 50000" />
                </div>
              </div>
              <div className="flex justify-end pt-4"><button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-md">{editingIds.auditor ? 'Save Changes' : 'Link Auditor'}</button></div>
            </form>
          </div>
        </div>
      )}

      {/* A4: Add UDIN Modal */}
      {isUdinModalOpen && (
        <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50"><h2 className="text-lg font-bold text-slate-800">{editingIds.udin ? 'Edit UDIN Record' : 'Register New UDIN'}</h2><button onClick={() => setIsUdinModalOpen(false)}><X size={18} /></button></div>
            <form onSubmit={handleAddUdin} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 mb-1">18-Digit UDIN No. *</label>
                  <input type="text" required minLength="18" maxLength="18" value={udinForm.udin_no} onChange={(e) => setUdinForm({...udinForm, udin_no: e.target.value.toUpperCase()})} placeholder="e.g. 21012345ABCDEF1234" className="w-full p-2.5 border rounded-xl text-sm font-mono font-bold uppercase tracking-widest text-blue-700" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Document Type *</label>
                  <select value={udinForm.document_type} onChange={(e) => setUdinForm({...udinForm, document_type: e.target.value})} className="w-full p-2.5 border rounded-xl text-sm"><option value="Tax Audit Report">Tax Audit Report</option><option value="Statutory Audit Report">Statutory Audit Report</option><option value="Certificate">Certificate</option><option value="Other attestation">Other attestation</option><option value="Other">Other</option></select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Document Date</label>
                  <input type="date" value={udinForm.document_date} onChange={(e) => setUdinForm({...udinForm, document_date: e.target.value})} className="w-full p-2.5 border rounded-xl text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Generated Date *</label>
                  <input type="date" required value={udinForm.udin_generated_date} onChange={(e) => setUdinForm({...udinForm, udin_generated_date: e.target.value})} className="w-full p-2.5 border rounded-xl text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">UDIN Status *</label>
                  <select value={udinForm.udin_status} onChange={(e) => setUdinForm({...udinForm, udin_status: e.target.value})} className="w-full p-2.5 border rounded-xl text-sm font-semibold"><option value="Pending">Pending</option><option value="Generated">Generated</option><option value="Revoked">Revoked</option></select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 mb-1 flex items-center gap-1"><UploadCloud size={14}/> Upload Signed PDF (Optional)</label>
                  <input type="file" accept="application/pdf" onChange={(e) => setUdinForm({...udinForm, signed_copy_file: e.target.files[0]})} className="w-full text-sm font-medium border border-slate-200 rounded-lg p-2.5 bg-white file:mr-4 file:py-1 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 mb-1">Remarks</label>
                  <textarea rows="2" maxLength="300" value={udinForm.remarks} onChange={(e) => setUdinForm({...udinForm, remarks: e.target.value})} className="w-full p-2.5 border rounded-xl text-sm resize-none" placeholder="Any internal notes..." />
                </div>
              </div>
              <div className="flex justify-end pt-4"><button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-md">{editingIds.udin ? 'Save Changes' : 'Save UDIN'}</button></div>
            </form>
          </div>
        </div>
      )}

      {/* A5: Add Filing Modal */}
      {isFilingModalOpen && (
        <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50"><h2 className="text-lg font-bold text-slate-800">{editingIds.filing ? 'Edit Filing Record' : 'Add Filing Tracker Record'}</h2><button onClick={() => setIsFilingModalOpen(false)}><X size={18} /></button></div>
            <form onSubmit={handleAddFiling} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Form Name *</label>
                  <select value={filingForm.form_name} onChange={(e) => setFilingForm({...filingForm, form_name: e.target.value})} className="w-full p-2.5 border rounded-xl text-sm"><option value="Tax audit report">Tax audit report</option><option value="Tax audit annexure">Tax audit annexure</option><option value="Financial statements filing">Financial statements filing</option><option value="Annual return">Annual return</option><option value="Other">Other</option></select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Portal *</label>
                  <select value={filingForm.filing_portal} onChange={(e) => setFilingForm({...filingForm, filing_portal: e.target.value})} className="w-full p-2.5 border rounded-xl text-sm"><option value="Income Tax portal">Income Tax portal</option><option value="MCA">MCA</option><option value="GST portal">GST portal</option><option value="Other">Other</option></select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Status *</label>
                  <select value={filingForm.filing_status} onChange={(e) => setFilingForm({...filingForm, filing_status: e.target.value})} className="w-full p-2.5 border rounded-xl text-sm font-semibold"><option value="Pending">Pending</option><option value="Uploaded">Uploaded</option><option value="Filed">Filed</option><option value="Rejected">Rejected</option></select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Acknowledgement / SRN No.</label>
                  <input type="text" maxLength="30" value={filingForm.acknowledgement_srn_no} onChange={(e) => setFilingForm({...filingForm, acknowledgement_srn_no: e.target.value})} className="w-full p-2.5 border rounded-xl text-sm font-mono" placeholder="Ack No."/>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Auditor Upload Date</label>
                  <input type="date" value={filingForm.uploaded_by_auditor_date} onChange={(e) => setFilingForm({...filingForm, uploaded_by_auditor_date: e.target.value})} className="w-full p-2.5 border rounded-xl text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Client Approval Date</label>
                  <input type="date" value={filingForm.client_approval_date} onChange={(e) => setFilingForm({...filingForm, client_approval_date: e.target.value})} className="w-full p-2.5 border rounded-xl text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Final Filed Date</label>
                  <input type="date" value={filingForm.filed_date} onChange={(e) => setFilingForm({...filingForm, filed_date: e.target.value})} className="w-full p-2.5 border rounded-xl text-sm font-bold text-emerald-600" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Late Fee (₹) if any</label>
                  <input type="number" step="0.01" value={filingForm.late_fee} onChange={(e) => setFilingForm({...filingForm, late_fee: e.target.value})} className="w-full p-2.5 border rounded-xl text-sm text-rose-600 font-bold" placeholder="0.00" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 mb-1 flex items-center gap-1"><UploadCloud size={14}/> Upload Ack/Challan Proof (Optional)</label>
                  <input type="file" onChange={(e) => setFilingForm({...filingForm, proof_file: e.target.files[0]})} className="w-full text-sm font-medium border border-slate-200 rounded-lg p-2.5 bg-white file:mr-4 file:py-1 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 mb-1">Remarks</label>
                  <textarea rows="2" maxLength="300" value={filingForm.remarks} onChange={(e) => setFilingForm({...filingForm, remarks: e.target.value})} className="w-full p-2.5 border rounded-xl text-sm resize-none" placeholder="Notes..." />
                </div>
              </div>
              <div className="flex justify-end pt-4"><button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-md">{editingIds.filing ? 'Save Changes' : 'Save Record'}</button></div>
            </form>
          </div>
        </div>
      )}

      {/* A6: Add Checklist Modal */}
      {isChecklistModalOpen && (
        <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50"><h2 className="text-lg font-bold text-slate-800">{editingIds.checklist ? 'Edit Checklist Item' : 'Add Required Document'}</h2><button onClick={() => setIsChecklistModalOpen(false)}><X size={18} /></button></div>
            <form onSubmit={handleAddChecklist} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 mb-1">Document Needed *</label>
                  <select value={checklistForm.item} onChange={(e) => setChecklistForm({...checklistForm, item: e.target.value})} className="w-full p-2.5 border rounded-xl text-sm font-semibold">
                    <option value="Trial balance">Trial balance</option><option value="Financial statements (draft)">Financial statements (draft)</option><option value="Bank statements">Bank statements</option><option value="Fixed asset register">Fixed asset register</option><option value="Stock statement">Stock statement</option><option value="Loan confirmations">Loan confirmations</option><option value="Sales / purchase registers">Sales / purchase registers</option><option value="TDS / TCS reconciliation">TDS / TCS reconciliation</option><option value="GST reconciliation">GST reconciliation</option><option value="Form 26AS / AIS">Form 26AS / AIS</option><option value="Previous year audit report">Previous year audit report</option><option value="Management representation letter">Management representation letter</option><option value="Engagement letter">Engagement letter</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Status *</label>
                  <select value={checklistForm.status} onChange={(e) => setChecklistForm({...checklistForm, status: e.target.value})} className="w-full p-2.5 border rounded-xl text-sm font-bold text-slate-700"><option value="Pending">Pending</option><option value="Received">Received</option><option value="Not applicable">Not applicable</option></select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Received Date</label>
                  <input type="date" value={checklistForm.received_date} onChange={(e) => setChecklistForm({...checklistForm, received_date: e.target.value})} className="w-full p-2.5 border rounded-xl text-sm" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 mb-1 flex items-center gap-1"><UploadCloud size={14}/> Upload Document (Optional)</label>
                  <input type="file" onChange={(e) => setChecklistForm({...checklistForm, file: e.target.files[0]})} className="w-full text-sm font-medium border border-slate-200 rounded-lg p-2.5 bg-white file:mr-4 file:py-1 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 mb-1">Remarks</label>
                  <textarea rows="2" maxLength="300" value={checklistForm.remarks} onChange={(e) => setChecklistForm({...checklistForm, remarks: e.target.value})} className="w-full p-2.5 border rounded-xl text-sm resize-none" placeholder="Notes..." />
                </div>
              </div>
              <div className="flex justify-end pt-4"><button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-md">{editingIds.checklist ? 'Save Changes' : 'Add to List'}</button></div>
            </form>
          </div>
        </div>
      )}

      {/* 🔴 MODAL: CREATE NEW AUDITOR IN MASTER */}
      {isAddAuditorMasterOpen && (
        <div className="fixed inset-0 z-[70] bg-slate-900/80 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Users size={20} className="text-blue-600"/> Add New CA / Auditor to Master</h2>
              <button onClick={() => setIsAddAuditorMasterOpen(false)} className="text-slate-400 hover:text-slate-700"><X size={18} /></button>
            </div>
            <form onSubmit={handleCreateAuditorMaster} className="p-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 mb-1">CA Firm Name *</label>
                  <input type="text" required maxLength="150" value={newAuditorForm.firm_name} onChange={(e) => setNewAuditorForm({...newAuditorForm, firm_name: e.target.value})} className="w-full p-2.5 border rounded-xl text-sm font-semibold" placeholder="e.g. Sharma & Associates" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Firm Registration No. (FRN) *</label>
                  <input type="text" required maxLength="10" value={newAuditorForm.firm_frn} onChange={(e) => setNewAuditorForm({...newAuditorForm, firm_frn: e.target.value})} className="w-full p-2.5 border rounded-xl text-sm uppercase" placeholder="e.g. 123456W" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Auditor PAN *</label>
                  <input type="text" required maxLength="10" value={newAuditorForm.auditor_pan} onChange={(e) => setNewAuditorForm({...newAuditorForm, auditor_pan: e.target.value.toUpperCase()})} className="w-full p-2.5 border rounded-xl text-sm uppercase" placeholder="ABCDE1234F" />
                </div>
                <div className="col-span-2 border-t border-slate-100 mt-2 pt-4">
                  <h4 className="text-[10px] font-black uppercase text-blue-600 mb-3 tracking-wider">Signing Partner Details</h4>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Signing Person Name *</label>
                  <input type="text" required maxLength="100" value={newAuditorForm.signing_person_name} onChange={(e) => setNewAuditorForm({...newAuditorForm, signing_person_name: e.target.value})} className="w-full p-2.5 border rounded-xl text-sm font-semibold" placeholder="e.g. CA Amit Sharma" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">ICAI Membership No. *</label>
                  <input type="text" required maxLength="6" value={newAuditorForm.membership_no} onChange={(e) => setNewAuditorForm({...newAuditorForm, membership_no: e.target.value})} className="w-full p-2.5 border rounded-xl text-sm" placeholder="e.g. 512345" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Designation *</label>
                  <select required value={newAuditorForm.designation} onChange={(e) => setNewAuditorForm({...newAuditorForm, designation: e.target.value})} className="w-full p-2.5 border rounded-xl text-sm">
                    <option value="Partner">Partner</option><option value="Proprietor">Proprietor</option>
                  </select>
                </div>
                <div className="col-span-2 border-t border-slate-100 mt-2 pt-4">
                  <h4 className="text-[10px] font-black uppercase text-blue-600 mb-3 tracking-wider">Contact & Address</h4>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Email ID *</label>
                  <input type="email" required maxLength="100" value={newAuditorForm.email} onChange={(e) => setNewAuditorForm({...newAuditorForm, email: e.target.value})} className="w-full p-2.5 border rounded-xl text-sm" placeholder="ca@firm.com" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Mobile No. *</label>
                  <input type="text" required maxLength="10" value={newAuditorForm.mobile} onChange={(e) => setNewAuditorForm({...newAuditorForm, mobile: e.target.value})} className="w-full p-2.5 border rounded-xl text-sm" placeholder="9876543210" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 mb-1">Full Address *</label>
                  <textarea required rows="2" maxLength="250" value={newAuditorForm.address} onChange={(e) => setNewAuditorForm({...newAuditorForm, address: e.target.value})} className="w-full p-2.5 border rounded-xl text-sm resize-none" placeholder="Office address..." />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">City *</label>
                  <input type="text" required value={newAuditorForm.city} onChange={(e) => setNewAuditorForm({...newAuditorForm, city: e.target.value})} className="w-full p-2.5 border rounded-xl text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">State *</label>
                  <input type="text" required value={newAuditorForm.state} onChange={(e) => setNewAuditorForm({...newAuditorForm, state: e.target.value})} className="w-full p-2.5 border rounded-xl text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Pincode *</label>
                  <input type="text" required maxLength="6" value={newAuditorForm.pincode} onChange={(e) => setNewAuditorForm({...newAuditorForm, pincode: e.target.value})} className="w-full p-2.5 border rounded-xl text-sm" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-6 mt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsAddAuditorMasterOpen(false)} className="px-5 py-2 text-sm font-bold text-slate-600 bg-slate-100 rounded-xl">Cancel</button>
                <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-md">Save Master Data</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default AuditWorkspace;