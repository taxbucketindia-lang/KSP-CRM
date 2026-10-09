import React, { useState, useEffect, useContext, useMemo, useRef } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import toast, { Toaster } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import ClientWorkspaceDetail, { WORKSPACES } from '../components/ClientWorkspaceDetail';
import { downloadClientStatement } from '../utils/statementPdf';
import * as XLSX from 'xlsx'; 
import ExcelJS from 'exceljs'; 
import { saveAs } from 'file-saver';
import { 
  Building, Search, Plus, X, Mail, Phone, MapPin, 
  CheckCircle2, Edit, AlertCircle, RefreshCw, Trash2, AlertTriangle, 
  Briefcase, Eye, UserCircle, Hash, FileText, Calculator, Building2, FileKey, ShieldCheck,
  IndianRupee, MessageCircle, Clock, CalendarDays, Filter, Store, 
  BookOpen, Download, ChevronRight, Bell, Loader2
} from 'lucide-react';
import { can } from '../utils/permissions';

const ClientMaster = () => {
  const { user } = useContext(AuthContext);
  // 🔴 Data delete sirf "Delete Records" right wala kar sakta hai (CEO, Admin, ya jise Admin ne diya)
  const canDelete = can(user, 'DELETE_RECORDS');
  
  const [clients, setClients] = useState([]);
  const [allInvoices, setAllInvoices] = useState([]); 
  const [gstData, setGstData] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fetchingPan, setFetchingPan] = useState(false); 
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('Active');
  const [typeFilter, setTypeFilter] = useState('All');
  const [monthFilter, setMonthFilter] = useState('All'); 
  const [yearFilter, setYearFilter] = useState('All');  
  const [duesFilter, setDuesFilter] = useState('All'); 

  // Pagination Variables (Now Server Side)
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [serverStats, setServerStats] = useState(null); // Poore filtered data ke totals (server se)
  const itemsPerPage = 10;

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ open: false, client: null });
  
  // View Profile Modal
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [clientToView, setClientToView] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); 
  const [workspaceDetailModal, setWorkspaceDetailModal] = useState({ open: false, key: '' });
  // 🔴 Khule hue client ke saare workspaces ki poori detail (ITR, GST, ROC, TDS, Audit, FSSAI, CFO)
  const [workspaceData, setWorkspaceData] = useState({ loading: false, data: null });
  const navigate = useNavigate();

  // Initial Form State
  const initialForm = {
    pan: '', name: '', tradeName: '', mobile: '', email: '', 
    clientType: 'Individual', address: '', state: '', pinCode: '',
    gstin: '', aadhaar: '', dob: '', fatherName: '', 
    status: 'Active', remarks: '', openingBalance: '',
    constitution: '', cin_llpin: '', date_of_incorporation: '', nature_of_business: '',
    registered_office_address: '', books_kept_at: '', accounting_method: ''
  };
  
  const [formData, setFormData] = useState(initialForm);

  // 🔴 FETCH DATA (NOW WITH PAGINATION PARAMETERS)
  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${user.token}` };
      
      const params = new URLSearchParams({
        page: currentPage,
        limit: itemsPerPage,
        search: searchQuery,
        type: typeFilter,
        status: statusFilter,
        month: monthFilter,
        year: yearFilter,
        dues: duesFilter
      }).toString();

      const [clientsRes, invoicesRes, gstRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_URL}/client-master?${params}`, { headers }),
        axios.get(`${import.meta.env.VITE_API_URL}/invoices`, { headers }).catch(() => ({ data: { data: [] } })),
        axios.get(`${import.meta.env.VITE_API_URL}/gst`, { headers }).catch(() => ({ data: [] }))
      ]);
      
      const fetchedClients = clientsRes.data.clients || clientsRes.data || [];
      const fetchedGstData = gstRes.data?.data || gstRes.data?.clients || gstRes.data || [];
      const safeGstData = Array.isArray(fetchedGstData) ? fetchedGstData : [];
      
      // 🔴 NAYA LOGIC: Jabhi Clients fetch honge, hum unka tradeName check karenge
      // Agar backend mein tradeName missing hai, par GST data mein milta hai, toh backend ko permanent UPDATE bhejenge
      
      const patchPromises = [];
      const patchedClients = fetchedClients.map(client => {
         if (!client.tradeName && safeGstData.length > 0) {
            const match = safeGstData.find(g => g.pan?.toUpperCase() === client.pan?.toUpperCase());
            if (match && match.tradeName) {
               // 1. Array mein temporary update karo taaki UI turant theek dikhe
               client.tradeName = match.tradeName; 
               // 2. Database mein permanent save karne ke liye promise bana lo
               patchPromises.push(
                 axios.put(`${import.meta.env.VITE_API_URL}/client-master/${client._id}`, 
                   { tradeName: match.tradeName }, 
                   { headers }
                 ).catch(() => console.log('Silent auto-update failed for', client.pan))
               );
            }
         }
         return client;
      });

      // Background mein saare missing names update kar do
      if (patchPromises.length > 0) {
        Promise.all(patchPromises); 
      }

      setClients(patchedClients);
      setTotalPages(clientsRes.data.totalPages || 1);
      setTotalRecords(clientsRes.data.totalCount || 0);
      setServerStats(clientsRes.data.stats || null);

      setAllInvoices(invoicesRes.data?.data || invoicesRes.data || []);
      setGstData(safeGstData);

    } catch (error) {
      toast.error("Failed to load database");
    } finally {
      setLoading(false);
    }
  };

  // 🔴 USE EFFECT: Dependency on Page & Filters (Debounce API logic to avoid spamming server)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchData();
    }, 500); 
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line
  }, [user.token, currentPage, searchQuery, statusFilter, typeFilter, monthFilter, yearFilter, duesFilter]);

  // Reset to page 1 if any filter is changed
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, typeFilter, monthFilter, yearFilter, duesFilter]);

  const handlePanChange = (e) => {
    const val = e.target.value.toUpperCase();
    setFormData(prev => ({ ...prev, pan: val }));
    
    if (val.length === 10 && !editingId) {
      setFetchingPan(true);
      setTimeout(() => {
        if (Array.isArray(gstData)) {
          const match = gstData.find(g => g.pan?.toUpperCase() === val);
          if (match) {
             setFormData(prev => ({
               ...prev,
               tradeName: prev.tradeName || match.tradeName || '',
               name: prev.name || match.assesseeName || '',
               gstin: prev.gstin || match.gstin || '',
               mobile: prev.mobile || match.mobile || '',
               email: prev.email || match.email || '',
               state: prev.state || match.state || '',
               pinCode: prev.pinCode || match.pinCode || ''
             }));
             toast.success("✅ Trade Name & Details Auto-Fetched from GST Workspace!");
          }
        }
        setFetchingPan(false);
      }, 500); 
    }
  };

  // Dynamic filter lists
  const uniqueYears = useMemo(() => {
    const currentY = new Date().getFullYear();
    return Array.from({length: 10}, (_, i) => currentY - i); 
  }, []);

  const getClientDueAmount = (client) => {
    const clientInvs = allInvoices.filter(inv => 
      (client.pan && inv.customer?.pan?.toUpperCase() === client.pan?.toUpperCase()) || 
      (client.gstin && inv.customer?.gstin?.toUpperCase() === client.gstin?.toUpperCase()) ||
      (inv.customer?.name?.toLowerCase() === client.name?.toLowerCase())
    );

    let invoiceDue = 0;
    clientInvs.forEach(inv => {
      const invTotal = Number(inv.totalAmountAfterTax || 0);
      let invReceived = Number(inv.amountReceived || 0);
      if (inv.paymentStatus === 'Paid' && invReceived === 0) invReceived = invTotal;
      invoiceDue += (invTotal - invReceived);
    });

    const openingBalance = Number(client.openingBalance || 0);
    const totalDue = (invoiceDue > 0 ? invoiceDue : 0) + openingBalance;

    return totalDue > 0 ? totalDue : 0;
  };

  // 🔴 FINAL DISPLAY LIST (Sirf Dues filter handle kar raha hai, kyunki trade name patch upar ho gaya)
  const finalDisplayClients = clients; // Dues filter server par lag chuka hai, har page par poore records aate hain

  // 🔴 Cards poore filtered clients ka total dikhate hain (server se), sirf is page ke 10 clients ka nahi
  const globalFinances = useMemo(() => ({
    billed: Number(serverStats?.billed || 0),
    received: Number(serverStats?.received || 0),
    due: Number(serverStats?.due || 0)
  }), [serverStats]);

  // 🔴 EXCEL EXPORT
  const handleExportExcel = async () => {
    const toastId = toast.loading("Fetching all client records for export...");
    try {
      const headers = { Authorization: `Bearer ${user.token}` };
      const params = new URLSearchParams({
        search: searchQuery,
        type: typeFilter,
        status: statusFilter,
        month: monthFilter,
        year: yearFilter,
        dues: duesFilter,
        fetchAll: 'true' 
      }).toString();

      const res = await axios.get(`${import.meta.env.VITE_API_URL}/client-master?${params}`, { headers });
      const fullClientsList = res.data.clients || [];

      toast.success("Generating Excel File...", { id: toastId });

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Client Master');

      worksheet.columns = [
        { header: 'Client ID', key: 'clientId', width: 15 },
        { header: 'PAN', key: 'pan', width: 15 },
        { header: 'Name', key: 'name', width: 30 },
        { header: 'Trade Name', key: 'tradeName', width: 25 },
        { header: 'Mobile', key: 'mobile', width: 15 },
        { header: 'Email', key: 'email', width: 25 },
        { header: 'Client Type', key: 'clientType', width: 20 },
        { header: 'Constitution', key: 'constitution', width: 20 },
        { header: 'GSTIN', key: 'gstin', width: 20 },
        { header: 'Aadhaar (Last 4)', key: 'aadhaar', width: 15 },
        { header: 'DOB/Incorporation', key: 'dob', width: 15 },
        { header: 'Father Name', key: 'fatherName', width: 20 },
        { header: 'Address', key: 'address', width: 30 },
        { header: 'State', key: 'state', width: 15 },
        { header: 'PIN Code', key: 'pinCode', width: 15 },
        { header: 'CIN / LLPIN', key: 'cin_llpin', width: 25 },
        { header: 'Date of Incorporation', key: 'date_of_incorporation', width: 15 },
        { header: 'Nature of Business', key: 'nature_of_business', width: 25 },
        { header: 'Accounting Method', key: 'accounting_method', width: 15 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Remarks', key: 'remarks', width: 30 },
        { header: 'Opening Balance (₹)', key: 'openingBalance', width: 18 }, 
        { header: 'Total Billed (₹)', key: 'totalBilled', width: 15 },
        { header: 'Total Received (₹)', key: 'totalReceived', width: 15 },
        { header: 'Pending Dues (₹)', key: 'pendingDues', width: 15 }
      ];

      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

      fullClientsList.forEach(client => {
        const clientDue = getClientDueAmount(client);
        
        const clientInvs = allInvoices.filter(inv => 
          (client.pan && inv.customer?.pan?.toUpperCase() === client.pan?.toUpperCase()) || 
          (client.gstin && inv.customer?.gstin?.toUpperCase() === client.gstin?.toUpperCase()) ||
          (inv.customer?.name?.toLowerCase() === client.name?.toLowerCase())
        );
        
        let billed = 0;
        let received = 0;
        clientInvs.forEach(inv => {
          const invTotal = Number(inv.totalAmountAfterTax || 0);
          let invReceived = Number(inv.amountReceived || 0);
          if (inv.paymentStatus === 'Paid' && invReceived === 0) invReceived = invTotal;
          billed += invTotal;
          received += invReceived;
        });

        worksheet.addRow({
          clientId: client.clientId || 'Pending',
          pan: client.pan || '',
          name: client.name || '',
          tradeName: client.tradeName || '',
          mobile: client.mobile || '',
          email: client.email || '',
          clientType: client.clientType || 'Individual',
          constitution: client.constitution || '',
          gstin: client.gstin || '',
          aadhaar: client.aadhaar || '',
          dob: client.dob ? new Date(client.dob).toLocaleDateString('en-IN') : '',
          fatherName: client.fatherName || '',
          address: client.address || '',
          state: client.state || '',
          pinCode: client.pinCode || '',
          cin_llpin: client.cin_llpin || '',
          date_of_incorporation: client.date_of_incorporation ? new Date(client.date_of_incorporation).toLocaleDateString('en-IN') : '',
          nature_of_business: client.nature_of_business || '',
          accounting_method: client.accounting_method || '',
          status: client.status || 'Active',
          remarks: client.remarks || '',
          openingBalance: Number(client.openingBalance || 0), 
          totalBilled: billed,
          totalReceived: received,
          pendingDues: clientDue
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `Client_Master_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      toast.error("Failed to generate Excel.", { id: toastId });
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.pan) return toast.error("PAN Number is required!");
    if (formData.pan.length !== 10) return toast.error("PAN must be exactly 10 characters.");
    
    setSaving(true);
    try {
      const headers = { Authorization: `Bearer ${user.token}` };
      
      const payload = {
        ...formData,
        openingBalance: Number(formData.openingBalance || 0)
      };

      if (editingId) {
        await axios.put(`${import.meta.env.VITE_API_URL}/client-master/${editingId}`, payload, { headers });
        toast.success("Client Updated Successfully!");
      } else {
        await axios.post(`${import.meta.env.VITE_API_URL}/client-master`, payload, { headers });
        toast.success("New Client Added!");
      }
      
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save client");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (client) => {
    setEditingId(client._id);
    const parseDate = (d) => d ? new Date(d).toISOString().split('T')[0] : '';

    setFormData({
      pan: client.pan || '', name: client.name || '', tradeName: client.tradeName || '',
      mobile: client.mobile || '', email: client.email || '', clientType: client.clientType || 'Individual', 
      address: client.address || '', state: client.state || '', pinCode: client.pinCode || '',
      gstin: client.gstin || '', aadhaar: client.aadhaar || '', dob: parseDate(client.dob),
      fatherName: client.fatherName || '', status: client.status || 'Active', 
      remarks: client.remarks || '', openingBalance: client.openingBalance || '', 
      constitution: client.constitution || '', cin_llpin: client.cin_llpin || '',
      date_of_incorporation: parseDate(client.date_of_incorporation), nature_of_business: client.nature_of_business || '',
      registered_office_address: client.registered_office_address || '', books_kept_at: client.books_kept_at || '',
      accounting_method: client.accounting_method || ''
    });
    setIsModalOpen(true);
  };

  const openNewModal = () => {
    setEditingId(null);
    setFormData(initialForm);
    setIsModalOpen(true);
  };

  const handleOpenView = async (client) => {
    setClientToView(client);
    setActiveTab('overview');
    setIsViewModalOpen(true);

    setWorkspaceData({ loading: true, data: null });
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/client-master/${client._id}/workspaces`, { headers: { Authorization: `Bearer ${user.token}` } });
      setWorkspaceData({ loading: false, data: res.data });
    } catch (error) {
      setWorkspaceData({ loading: false, data: null });
      toast.error("Could not load workspace details");
    }
  };

  // CFO box: seedha us client ki Business Health report par (latest month)
  const openCfoReport = (month) => {
    const latest = month || workspaceData.data?.cfo?.[0]?.month;
    navigate('/business-health', { state: { client: clientToView, month: latest } });
  };

  const handleWorkspaceClick = (ws) => {
    if (ws.key === 'cfo') return openCfoReport();
    setWorkspaceDetailModal({ open: true, key: ws.key });
  };

  const sendDueReminder = (client, dueAmount) => {
    if (!client.mobile) return toast.error("Mobile number is missing for this client!");
    
    const text = `Dear ${client.name},\n\nThis is a gentle reminder from SkyEdge Taxbucket.\n\nYour total pending balance across invoices is *₹${dueAmount.toLocaleString('en-IN')}*.\n\nPlease process the payment at your earliest convenience to avoid any service interruptions.\n\nThank you,\nTeam Taxbucket`;
    const encodedText = encodeURIComponent(text);
    const waLink = `https://wa.me/91${client.mobile.replace(/\D/g, '')}?text=${encodedText}`;
    
    window.open(waLink, '_blank');
    toast.success("Opening WhatsApp to send payment reminder!");
  };

  const executeDelete = async () => {
    try {
      const headers = { Authorization: `Bearer ${user.token}` };
      await axios.delete(`${import.meta.env.VITE_API_URL}/client-master/${deleteModal.client._id}`, { headers });
      toast.success("Client deleted permanently.");
      setDeleteModal({ open: false, client: null });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Error deleting client");
    }
  };

  const getStatusBadge = (status) => {
    return status === 'Active' 
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
      : 'bg-rose-50 text-rose-700 border-rose-200';
  };

  const generateLedger = () => {
    let transactions = [];

    const openingBal = Number(clientToView?.openingBalance || 0);
    if (openingBal > 0) {
       transactions.push({
         id: 'opening-bal',
         date: '1970-01-01T00:00:00.000Z', 
         displayDate: clientToView.createdAt, 
         type: 'Opening',
         particulars: 'Opening Balance Carried Forward',
         debit: openingBal,
         credit: 0
       });
    }

    const clientInvoices = allInvoices.filter(inv => 
      (clientToView?.pan && inv.customer?.pan?.toUpperCase() === clientToView.pan?.toUpperCase()) || 
      (clientToView?.gstin && inv.customer?.gstin?.toUpperCase() === clientToView.gstin?.toUpperCase()) ||
      (inv.customer?.name?.toLowerCase() === clientToView?.name?.toLowerCase())
    );

    clientInvoices.forEach(inv => {
      const billedAmount = inv.totalAmountAfterTax || 0;
      
      transactions.push({
        id: `inv-${inv._id}`,
        date: inv.invoiceDate || inv.createdAt,
        type: 'Invoice / Work',
        ref: inv.invoiceNo,
        particulars: `Invoice Raised (${inv.invoiceNo}) for ${inv.items?.[0]?.description || 'Professional Services'}`,
        debit: billedAmount,
        credit: 0
      });

      if (inv.paymentHistory && inv.paymentHistory.length > 0) {
        inv.paymentHistory.forEach((ph, idx) => {
          const paidAmt = Number(ph.amount || 0);
          const discAmt = Number(ph.discount || 0);
          const totalCredit = paidAmt + discAmt;
          
          let desc = `Part Payment Received against Invoice ${inv.invoiceNo} via ${ph.mode || 'Online'}`;
          if (discAmt > 0) {
            desc += ` (+ ₹${discAmt.toLocaleString('en-IN')} Discount)`;
          }

          transactions.push({
            id: `pay-${inv._id}-${idx}`,
            date: ph.date || inv.paymentDate || inv.updatedAt,
            type: 'Payment',
            ref: inv.invoiceNo,
            particulars: desc,
            debit: 0,
            credit: totalCredit
          });
        });
      } else {
        let actualReceived = Number(inv.amountReceived || 0);
        if (inv.paymentStatus === 'Paid' && actualReceived === 0) actualReceived = billedAmount;

        if (actualReceived > 0) {
          const pDate = inv.paymentDate || inv.updatedAt || inv.invoiceDate;
          transactions.push({
            id: `pay-${inv._id}`,
            date: pDate,
            type: 'Payment',
            ref: inv.invoiceNo,
            particulars: `Payment Received against Invoice ${inv.invoiceNo}`,
            debit: 0,
            credit: actualReceived
          });
        }
      }
    });

    transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let runningBalance = 0;
    let ledger = [];
    
    transactions.forEach(t => {
       runningBalance += t.debit;
       runningBalance -= t.credit;
       
       ledger.push({
         ...t,
         balance: runningBalance
       });
    });

    return ledger;
  };

  const clientLedger = isViewModalOpen ? generateLedger() : [];

  // 🔴 Statement PDF (pehle is button ke peeche koi kaam likha hi nahi tha)
  const [downloadingStatement, setDownloadingStatement] = useState(false);
  const handleDownloadStatement = async () => {
    if (!clientToView) return;
    setDownloadingStatement(true);
    try {
      await downloadClientStatement(clientToView, clientLedger);
      toast.success("Statement downloaded!");
    } catch (error) {
      console.error(error);
      toast.error("Could not create the statement PDF");
    } finally {
      setDownloadingStatement(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6 pb-12">
      <Toaster position="top-right" />

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <Building size={28} className="text-blue-600" /> Client Master (360° Profile)
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Global central database & unified financial tracking.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleExportExcel} className="inline-flex items-center gap-2 bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200 hover:border-emerald-200 text-sm font-bold px-4 py-2.5 rounded-xl shadow-sm transition-colors">
            <Download size={18} strokeWidth={2.5} /> Export Excel
          </button>
          <button onClick={openNewModal} className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-5 py-2.5 rounded-xl shadow-md shadow-blue-500/20 transition-all">
            <Plus size={18} strokeWidth={2.5} /> Add New Client
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 border-l-4 border-l-blue-500">
          <div className="h-10 w-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold border border-blue-100 shrink-0"><Building size={18} /></div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Clients</p>
            <h3 className="text-xl font-black text-slate-800">{totalRecords}</h3> {/* Updated to totalRecords from API */}
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 border-l-4 border-l-emerald-500">
          <div className="h-10 w-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold border border-emerald-100 shrink-0"><FileText size={18} /></div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Billed</p>
            <h3 className="text-xl font-black text-emerald-700 flex items-center gap-0.5"><IndianRupee size={16}/>{globalFinances.billed.toLocaleString('en-IN')}</h3>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 border-l-4 border-l-indigo-500">
          <div className="h-10 w-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold border border-indigo-100 shrink-0"><CheckCircle2 size={18} /></div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Received</p>
            <h3 className="text-xl font-black text-indigo-700 flex items-center gap-0.5"><IndianRupee size={16}/>{globalFinances.received.toLocaleString('en-IN')}</h3>
          </div>
        </div>

        <div className="bg-rose-50 p-4 rounded-xl border border-rose-200 shadow-sm flex items-center gap-4 border-l-4 border-l-rose-500">
          <div className="h-10 w-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center font-bold border border-rose-200 shrink-0"><AlertCircle size={18} /></div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-rose-500">Pending Dues</p>
            <h3 className="text-xl font-black text-rose-700 flex items-center gap-0.5"><IndianRupee size={16}/>{globalFinances.due.toLocaleString('en-IN')}</h3>
          </div>
        </div>
      </div>

      {/* FILTERS */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-4">
        <div className="p-4 bg-slate-50/50 flex flex-col gap-4 border-b border-slate-100">
          <div className="flex flex-col xl:flex-row xl:items-center gap-4 justify-between">
            <div className="relative w-full xl:w-80 shrink-0">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Search by ID, Name, Trade Name, PAN or GSTIN..." 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
                className="w-full pl-9 pr-3.5 py-2.5 text-sm font-medium bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm" 
              />
            </div>
            
            <div className="w-full flex flex-wrap gap-3">
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="w-full sm:w-auto text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl px-4 py-2.5 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer">
                <option value="All">All Types</option>
                <option value="Individual">Individual</option>
                <option value="Proprietorship">Proprietorship</option>
                <option value="Partnership Firm">Partnership Firm</option>
                <option value="LLP">LLP</option>
                <option value="Private Limited">Private Limited</option>
                <option value="Public Limited">Public Limited</option>
                <option value="HUF">HUF</option>
                <option value="Trust">Trust</option>
                <option value="Other">Other</option>
              </select>

              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full sm:w-auto text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl px-4 py-2.5 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer">
                <option value="All">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>

              <select value={duesFilter} onChange={(e) => setDuesFilter(e.target.value)} className="w-full sm:w-auto text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl px-4 py-2.5 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer">
                <option value="All">All Dues Status</option>
                <option value="Has Dues">Has Pending Dues</option>
                <option value="Clear">Fully Paid / Clear</option>
                <option value="No Invoice">No Invoice Yet</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 mr-2">
              <CalendarDays size={13} className="text-slate-400" />
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Onboarding Filters:</span>
            </div>
            <select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} className="text-[11px] font-bold text-slate-600 bg-white border border-slate-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer">
              <option value="All">All Months</option>
              {Array.from({length: 12}, (_, i) => <option key={i+1} value={i+1}>{new Date(0, i).toLocaleString('en', {month: 'long'})}</option>)}
            </select>
            <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)} className="text-[11px] font-bold text-slate-600 bg-white border border-slate-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer">
              <option value="All">All Years</option>
              {uniqueYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        {/* LIST VIEW TABLE WITH SERVER-SIDE PAGINATION */}
        <div className="flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-500 text-[11px] font-black uppercase tracking-wider">
                  <th className="py-4 px-5">Client Info</th>
                  <th className="py-4 px-5">Tax & Identifiers</th>
                  <th className="py-4 px-5">Contact Details</th>
                  <th className="py-4 px-5">Location</th>
                  <th className="py-4 px-5">Status & Dues</th>
                  <th className="py-4 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {loading ? (
                  <tr><td colSpan="6" className="text-center py-16 text-slate-400"><RefreshCw className="animate-spin inline-block mr-2" size={18}/> Fetching Page {currentPage}...</td></tr>
                ) : finalDisplayClients.length === 0 ? (
                  <tr><td colSpan="6" className="text-center py-16 text-slate-400"><AlertCircle size={36} className="mb-3 text-slate-300 mx-auto"/> No clients found for these filters.</td></tr>
                ) : (
                  finalDisplayClients.map((client) => {
                    const clientDue = getClientDueAmount(client); 
                    
                    return (
                      <tr key={client._id} className={`hover:bg-slate-50/70 transition-colors group ${clientDue > 0 ? 'bg-amber-50/20' : ''}`}>
                        <td className="py-3 px-5">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-black text-sm shrink-0 border border-blue-200">
                              {client.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-slate-800 flex flex-col gap-0.5">
                                <span className="flex items-center gap-2">
                                  {client.name}
                                  {client.clientId && (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-slate-200/70 text-slate-600 tracking-wider">
                                      {client.clientId}
                                    </span>
                                  )}
                                </span>
                                {client.tradeName && <span className="text-[10px] text-slate-500 font-medium">({client.tradeName})</span>}
                              </p>
                              <p className="text-[10px] font-bold text-slate-500 mt-0.5 flex items-center gap-1">
                                <Briefcase size={10} /> {client.clientType}
                              </p>
                              {WORKSPACES.some(ws => client.services?.[ws.key]) && (
                                <div className="flex flex-wrap gap-1 mt-1.5">
                                  {WORKSPACES.filter(ws => client.services?.[ws.key]).map(ws => (
                                    <span key={ws.key} className={`text-[8px] font-black tracking-wider px-1.5 py-0.5 rounded ${ws.chip}`}>{ws.short}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-5">
                          <div className="space-y-1.5">
                            <p className="text-[11px] font-mono font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 inline-block w-max">
                              PAN: {client.pan}
                            </p>
                            {client.gstin && (
                              <p className="text-[10px] font-mono font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 inline-block w-max">
                                GST: {client.gstin}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-5">
                          <div className="space-y-1">
                            <p className="text-xs font-semibold text-slate-700 flex items-center gap-1.5"><Phone size={12} className="text-slate-400"/> {client.mobile || 'N/A'}</p>
                            {client.email && <p className="text-[10px] font-bold text-blue-600 flex items-center gap-1.5 truncate max-w-[150px]" title={client.email}><Mail size={10} className="shrink-0"/> {client.email}</p>}
                          </div>
                        </td>
                        <td className="py-3 px-5">
                          <p className="text-[11px] text-slate-600 flex items-start gap-1.5 mt-0.5 max-w-[150px]">
                            <MapPin size={12} className="text-slate-400 mt-0.5 shrink-0"/> 
                            <span className="truncate">{client.state ? `${client.state} ${client.pinCode ? `(${client.pinCode})` : ''}` : 'Location not added'}</span>
                          </p>
                        </td>
                        <td className="py-3 px-5">
                          <div className="flex flex-col items-start gap-1.5">
                            <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${getStatusBadge(client.status)}`}>
                              {client.status}
                            </span>
                            
                            {/* PENDING DUE BADGE IN TABLE */}
                            {clientDue > 0 ? (
                               <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-rose-600 bg-rose-100 px-2 py-0.5 rounded border border-rose-200">
                                 Due: ₹{clientDue.toLocaleString('en-IN')}
                               </span>
                            ) : (
                               <span className="text-[10px] font-bold text-slate-400">Dues Clear</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-5 text-right">
                          <div className="flex flex-col items-end gap-2">
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={() => handleOpenView(client)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent" title="View 360 Profile">
                                <Eye size={16}/>
                              </button>
                              <button onClick={() => handleEdit(client)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-transparent" title="Edit Client">
                                <Edit size={16}/>
                              </button>
                              {canDelete && (
                              <button onClick={() => setDeleteModal({ open: true, client: client })} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-transparent" title="Delete Client">
                                <Trash2 size={16}/>
                              </button>
                              )}
                            </div>
                            
                            {clientDue > 0 && (
                               <button 
                                 onClick={() => sendDueReminder(client, clientDue)} 
                                 className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 bg-amber-100 text-amber-700 px-2 py-1 rounded hover:bg-amber-200 transition-colors border border-amber-200"
                               >
                                 <Bell size={10} className="animate-pulse"/> Reminder
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

          {/* SERVER-SIDE PAGINATION CONTROLS */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 bg-slate-50 border-t border-slate-200 rounded-b-2xl">
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
      </div>

      {/* FULL VIEW 360 PROFILE MODAL */}
      {isViewModalOpen && clientToView && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-slate-50 rounded-3xl w-full max-w-5xl shadow-2xl border border-slate-100 flex flex-col max-h-[95vh] overflow-hidden animate-in fade-in zoom-in-95">
            
            {/* Modal Header */}
            <div className="relative px-8 pt-6 pb-16 bg-gradient-to-r from-blue-700 to-indigo-800 text-white rounded-t-3xl flex flex-col overflow-hidden shrink-0">
              <div className="absolute top-0 right-0 -mt-10 -mr-10 h-40 w-40 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
              
              <div className="flex justify-between items-start z-10 w-full">
                <div className="flex items-center gap-5">
                  <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md border border-white/30 shadow-inner">
                    <UserCircle size={36} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
                      {clientToView.name} 
                      {clientToView.tradeName && <span className="text-sm font-medium text-blue-200">({clientToView.tradeName})</span>}
                    </h2>
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-blue-100 font-medium">
                      {clientToView.clientId && (
                        <span className="flex items-center gap-1.5 bg-white/20 px-2.5 py-1 rounded-md border border-white/30 font-mono tracking-wider text-white font-bold">
                          ID: {clientToView.clientId}
                        </span>
                      )}
                      <span className="flex items-center gap-1.5 bg-black/20 px-2.5 py-1 rounded-md border border-white/10 font-mono tracking-wider text-white">
                        PAN: {clientToView.pan}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${clientToView.status === 'Active' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'}`}>
                        {clientToView.status}
                      </span>
                    </div>
                  </div>
                </div>
                <button onClick={() => setIsViewModalOpen(false)} className="p-2 rounded-full bg-black/10 hover:bg-black/20 text-white transition-colors"><X size={20} strokeWidth={2.5} /></button>
              </div>

              {/* TABS Navigation */}
              <div className="flex items-center gap-6 mt-6 z-10 border-b border-white/20">
                <button 
                  onClick={() => setActiveTab('overview')}
                  className={`pb-3 text-sm font-bold transition-all border-b-2 flex items-center gap-2 ${activeTab === 'overview' ? 'border-white text-white' : 'border-transparent text-blue-200 hover:text-white'}`}
                >
                  <Eye size={16}/> Profile Overview
                </button>
                <button 
                  onClick={() => setActiveTab('ledger')}
                  className={`pb-3 text-sm font-bold transition-all border-b-2 flex items-center gap-2 ${activeTab === 'ledger' ? 'border-white text-white' : 'border-transparent text-blue-200 hover:text-white'}`}
                >
                  <BookOpen size={16}/> Account Statement & Ledger
                </button>
              </div>
            </div>
            
            {/* TAB CONTENT AREA */}
            <div className="overflow-y-auto p-6 md:p-8 custom-scrollbar flex-1">
              
              {/* TAB 1: PROFILE OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="space-y-6 animate-in fade-in">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Contact & General Card */}
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                        <MapPin size={14}/> General & Contact Info
                      </h3>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Mobile</p>
                            <p className="text-sm font-semibold text-slate-800">{clientToView.mobile || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Email</p>
                            <p className="text-sm font-semibold text-slate-800 truncate" title={clientToView.email}>{clientToView.email || 'N/A'}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">DOB / Incorporation</p>
                            <p className="text-sm font-semibold text-slate-800">{clientToView.dob ? new Date(clientToView.dob).toLocaleDateString('en-IN') : 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Father's Name</p>
                            <p className="text-sm font-semibold text-slate-800">{clientToView.fatherName || 'N/A'}</p>
                          </div>
                        </div>
                        <div className="pt-3 border-t border-slate-100">
                          <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Full Address</p>
                          <p className="text-sm font-semibold text-slate-700">
                            {[clientToView.address, clientToView.district, clientToView.state, clientToView.pinCode].filter(Boolean).join(', ') || 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Tax Identifiers Card */}
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                        <Hash size={14}/> Tax & ID Credentials
                      </h3>
                      <div className="space-y-4">
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex justify-between items-center">
                          <span className="text-xs font-bold text-slate-500">PAN Number</span>
                          <span className="text-sm font-mono font-black text-slate-800 tracking-widest">{clientToView.pan}</span>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex justify-between items-center">
                          <span className="text-xs font-bold text-slate-500">GSTIN</span>
                          <span className="text-sm font-mono font-bold text-indigo-700">{clientToView.gstin || 'Not Provided'}</span>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex justify-between items-center">
                          <span className="text-xs font-bold text-slate-500">Aadhaar (Masked)</span>
                          <span className="text-sm font-mono font-bold text-slate-600">
                            {clientToView.aadhaar ? `XXXX-XXXX-${clientToView.aadhaar.slice(-4)}` : 'Not Provided'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* BUSINESS DETAILS */}
                  <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                      <Briefcase size={14}/> Business Details
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[
                        ['Client Type', clientToView.clientType],
                        ['Constitution', clientToView.constitution],
                        ['Contact Person', clientToView.contactPerson],
                        ['CIN / LLPIN', clientToView.cin_llpin],
                        ['Incorporation Date', clientToView.date_of_incorporation ? new Date(clientToView.date_of_incorporation).toLocaleDateString('en-IN') : ''],
                        ['Nature of Business', clientToView.nature_of_business],
                        ['Accounting Method', clientToView.accounting_method],
                        ['Opening Balance', Number(clientToView.openingBalance) ? `₹${Number(clientToView.openingBalance).toLocaleString('en-IN')}` : ''],
                        ['Client Since', clientToView.createdAt ? new Date(clientToView.createdAt).toLocaleDateString('en-IN') : '']
                      ].map(([label, value]) => (
                        <div key={label} className="min-w-0">
                          <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">{label}</p>
                          <p className={`text-sm font-semibold break-words ${value ? 'text-slate-800' : 'text-slate-300'}`}>{value || 'Not added'}</p>
                        </div>
                      ))}
                    </div>
                    {clientToView.remarks && (
                      <div className="mt-4 pt-3 border-t border-slate-100">
                        <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Remarks</p>
                        <p className="text-sm font-medium text-slate-700 whitespace-pre-wrap break-words">{clientToView.remarks}</p>
                      </div>
                    )}
                  </div>

                  {/* CONNECTED WORKSPACES */}
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <h3 className="text-sm font-black text-slate-800 mb-1 flex items-center gap-2">
                      <ShieldCheck size={18} className="text-emerald-600"/> Connected Workspaces
                    </h3>
                    <p className="text-[11px] font-medium text-slate-500 mb-5 pb-3 border-b border-slate-100">Click a box to see the full details and work updates of that service. CFO opens the client's Business Health report.</p>

                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                      {WORKSPACES.map(ws => {
                        const linked = !!clientToView.services?.[ws.key];
                        const count = workspaceData.data?.[ws.key]?.length;
                        const clickable = linked || ws.key === 'cfo'; // CFO report kisi bhi client ke liye shuru ki ja sakti hai
                        const WsIcon = ws.icon;
                        return (
                          <button
                            key={ws.key}
                            onClick={() => handleWorkspaceClick(ws)}
                            disabled={!clickable}
                            title={linked ? `View ${ws.label} details` : ws.key === 'cfo' ? 'Start a Business Health report for this client' : 'Not linked'}
                            className={`border rounded-xl p-3 flex flex-col items-center justify-center text-center gap-2 transition-all ${linked ? `${ws.box} shadow-sm hover:scale-105 active:scale-95 cursor-pointer` : clickable ? 'bg-white border-dashed border-slate-300 hover:border-rose-300 hover:bg-rose-50/40 cursor-pointer' : 'bg-slate-50 border-slate-200 opacity-60 grayscale cursor-not-allowed'}`}
                          >
                            <div className={`h-10 w-10 rounded-full flex items-center justify-center ${linked ? ws.chip : 'bg-slate-200 text-slate-400'}`}><WsIcon size={18}/></div>
                            <span className="text-[11px] font-bold text-slate-700 leading-tight">{ws.label}</span>
                            {linked ? (
                              <span className="text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded shadow-sm flex items-center gap-1">
                                <CheckCircle2 size={10}/> {workspaceData.loading ? 'Active' : count ? `${count} ${ws.key === 'cfo' ? 'report' : 'record'}${count > 1 ? 's' : ''}` : 'Active'}
                              </span>
                            ) : ws.key === 'cfo' ? (
                              <span className="text-[9px] font-bold uppercase tracking-wider bg-rose-50 text-rose-600 px-2 py-0.5 rounded">Start Report</span>
                            ) : (
                              <span className="text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 px-2 py-0.5 rounded">Not Linked</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: ACCOUNT STATEMENT & Ledger */}
              {activeTab === 'ledger' && (
                <div className="space-y-6 animate-in fade-in">
                  
                  {/* Ledger Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Billed (Debit)</span>
                      <span className="text-xl font-black text-slate-800 flex items-center gap-1">
                        <IndianRupee size={18}/> 
                        {clientLedger.filter(l => l.debit > 0).reduce((acc, curr) => acc + curr.debit, 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100 shadow-sm flex flex-col">
                      <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1">Total Received (Credit)</span>
                      <span className="text-xl font-black text-emerald-700 flex items-center gap-1">
                        <IndianRupee size={18}/> 
                        {clientLedger.filter(l => l.credit > 0).reduce((acc, curr) => acc + curr.credit, 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="bg-rose-50 p-5 rounded-2xl border border-rose-100 shadow-sm flex flex-col">
                      <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider mb-1">Net Balance Due</span>
                      <span className="text-xl font-black text-rose-700 flex items-center gap-1">
                        <IndianRupee size={18}/> 
                        {clientLedger.length > 0 ? clientLedger[clientLedger.length - 1].balance.toLocaleString('en-IN') : 0}
                      </span>
                    </div>
                  </div>

                  {/* Ledger Table */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                      <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <BookOpen size={16} className="text-indigo-600"/> Account Ledger
                      </h3>
                      <button onClick={handleDownloadStatement} disabled={downloadingStatement} className="flex items-center gap-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg shadow-sm disabled:opacity-50 transition-colors">
                        {downloadingStatement ? <Loader2 size={14} className="animate-spin"/> : <Download size={14}/>} Download Statement (PDF)
                      </button>
                    </div>

                    {clientLedger.length === 0 ? (
                       <div className="text-center py-12 bg-slate-50/30">
                          <BookOpen size={32} className="mx-auto text-slate-300 mb-3"/>
                          <p className="text-sm font-bold text-slate-500">No transactions found for this client.</p>
                          <p className="text-xs text-slate-400 mt-1">Invoices, work tracking, and payments will appear here.</p>
                       </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-100 border-b border-slate-200 text-slate-500 text-[10px] font-black uppercase tracking-wider">
                              <th className="py-3 px-4 w-28">Date</th>
                              <th className="py-3 px-4">Particulars / Description</th>
                              <th className="py-3 px-4 text-right">Debit (Billed)</th>
                              <th className="py-3 px-4 text-right">Credit (Paid)</th>
                              <th className="py-3 px-4 text-right bg-blue-50/50">Balance</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                            {clientLedger.map((entry, index) => (
                              <tr key={entry.id} className="hover:bg-slate-50">
                                <td className="py-3 px-4 font-semibold text-slate-600 whitespace-nowrap">
                                  {entry.type === 'Opening' 
                                    ? 'Opening' 
                                    : (entry.date ? new Date(entry.date).toLocaleDateString('en-IN') : '---')
                                  }
                                </td>
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${entry.type === 'Opening' ? 'bg-amber-500' : entry.type === 'Payment' ? 'bg-emerald-500' : 'bg-blue-500'}`}></span>
                                    <span className="font-bold text-slate-800">{entry.particulars}</span>
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-right font-mono text-slate-700">
                                  {entry.debit > 0 ? entry.debit.toLocaleString('en-IN') : '-'}
                                </td>
                                <td className="py-3 px-4 text-right font-mono text-emerald-600 font-bold">
                                  {entry.credit > 0 ? entry.credit.toLocaleString('en-IN') : '-'}
                                </td>
                                <td className="py-3 px-4 text-right font-mono font-black bg-blue-50/30 text-blue-900">
                                  ₹{entry.balance.toLocaleString('en-IN')}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>
            
            <div className="flex justify-between items-center px-6 py-4 border-t border-slate-100 bg-white rounded-b-3xl shrink-0">
              <div></div>
              <div className="flex items-center gap-3">
                <button onClick={() => setIsViewModalOpen(false)} className="px-5 py-2.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors">
                  Close Window
                </button>
                <button onClick={() => { setIsViewModalOpen(false); handleEdit(clientToView); }} className="px-5 py-2.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center gap-2">
                  <Edit size={15} strokeWidth={2.5}/> Edit Details
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🔴 WORKSPACE DETAIL MODAL (ITR / GST / ROC / TDS / Audit / FSSAI ki poori detail) */}
      {workspaceDetailModal.open && clientToView && (() => {
        const ws = WORKSPACES.find(w => w.key === workspaceDetailModal.key);
        if (!ws) return null;
        const clientInvoices = allInvoices.filter(inv =>
          (clientToView.pan && inv.customer?.pan?.toUpperCase() === clientToView.pan?.toUpperCase()) ||
          (clientToView.gstin && inv.customer?.gstin?.toUpperCase() === clientToView.gstin?.toUpperCase()) ||
          (inv.customer?.name?.toLowerCase() === clientToView.name?.toLowerCase())
        );
        return (
          <ClientWorkspaceDetail
            workspace={ws}
            records={workspaceData.data?.[ws.key] || []}
            loading={workspaceData.loading}
            client={clientToView}
            invoices={clientInvoices}
            onClose={() => setWorkspaceDetailModal({ open: false, key: '' })}
            onOpenWorkspace={(w) => navigate(w.path)}
            onOpenCfoReport={openCfoReport}
          />
        );
      })()}

      {/* ADD / EDIT CLIENT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95">
            
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/80">
              <div>
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Building className="text-blue-600" size={20}/> {editingId ? 'Edit Client Details' : 'Add New Client'}
                </h2>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors"><X size={18} /></button>
            </div>

            <form onSubmit={handleSave} className="overflow-y-auto p-6 space-y-6 custom-scrollbar">
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                
                {/* PAN & Core Details */}
                <div className="md:col-span-4 bg-blue-50/40 p-5 rounded-2xl border border-blue-100">
                  <h3 className="text-xs font-bold text-blue-700 uppercase tracking-wider border-b border-blue-200/50 pb-2 mb-4 flex items-center gap-2">
                     Core Details (Master Identifiers)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-1 relative">
                      <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">PAN Number *</label>
                      <input 
                        type="text" 
                        required 
                        maxLength="10"
                        value={formData.pan} 
                        onChange={handlePanChange} 
                        disabled={editingId} 
                        placeholder="ABCDE1234F" 
                        className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-black text-slate-800 uppercase tracking-widest bg-white focus:ring-2 focus:ring-blue-500/20 outline-none disabled:bg-slate-100 disabled:text-slate-400"
                      />
                      {fetchingPan && <Loader2 size={14} className="absolute right-3 top-10 animate-spin text-blue-500"/>}
                    </div>
                    <div className="md:col-span-1">
                      <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Client Name / Entity *</label>
                      <input 
                        type="text" 
                        required 
                        value={formData.name} 
                        onChange={(e) => setFormData({...formData, name: e.target.value})} 
                        className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-semibold bg-white focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                    <div className="md:col-span-1">
                      <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Trade / Firm Name</label>
                      <input 
                        type="text" 
                        value={formData.tradeName} 
                        onChange={(e) => setFormData({...formData, tradeName: e.target.value})} 
                        className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-semibold bg-white focus:ring-2 focus:ring-blue-500/20"
                        placeholder="Optional"
                      />
                    </div>
                    <div className="md:col-span-1">
                      <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Entity Type</label>
                      <select 
                        value={formData.clientType} 
                        onChange={(e) => setFormData({...formData, clientType: e.target.value})} 
                        className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 bg-white focus:ring-2 focus:ring-blue-500/20"
                      >
                        <option value="Individual">Individual</option>
                        <option value="Proprietorship">Proprietorship</option>
                        <option value="Partnership Firm">Partnership Firm</option>
                        <option value="LLP">LLP</option>
                        <option value="Private Limited">Private Limited</option>
                        <option value="Public Limited">Public Limited</option>
                        <option value="HUF">HUF</option>
                        <option value="Trust">Trust</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                  
                  {/* Additional Common Identifiers */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-blue-100">
                    <div className="md:col-span-1">
                      <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">GSTIN (If Any)</label>
                      <input 
                        type="text" 
                        value={formData.gstin} 
                        onChange={(e) => setFormData({...formData, gstin: e.target.value.toUpperCase()})} 
                        placeholder="22AAAAA0000A1Z5" 
                        className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-mono font-bold text-indigo-700 uppercase bg-white focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                    <div className="md:col-span-1">
                      <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Aadhaar (Last 4 Digits)</label>
                      <input 
                        type="text" 
                        maxLength="12"
                        value={formData.aadhaar} 
                        onChange={(e) => setFormData({...formData, aadhaar: e.target.value})} 
                        placeholder="e.g. 1234" 
                        className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-semibold bg-white focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                    <div className="md:col-span-1">
                      <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">DOB</label>
                      <input 
                        type="date" 
                        value={formData.dob} 
                        onChange={(e) => setFormData({...formData, dob: e.target.value})} 
                        className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 bg-white focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                    <div className="md:col-span-1">
                      <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Father's Name (For ITR)</label>
                      <input 
                        type="text" 
                        value={formData.fatherName} 
                        onChange={(e) => setFormData({...formData, fatherName: e.target.value})} 
                        placeholder="Name..." 
                        className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-semibold bg-white focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                  </div>
                </div>

                {/* AUDIT & COMPLIANCE DETAILS (A0 FIELDS) */}
                <div className="md:col-span-4 mt-2 bg-amber-50/30 p-5 rounded-2xl border border-amber-100">
                  <h3 className="text-xs font-bold text-amber-700 uppercase tracking-wider border-b border-amber-200/50 pb-2 mb-4 flex items-center gap-2">
                     Audit & Compliance Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Constitution</label>
                      <select value={formData.constitution} onChange={(e) => setFormData({...formData, constitution: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500/20">
                        <option value="">-- Select --</option><option value="Private Limited Company">Private Limited Company</option><option value="Public Limited Company">Public Limited Company</option><option value="LLP">LLP</option><option value="Partnership Firm">Partnership Firm</option><option value="Proprietorship">Proprietorship</option><option value="HUF">HUF</option><option value="Trust">Trust</option><option value="Society">Society</option><option value="AOP/BOI">AOP/BOI</option><option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">CIN / LLPIN</label>
                      <input type="text" maxLength="21" value={formData.cin_llpin} onChange={(e) => setFormData({...formData, cin_llpin: e.target.value.toUpperCase()})} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-amber-500/20" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Accounting Method</label>
                      <select value={formData.accounting_method} onChange={(e) => setFormData({...formData, accounting_method: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500/20"><option value="">-- Select --</option><option value="Mercantile">Mercantile</option><option value="Cash">Cash</option></select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Date of Incorporation / Comm.</label>
                      <input type="date" value={formData.date_of_incorporation} onChange={(e) => setFormData({...formData, date_of_incorporation: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500/20" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Nature of Business</label>
                      <input type="text" maxLength="200" value={formData.nature_of_business} onChange={(e) => setFormData({...formData, nature_of_business: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500/20" placeholder="e.g. Trading of garments" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Books Kept At</label>
                      <input type="text" maxLength="200" value={formData.books_kept_at} onChange={(e) => setFormData({...formData, books_kept_at: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500/20" placeholder="Place where books are maintained" />
                    </div>
                    <div className="md:col-span-4">
                      <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Registered Office Address</label>
                      <textarea rows="2" maxLength="250" value={formData.registered_office_address} onChange={(e) => setFormData({...formData, registered_office_address: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm resize-none focus:ring-2 focus:ring-amber-500/20" placeholder="Registered Address..." />
                    </div>
                  </div>
                </div>

                {/* Contact & Location Details */}
                <div className="md:col-span-4 mt-2">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b pb-2 mb-4">Contact & Physical Location Info</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Mobile Number</label>
                      <input type="text" value={formData.mobile} onChange={(e) => setFormData({...formData, mobile: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500/20"/>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Email Address</label>
                      <input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500/20"/>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">State</label>
                      <input type="text" placeholder="e.g. Delhi" value={formData.state} onChange={(e) => setFormData({...formData, state: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500/20"/>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">PIN Code</label>
                      <input type="text" value={formData.pinCode} onChange={(e) => setFormData({...formData, pinCode: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500/20"/>
                    </div>
                    <div className="md:col-span-4">
                      <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Full Communication Address</label>
                      <textarea rows="2" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-semibold resize-none focus:ring-2 focus:ring-blue-500/20"/>
                    </div>
                  </div>
                </div>

                {/* Status, Opening Balance & Remarks */}
                <div className="md:col-span-4 mt-2">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Current Status</label>
                      <select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-500/20">
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Opening Balance (₹)</label>
                      <input 
                        type="number" 
                        placeholder="0" 
                        value={formData.openingBalance} 
                        onChange={(e) => setFormData({...formData, openingBalance: e.target.value})} 
                        className="w-full p-2.5 border border-rose-200 rounded-xl text-sm font-bold text-rose-700 bg-rose-50 focus:ring-2 focus:ring-rose-500/20"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Remarks / Notes</label>
                      <input type="text" placeholder="Any internal notes for this client" value={formData.remarks} onChange={(e) => setFormData({...formData, remarks: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500/20"/>
                    </div>
                  </div>
                </div>

              </div>

              <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">Cancel</button>
                <button type="submit" disabled={saving} className="px-8 py-2.5 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center gap-2 disabled:opacity-50">
                  {saving ? <RefreshCw size={18} className="animate-spin"/> : <CheckCircle2 size={18} />} 
                  {editingId ? 'Update Master Profile' : 'Save Client'}
                </button>
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
              <h3 className="text-xl font-bold text-slate-800 tracking-tight">Delete Client?</h3>
              <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                Are you sure you want to permanently delete <span className="font-bold text-slate-700">{deleteModal.client?.name}</span>? 
                <br/><span className="text-[10px] text-rose-500 font-bold">*Note: Linked ITR/GST data might lose client reference!</span>
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

export default ClientMaster;
