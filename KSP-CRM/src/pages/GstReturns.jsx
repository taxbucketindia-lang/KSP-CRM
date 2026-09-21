import { useState, useEffect, useContext, useMemo, useRef } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import toast, { Toaster } from 'react-hot-toast';
import * as XLSX from 'xlsx'; 
import ExcelJS from 'exceljs'; 
import { saveAs } from 'file-saver';
import { 
  FileText, Search, Phone, FileClock, FileCheck, RefreshCw, 
  CheckCircle2, IndianRupee, AlertCircle, CalendarClock, Pencil,
  Plus, X, UserCheck, Key, Activity, Eye, MessageSquare, Trash2, MapPin, ShieldUser, Briefcase,
  UserCircle, Mail, AlertTriangle, Send, Calculator, CreditCard, Download, Upload, Building2, ShieldCheck, User, Info, Hash, Navigation,
  Wallet, CheckSquare, History, Filter
} from 'lucide-react';

const GstReturns = () => {
  const { user } = useContext(AuthContext);
  
  const [importList, setImportList] = useState([]); 
  const [gstClients, setGstClients] = useState([]); 
  const [loading, setLoading] = useState(true);
  
  // 🔴 FILTERS STATE
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [taxpayerTypeFilter, setTaxpayerTypeFilter] = useState('ALL');
  const [paymentPlanFilter, setPaymentPlanFilter] = useState('ALL');
  const [stateFilter, setStateFilter] = useState('ALL');
  const [gstr1Filter, setGstr1Filter] = useState('ALL');
  const [gstr3bFilter, setGstr3bFilter] = useState('ALL');
  const [bankLinkedFilter, setBankLinkedFilter] = useState('ALL');
  const [aadhaarKycFilter, setAadhaarKycFilter] = useState('ALL');

  const [selectedIds, setSelectedIds] = useState([]);

  const fileInputRef = useRef(null);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentGstId, setCurrentGstId] = useState(null);
  const [importClientId, setImportClientId] = useState(''); 

  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [clientToView, setClientToView] = useState(null);
  
  const [isRemarksModalOpen, setIsRemarksModalOpen] = useState(false);
  const [clientForRemarks, setClientForRemarks] = useState(null);
  const [newRemark, setNewRemark] = useState(''); 
  const [newRemarkText, setNewRemarkText] = useState(''); 

  // History Panel States
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [clientForHistory, setClientForHistory] = useState(null);
  const [historyTab, setHistoryTab] = useState('returns');

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState(null);

  const isAdmin = user?.role === 'Admin';

  const initialForm = {
    clientId: '', // 🔴 Naya Field
    assesseeName: '', tradeName: '', 
    taxpayerType: 'Regular', aadhaarKycStatus: 'No', 
    portalUsername: '', portalPassword: '', 
    registrationDate: '', state: '', gstin: '', 
    authorisedPersonName: '', mobile: '', email: '', pinCode: '', 
    bankLinkedStatus: 'Not Updated',
    gstStatus: 'Documents Pending', 
    gstr1FilingDate: '', gstr1NextDueDate: '',
    gstr3bFilingDate: '', gstr3bNextDueDate: '',
    feeStatus: 'Yearly', feeAmount: '', amountReceived: '', paymentDate: '',
    newPaymentAmount: '', newPaymentDate: '' 
  };
  const [formData, setFormData] = useState(initialForm);

  const getFilteredGstRemarks = (remarksStr) => {
    if (!remarksStr) return '';
    const blocks = remarksStr.split(/(?=\n\n--------------------------------------\n|\n?📅 )/);
    const filtered = blocks.filter(block => {
      const lower = block.toLowerCase();
      return (
        lower.includes('(gst return note)') ||
        lower.includes('workspace note') ||
        lower.includes('imported client') ||
        lower.includes('gst workspace')
      );
    });
    return filtered.join('').trim();
  };

  const getFilteredFeeHistory = (remarksStr) => {
    if (!remarksStr) return [];
    const blocks = remarksStr.split(/(?=\n\n--------------------------------------\n|\n?📅 )/);
    const feeBlocks = blocks.filter(block => {
      const l = block.toLowerCase();
      return l.includes('payment received') || l.includes('fee') || l.includes('balance') || l.includes('dues');
    });
    return feeBlocks;
  };

  const fetchData = async () => {
    try {
      const headers = { Authorization: `Bearer ${user.token}` };
      const [crmRes, gstRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_URL}/clients`, { headers }), 
        axios.get(`${import.meta.env.VITE_API_URL}/gst`, { headers })      
      ]);
      
      const crmClients = crmRes.data || [];
      const activeGstRecords = gstRes.data || [];

      const existingGstins = activeGstRecords.filter(g => g.gstin).map(g => g.gstin.toUpperCase());
      
      const availableForImport = crmClients.filter(c => 
        c.service === 'GST Registration' && !c.isGstWorkspace && 
        !(c.gstin && existingGstins.includes(c.gstin.toUpperCase()))
      );

      setImportList(availableForImport); 
      setGstClients(activeGstRecords);
      setSelectedIds([]); 
    } catch (error) {
      toast.error("Failed to load GST data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user.token]);

  // 🔴 LOGIC: Naya Client ID Auto-Generate Karne Ke Liye
  const generateNewClientId = () => {
    if (gstClients.length === 0) return 'GST-1001';
    const sortedClients = [...gstClients].sort((a, b) => {
      const numA = a.clientId ? parseInt(a.clientId.split('-')[1]) || 0 : 0;
      const numB = b.clientId ? parseInt(b.clientId.split('-')[1]) || 0 : 0;
      return numB - numA; 
    });
    const lastId = sortedClients[0].clientId;
    if (lastId && lastId.includes('-')) {
      const parts = lastId.split('-');
      if (!isNaN(parts[1])) {
        const nextNum = parseInt(parts[1]) + 1;
        return `GST-${nextNum}`;
      }
    }
    return `GST-${gstClients.length + 1001}`; 
  };

  // Dynamic States for State Filter
  const uniqueStates = useMemo(() => {
    const states = gstClients.map(c => c.state).filter(Boolean);
    return [...new Set(states)].sort();
  }, [gstClients]);

  const filteredClients = useMemo(() => {
    const filtered = gstClients.filter((client) => {
      const searchStr = searchQuery.toLowerCase();
      // 🔴 Added clientId in search
      const matchesSearch = 
        (client.assesseeName?.toLowerCase() || '').includes(searchStr) || 
        (client.tradeName?.toLowerCase() || '').includes(searchStr) || 
        (client.gstin?.toLowerCase() || '').includes(searchStr) ||
        (client.clientId?.toLowerCase() || '').includes(searchStr);

      const matchesStatus = statusFilter === 'ALL' || (client.gstStatus || 'Documents Pending') === statusFilter;
      const matchesType = taxpayerTypeFilter === 'ALL' || (client.taxpayerType || 'Regular') === taxpayerTypeFilter;
      const matchesState = stateFilter === 'ALL' || (client.state || '') === stateFilter;
      const matchesPaymentPlan = paymentPlanFilter === 'ALL' || (client.feeStatus || 'Yearly') === paymentPlanFilter;
      const matchesBankLinked = bankLinkedFilter === 'ALL' || (client.bankLinkedStatus || 'Not Updated') === bankLinkedFilter;
      const matchesAadhaarKyc = aadhaarKycFilter === 'ALL' || (client.aadhaarKycStatus || 'No') === aadhaarKycFilter;

      const matchesGstr1 = gstr1Filter === 'ALL' || (gstr1Filter === 'Filed' ? !!client.gstr1FilingDate : !client.gstr1FilingDate);
      const matchesGstr3b = gstr3bFilter === 'ALL' || (gstr3bFilter === 'Filed' ? !!client.gstr3bFilingDate : !client.gstr3bFilingDate);

      return matchesSearch && matchesStatus && matchesType && matchesState && matchesPaymentPlan && matchesBankLinked && matchesAadhaarKyc && matchesGstr1 && matchesGstr3b;
    });
    return filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [gstClients, searchQuery, statusFilter, taxpayerTypeFilter, stateFilter, paymentPlanFilter, bankLinkedFilter, aadhaarKycFilter, gstr1Filter, gstr3bFilter]);

  const stats = useMemo(() => {
    let totalFeeAmount = 0;
    let totalReceivedAmount = 0;

    filteredClients.forEach(c => {
      totalFeeAmount += Number(c.feeAmount || 0);
      totalReceivedAmount += Number(c.amountReceived || 0);
    });

    return {
      total: filteredClients.length,
      pending: filteredClients.filter(c => (c.gstStatus || 'Documents Pending') === 'Documents Pending').length,
      processing: filteredClients.filter(c => c.gstStatus === 'Processing').length,
      completed: filteredClients.filter(c => c.gstStatus === 'Filed').length,
      totalFeeAmount,
      totalReceivedAmount,
      totalPendingAmount: totalFeeAmount - totalReceivedAmount
    };
  }, [filteredClients]);

  const handleExportExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('GST Workspace');

    worksheet.columns = [
      { header: 'Client ID', key: 'clientId', width: 15 }, // 🔴 ADDED
      { header: 'Client / Trade Name', key: 'assesseeName', width: 30 },
      { header: 'GSTIN', key: 'gstin', width: 20 },
      { header: 'Taxpayer Type', key: 'taxpayerType', width: 15 },
      { header: 'Aadhaar KYC', key: 'aadhaarKycStatus', width: 15 },
      { header: 'Mobile', key: 'mobile', width: 15 },
      { header: 'Email', key: 'email', width: 25 },
      { header: 'Authorised Person', key: 'authorisedPersonName', width: 20 },
      { header: 'State', key: 'state', width: 15 },
      { header: 'Pin Code', key: 'pinCode', width: 15 },
      { header: 'Registration Date', key: 'registrationDate', width: 18 },
      { header: 'Bank Linked Status', key: 'bankLinkedStatus', width: 20 },
      { header: 'GST Status', key: 'gstStatus', width: 25 },
      { header: 'GSTR-1 Filed', key: 'gstr1FilingDate', width: 15 },
      { header: 'GSTR-1 Due (11th)', key: 'gstr1NextDueDate', width: 15 },
      { header: 'GSTR-3B Filed', key: 'gstr3bFilingDate', width: 15 },
      { header: 'GSTR-3B Due (20th)', key: 'gstr3bNextDueDate', width: 15 },
      { header: 'Portal Username', key: 'portalUsername', width: 20 },
      { header: 'Portal Password', key: 'portalPassword', width: 20 },
      { header: 'Payment Plan', key: 'feeStatus', width: 15 },
      { header: 'Total Fee', key: 'feeAmount', width: 15 },
      { header: 'Received', key: 'amountReceived', width: 15 },
      { header: 'Last Payment Date', key: 'paymentDate', width: 15 },
      { header: 'System Added By', key: 'createdBy', width: 20 }
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

    const dataToExport = selectedIds.length > 0 
      ? filteredClients.filter(c => selectedIds.includes(c._id)) 
      : filteredClients;

    dataToExport.forEach(client => { 
      worksheet.addRow({
        clientId: client.clientId || '',
        assesseeName: client.tradeName ? `${client.assesseeName} (${client.tradeName})` : client.assesseeName,
        gstin: client.gstin || '',
        taxpayerType: client.taxpayerType || '',
        aadhaarKycStatus: client.aadhaarKycStatus || '',
        mobile: client.mobile || '',
        email: client.email || '',
        authorisedPersonName: client.authorisedPersonName || '',
        state: client.state || '',
        pinCode: client.pinCode || '',
        registrationDate: client.registrationDate ? new Date(client.registrationDate).toLocaleDateString('en-IN') : '',
        bankLinkedStatus: client.bankLinkedStatus || '',
        gstStatus: client.gstStatus || 'Documents Pending',
        gstr1FilingDate: client.gstr1FilingDate ? new Date(client.gstr1FilingDate).toLocaleDateString('en-IN') : '',
        gstr1NextDueDate: client.gstr1NextDueDate ? new Date(client.gstr1NextDueDate).toLocaleDateString('en-IN') : '',
        gstr3bFilingDate: client.gstr3bFilingDate ? new Date(client.gstr3bFilingDate).toLocaleDateString('en-IN') : '',
        gstr3bNextDueDate: client.gstr3bNextDueDate ? new Date(client.gstr3bNextDueDate).toLocaleDateString('en-IN') : '',
        portalUsername: client.portalUsername || '',
        portalPassword: client.portalPassword || '',
        feeStatus: client.feeStatus || '',
        feeAmount: client.feeAmount || 0,
        amountReceived: client.amountReceived || 0,
        paymentDate: client.paymentDate ? new Date(client.paymentDate).toLocaleDateString('en-IN') : '',
        createdBy: client.createdBy?.name || 'Admin' 
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `GST_Workspace_${selectedIds.length > 0 ? 'Selected_' : ''}${new Date().toISOString().split('T')[0]}.xlsx`);
    
    if(selectedIds.length > 0) setSelectedIds([]);
  };

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
            if (parts.length === 3) return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
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
          clientId: getVal(row, ['Client ID', 'clientId', 'ID']), // 🔴 Added
          assesseeName: getVal(row, ['Client / Trade Name', 'Assessee Name', 'assesseeName']) || '',
          tradeName: row['Trade Name'] || row['tradeName'] || '',
          gstin: row['GSTIN'] || row['gstin'] || '',
          taxpayerType: row['Taxpayer Type'] || row['taxpayerType'] || 'Regular',
          aadhaarKycStatus: row['Aadhaar KYC'] || row['aadhaarKycStatus'] || 'No',
          mobile: row['Mobile'] || row['mobile'] || '',
          email: row['Email'] || row['email'] || '',
          authorisedPersonName: row['Authorised Person'] || row['authorisedPersonName'] || '',
          state: row['State'] || row['state'] || '',
          pinCode: row['Pin Code'] || row['pinCode'] || row['pincode'] || '',
          registrationDate: parseDate(row['Registration Date'] || row['registrationDate']),
          bankLinkedStatus: row['Bank Linked Status'] || row['bankLinkedStatus'] || 'Not Updated',
          gstStatus: row['GST Status'] || row['gstStatus'] || 'Documents Pending',
          gstr1FilingDate: parseDate(row['GSTR-1 Filed'] || row['gstr1FilingDate']),
          gstr1NextDueDate: parseDate(row['GSTR-1 Due'] || row['gstr1NextDueDate']),
          gstr3bFilingDate: parseDate(row['GSTR-3B Filed'] || row['gstr3bFilingDate']),
          gstr3bNextDueDate: parseDate(row['GSTR-3B Due'] || row['gstr3bNextDueDate']),
          portalUsername: row['Portal Username'] || row['portalUsername'] || '',
          portalPassword: row['Portal Password'] || row['portalPassword'] || '',
          feeStatus: row['Payment Plan'] || row['feeStatus'] || 'Yearly',
          feeAmount: Number(row['Total Fee'] || row['feeAmount'] || 0),
          amountReceived: Number(row['Received Amount'] || row['amountReceived'] || 0),
          paymentDate: parseDate(row['Payment Date'] || row['paymentDate'])
        })).filter(item => item.assesseeName); 

        if (formattedRecords.length === 0) return toast.error("No valid rows found.");

        const headers = { Authorization: `Bearer ${user.token}` };
        const response = await axios.post(`${import.meta.env.VITE_API_URL}/gst/import`, { records: formattedRecords }, { headers });
        
        toast.success(response.data.message || `Successfully processed GST records!`);
        fetchData();
      } catch (error) {
        toast.error("Error importing records");
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = ""; 
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(filteredClients.map(c => c._id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Are you sure you want to permanently delete ${selectedIds.length} selected records?`)) return;
    try {
      const headers = { Authorization: `Bearer ${user.token}` };
      await axios.post(`${import.meta.env.VITE_API_URL}/gst/bulk-delete`, { ids: selectedIds }, { headers });
      toast.success(`${selectedIds.length} Records deleted successfully!`);
      setSelectedIds([]);
      fetchData();
    } catch (error) {
      toast.error("Error deleting records: " + (error.response?.data?.message || error.message));
    }
  };

  const handleStatusChange = async (clientId, newStatus) => {
    try {
      const headers = { Authorization: `Bearer ${user.token}` };
      await axios.put(`${import.meta.env.VITE_API_URL}/gst/${clientId}`, { gstStatus: newStatus }, { headers });
      setGstClients(prev => prev.map(c => c._id === clientId ? { ...c, gstStatus: newStatus } : c));
      toast.success(`Status updated to ${newStatus}`);
    } catch (error) {
      toast.error("Error updating status");
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      
      if (name === 'gstr1FilingDate' && value) {
        const [yyyy, mm] = value.split('-');
        let year = parseInt(yyyy, 10);
        let month = parseInt(mm, 10);
        if (month === 12) { month = 1; year += 1; } else { month += 1; }
        const nextMonthStr = String(month).padStart(2, '0');
        updated.gstr1NextDueDate = `${year}-${nextMonthStr}-11`;
      }
      
      if (name === 'gstr3bFilingDate' && value) {
        const [yyyy, mm] = value.split('-');
        let year = parseInt(yyyy, 10);
        let month = parseInt(mm, 10);
        if (month === 12) { month = 1; year += 1; } else { month += 1; }
        const nextMonthStr = String(month).padStart(2, '0');
        updated.gstr3bNextDueDate = `${year}-${nextMonthStr}-20`;
      }

      return updated;
    });
  };

  const handleImportSelect = (e) => {
    const cid = e.target.value;
    setImportClientId(cid);
    
    if (!cid) {
      setFormData(initialForm); 
      return;
    }

    const client = importList.find(c => c._id === cid);
    if (client) {
      setFormData({
        ...initialForm,
        assesseeName: client.assesseeName || '',
        mobile: client.mobile || '',
        email: client.email || '',
        state: client.state || '',
        pinCode: client.pinCode || client.pincode || '',
        gstin: client.gstin || '',
        portalPassword: client.portalPassword || ''
      });
    }
  };

  const handleOpenAdd = () => {
    setEditMode(false);
    setCurrentGstId(null);
    setImportClientId('');
    // 🔴 ADD ME AUTO GENERATE ID
    setFormData({ ...initialForm, clientId: generateNewClientId() });
    setNewRemark('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (client) => {
    setEditMode(true);
    setCurrentGstId(client._id);
    setImportClientId('');
    
    const parseDate = (d) => {
      if (!d) return '';
      const dateObj = new Date(d);
      if (!isNaN(dateObj.getTime())) return dateObj.toISOString().split('T')[0];
      return '';
    };

    setFormData({
      clientId: client.clientId || '',
      assesseeName: client.assesseeName || '',
      tradeName: client.tradeName || '',
      taxpayerType: client.taxpayerType || 'Regular',
      aadhaarKycStatus: client.aadhaarKycStatus || 'No',
      portalUsername: client.portalUsername || '',
      portalPassword: client.portalPassword || '',
      registrationDate: parseDate(client.registrationDate),
      state: client.state || '',
      pinCode: client.pinCode || client.pincode || '',
      gstin: client.gstin || '',
      authorisedPersonName: client.authorisedPersonName || '',
      mobile: client.mobile || '',
      email: client.email || '',
      bankLinkedStatus: client.bankLinkedStatus || 'Not Updated',
      gstStatus: client.gstStatus || 'Documents Pending',
      gstr1FilingDate: parseDate(client.gstr1FilingDate),
      gstr1NextDueDate: parseDate(client.gstr1NextDueDate),
      gstr3bFilingDate: parseDate(client.gstr3bFilingDate),
      gstr3bNextDueDate: parseDate(client.gstr3bNextDueDate),
      feeStatus: client.feeStatus || 'Yearly',
      feeAmount: client.feeAmount || '',
      amountReceived: client.amountReceived || '',
      paymentDate: parseDate(client.paymentDate),
      newPaymentAmount: '',
      newPaymentDate: '',
      remarks: client.remarks || ''
    });
    setNewRemark(''); 
    setIsModalOpen(true);
  };

  const handleOpenView = (client) => { setClientToView(client); setIsViewModalOpen(true); };
  const handleOpenRemarks = (client) => { setClientForRemarks(client); setNewRemarkText(''); setIsRemarksModalOpen(true); };
  
  const handleOpenHistory = (client) => { 
    setClientForHistory(client); 
    setHistoryTab('returns'); 
    setIsHistoryModalOpen(true); 
  };
  
  const confirmDelete = (client) => { setClientToDelete(client); setIsDeleteModalOpen(true); };

  const handleDelete = async () => {
    if (!clientToDelete) return;
    try {
      const headers = { Authorization: `Bearer ${user.token}` };
      await axios.delete(`${import.meta.env.VITE_API_URL}/gst/${clientToDelete._id}`, { headers });
      setIsDeleteModalOpen(false);
      setClientToDelete(null);
      if (isViewModalOpen) setIsViewModalOpen(false);
      toast.success("GST Record removed! Client remains safe in CRM.");
      fetchData();
    } catch (error) {
      toast.error("Error removing record");
    }
  };

  const handleAddRemarkSubmit = async (e) => {
    e.preventDefault();
    if (!newRemarkText.trim() || !clientForRemarks) return;

    try {
      const headers = { Authorization: `Bearer ${user.token}` };
      const dateStamp = new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit' });
      const authorInfo = user?.name ? `${user.name}` : 'User';

      const entry = `\n\n--------------------------------------\n📅 ${dateStamp} | 👤 ${authorInfo} (GST Note)\n💬 ${newRemarkText.trim()}`;
      const updatedRemarks = (clientForRemarks.remarks || '') + entry;

      await axios.put(`${import.meta.env.VITE_API_URL}/gst/${clientForRemarks._id}`, { remarks: updatedRemarks }, { headers });
      
      setClientForRemarks(prev => ({ ...prev, remarks: updatedRemarks }));
      setGstClients(prev => prev.map(c => c._id === clientForRemarks._id ? { ...c, remarks: updatedRemarks } : c));
      setNewRemarkText('');
      toast.success("Remark added successfully!");
    } catch (error) {
      toast.error("Failed to add remark");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const headers = { Authorization: `Bearer ${user.token}` };
      const dateStamp = new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit' });
      const authorInfo = user?.name ? `${user.name}` : 'User';
      
      let finalAmountReceived = Number(formData.amountReceived || 0);
      let finalRemarks = formData.remarks || '';
      let finalFeeStatus = formData.feeStatus;
      let finalPaymentDate = formData.paymentDate;

      if (editMode && currentGstId) {
        const clientToUpdate = gstClients.find(c => c._id === currentGstId);
        if (clientToUpdate) {
            let changes = [];
            
            const newAmt = Number(formData.newPaymentAmount || 0);
            let newPaymentAdded = false;

            if (newAmt > 0) {
               finalAmountReceived += newAmt;
               const pDateStr = formData.newPaymentDate || new Date().toISOString().split('T')[0];
               finalPaymentDate = pDateStr;
               newPaymentAdded = true;

               const newBal = Number(formData.feeAmount || 0) - finalAmountReceived;
               
               if (newBal <= 0) {
                  finalFeeStatus = 'Paid'; 
               }

               changes.push(`💰 Payment Received: ₹${newAmt} on ${new Date(pDateStr).toLocaleDateString('en-IN')}`);
               changes.push(`📊 New Balance Due: ₹${newBal <= 0 ? 0 : newBal}`);
            }

            if (!newPaymentAdded) {
              if (clientToUpdate.feeStatus !== formData.feeStatus) changes.push(`Payment Plan changed to [${formData.feeStatus}]`);
              if (Number(clientToUpdate.amountReceived || 0) !== Number(formData.amountReceived || 0)) changes.push(`Amount Received manually adjusted to [₹${formData.amountReceived || 0}]`);
              if (clientToUpdate.paymentDate !== formData.paymentDate) {
                const pd = formData.paymentDate ? new Date(formData.paymentDate).toLocaleDateString('en-IN') : 'N/A';
                changes.push(`Last Payment Date set to [${pd}]`);
              }
            }

            if(changes.length > 0 || newRemark.trim()) {
              let auditBlock = `\n\n--------------------------------------\n📅 ${dateStamp} | 👤 ${authorInfo}\n🔄 Fee & Ledger Updates:\n - ${changes.join('\n - ')}`;
              if (newRemark.trim()) auditBlock += `\n💬 Note: ${newRemark.trim()}`;
              finalRemarks += auditBlock;
            }
        }
      } else {
        finalRemarks = `📅 ${dateStamp} | 👤 ${authorInfo}\n📌 ${importClientId ? 'Imported client to GST workspace.' : 'Client profile created in GST workspace.'}`;
      }

      const payload = { 
        ...formData, 
        amountReceived: finalAmountReceived,
        feeStatus: finalFeeStatus,
        paymentDate: finalPaymentDate,
        remarks: finalRemarks,
        crmClientId: importClientId || null, 
        createdBy: user._id 
      };

      delete payload.newPaymentAmount;
      delete payload.newPaymentDate;

      if (editMode && currentGstId) {
        await axios.put(`${import.meta.env.VITE_API_URL}/gst/${currentGstId}`, payload, { headers });
        toast.success("GST details updated successfully!");
      } else {
        await axios.post(`${import.meta.env.VITE_API_URL}/gst`, payload, { headers });
        toast.success("GST Client added to workspace!");
      }
      
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Error saving details");
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'Documents Pending': return 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 ring-amber-500/20';
      case 'Processing': return 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 ring-blue-500/20';
      case 'Challan Generated': return 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 ring-purple-500/20';
      case 'Filed': return 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 ring-emerald-500/20';
      case 'Error/Mismatch': return 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 ring-rose-500/20';
      default: return 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 ring-slate-500/20';
    }
  };

  const projectedBalance = Number(formData.feeAmount || 0) - Number(formData.amountReceived || 0) - Number(formData.newPaymentAmount || 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <Toaster position="top-right" />

      {/* HEADER & MAIN ACTIONS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <Building2 size={28} className="text-blue-600" /> GST Return Workspace
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Manage, track, and update all GST filings in one place.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleExportExcel} className="inline-flex items-center gap-2 bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200 hover:border-emerald-200 text-sm font-bold px-4 py-2.5 rounded-xl transition-colors shadow-sm">
            <Download size={16} strokeWidth={2.5} /> Export All
          </button>
          <button onClick={() => fileInputRef.current.click()} className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-sm font-bold px-4 py-2.5 rounded-xl transition-colors shadow-sm">
            <Upload size={16} strokeWidth={2.5} /> Import Excel
          </button>
          <input type="file" accept=".xlsx, .xls, .csv" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
          
          <button onClick={handleOpenAdd} className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-5 py-2.5 rounded-xl shadow-md shadow-blue-500/20 transition-all">
            <Plus size={18} strokeWidth={2.5} /> Add / Import Return
          </button>
        </div>
      </div>

      {/* ROW 1: STATUS METRICS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total GST Files</p>
              <h3 className="text-3xl font-black text-slate-800 mt-1">{stats.total}</h3>
            </div>
            <div className="h-12 w-12 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center font-bold border border-slate-100"><Building2 size={20} /></div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow border-b-4 border-b-amber-400">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Docs Pending</p>
              <h3 className="text-3xl font-black text-amber-600 mt-1">{stats.pending}</h3>
            </div>
            <div className="h-12 w-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold border border-amber-100"><FileClock size={20} /></div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow border-b-4 border-b-blue-500">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">In Processing</p>
              <h3 className="text-3xl font-black text-blue-600 mt-1">{stats.processing}</h3>
            </div>
            <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold border border-blue-100"><RefreshCw size={20} /></div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow border-b-4 border-b-emerald-500">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Filed / Done</p>
              <h3 className="text-3xl font-black text-emerald-600 mt-1">{stats.completed}</h3>
            </div>
            <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold border border-emerald-100"><FileCheck size={20} /></div>
          </div>
        </div>
      </div>

      {/* ROW 2: FINANCIAL METRICS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-[0_2px_4px_rgba(0,0,0,0.02)] flex items-center gap-4">
          <div className="h-10 w-10 rounded-full bg-slate-50 text-slate-600 flex items-center justify-center font-bold border border-slate-100 shrink-0">
            <Calculator size={18} />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Billed Fees</p>
            <h3 className="text-lg font-black text-slate-800 flex items-center"><IndianRupee size={14} className="mr-0.5" />{stats.totalFeeAmount.toLocaleString('en-IN')}</h3>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-[0_2px_4px_rgba(0,0,0,0.02)] flex items-center gap-4">
          <div className="h-10 w-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold border border-emerald-100 shrink-0">
            <CheckCircle2 size={18} />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Received</p>
            <h3 className="text-lg font-black text-emerald-600 flex items-center"><IndianRupee size={14} className="mr-0.5" />{stats.totalReceivedAmount.toLocaleString('en-IN')}</h3>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-[0_2px_4px_rgba(0,0,0,0.02)] border-l-4 border-l-rose-500 flex items-center gap-4">
          <div className="h-10 w-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center font-bold border border-rose-100 shrink-0">
            <Wallet size={18} />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pending Dues</p>
            <h3 className="text-lg font-black text-rose-600 flex items-center"><IndianRupee size={14} className="mr-0.5" />{stats.totalPendingAmount.toLocaleString('en-IN')}</h3>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        
        {/* FILTERS & SEARCH ROW */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col gap-3">
          
          <div className="flex flex-col xl:flex-row xl:items-center gap-4">
            <div className="relative w-full xl:w-72 shrink-0">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input type="text" placeholder="Search Client or GSTIN..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-3.5 py-2 text-sm font-medium bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors shadow-sm" />
            </div>
            
            <div className="flex flex-wrap items-center gap-2 w-full">
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer shadow-sm">
                <option value="ALL">Status: All</option>
                <option value="Documents Pending">Documents Pending</option>
                <option value="Processing">Processing</option>
                <option value="Challan Generated">Challan Generated</option>
                <option value="Filed">Filed</option>
                <option value="Error/Mismatch">Error/Mismatch</option>
              </select>

              <select value={taxpayerTypeFilter} onChange={(e) => setTaxpayerTypeFilter(e.target.value)} className="text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer shadow-sm">
                <option value="ALL">Type: All</option>
                <option value="Regular">Regular</option>
                <option value="IFF">IFF</option>
                <option value="Composition">Composition</option>
              </select>

              <select value={paymentPlanFilter} onChange={(e) => setPaymentPlanFilter(e.target.value)} className="text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer shadow-sm">
                <option value="ALL">Payment Plan: All</option>
                <option value="Yearly">Yearly</option>
                <option value="Half-Yearly">Half-Yearly</option>
                <option value="Quarterly">Quarterly</option>
                <option value="Monthly">Monthly</option>
                <option value="Paid">Paid Fully</option>
                <option value="Dues">Dues Pending</option>
                <option value="FOC">FOC</option>
              </select>

              <select value={stateFilter} onChange={(e) => setStateFilter(e.target.value)} className="text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer shadow-sm">
                <option value="ALL">State: All</option>
                {uniqueStates.map(state => <option key={state} value={state}>{state}</option>)}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 mr-2">
              <Filter size={13} className="text-slate-400" />
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Adv. Filters:</span>
            </div>
            <select value={gstr1Filter} onChange={(e) => setGstr1Filter(e.target.value)} className="text-[11px] font-bold text-slate-600 bg-white border border-slate-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer">
              <option value="ALL">GSTR-1: All</option>
              <option value="Filed">Filed</option>
              <option value="Pending">Pending</option>
            </select>
            <select value={gstr3bFilter} onChange={(e) => setGstr3bFilter(e.target.value)} className="text-[11px] font-bold text-slate-600 bg-white border border-slate-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer">
              <option value="ALL">GSTR-3B: All</option>
              <option value="Filed">Filed</option>
              <option value="Pending">Pending</option>
            </select>
            <select value={aadhaarKycFilter} onChange={(e) => setAadhaarKycFilter(e.target.value)} className="text-[11px] font-bold text-slate-600 bg-white border border-slate-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer">
              <option value="ALL">Aadhaar KYC: All</option>
              <option value="Yes">Verified</option>
              <option value="No">Pending</option>
            </select>
            <select value={bankLinkedFilter} onChange={(e) => setBankLinkedFilter(e.target.value)} className="text-[11px] font-bold text-slate-600 bg-white border border-slate-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer">
              <option value="ALL">Bank: All</option>
              <option value="Updated">Updated</option>
              <option value="Not Updated">Not Updated</option>
            </select>
          </div>
        </div>

        {/* SMART TOOLBAR FOR SELECTED ROWS */}
        {selectedIds.length > 0 && (
          <div className="bg-indigo-50 border-b border-indigo-100 p-3 px-6 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
            <span className="text-sm font-bold text-indigo-800 flex items-center gap-2">
              <CheckSquare size={16} /> {selectedIds.length} Clients Selected
            </span>
            <div className="flex items-center gap-3">
              <button onClick={handleExportExcel} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors shadow-sm">
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

        {/* SAME TABLE DESIGN PRESERVED */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-500 text-[11px] font-black uppercase tracking-wider">
                <th className="py-4 px-4 w-12 text-center border-r border-slate-100">
                  <input 
                    type="checkbox" 
                    checked={selectedIds.length === filteredClients.length && filteredClients.length > 0} 
                    onChange={handleSelectAll} 
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                  />
                </th>
                <th className="py-4 px-5">Client / Trade Name</th>
                <th className='py-4 px-5'>Client Id's</th>
                <th className="py-4 px-5">GSTIN</th>
                <th className="py-4 px-5">Taxpayer Type</th>
                {/* <th className="py-4 px-5">Reg. Date</th> */}
                <th className="py-4 px-5">Aadhaar KYC</th>
                <th className="py-4 px-5">Added By</th>
                <th className="py-4 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-700">
              {loading ? (
                <tr><td colSpan="8" className="text-center py-16 text-slate-400"><RefreshCw className="animate-spin inline-block mr-2" size={18}/> Loading GST workflow...</td></tr>
              ) : filteredClients.length === 0 ? (
                <tr><td colSpan="8" className="text-center py-16 text-slate-400 flex flex-col items-center"><AlertCircle size={36} className="mb-3 text-slate-300"/> No active GST clients.</td></tr>
              ) : (
                filteredClients.map((client) => {
                  const isSelected = selectedIds.includes(client._id);

                  return (
                    <tr key={client._id} className={`transition-colors group ${isSelected ? 'bg-indigo-50/30' : 'hover:bg-slate-50/70'}`}>
                      
                      <td className="py-4 px-4 text-center border-r border-slate-50">
                        <input 
                          type="checkbox" 
                          checked={isSelected} 
                          onChange={() => handleSelectOne(client._id)} 
                          className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>

                      <td className="py-4 px-0">
                        <div className="font-bold text-slate-800 text-sm flex items-center gap-2">
                           {client.tradeName || client.assesseeName}
                           {/* 🔴 CLIENT ID DISPLAY IN TABLE */}
                           {/* <span className="text-[9px] font-black uppercase tracking-wider bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200">
                             {client.clientId || 'N/A'}
                           </span> */}
                        </div>
                        <div className="text-[11px] font-medium text-slate-500 flex items-center gap-1.5 mt-1">
                          <User size={10} className="text-slate-400"/> {client.assesseeName}
                        </div>
                      </td>

                      <td className="py-4 px-2">
                        <div className="font-mono text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-1 rounded-md inline-block uppercase shadow-sm">
                           {client.clientId || 'N/A'}
                        </div>
                      </td>
                      
                      <td className="py-4 px-5">
                        <div className="font-mono text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-1 rounded-md inline-block uppercase shadow-sm">
                          {client.gstin || 'N/A'}
                        </div>
                      </td>

                      <td className="py-4 px-5">
                        <span className="text-[10px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-100 px-2 py-1 rounded uppercase tracking-wider">
                          {client.taxpayerType || 'Regular'}
                        </span>
                      </td>

                      {/* <td className="py-4 px-5">
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                          <CalendarClock size={13} className="text-blue-500" /> 
                          {client.registrationDate ? new Date(client.registrationDate).toLocaleDateString('en-IN') : 'N/A'}
                        </span>
                      </td> */}

                      <td className="py-4 px-5">
                        <div className={`text-[10px] font-bold px-2 py-1 rounded border w-max flex items-center gap-1.5 shadow-sm ${client.aadhaarKycStatus === 'Yes' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                          {client.aadhaarKycStatus === 'Yes' ? <ShieldCheck size={14}/> : <AlertTriangle size={14}/>} 
                          {client.aadhaarKycStatus === 'Yes' ? 'Verified' : 'Pending'}
                        </div>
                      </td>
                      
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 text-[11px] font-bold shrink-0">
                            {client.createdBy?.name ? client.createdBy.name.charAt(0).toUpperCase() : 'A'}
                          </div>
                          <span className="text-xs font-bold text-slate-700 truncate w-24">
                            {client.createdBy?.name || 'Admin'}
                          </span>
                        </div>
                      </td>

                      <td className="py-4 px-5 text-right">
                        <div className="flex items-center justify-end gap-2.5">
                          <button onClick={() => handleOpenView(client)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-600 hover:text-white rounded-lg transition-all border border-blue-200 shadow-sm" title="View Profile">
                            <Eye size={14} strokeWidth={2.5}/> View
                          </button>
                          <button onClick={() => handleOpenRemarks(client)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-500 hover:text-white rounded-lg transition-all border border-amber-200 shadow-sm" title="Remarks & Notes">
                            <MessageSquare size={14} strokeWidth={2.5}/> Note
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

      {/* FULL VIEW PROFILE MODAL */}
      {isViewModalOpen && clientToView && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-slate-50 rounded-3xl w-full max-w-4xl shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95">
            
            <div className="relative px-8 pt-6 pb-16 bg-gradient-to-r from-blue-700 to-indigo-800 text-white rounded-t-3xl flex justify-between items-start overflow-hidden">
              <div className="absolute top-0 right-0 -mt-10 -mr-10 h-40 w-40 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
              
              <div className="flex items-center gap-5 z-10">
                <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md border border-white/30 shadow-inner">
                  <Building2 size={36} className="text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-black tracking-tight">{clientToView.tradeName || clientToView.assesseeName}</h2>
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-blue-100 font-medium">
                    <span className="flex items-center gap-1.5 bg-black/20 px-2.5 py-1 rounded-md border border-white/10 font-mono tracking-wider text-white">
                      GST: {clientToView.gstin || 'N/A'}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <User size={14} className="opacity-70"/> {clientToView.assesseeName}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Phone size={14} className="opacity-70"/> {clientToView.mobile}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="z-10 flex gap-2">
                <button onClick={() => { setIsViewModalOpen(false); handleOpenHistory(clientToView); }} className="p-2 rounded-full bg-black/10 hover:bg-black/20 text-white transition-colors" title="View Return History">
                  <History size={20} strokeWidth={2.5} />
                </button>
                <button onClick={() => setIsViewModalOpen(false)} className="p-2 rounded-full bg-black/10 hover:bg-black/20 text-white transition-colors">
                  <X size={20} strokeWidth={2.5} />
                </button>
              </div>
            </div>
            
            <div className="overflow-y-auto p-6 md:p-8 space-y-6 custom-scrollbar">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Contact & Registration Card */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                    <Navigation size={14}/> Registration & Contact
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Authorised Person</p>
                      <p className="text-sm font-semibold text-slate-800">{clientToView.authorisedPersonName || 'N/A'}</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Email Address</p>
                        <p className="text-sm font-semibold text-slate-800 truncate" title={clientToView.email}>{clientToView.email || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Taxpayer Type</p>
                        <p className="text-sm font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded w-max border border-blue-100">{clientToView.taxpayerType || 'Regular'}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-100">
                      <div>
                        <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">State / Location</p>
                        <p className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                           <MapPin size={12} className="text-slate-400"/> {clientToView.state || 'N/A'} {clientToView.pinCode ? `(${clientToView.pinCode})` : ''}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Aadhaar KYC</p>
                        <div className={`text-xs font-bold px-2 py-0.5 rounded border w-max flex items-center gap-1 ${clientToView.aadhaarKycStatus === 'Yes' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                           {clientToView.aadhaarKycStatus === 'Yes' ? <ShieldCheck size={12}/> : <AlertTriangle size={12}/>} 
                           {clientToView.aadhaarKycStatus === 'Yes' ? 'Verified' : 'Pending'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Workflow Status Card */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                    <Activity size={14}/> Workspace & Portal Details
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <span className="text-xs font-bold text-slate-500">Live Status</span>
                      <span className={`px-3 py-1 rounded-lg text-xs font-bold shadow-sm border ${getStatusStyle(clientToView.gstStatus)}`}>
                        {clientToView.gstStatus || 'Documents Pending'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Portal Username</p>
                        <p className="text-sm font-bold text-slate-700">{clientToView.portalUsername || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Portal Password</p>
                        <p className="text-sm font-bold text-rose-600 flex items-center gap-1.5"><Key size={12}/> {clientToView.portalPassword || 'N/A'}</p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100">
                      <p className="text-[9px] font-bold uppercase text-slate-400 mb-1">Reg. Date</p>
                      <p className="text-xs font-bold text-slate-700">{clientToView.registrationDate ? new Date(clientToView.registrationDate).toLocaleDateString('en-IN') : 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Row: Bank & Fees */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Bank Details */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                    <CreditCard size={14}/> Bank Details
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Bank Name</p>
                      <p className="text-sm font-bold text-slate-800">{clientToView.bankName || 'N/A'}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Account No.</p>
                        <p className="text-sm font-mono font-bold text-slate-800">{clientToView.accountNo || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">IFSC Code</p>
                        <p className="text-sm font-mono font-bold text-slate-800 uppercase">{clientToView.ifscCode || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Fee Status */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                      <IndianRupee size={14}/> Professional Fees
                    </h3>
                    <div className="flex gap-2">
                       <span className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-md border ${['Paid', 'Monthly', 'Yearly', 'Quarterly', 'Half-Yearly'].includes(clientToView.feeStatus) ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : clientToView.feeStatus === 'FOC' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                         {clientToView.feeStatus || 'Paid'}
                       </span>
                    </div>
                  </div>
                  
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex justify-between items-center h-20">
                    <div>
                      <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Total Fee</p>
                      <p className="text-lg font-black text-slate-800">₹{clientToView.feeAmount || 0}</p>
                    </div>
                    <div className="w-px h-10 bg-slate-200"></div>
                    <div>
                      <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Received</p>
                      <p className="text-lg font-black text-emerald-600">₹{clientToView.amountReceived || 0}</p>
                    </div>
                    <div className="w-px h-10 bg-slate-200"></div>
                    <div>
                      <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Balance Due</p>
                      <p className="text-lg font-black text-rose-600">₹{(clientToView.feeAmount || 0) - (clientToView.amountReceived || 0)}</p>
                    </div>
                  </div>
                  <div className="mt-3 text-right">
                     <span className="text-[10px] font-bold text-slate-400 uppercase">Last Payment Date: </span>
                     <span className="text-xs font-bold text-slate-700">{clientToView.paymentDate ? new Date(clientToView.paymentDate).toLocaleDateString('en-IN') : 'N/A'}</span>
                  </div>
                </div>

              </div>

            </div>
            
            <div className="flex justify-between items-center p-5 border-t border-slate-200 bg-white rounded-b-3xl">
              {isAdmin ? (
                <button 
                  onClick={() => { setIsViewModalOpen(false); confirmDelete(clientToView); }} 
                  className="px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors border border-transparent hover:border-rose-200 flex items-center gap-1.5"
                >
                  <Trash2 size={15} /> Remove Workspace
                </button>
              ) : <div></div>}

              <div className="flex items-center gap-3">
                <button onClick={() => setIsViewModalOpen(false)} className="px-5 py-2.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors">
                  Close Profile
                </button>
                <button 
                  onClick={() => { setIsViewModalOpen(false); handleOpenEdit(clientToView); }} 
                  className="px-5 py-2.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center gap-2"
                >
                  <Pencil size={15} strokeWidth={2.5}/> Edit Details
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* DEDICATED HISTORY MODAL (WITH TABS) */}
      {isHistoryModalOpen && clientForHistory && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-100 flex flex-col max-h-[85vh] overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/80">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold"><History size={20} /></div>
                <div>
                  <h2 className="text-base font-bold text-slate-800 tracking-tight">Client Audit & History</h2>
                  <p className="text-xs text-slate-500">{clientForHistory.tradeName || clientForHistory.assesseeName}</p>
                </div>
              </div>
              <button onClick={() => setIsHistoryModalOpen(false)} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors"><X size={18} /></button>
            </div>
            
            {/* TABS */}
            <div className="flex border-b border-slate-100 bg-white px-6">
              <button onClick={() => setHistoryTab('returns')} className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors ${historyTab === 'returns' ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
                Monthly Returns
              </button>
              <button onClick={() => setHistoryTab('fees')} className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors ${historyTab === 'fees' ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
                Fee History
              </button>
            </div>

            <div className="overflow-y-auto p-6 space-y-6 custom-scrollbar bg-slate-50/50">
              
              {historyTab === 'returns' && (
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm animate-in fade-in slide-in-from-bottom-2">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
                    <CalendarClock size={14}/> Returns Tracker
                  </h3>
                  
                  <div className="space-y-4">
                    {/* GSTR-1 */}
                    <div className="flex items-start gap-4">
                      <div className="mt-1 h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center border border-blue-100 shrink-0">
                        <FileCheck size={14} className="text-blue-600" />
                      </div>
                      <div className="flex-1 bg-slate-50 rounded-xl p-3 border border-slate-100">
                        <h4 className="text-xs font-bold text-slate-800 mb-2">GSTR-1 (Outward Supplies)</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-[10px] font-bold uppercase text-slate-400">Filed On</p>
                            <p className="text-sm font-semibold text-emerald-600">{clientForHistory.gstr1FilingDate ? new Date(clientForHistory.gstr1FilingDate).toLocaleDateString('en-IN') : 'Not Filed'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold uppercase text-slate-400">Next Due (11th)</p>
                            <p className="text-sm font-semibold text-rose-500">{clientForHistory.gstr1NextDueDate ? new Date(clientForHistory.gstr1NextDueDate).toLocaleDateString('en-IN') : 'N/A'}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* GSTR-3B */}
                    <div className="flex items-start gap-4">
                      <div className="mt-1 h-8 w-8 rounded-full bg-indigo-50 flex items-center justify-center border border-indigo-100 shrink-0">
                        <FileText size={14} className="text-indigo-600" />
                      </div>
                      <div className="flex-1 bg-slate-50 rounded-xl p-3 border border-slate-100">
                        <h4 className="text-xs font-bold text-slate-800 mb-2">GSTR-3B (Summary Return)</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-[10px] font-bold uppercase text-slate-400">Filed On</p>
                            <p className="text-sm font-semibold text-emerald-600">{clientForHistory.gstr3bFilingDate ? new Date(clientForHistory.gstr3bFilingDate).toLocaleDateString('en-IN') : 'Not Filed'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold uppercase text-slate-400">Next Due (20th)</p>
                            <p className="text-sm font-semibold text-rose-500">{clientForHistory.gstr3bNextDueDate ? new Date(clientForHistory.gstr3bNextDueDate).toLocaleDateString('en-IN') : 'N/A'}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {historyTab === 'fees' && (
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm animate-in fade-in slide-in-from-bottom-2">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
                    <IndianRupee size={14}/> Fee & Payment History
                  </h3>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-4">
                     <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="border-r border-slate-200">
                           <p className="text-[10px] font-bold text-slate-400 uppercase">Payment Plan</p>
                           <p className="text-sm font-bold text-slate-800 mt-1">{clientForHistory.feeStatus}</p>
                        </div>
                        <div className="border-r border-slate-200">
                           <p className="text-[10px] font-bold text-slate-400 uppercase">Current Dues</p>
                           <p className="text-sm font-bold text-rose-600 mt-1">₹{(clientForHistory.feeAmount || 0) - (clientForHistory.amountReceived || 0)}</p>
                        </div>
                        <div>
                           <p className="text-[10px] font-bold text-slate-400 uppercase">Last Payment</p>
                           <p className="text-sm font-bold text-emerald-600 mt-1">{clientForHistory.paymentDate ? new Date(clientForHistory.paymentDate).toLocaleDateString('en-IN') : 'N/A'}</p>
                        </div>
                     </div>
                  </div>

                  <div className="text-xs text-slate-700 whitespace-pre-wrap max-h-40 overflow-y-auto custom-scrollbar font-medium leading-relaxed bg-slate-50 rounded-xl p-3 border border-slate-100">
                    {clientForHistory.remarks && getFilteredFeeHistory(clientForHistory.remarks).length > 0
                      ? getFilteredFeeHistory(clientForHistory.remarks).join('\n\n')
                      : <span className="text-slate-400 italic">No specific fee update logs found. Updates added during edits will appear here.</span>}
                  </div>
                </div>
              )}

            </div>
            <div className="flex justify-between items-center px-6 py-4 border-t border-slate-100 bg-white rounded-b-3xl">
              <span className="text-xs text-slate-400 font-medium">GSTIN: {clientForHistory.gstin || 'N/A'}</span>
              <button onClick={() => setIsHistoryModalOpen(false)} className="px-5 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors">Close</button>
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
                  <h2 className="text-base font-bold text-slate-800 tracking-tight">GST Notes & Remarks</h2>
                  <p className="text-xs text-slate-500">{clientForRemarks.tradeName || clientForRemarks.assesseeName}</p>
                </div>
              </div>
              <button onClick={() => setIsRemarksModalOpen(false)} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors"><X size={18} /></button>
            </div>
            
            <div className="overflow-y-auto p-6 space-y-4 custom-scrollbar">
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 text-xs text-slate-700 font-medium whitespace-pre-wrap min-h-[140px] max-h-[220px] overflow-y-auto shadow-inner leading-relaxed custom-scrollbar">
                {clientForRemarks.remarks && getFilteredGstRemarks(clientForRemarks.remarks) 
                  ? getFilteredGstRemarks(clientForRemarks.remarks) 
                  : <span className="text-slate-400 italic">No GST specific notes recorded yet.</span>}
              </div>

              <form onSubmit={handleAddRemarkSubmit} className="space-y-3 pt-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">Add New Progress Note</label>
                <div className="relative">
                  <textarea 
                    rows="3" 
                    value={newRemarkText} 
                    onChange={(e) => setNewRemarkText(e.target.value)} 
                    placeholder="Enter GST filing update..." 
                    className="w-full text-xs font-medium border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none shadow-sm"
                  />
                  <button 
                    type="submit" 
                    disabled={!newRemarkText.trim()}
                    className="absolute right-3 bottom-3 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm transition-all"
                  >
                    <Send size={12} /> Post Note
                  </button>
                </div>
              </form>
            </div>
            <div className="flex justify-end items-center px-6 py-4 border-t border-slate-100 bg-white rounded-b-3xl">
              <button onClick={() => setIsRemarksModalOpen(false)} className="px-5 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* UNLINK CONFIRMATION MODAL */}
      {isDeleteModalOpen && clientToDelete && (
        <div className="fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 p-8 text-center space-y-4 animate-in fade-in zoom-in-95">
            <div className="mx-auto h-14 w-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center"><AlertTriangle size={26} /></div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 tracking-tight">Remove from Workspace?</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Are you sure you want to remove <span className="font-bold text-slate-700">{clientToDelete.assesseeName}</span> from the active GST workflow? <br/><br/>
                <span className="text-blue-600 bg-blue-50 px-2 py-1 rounded font-medium">This client will remain safe in the main CRM list.</span>
              </p>
            </div>
            <div className="flex justify-center gap-3 pt-3">
              <button onClick={() => setIsDeleteModalOpen(false)} className="px-5 py-2.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors">Cancel</button>
              <button onClick={handleDelete} className="px-5 py-2.5 text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white rounded-xl shadow-md shadow-amber-500/20 transition-colors">Yes, Remove</button>
            </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT / IMPORT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95">
            
            <div className="flex justify-between items-center px-8 py-5 border-b border-slate-100 bg-slate-50/80">
              <div>
                <h2 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
                  <Building2 className="text-blue-600" size={24}/> {editMode ? 'Edit GST Return Details' : 'Add / Import GST Return'}
                </h2>
                <p className="text-xs text-slate-500 mt-1">Manage portal credentials, taxpayer details, and filing dates.</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors"><X size={20} /></button>
            </div>

            <form onSubmit={handleSubmit} className="overflow-y-auto p-8 space-y-8 custom-scrollbar">
              
              {!editMode && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 p-5 rounded-2xl shadow-inner">
                  <label className="block text-xs font-bold uppercase tracking-wider text-blue-800 mb-2 flex items-center gap-2">
                    <UserCheck size={16} /> Quick Import Existing CRM Client
                  </label>
                  <select value={importClientId} onChange={handleImportSelect} className="w-full text-sm border border-blue-200 bg-white rounded-xl p-3.5 font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer shadow-sm">
                    <option value="">-- Click here to select a client ({importList.length} pending imports) --</option>
                    {importList.map(c => (
                      <option key={c._id} value={c._id}>{c.tradeName ? `${c.assesseeName} (${c.tradeName})` : c.assesseeName} - {c.mobile}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* 🔴 NEW ID READ-ONLY INPUT */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Generated Client ID</label>
                  <input type="text" name="clientId" value={formData.clientId} onChange={handleChange} disabled={!isAdmin} className="bg-transparent font-mono text-lg font-black text-slate-800 outline-none w-32 uppercase" />
                </div>
                {!editMode && <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-1 rounded">Auto-Generated</span>}
              </div>

              {/* SECTION 1: CORE INFO */}
              <div>
                <h3 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4">1. Primary Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Client / Assessee Name *</label>
                    <input type="text" name="assesseeName" required value={formData.assesseeName} onChange={handleChange} disabled={editMode && !isAdmin} className="w-full text-sm font-semibold border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500/20" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Trade / Business Name</label>
                    <input type="text" name="tradeName" value={formData.tradeName} onChange={handleChange} disabled={editMode && !isAdmin} className="w-full text-sm font-semibold border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500/20" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">GSTIN Number *</label>
                    <input type="text" name="gstin" required value={formData.gstin} onChange={handleChange} disabled={editMode && !isAdmin} className="w-full text-sm font-bold border border-slate-200 rounded-xl p-3 uppercase focus:ring-2 focus:ring-blue-500/20" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Mobile Number *</label>
                    <input type="tel" name="mobile" required value={formData.mobile} onChange={handleChange} disabled={editMode && !isAdmin} className="w-full text-sm font-medium border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500/20" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Email ID</label>
                    <input type="email" name="email" value={formData.email} onChange={handleChange} disabled={editMode && !isAdmin} className="w-full text-sm font-medium border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500/20" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Authorised Person</label>
                    <input type="text" name="authorisedPersonName" value={formData.authorisedPersonName} onChange={handleChange} disabled={editMode && !isAdmin} className="w-full text-sm font-medium border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500/20" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Taxpayer Type</label>
                      <select name="taxpayerType" value={formData.taxpayerType} onChange={handleChange} disabled={editMode && !isAdmin} className="w-full text-sm font-medium border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500/20">
                        <option value="Regular">Regular</option>
                        <option value="IFF">IFF</option>
                        <option value="Composition">Composition</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Aadhaar KYC</label>
                      <select name="aadhaarKycStatus" value={formData.aadhaarKycStatus} onChange={handleChange} disabled={editMode && !isAdmin} className="w-full text-sm font-medium border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500/20">
                        <option value="No">No (Pending)</option>
                        <option value="Yes">Yes (Verified)</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">State</label>
                    <input type="text" name="state" value={formData.state} onChange={handleChange} disabled={editMode && !isAdmin} placeholder="e.g. Delhi" className="w-full text-sm font-medium border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500/20" />
                  </div>
                </div>
              </div>

              {/* SECTION 2: WORKFLOW & PORTAL */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                <h3 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4 flex items-center gap-2"><Activity size={16} className="text-blue-600"/> 2. Workflow & Portal Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="md:col-span-1">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-blue-600 mb-1.5">Live Workflow Status</label>
                    <select name="gstStatus" value={formData.gstStatus} onChange={handleChange} className={`w-full text-sm font-bold border rounded-xl p-3 focus:ring-2 focus:outline-none shadow-sm ${getStatusStyle(formData.gstStatus)}`}>
                      <option value="Documents Pending">⏳ Documents Pending</option>
                      <option value="Processing">⚙️ Processing</option>
                      <option value="Challan Generated">🧾 Challan Generated</option>
                      <option value="Filed">✅ Filed</option>
                      <option value="Error/Mismatch">⚠️ Error/Mismatch</option>
                    </select>
                  </div>
                  <div className="md:col-span-1">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-emerald-600 mb-1.5">Bank Linked Status</label>
                    <select name="bankLinkedStatus" value={formData.bankLinkedStatus} onChange={handleChange} disabled={editMode && !isAdmin} className="w-full text-sm font-bold border border-emerald-200 bg-white rounded-xl p-3 focus:ring-2 focus:ring-emerald-500/20">
                      <option value="Not Updated">Not Updated</option>
                      <option value="Updated">Updated</option>
                    </select>
                  </div>

                  <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-5 mt-2 pt-4 border-t border-slate-200/60">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Portal Username</label>
                      <input type="text" name="portalUsername" value={formData.portalUsername} onChange={handleChange} placeholder="Username" className="w-full text-sm font-medium border border-slate-200 bg-white rounded-xl p-3 focus:ring-2 focus:ring-blue-500/20" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-rose-600 mb-1.5 flex items-center gap-1"><Key size={12}/> Portal Password</label>
                      <input type="text" name="portalPassword" value={formData.portalPassword} onChange={handleChange} placeholder="Password" className="w-full text-sm font-medium border border-rose-200 bg-white rounded-xl p-3 focus:ring-2 focus:ring-rose-500/20" />
                    </div>
                  </div>

                  {/* 🔴 NEW: GSTR-1 & 3B Dates in ADD/EDIT FORM */}
                  <div className="md:col-span-2 mt-4">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3 border-b border-slate-200 pb-1">Monthly Return Tracking</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                      
                      {/* GSTR-1 Block */}
                      <div className="space-y-3 border-r border-slate-100 pr-4">
                        <p className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-1 rounded w-max">GSTR-1 (Outward)</p>
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-emerald-600 mb-1">Filed On</label>
                          <input type="date" name="gstr1FilingDate" value={formData.gstr1FilingDate} onChange={handleChange} className="w-full text-sm font-medium border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500/20" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-amber-600 mb-1">Next Due (11th)</label>
                          <input type="date" name="gstr1NextDueDate" value={formData.gstr1NextDueDate} onChange={handleChange} className="w-full text-sm font-medium border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500/20" />
                        </div>
                      </div>

                      {/* GSTR-3B Block */}
                      <div className="space-y-3">
                        <p className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-1 rounded w-max">GSTR-3B (Summary)</p>
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-emerald-600 mb-1">Filed On</label>
                          <input type="date" name="gstr3bFilingDate" value={formData.gstr3bFilingDate} onChange={handleChange} className="w-full text-sm font-medium border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500/20" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-amber-600 mb-1">Next Due (20th)</label>
                          <input type="date" name="gstr3bNextDueDate" value={formData.gstr3bNextDueDate} onChange={handleChange} className="w-full text-sm font-medium border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500/20" />
                        </div>
                      </div>

                    </div>
                  </div>

                </div>
              </div>

              {/* SECTION 3: FEES & PAYMENTS (ADVANCED LEDGER) */}
              <div>
                <h3 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4">3. Fees & Payment Ledger</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Payment Plan</label>
                    <select name="feeStatus" value={formData.feeStatus} onChange={handleChange} className="w-full text-sm font-medium border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500/20">
                      <option value="Yearly">Yearly</option>
                      <option value="Half-Yearly">Half-Yearly</option>
                      <option value="Quarterly">Quarterly</option>
                      <option value="Monthly">Monthly</option>
                      <option value="Paid">Paid Fully (One-time)</option>
                      <option value="Dues">Payment Pending</option>
                      <option value="FOC">Free of Cost (FOC)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Total Billed Fee (₹)</label>
                    <input type="number" name="feeAmount" value={formData.feeAmount} onChange={handleChange} className="w-full text-sm font-medium border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500/20" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Total Received So Far (₹)</label>
                    <input type="number" name="amountReceived" value={formData.amountReceived} onChange={handleChange} className="w-full text-sm font-medium border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500/20" />
                  </div>
                </div>

                {editMode && (
                  <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 flex flex-col md:flex-row gap-5 items-end shadow-sm">
                    <div className="flex-1 w-full">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-emerald-700 mb-1.5 flex items-center gap-1"><Plus size={12}/> Log New Installment / Payment</label>
                      <input type="number" name="newPaymentAmount" value={formData.newPaymentAmount || ''} onChange={handleChange} placeholder="Enter amount received..." className="w-full text-sm font-bold border border-emerald-200 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-emerald-500/20 text-emerald-700 placeholder:font-medium placeholder:text-emerald-300" />
                    </div>
                    <div className="flex-1 w-full">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-emerald-700 mb-1.5">Payment Date</label>
                      <input type="date" name="newPaymentDate" value={formData.newPaymentDate || ''} onChange={handleChange} className="w-full text-sm font-bold border border-emerald-200 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-emerald-500/20 text-emerald-700" />
                    </div>
                    <div className="flex-1 w-full bg-white p-2.5 rounded-lg border border-emerald-200 shadow-sm flex flex-col justify-center">
                      <span className="text-[9px] font-bold uppercase text-slate-400">Projected Balance Due</span>
                      <span className={`text-sm font-black ${projectedBalance <= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        ₹{projectedBalance <= 0 ? 0 : projectedBalance}
                      </span>
                    </div>
                  </div>
                )}
                
                {editMode && (
                  <div className="mt-4">
                    <label className="block text-xs font-bold uppercase tracking-wider text-blue-600 mb-1.5 flex items-center gap-2">
                      <Pencil size={14} className="text-blue-500"/> Any Custom Remarks?
                    </label>
                    <textarea 
                      name="newRemark" 
                      rows="2" 
                      value={newRemark} 
                      onChange={(e) => setNewRemark(e.target.value)} 
                      placeholder="Add an optional note about this update..." 
                      className="w-full text-sm bg-white border border-blue-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none shadow-inner" 
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">Cancel</button>
                <button type="submit" className="px-8 py-2.5 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center gap-2">
                  <CheckCircle2 size={18} /> {editMode ? 'Save Changes' : 'Save GST Return'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default GstReturns;