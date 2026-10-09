import { isAdminRole } from '../utils/roles';
import React, { useState, useEffect, useContext, useMemo, useRef } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import toast, { Toaster } from 'react-hot-toast';
import * as XLSX from 'xlsx'; 
import ExcelJS from 'exceljs'; 
import { saveAs } from 'file-saver';
import { 
  Store, Search, Plus, X, CheckCircle2, AlertTriangle, AlertCircle, RefreshCw, 
  Trash2, Eye, Edit, ShieldCheck, CalendarDays, IndianRupee, Key, Download, Upload, Activity ,
  CheckSquare, Users, Phone, Mail, MapPin, FileText, ClipboardList, Send, MessageSquare, Loader2, Copy, ExternalLink
} from 'lucide-react';

const FssaiWorkspace = () => {
  const { user } = useContext(AuthContext);
  const isAdmin = isAdminRole(user?.role);
  
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [fetchingPan, setFetchingPan] = useState(false);
  const [panSuggestions, setPanSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [licenseTypeFilter, setLicenseTypeFilter] = useState('ALL');

  // 🔴 Server-Side Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [serverStats, setServerStats] = useState(null); // Poore filtered data ke totals (server se)
  const itemsPerPage = 10;

  const [selectedIds, setSelectedIds] = useState([]);
  const fileInputRef = useRef(null);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingData, setViewingData] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ open: false, client: null });

  const [isRemarksModalOpen, setIsRemarksModalOpen] = useState(false);
  const [clientForRemarks, setClientForRemarks] = useState(null);
  const [newRemarkText, setNewRemarkText] = useState('');

  const initialForm = {
    pan: '', fssaiLicenseNo: '', assesseeName: '', clientId: '',
    licenseType: 'Basic Registration', kindOfBusiness: '',
    mobile: '', email: '', state: '', address: '', pinCode: '',
    issueDate: '', expiryDate: '',
    foscosUserId: '', foscosPassword: '',
    financialYear: '2026-27', returnType: 'Annual Return (Form D-1)', fssaiStatus: 'Documents Pending',
    dueDate: '', filingDate: '', acknowledgementNo: '',
    feeStatus: 'Yearly', feeAmount: '', amountReceived: '', paymentDate: '',
    newPaymentAmount: '', newPaymentDate: '', remarks: ''
  };
  
  const [formData, setFormData] = useState(initialForm);

  // 🔴 FETCH DATA WITH PAGINATION
  const fetchWorkspaces = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${user.token}` };
      const params = new URLSearchParams({
        page: currentPage,
        limit: itemsPerPage,
        search: searchQuery,
        status: statusFilter,
        licenseType: licenseTypeFilter
      }).toString();

      const res = await axios.get(`${import.meta.env.VITE_API_URL}/fssai?${params}`, { headers });
      
      if (res.data && res.data.data) {
        setWorkspaces(res.data.data);
        setTotalPages(res.data.totalPages || 1);
        setTotalRecords(res.data.totalCount || 0);
        setServerStats(res.data.stats || null);
      } else {
        setWorkspaces(res.data || []);
      }
      setSelectedIds([]);
    } catch (error) {
      toast.error("Failed to load FSSAI workspaces");
    } finally {
      setLoading(false);
    }
  };

  // Debounce API calls when filters or search change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchWorkspaces();
    }, 500); 
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line
  }, [user.token, currentPage, searchQuery, statusFilter, licenseTypeFilter]);

  // Reset page to 1 if any filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, licenseTypeFilter]);

  // 🔴 BULLETPROOF PAN SEARCH LOGIC
  const handlePanChange = async (e) => {
    const val = e.target.value.toUpperCase();
    setFormData(prev => ({ ...prev, pan: val }));

    if (val.length >= 2) {
      setFetchingPan(true);
      try {
        const headers = { Authorization: `Bearer ${user.token}` };
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/client-master?search=${val}&fetchAll=true`, { headers });
        
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
    setFormData(prev => ({
      ...prev,
      pan: client.pan,
      assesseeName: client.name || prev.assesseeName,
      clientId: client.clientId || '',
      mobile: client.mobile || prev.mobile,
      email: client.email || prev.email,
      state: client.state || prev.state,
      pinCode: client.pinCode || prev.pinCode,
      address: client.address || prev.address
    }));
    setShowSuggestions(false); 
    toast.success("✅ Client Data Auto-Filled!");
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const copyToClipboard = (text, type) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success(`${type} copied!`, { icon: '📋', style: { borderRadius: '10px', background: '#333', color: '#fff' } });
  };

  // 🔴 Cards poore filtered data ka total dikhate hain (server se), sirf is page ke 10 records ka nahi
  const stats = useMemo(() => {
    const s = serverStats || {};
    const totalFee = Number(s.totalFee || 0);
    const totalReceived = Number(s.totalReceived || 0);
    return {
      total: totalRecords,
      active: s.active || 0,
      expired: s.expired || 0,
      filed: s.filed || 0,
      totalFee, totalReceived,
      pendingDues: totalFee - totalReceived
    };
  }, [serverStats, totalRecords]);

  // EXCEL EXPORT (Full Download via backend request)
  const handleExportExcel = async () => {
    const toastId = toast.loading("Fetching all FSSAI records for export...");
    try {
      const headers = { Authorization: `Bearer ${user.token}` };
      const params = new URLSearchParams({
        search: searchQuery,
        status: statusFilter,
        licenseType: licenseTypeFilter,
        fetchAll: 'true' // Requesting full list from backend
      }).toString();

      const res = await axios.get(`${import.meta.env.VITE_API_URL}/fssai?${params}`, { headers });
      const fullWorkspacesList = res.data.data || res.data || [];

      toast.success("Generating Excel File...", { id: toastId });

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('FSSAI Workspace');

      worksheet.columns = [
        { header: 'Master ID', key: 'clientId', width: 20 },
        { header: 'PAN', key: 'pan', width: 15 },
        { header: 'Entity Name', key: 'name', width: 30 },
        { header: 'FSSAI License No', key: 'licenseNo', width: 25 },
        { header: 'License Type', key: 'licenseType', width: 20 },
        { header: 'Kind of Business', key: 'kob', width: 25 },
        { header: 'Mobile', key: 'mobile', width: 15 },
        { header: 'Email', key: 'email', width: 25 },
        { header: 'State', key: 'state', width: 15 },
        { header: 'Issue Date', key: 'issueDate', width: 15 },
        { header: 'Expiry Date', key: 'expiryDate', width: 15 },
        { header: 'FoSCoS User ID', key: 'portalId', width: 20 },
        { header: 'FoSCoS Password', key: 'portalPass', width: 20 },
        { header: 'Financial Year', key: 'fy', width: 15 },
        { header: 'Return Type', key: 'returnType', width: 20 },
        { header: 'Current Status', key: 'status', width: 20 },
        { header: 'Due Date', key: 'dueDate', width: 15 },
        { header: 'Filing Date', key: 'filingDate', width: 15 },
        { header: 'Ack / SRN No', key: 'ackNo', width: 20 },
        { header: 'Fee Status', key: 'feeStatus', width: 15 },
        { header: 'Total Fee', key: 'feeAmount', width: 15 },
        { header: 'Received', key: 'amountReceived', width: 15 },
        { header: 'Balance', key: 'balance', width: 15 }
      ];

      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

      const dataToExport = selectedIds.length > 0 ? fullWorkspacesList.filter(ws => selectedIds.includes(ws._id)) : fullWorkspacesList;

      dataToExport.forEach(ws => { 
        worksheet.addRow({
          clientId: ws.clientMasterId?.clientId || 'N/A',
          pan: ws.pan || '',
          name: ws.assesseeName || '',
          licenseNo: ws.fssaiLicenseNo || '',
          licenseType: ws.licenseType || '',
          kob: ws.kindOfBusiness || '',
          mobile: ws.mobile || '',
          email: ws.email || '',
          state: ws.state || '',
          issueDate: ws.issueDate ? new Date(ws.issueDate).toLocaleDateString('en-IN') : '',
          expiryDate: ws.expiryDate ? new Date(ws.expiryDate).toLocaleDateString('en-IN') : '',
          portalId: ws.foscosUserId || '',
          portalPass: ws.foscosPassword || '',
          fy: ws.financialYear || '',
          returnType: ws.returnType || '',
          status: ws.fssaiStatus || '',
          dueDate: ws.dueDate ? new Date(ws.dueDate).toLocaleDateString('en-IN') : '',
          filingDate: ws.filingDate ? new Date(ws.filingDate).toLocaleDateString('en-IN') : '',
          ackNo: ws.acknowledgementNo || '',
          feeStatus: ws.feeStatus || '',
          feeAmount: ws.feeAmount || 0,
          amountReceived: ws.amountReceived || 0,
          balance: (ws.feeAmount || 0) - (ws.amountReceived || 0)
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `FSSAI_Workspace_${new Date().toISOString().split('T')[0]}.xlsx`);
      if(selectedIds.length > 0) setSelectedIds([]);
    } catch (error) {
      toast.error("Failed to generate Excel.", { id: toastId });
    }
  };

  // 🔴 IMPORT LOGIC
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary', cellDates: true }); 
        const wsname = wb.SheetNames[0];
        const data = XLSX.utils.sheet_to_json(wb.Sheets[wsname]);

        if (data.length === 0) return toast.error("Uploaded Excel file is empty!");

        const parseDate = (raw) => {
          if (!raw) return null;
          if (raw instanceof Date && !isNaN(raw.getTime())) return `${raw.getFullYear()}-${String(raw.getMonth() + 1).padStart(2, '0')}-${String(raw.getDate()).padStart(2, '0')}`;
          if (typeof raw === 'string') {
            const parts = raw.split(/[\/\-]/); 
            if (parts.length === 3) {
               if(parts[0].length === 4) return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
               return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            }
          }
          return null;
        };

        const getVal = (row, keys) => {
          for (let key of keys) {
            if (row[key] !== undefined && row[key] !== null) return row[key];
          }
          return '';
        };

        const formattedRecords = data.map(row => ({
          pan: String(getVal(row, ['PAN', 'pan', 'Pan'])).toUpperCase(), 
          assesseeName: getVal(row, ['Entity Name', 'Name', 'assesseeName']) || '',
          fssaiLicenseNo: String(getVal(row, ['FSSAI License No', 'License No', 'fssaiLicenseNo'])).toUpperCase(),
          licenseType: getVal(row, ['License Type', 'licenseType']) || 'Basic Registration',
          kindOfBusiness: getVal(row, ['Kind of Business', 'KOB', 'kob']) || '',
          mobile: getVal(row, ['Mobile', 'mobile']) || '',
          email: getVal(row, ['Email', 'email']) || '',
          state: getVal(row, ['State', 'state']) || '',
          issueDate: parseDate(getVal(row, ['Issue Date', 'issueDate'])),
          expiryDate: parseDate(getVal(row, ['Expiry Date', 'expiryDate'])),
          foscosUserId: getVal(row, ['FoSCoS User ID', 'Portal ID', 'foscosUserId']) || '',
          foscosPassword: String(getVal(row, ['FoSCoS Password', 'Portal Pass', 'foscosPassword']) || ''),
          financialYear: getVal(row, ['Financial Year', 'FY', 'fy']) || '2026-27',
          returnType: getVal(row, ['Return Type', 'returnType']) || 'Annual Return (Form D-1)',
          fssaiStatus: getVal(row, ['Current Status', 'Status', 'status']) || 'Documents Pending',
          dueDate: parseDate(getVal(row, ['Due Date', 'dueDate'])),
          filingDate: parseDate(getVal(row, ['Filing Date', 'filingDate'])),
          acknowledgementNo: String(getVal(row, ['Ack / SRN No', 'Ack No', 'acknowledgementNo']) || ''),
          feeStatus: getVal(row, ['Fee Status', 'feeStatus']) || 'Yearly',
          feeAmount: Number(getVal(row, ['Total Fee', 'feeAmount']) || 0),
          amountReceived: Number(getVal(row, ['Received', 'amountReceived']) || 0),
          paymentDate: parseDate(getVal(row, ['Last Payment Date', 'Payment Date', 'paymentDate']))
        })).filter(item => item.assesseeName && item.fssaiLicenseNo && item.pan); 

        if (formattedRecords.length === 0) return toast.error("No valid rows found. Ensure Name, PAN & License No exist.");

        const headers = { Authorization: `Bearer ${user.token}` };
        const response = await axios.post(`${import.meta.env.VITE_API_URL}/fssai/import`, { records: formattedRecords }, { headers });
        
        toast.success(response.data.message || `Successfully imported FSSAI records!`);
        fetchWorkspaces();
      } catch (error) {
        toast.error("Error importing records");
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = ""; 
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Are you sure you want to permanently delete ${selectedIds.length} records?`)) return;
    try {
      const headers = { Authorization: `Bearer ${user.token}` };
      await axios.post(`${import.meta.env.VITE_API_URL}/fssai/bulk-delete`, { ids: selectedIds }, { headers });
      toast.success(`${selectedIds.length} Records deleted successfully!`);
      setSelectedIds([]);
      fetchWorkspaces();
    } catch (error) {
      toast.error("Error deleting records");
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.pan || !formData.fssaiLicenseNo || !formData.assesseeName) {
      return toast.error("PAN, License Number, and Name are required!");
    }
    
    setSaving(true);
    try {
      const headers = { Authorization: `Bearer ${user.token}` };
      const dateStamp = new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit' });
      const authorInfo = user?.name ? `${user.name}` : 'User';
      
      let finalAmountReceived = Number(formData.amountReceived || 0);
      let finalRemarks = formData.remarks || '';
      let finalFeeStatus = formData.feeStatus;
      let finalPaymentDate = formData.paymentDate;

      if (editMode && currentId) {
        const clientToUpdate = workspaces.find(c => c._id === currentId);
        if (clientToUpdate) {
            let changes = [];
            const newAmt = Number(formData.newPaymentAmount || 0);
            
            if (newAmt > 0) {
               finalAmountReceived += newAmt;
               const pDateStr = formData.newPaymentDate || new Date().toISOString().split('T')[0];
               finalPaymentDate = pDateStr;

               const newBal = Number(formData.feeAmount || 0) - finalAmountReceived;
               if (newBal <= 0) finalFeeStatus = 'Paid'; 

               changes.push(`💰 Payment Received: ₹${newAmt} on ${new Date(pDateStr).toLocaleDateString('en-IN')}`);
               changes.push(`📊 New Balance Due: ₹${newBal <= 0 ? 0 : newBal}`);
            }

            if(changes.length > 0 || newRemarkText.trim()) {
              let auditBlock = `\n\n--------------------------------------\n📅 ${dateStamp} | 👤 ${authorInfo}\n🔄 Updates:\n - ${changes.join('\n - ')}`;
              if (newRemarkText.trim()) auditBlock += `\n💬 Note: ${newRemarkText.trim()}`;
              finalRemarks += auditBlock;
            }
        }
      } else {
        finalRemarks = `📅 ${dateStamp} | 👤 ${authorInfo}\n📌 Client onboarded to FSSAI workspace.`;
      }

      const payload = { 
        ...formData, 
        amountReceived: finalAmountReceived, feeStatus: finalFeeStatus,
        paymentDate: finalPaymentDate, remarks: finalRemarks
      };
      delete payload.newPaymentAmount; delete payload.newPaymentDate;

      if (editMode && currentId) {
        await axios.put(`${import.meta.env.VITE_API_URL}/fssai/${currentId}`, payload, { headers });
        toast.success("FSSAI details updated successfully!");
      } else {
        await axios.post(`${import.meta.env.VITE_API_URL}/fssai`, payload, { headers });
        toast.success("Client added to FSSAI workspace!");
      }
      
      setIsModalOpen(false);
      fetchWorkspaces();
    } catch (error) {
      toast.error(error.response?.data?.message || "Error saving details");
    } finally {
      setSaving(false);
    }
  };

  const handleOpenAdd = () => {
    setEditMode(false);
    setCurrentId(null);
    setFormData(initialForm);
    setShowSuggestions(false);
    setNewRemarkText('');
    setIsModalOpen(true);
  };

  const handleEdit = (ws) => {
    setEditMode(true);
    setCurrentId(ws._id);
    
    const parseDate = (d) => d ? new Date(d).toISOString().split('T')[0] : '';

    setFormData({
      pan: ws.pan || '',
      fssaiLicenseNo: ws.fssaiLicenseNo || '',
      assesseeName: ws.assesseeName || '',
      clientId: ws.clientMasterId?.clientId || '',
      licenseType: ws.licenseType || 'Basic Registration',
      kindOfBusiness: ws.kindOfBusiness || '',
      mobile: ws.mobile || '', email: ws.email || '', state: ws.state || '',
      address: ws.address || '', pinCode: ws.pinCode || '',
      issueDate: parseDate(ws.issueDate), expiryDate: parseDate(ws.expiryDate),
      foscosUserId: ws.foscosUserId || '', foscosPassword: ws.foscosPassword || '',
      financialYear: ws.financialYear || '2026-27',
      returnType: ws.returnType || 'Annual Return (Form D-1)',
      fssaiStatus: ws.fssaiStatus || 'Documents Pending',
      dueDate: parseDate(ws.dueDate), filingDate: parseDate(ws.filingDate),
      acknowledgementNo: ws.acknowledgementNo || '',
      feeStatus: ws.feeStatus || 'Yearly', feeAmount: ws.feeAmount || '',
      amountReceived: ws.amountReceived || '', paymentDate: parseDate(ws.paymentDate),
      newPaymentAmount: '', newPaymentDate: '', remarks: ws.remarks || ''
    });
    setNewRemarkText(''); 
    setIsModalOpen(true);
  };

  const handleOpenView = (ws) => { setViewingData(ws); setIsViewModalOpen(true); };

  const handleOpenRemarks = (ws) => { 
    setClientForRemarks(ws); 
    setNewRemarkText(''); 
    setIsRemarksModalOpen(true); 
  };
  
  const confirmDelete = (ws) => { setDeleteModal({ open: true, client: ws }); };

  const executeDelete = async () => {
    try {
      const headers = { Authorization: `Bearer ${user.token}` };
      await axios.delete(`${import.meta.env.VITE_API_URL}/fssai/${deleteModal.client._id}`, { headers });
      toast.success("FSSAI Record removed!");
      setDeleteModal({ open: false, client: null });
      if (isViewModalOpen) setIsViewModalOpen(false);
      fetchWorkspaces();
    } catch (error) { toast.error("Error removing record"); }
  };

  const handleAddRemarkSubmit = async (e) => {
    e.preventDefault();
    if (!newRemarkText.trim() || !clientForRemarks) return;

    try {
      const headers = { Authorization: `Bearer ${user.token}` };
      const dateStamp = new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit' });
      const entry = `\n\n--------------------------------------\n📅 ${dateStamp} | 👤 ${user?.name || 'User'} (Notes)\n💬 ${newRemarkText.trim()}`;
      const updatedRemarks = (clientForRemarks.remarks || '') + entry;

      await axios.put(`${import.meta.env.VITE_API_URL}/fssai/${clientForRemarks._id}`, { remarks: updatedRemarks }, { headers });
      setClientForRemarks(prev => ({ ...prev, remarks: updatedRemarks }));
      setWorkspaces(prev => prev.map(c => c._id === clientForRemarks._id ? { ...c, remarks: updatedRemarks } : c));
      setNewRemarkText('');
      toast.success("Remark added!");
    } catch (error) { toast.error("Failed to add remark"); }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'Documents Pending': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Processing': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Filed': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'License Expired': return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'Error/Mismatch': return 'bg-orange-50 text-orange-700 border-orange-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getFilteredRemarks = (remarksStr) => {
    if (!remarksStr) return '';
    const blocks = remarksStr.split(/(?=\n\n--------------------------------------\n|\n?📅 )/);
    return blocks.join('').trim();
  };

  const projectedBalance = Number(formData.feeAmount || 0) - Number(formData.amountReceived || 0) - Number(formData.newPaymentAmount || 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 pb-12 h-[calc(100vh-80px)] flex flex-col">
      <Toaster position="top-right" />

      {/* HEADER & MAIN ACTIONS */}
      <div className="flex-none space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
              <Store size={28} className="text-emerald-600" /> FSSAI / FoSCoS Workspace
            </h1>
            <p className="text-sm text-slate-500 mt-1 font-medium">Track Food Licenses, Renewals, Returns, and FoSCoS portal credentials.</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleExportExcel} className="inline-flex items-center gap-2 bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200 hover:border-emerald-200 text-sm font-bold px-4 py-2.5 rounded-xl transition-colors shadow-sm">
              <Download size={16} strokeWidth={2.5} /> Export
            </button>
            <button onClick={() => fileInputRef.current.click()} className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-sm font-bold px-4 py-2.5 rounded-xl transition-colors shadow-sm">
              <Upload size={16} strokeWidth={2.5} /> Import
            </button>
            <input type="file" accept=".xlsx, .xls, .csv" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
            
            <button onClick={handleOpenAdd} className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold px-5 py-2.5 rounded-xl shadow-md shadow-emerald-500/20 transition-all">
              <Plus size={18} strokeWidth={2.5} /> Onboard FSSAI License
            </button>
          </div>
        </div>

        {/* METRICS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className="h-12 w-12 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center font-bold border border-slate-100 shrink-0"><ClipboardList size={20} /></div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Licenses</p>
              <h3 className="text-2xl font-black text-slate-800">{stats.total}</h3>
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow border-b-4 border-b-emerald-500">
            <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold border border-emerald-100 shrink-0"><ShieldCheck size={20} /></div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Active Licenses</p>
              <h3 className="text-2xl font-black text-emerald-600">{stats.active}</h3>
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow border-b-4 border-b-rose-500">
            <div className="h-12 w-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold border border-rose-100 shrink-0"><AlertTriangle size={20} /></div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Expired / Mismatch</p>
              <h3 className="text-2xl font-black text-rose-600">{stats.expired}</h3>
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow border-b-4 border-b-blue-500">
            <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold border border-blue-100 shrink-0"><CheckCircle2 size={20} /></div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Returns Filed</p>
              <h3 className="text-2xl font-black text-blue-600">{stats.filed}</h3>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN DATA SECTION */}
      <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden min-h-0">
        
        {/* FILTERS */}
        <div className="flex-none bg-slate-50/95 backdrop-blur-md z-20 shadow-sm border-b border-slate-200 p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-1/3">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search Client, License No, or PAN..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              className="w-full pl-9 pr-3.5 py-2.5 text-sm font-medium bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-sm" 
            />
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <select value={licenseTypeFilter} onChange={(e) => setLicenseTypeFilter(e.target.value)} className="text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl px-4 py-2.5 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer w-full md:w-auto">
              <option value="ALL">All License Types</option>
              <option value="Basic Registration">Basic Registration</option>
              <option value="State License">State License</option>
              <option value="Central License">Central License</option>
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl px-4 py-2.5 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer w-full md:w-auto">
              <option value="ALL">All Status</option>
              <option value="Documents Pending">Documents Pending</option>
              <option value="Processing">Processing</option>
              <option value="Filed">Filed</option>
              <option value="License Expired">License Expired</option>
              <option value="Error/Mismatch">Error/Mismatch</option>
            </select>
          </div>
        </div>

        {/* SMART TOOLBAR FOR SELECTED ROWS */}
        {selectedIds.length > 0 && (
          <div className="bg-emerald-50 border-b border-emerald-100 p-3 px-6 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
            <span className="text-sm font-bold text-emerald-800 flex items-center gap-2">
              <CheckSquare size={16} /> {selectedIds.length} Records Selected
            </span>
            <div className="flex items-center gap-3">
              <button onClick={handleExportExcel} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors shadow-sm">
                <Download size={14} strokeWidth={2.5}/> Export Selected
              </button>
              {isAdmin && (
                <button onClick={handleBulkDelete} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-rose-500 hover:bg-rose-600 rounded-lg transition-colors shadow-sm">
                  <Trash2 size={14} strokeWidth={2.5}/> Delete Selected
                </button>
              )}
            </div>
          </div>
        )}

        <div className="w-full text-left bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-wider flex pr-4 border-b border-slate-200">
           <div className="py-3 px-12 w-[35%]">Client & License Info</div>
           <div className="py-3 px-5 w-[20%]">Validity & Details</div>
           <div className="py-3 px-5 w-[15%]">Status</div>
           <div className="py-3 px-5 flex-1 text-right">Actions</div>
        </div>

        {/* SCROLLABLE TABLE BODY */}
        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead className="hidden"><tr><th className="w-[35%]"></th><th className="w-[20%]"></th><th className="w-[15%]"></th><th className="flex-1"></th></tr></thead>
            <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-700">
              {loading ? (
                <tr><td colSpan="4" className="text-center py-16 text-slate-400"><RefreshCw className="animate-spin inline-block mr-2" size={18}/> Loading FSSAI database...</td></tr>
              ) : workspaces.length === 0 ? (
                <tr><td colSpan="4" className="text-center py-16 text-slate-400 flex flex-col items-center"><AlertCircle size={36} className="mb-3 text-slate-300"/> No FSSAI records found.</td></tr>
              ) : (
                workspaces.map((ws) => {
                  const isSelected = selectedIds.includes(ws._id);
                  const isExpired = ws.fssaiStatus === 'License Expired' || (ws.expiryDate && new Date(ws.expiryDate) < new Date());

                  return (
                    <tr key={ws._id} className={`hover:bg-emerald-50/30 transition-colors group ${isSelected ? 'bg-emerald-50/30' : ''}`}>
                      <td className="py-4 px-4 w-[35%]">
                        <div className="flex items-center gap-3">
                          <input 
                            type="checkbox" 
                            checked={isSelected} 
                            onChange={() => {
                              setSelectedIds(prev => prev.includes(ws._id) ? prev.filter(i => i !== ws._id) : [...prev, ws._id]);
                            }} 
                            className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                          />
                          <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-sm shrink-0 border border-emerald-200">
                            {ws.assesseeName ? ws.assesseeName.charAt(0).toUpperCase() : 'F'}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-800 text-base flex items-center gap-2">
                              {ws.assesseeName}
                            </span>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              <span className="text-[10px] font-mono font-black uppercase text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded tracking-wider" title="FSSAI License">
                                {ws.fssaiLicenseNo}
                              </span>
                              <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                {ws.licenseType}
                              </span>
                              {ws.clientMasterId?.clientId && (
                                <span className="text-[9px] font-bold uppercase text-slate-400">ID: {ws.clientMasterId.clientId}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-5 w-[20%]">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600">
                             <CalendarDays size={12} className={isExpired ? 'text-rose-500' : 'text-slate-400'}/> 
                             Valid till: <span className={isExpired ? 'text-rose-600' : 'text-slate-800'}>{ws.expiryDate ? new Date(ws.expiryDate).toLocaleDateString('en-IN') : 'N/A'}</span>
                          </div>
                          <span className="text-[10px] font-bold text-slate-500 uppercase truncate" title={ws.kindOfBusiness}>
                             KOB: {ws.kindOfBusiness || 'Not Specified'}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-5 w-[15%]">
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border flex items-center gap-1 w-max ${getStatusStyle(ws.fssaiStatus)}`}>
                          {isExpired && ws.fssaiStatus !== 'License Expired' ? <AlertTriangle size={10}/> : null}
                          {ws.fssaiStatus}
                        </span>
                      </td>
                      <td className="py-4 px-5 flex-1 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => window.open('https://foscos.fssai.gov.in/', '_blank')} 
                            className="px-3 py-2 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white rounded-lg transition-colors border border-blue-200 text-[10px] font-bold flex items-center gap-1.5 shadow-sm"
                            title="Check Status on FoSCoS Portal"
                          >
                            <ExternalLink size={14} strokeWidth={2.5}/> Check Status
                          </button>
                          <button onClick={() => handleEdit(ws)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-transparent" title="Edit Profile">
                            <Edit size={16}/>
                          </button>
                          <button onClick={() => { setViewingData(ws); setIsViewModalOpen(true); }} className="px-3 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white rounded-lg transition-colors border border-emerald-200 text-xs font-bold flex items-center gap-2 shadow-sm" title="View 360 Profile">
                            <Eye size={14} strokeWidth={2.5}/> Open
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
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-100">
                {currentPage} / {totalPages}
              </span>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                disabled={currentPage === totalPages || loading}
                className="px-4 py-2 text-xs font-bold bg-emerald-600 text-white border border-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-sm"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ONBOARD / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95">
            
            <div className="flex justify-between items-center px-8 py-5 border-b border-slate-100 bg-slate-50/80">
              <div>
                <h2 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
                  <Store className="text-emerald-600" size={24}/> {editMode ? 'Edit FSSAI Workspace' : 'Onboard FSSAI License'}
                </h2>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors"><X size={20} /></button>
            </div>

            <form onSubmit={handleSave} className="overflow-y-auto p-8 space-y-8 custom-scrollbar">

              {/* 1. CORE INFO */}
              <div>
                <h3 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4">1. Primary License Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  
                  {/* PAN Auto-Suggest */}
                  <div className="md:col-span-1 relative">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">PAN Number *</label>
                    <input 
                      type="text" name="pan" required maxLength="10"
                      value={formData.pan} onChange={handlePanChange}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 200)} autoComplete="off"
                      disabled={editMode && !isAdmin} 
                      className="w-full text-sm font-bold border border-slate-200 rounded-xl p-3 uppercase focus:ring-2 focus:ring-emerald-500/20 disabled:bg-slate-100 outline-none relative z-10" 
                    />
                    {fetchingPan && !editMode && <Loader2 size={14} className="absolute right-3 top-10 animate-spin text-emerald-500 z-20"/>}
                    {showSuggestions && !editMode && panSuggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto custom-scrollbar">
                        {panSuggestions.map((client) => (
                          <div key={client._id} onClick={() => handleSelectSuggestion(client)} className="p-3 border-b border-slate-50 hover:bg-emerald-50 cursor-pointer transition-colors">
                            <p className="text-xs font-black text-slate-800 tracking-wider uppercase">{client.pan}</p>
                            <p className="text-[10px] font-bold text-slate-500 truncate">{client.name}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="md:col-span-1">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">FSSAI License / Reg No. *</label>
                    <input type="text" name="fssaiLicenseNo" required maxLength="14" value={formData.fssaiLicenseNo} onChange={handleChange} disabled={editMode && !isAdmin} className="w-full text-sm font-bold border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-emerald-500/20 font-mono disabled:bg-slate-100" placeholder="14-Digit Number" />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Entity / FBO Name *</label>
                    <input type="text" name="assesseeName" required value={formData.assesseeName} onChange={handleChange} disabled={editMode && !isAdmin} className="w-full text-sm font-semibold border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-emerald-500/20 disabled:bg-slate-100" />
                  </div>

                  <div className="grid grid-cols-2 gap-4 md:col-span-2">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">License Type</label>
                      <select name="licenseType" value={formData.licenseType} onChange={handleChange} className="w-full text-sm font-medium border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-emerald-500/20">
                        <option value="Basic Registration">Basic Registration</option>
                        <option value="State License">State License</option>
                        <option value="Central License">Central License</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Kind of Business (KoB)</label>
                      <input type="text" name="kindOfBusiness" value={formData.kindOfBusiness} onChange={handleChange} placeholder="e.g. Retailer, Manufacturer" className="w-full text-sm font-medium border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-emerald-500/20" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 md:col-span-2 border-t border-slate-100 pt-4 mt-2">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Issue Date</label>
                      <input type="date" name="issueDate" value={formData.issueDate} onChange={handleChange} className="w-full text-sm font-medium border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-emerald-500/20 text-slate-700" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-rose-600 mb-1.5">Expiry / Valid Upto *</label>
                      <input type="date" name="expiryDate" required value={formData.expiryDate} onChange={handleChange} className="w-full text-sm font-bold border border-rose-200 bg-rose-50 rounded-xl p-3 focus:ring-2 focus:ring-rose-500/20 text-rose-700" />
                    </div>
                  </div>

                  <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Mobile</label>
                      <input type="text" name="mobile" value={formData.mobile} onChange={handleChange} className="w-full text-sm font-medium border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-emerald-500/20" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Email</label>
                      <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full text-sm font-medium border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-emerald-500/20" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">State</label>
                      <input type="text" name="state" value={formData.state} onChange={handleChange} className="w-full text-sm font-medium border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-emerald-500/20" />
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Registered Premise Address</label>
                    <textarea name="address" rows="2" value={formData.address} onChange={handleChange} className="w-full text-sm font-medium border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-emerald-500/20 resize-none" />
                  </div>
                </div>
              </div>

              {/* 2. PORTAL & RETURNS */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                <h3 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4 flex items-center gap-2"><ShieldCheck size={16} className="text-emerald-600"/> 2. FoSCoS Portal & Returns</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  
                  <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">FoSCoS User ID</label>
                      <input type="text" name="foscosUserId" value={formData.foscosUserId} onChange={handleChange} placeholder="Username" className="w-full text-sm font-medium border border-slate-200 bg-white rounded-xl p-3 focus:ring-2 focus:ring-emerald-500/20" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-rose-600 mb-1.5 flex items-center gap-1"><Key size={12}/> FoSCoS Password</label>
                      <input type="text" name="foscosPassword" value={formData.foscosPassword} onChange={handleChange} placeholder="Password" className="w-full text-sm font-medium border border-rose-200 bg-white rounded-xl p-3 focus:ring-2 focus:ring-rose-500/20" />
                    </div>
                  </div>

                  <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-200/60">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-emerald-600 mb-1.5">Live FSSAI Status</label>
                      <select name="fssaiStatus" value={formData.fssaiStatus} onChange={handleChange} className={`w-full text-sm font-bold border rounded-xl p-3 focus:ring-2 focus:outline-none shadow-sm ${getStatusStyle(formData.fssaiStatus)}`}>
                        <option value="Documents Pending">Documents Pending</option>
                        <option value="Processing">Processing</option>
                        <option value="Filed">Filed / Active</option>
                        <option value="License Expired">License Expired</option>
                        <option value="Error/Mismatch">Error/Mismatch</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Return Type</label>
                      <select name="returnType" value={formData.returnType} onChange={handleChange} className="w-full text-sm font-bold bg-white border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-emerald-500/20">
                        <option value="Annual Return (Form D-1)">Annual Return (Form D-1)</option>
                        <option value="Half-Yearly Return">Half-Yearly Return</option>
                        <option value="Not Applicable">Not Applicable</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Financial Year</label>
                      <input type="text" name="financialYear" value={formData.financialYear} onChange={handleChange} placeholder="2026-27" className="w-full text-sm font-bold bg-white border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-emerald-500/20" />
                    </div>
                  </div>

                  <div className="md:col-span-2 grid grid-cols-3 gap-4 mt-2">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-amber-600 mb-1">Return Due Date</label>
                      <input type="date" name="dueDate" value={formData.dueDate} onChange={handleChange} className="w-full text-sm font-medium border border-slate-200 bg-white rounded-lg p-2 focus:ring-2 focus:ring-emerald-500/20" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-emerald-600 mb-1">Filing Date</label>
                      <input type="date" name="filingDate" value={formData.filingDate} onChange={handleChange} className="w-full text-sm font-medium border border-slate-200 bg-white rounded-lg p-2 focus:ring-2 focus:ring-emerald-500/20" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-indigo-600 mb-1">Ack No / SRN</label>
                      <input type="text" name="acknowledgementNo" value={formData.acknowledgementNo} onChange={handleChange} className="w-full text-sm font-medium border border-slate-200 bg-white rounded-lg p-2 focus:ring-2 focus:ring-emerald-500/20 font-mono" />
                    </div>
                  </div>

                </div>
              </div>

              {/* 3. FEES & PAYMENTS */}
              <div>
                <h3 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4">3. Fees & Payment Ledger</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Payment Plan</label>
                    <select name="feeStatus" value={formData.feeStatus} onChange={handleChange} className="w-full text-sm font-medium border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-emerald-500/20">
                      <option value="Yearly">Yearly</option>
                      <option value="Paid">Paid Fully</option>
                      <option value="Dues">Payment Pending</option>
                      <option value="FOC">Free of Cost (FOC)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Total Billed Fee (₹)</label>
                    <input type="number" name="feeAmount" value={formData.feeAmount} onChange={handleChange} className="w-full text-sm font-medium border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-emerald-500/20" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Received So Far (₹)</label>
                    <input type="number" name="amountReceived" value={formData.amountReceived} onChange={handleChange} className="w-full text-sm font-medium border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-emerald-500/20" />
                  </div>
                </div>

                {editMode && (
                  <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 flex flex-col md:flex-row gap-5 items-end shadow-sm mt-4">
                    <div className="flex-1 w-full">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-emerald-700 mb-1.5 flex items-center gap-1"><Plus size={12}/> Log New Payment</label>
                      <input type="number" name="newPaymentAmount" value={formData.newPaymentAmount || ''} onChange={handleChange} placeholder="Enter amount..." className="w-full text-sm font-bold border border-emerald-200 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-emerald-500/20 text-emerald-700" />
                    </div>
                    <div className="flex-1 w-full">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-emerald-700 mb-1.5">Payment Date</label>
                      <input type="date" name="newPaymentDate" value={formData.newPaymentDate || ''} onChange={handleChange} className="w-full text-sm font-bold border border-emerald-200 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-emerald-500/20 text-emerald-700" />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">Cancel</button>
                <button type="submit" disabled={saving} className="px-8 py-2.5 text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md shadow-emerald-500/20 transition-all flex items-center gap-2 disabled:opacity-50">
                  {saving ? <Loader2 size={18} className="animate-spin"/> : <CheckCircle2 size={18} />} 
                  {editMode ? 'Save Changes' : 'Onboard License'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FULL VIEW 360 PROFILE MODAL */}
      {isViewModalOpen && viewingData && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-slate-50 rounded-3xl w-full max-w-5xl shadow-2xl border border-slate-100 flex flex-col max-h-[95vh] overflow-hidden animate-in fade-in zoom-in-95">
            
            <div className="relative px-8 pt-6 pb-16 bg-gradient-to-r from-emerald-600 to-teal-800 text-white rounded-t-3xl flex justify-between items-start overflow-hidden">
              <div className="absolute top-0 right-0 -mt-10 -mr-10 h-40 w-40 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
              
              <div className="flex items-center gap-5 z-10">
                <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md border border-white/30 shadow-inner">
                  <Store size={32} className="text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
                    {viewingData.assesseeName} 
                  </h2>
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-emerald-100 font-medium">
                    {viewingData.clientMasterId?.clientId && (
                      <span className="flex items-center gap-1.5 bg-white/20 px-2.5 py-1 rounded-md border border-white/30 font-mono tracking-wider text-white font-bold">
                        ID: {viewingData.clientMasterId.clientId}
                      </span>
                    )}
                    <span className="flex items-center gap-1.5 bg-black/20 px-2.5 py-1 rounded-md border border-white/10 font-mono tracking-wider text-white font-black" title="FSSAI License">
                      {viewingData.fssaiLicenseNo}
                    </span>
                    <span className="flex items-center gap-1.5 bg-black/20 px-2.5 py-1 rounded-md border border-white/10 font-mono tracking-wider text-white">
                      PAN: {viewingData.pan || 'N/A'}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${viewingData.fssaiStatus === 'Filed' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'}`}>
                      {viewingData.fssaiStatus}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="z-10 flex gap-2">
                <button onClick={() => { setIsViewModalOpen(false); handleOpenRemarks(viewingData); }} className="p-2 rounded-full bg-black/10 hover:bg-black/20 text-white transition-colors" title="Remarks & Notes">
                  <MessageSquare size={20} strokeWidth={2.5} />
                </button>
                <button onClick={() => setIsViewModalOpen(false)} className="p-2 rounded-full bg-black/10 hover:bg-black/20 text-white transition-colors">
                  <X size={20} strokeWidth={2.5} />
                </button>
              </div>
            </div>
            
            <div className="overflow-y-auto p-6 md:p-8 space-y-6 custom-scrollbar">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Contact & License Info Card */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                    <ShieldCheck size={14}/> License & Contact Details
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">License Type</p>
                        <p className="text-sm font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded w-max border border-emerald-100">{viewingData.licenseType}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Kind of Business</p>
                        <p className="text-sm font-semibold text-slate-800">{viewingData.kindOfBusiness || 'N/A'}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-100">
                      <div>
                        <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Issue Date</p>
                        <p className="text-sm font-semibold text-slate-800">{viewingData.issueDate ? new Date(viewingData.issueDate).toLocaleDateString('en-IN') : 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase text-rose-500 mb-1">Expiry Date</p>
                        <p className="text-sm font-black text-rose-600">{viewingData.expiryDate ? new Date(viewingData.expiryDate).toLocaleDateString('en-IN') : 'N/A'}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-100">
                      <div>
                        <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Mobile</p>
                        <p className="text-sm font-semibold text-slate-800 flex items-center gap-1.5"><Phone size={12}/> {viewingData.mobile || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Email</p>
                        <p className="text-sm font-semibold text-slate-800 truncate" title={viewingData.email}>{viewingData.email || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* FoSCoS Portal & Returns Card */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                    <Activity size={14}/> FoSCoS Portal & Returns
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">FoSCoS User ID</p>
                        <p className="text-sm font-bold text-slate-700">{viewingData.foscosUserId || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">FoSCoS Password</p>
                        <p className="text-sm font-bold text-rose-600 flex items-center gap-1.5">
                          <Key size={12}/> {viewingData.foscosPassword || 'N/A'}
                          {viewingData.foscosPassword && (
                            <button onClick={() => copyToClipboard(viewingData.foscosPassword, 'Password')} className="text-rose-400 hover:text-rose-700 transition-colors"><Copy size={14}/></button>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100">
                      <p className="text-[10px] font-bold uppercase text-blue-600 mb-1 bg-blue-50 w-max px-2 py-0.5 rounded">Returns Info ({viewingData.financialYear})</p>
                      <div className="grid grid-cols-2 gap-4 mt-2">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 mb-0.5">Return Type</p>
                          <p className="text-sm font-semibold text-slate-800">{viewingData.returnType}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 mb-0.5">Ack / SRN No</p>
                          <p className="text-sm font-mono font-bold text-indigo-700">{viewingData.acknowledgementNo || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 mb-0.5">Due Date</p>
                          <p className="text-sm font-semibold text-rose-500">{viewingData.dueDate ? new Date(viewingData.dueDate).toLocaleDateString('en-IN') : 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 mb-0.5">Filing Date</p>
                          <p className="text-sm font-semibold text-emerald-600">{viewingData.filingDate ? new Date(viewingData.filingDate).toLocaleDateString('en-IN') : 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Row: Fees */}
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <IndianRupee size={14}/> Professional Fees Ledger
                  </h3>
                  <span className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-md border ${viewingData.feeStatus === 'Paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                    {viewingData.feeStatus || 'Paid'}
                  </span>
                </div>
                
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex justify-between items-center h-20">
                  <div>
                    <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Total Fee</p>
                    <p className="text-lg font-black text-slate-800">₹{viewingData.feeAmount || 0}</p>
                  </div>
                  <div className="w-px h-10 bg-slate-200"></div>
                  <div>
                    <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Received</p>
                    <p className="text-lg font-black text-emerald-600">₹{viewingData.amountReceived || 0}</p>
                  </div>
                  <div className="w-px h-10 bg-slate-200"></div>
                  <div>
                    <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Balance Due</p>
                    <p className="text-lg font-black text-rose-600">₹{(viewingData.feeAmount || 0) - (viewingData.amountReceived || 0)}</p>
                  </div>
                </div>
                <div className="mt-3 text-right">
                   <span className="text-[10px] font-bold text-slate-400 uppercase">Last Payment Date: </span>
                   <span className="text-xs font-bold text-slate-700">{viewingData.paymentDate ? new Date(viewingData.paymentDate).toLocaleDateString('en-IN') : 'N/A'}</span>
                </div>
              </div>

            </div>
            
            <div className="flex justify-between items-center px-6 py-4 border-t border-slate-100 bg-white rounded-b-3xl">
              <div>
                 {isAdmin ? (
                   <button 
                     onClick={() => { setIsViewModalOpen(false); setDeleteModal({ open: true, client: viewingData }); }} 
                     className="px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors border border-transparent hover:border-rose-200 flex items-center gap-1.5"
                   >
                     <Trash2 size={15} /> Remove Workspace
                   </button>
                 ) : <div></div>}
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => setIsViewModalOpen(false)} className="px-5 py-2.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors">
                  Close Profile
                </button>
                <button onClick={() => { setIsViewModalOpen(false); handleEdit(viewingData); }} className="px-5 py-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md shadow-emerald-500/20 transition-all flex items-center gap-2">
                  <Edit size={15} strokeWidth={2.5}/> Edit Details
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REMARKS MODAL */}
      {isRemarksModalOpen && clientForRemarks && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl border border-slate-100 flex flex-col max-h-[85vh] overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/80">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold"><MessageSquare size={20} /></div>
                <div>
                  <h2 className="text-base font-bold text-slate-800 tracking-tight">FSSAI Notes & Remarks</h2>
                  <p className="text-xs text-slate-500">{clientForRemarks.assesseeName}</p>
                </div>
              </div>
              <button onClick={() => setIsRemarksModalOpen(false)} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors"><X size={18} /></button>
            </div>
            
            <div className="overflow-y-auto p-6 space-y-4 custom-scrollbar">
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 text-xs text-slate-700 font-medium whitespace-pre-wrap min-h-[140px] max-h-[220px] overflow-y-auto shadow-inner leading-relaxed custom-scrollbar">
                {clientForRemarks.remarks && getFilteredRemarks(clientForRemarks.remarks) 
                  ? getFilteredRemarks(clientForRemarks.remarks) 
                  : <span className="text-slate-400 italic">No specific notes recorded yet.</span>}
              </div>

              <form onSubmit={async (e) => {
                e.preventDefault();
                if (!newRemarkText.trim()) return;
                try {
                  const headers = { Authorization: `Bearer ${user.token}` };
                  const dateStamp = new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit' });
                  const entry = `\n\n--------------------------------------\n📅 ${dateStamp} | 👤 ${user?.name || 'User'} (Notes)\n💬 ${newRemarkText.trim()}`;
                  const updatedRemarks = (clientForRemarks.remarks || '') + entry;
                  await axios.put(`${import.meta.env.VITE_API_URL}/fssai/${clientForRemarks._id}`, { remarks: updatedRemarks }, { headers });
                  setClientForRemarks(prev => ({ ...prev, remarks: updatedRemarks }));
                  setWorkspaces(prev => prev.map(c => c._id === clientForRemarks._id ? { ...c, remarks: updatedRemarks } : c));
                  setNewRemarkText('');
                  toast.success("Remark added!");
                } catch (error) { toast.error("Failed to add remark"); }
              }} className="space-y-3 pt-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">Add New Progress Note</label>
                <div className="relative">
                  <textarea 
                    rows="3" 
                    value={newRemarkText} 
                    onChange={(e) => setNewRemarkText(e.target.value)} 
                    placeholder="Enter update..." 
                    className="w-full text-xs font-medium border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 resize-none shadow-sm"
                  />
                  <button 
                    type="submit" 
                    disabled={!newRemarkText.trim()}
                    className="absolute right-3 bottom-3 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm transition-all"
                  >
                    <Send size={12} /> Post Note
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteModal.open && isAdmin && (
        <div className="fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 p-8 text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="mx-auto h-16 w-16 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100 mb-2">
              <AlertTriangle size={32} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800 tracking-tight">Delete Workspace?</h3>
              <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                Are you sure you want to permanently delete <span className="font-bold text-slate-700">{deleteModal.client?.assesseeName}</span>'s FSSAI record? 
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

export default FssaiWorkspace;