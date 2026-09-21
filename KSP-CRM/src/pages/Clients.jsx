import { useState, useEffect, useContext, useMemo, useRef } from 'react';
import axios from 'axios';
import { useLocation } from 'react-router-dom'; 
import { AuthContext } from '../context/AuthContext';
import * as XLSX from 'xlsx'; 
import ExcelJS from 'exceljs'; 
import { saveAs } from 'file-saver';
import { 
  Users, Search, Phone, AlertCircle, IndianRupee, FileText, CreditCard, 
  CheckCircle2, Wallet, Plus, X, UserCheck, Pencil, Trash2, AlertTriangle, 
  Mail, MapPin, Eye, History, UserCircle, Briefcase, Lock, ShieldUser, MessageSquare,
  Download, Upload, CalendarClock, Send 
} from 'lucide-react';

const Clients = () => {
  const { user } = useContext(AuthContext);
  const location = useLocation();

  const [clients, setClients] = useState([]);
  const [convertedLeads, setConvertedLeads] = useState([]);
  const [bas, setBas] = useState([]); 
  const [loading, setLoading] = useState(true);
  
  // FILTERS STATE
  const [searchQuery, setSearchQuery] = useState('');
  const [feeFilter, setFeeFilter] = useState('ALL');
  const [serviceFilter, setServiceFilter] = useState('ALL'); 

  const fileInputRef = useRef(null);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isRemarksModalOpen, setIsRemarksModalOpen] = useState(false); 
  const [editMode, setEditMode] = useState(false);
  
  const [currentClientId, setCurrentClientId] = useState(null);
  const [originalData, setOriginalData] = useState(null); 
  const [clientToView, setClientToView] = useState(null);
  const [clientForRemarks, setClientForRemarks] = useState(null); 
  const [selectedLeadId, setSelectedLeadId] = useState('');
  
  const [newRemark, setNewRemark] = useState('');
  const [newRemarkText, setNewRemarkText] = useState(''); 
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState(null);

  const isAdmin = user?.role === 'Admin';

  const initialForm = {
    assesseeName: '', dob: '', pan: '', district: '', state: '', pincode: '',
    email: '', mobile: '', leadSource: 'Google', referredByBA: '',      
    referenceName: '', otherSourceName: '', 
    service: '', 
    feeStatus: 'Paid', feeAmount: '', amountReceived: '', remarks: '',
    filingDate: '', nextReminderDate: '',
    // ITR SPECIFIC FIELDS
    itrFiledUpToAY: 'AY 2025-26', 
    totalIncome: '', incomeTax: '', tds: '', tcs: '', selfAdvTax: '', refund: '',
    verificationMethod: 'Pending', itrProcessedStatus: 'Pending',
    itrFiledBy: '', regime: 'New', formNo: 'ITR-1',
    // BANK DETAILS
    bankName: '', accountNo: '', ifscCode: ''
  };
  const [formData, setFormData] = useState(initialForm);

  // 🔴 FIX 1: URL BADALNE PAR PAGE UPDATE HOGA (NAVBAR CLICK FIX)
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const urlService = queryParams.get('service');
    setServiceFilter(urlService || 'ALL');
  }, [location.search]);

  // SMART FILTER LOGIC
  const getFilteredCrmRemarks = (remarksStr) => {
    if (!remarksStr) return '';
    const blocks = remarksStr.split(/(?=\n\n--------------------------------------\n|\n?📅 )/);
    const filtered = blocks.filter(block => {
      const lower = block.toLowerCase();
      return !(
        lower.includes('(itr return note)') ||
        lower.includes('workspace note:') ||
        lower.includes('imported client') ||
        lower.includes('itr workspace') ||
        lower.includes('itr profile')
      );
    });
    return filtered.join('').trim();
  };

  const fetchData = async () => {
    try {
      const headers = { Authorization: `Bearer ${user.token}` };
      const [clientsRes, leadsRes, basRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_URL}/clients`, { headers }),
        axios.get(`${import.meta.env.VITE_API_URL}/leads`, { headers }),
        axios.get(`${import.meta.env.VITE_API_URL}/bas`, { headers }).catch(() => ({ data: [] }))
      ]);
      
      setClients(clientsRes.data || []);
      const convLeads = (leadsRes.data || []).filter(l => l.status === 'Converted');
      setConvertedLeads(convLeads);
      setBas(basRes.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (clients.length > 0 && location.state?.openClientId) {
      const clientToOpen = clients.find(c => c._id === location.state.openClientId);
      if (clientToOpen) {
        setClientToView(clientToOpen);
        setIsViewModalOpen(true);
        window.history.replaceState({}, document.title);
      }
    }
  }, [clients, location.state]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      
      if (name === 'leadSource') {
        if (value !== 'BA') updated.referredByBA = ''; 
        if (value !== 'Reference') updated.referenceName = '';
        if (value !== 'Other') updated.otherSourceName = '';
      }
      
      if (name === 'service') {
        if (value !== 'ITR Filing') {
          updated.itrFiledUpToAY = '';
          updated.totalIncome = ''; updated.incomeTax = ''; updated.tds = '';
          updated.tcs = ''; updated.selfAdvTax = ''; updated.refund = '';
          updated.verificationMethod = 'Pending'; updated.itrProcessedStatus = 'Pending';
          updated.itrFiledBy = ''; updated.regime = 'New'; updated.formNo = 'ITR-1';
        }
        if (value !== 'ITR Filing' && value !== 'GST Registration') {
          updated.filingDate = '';
          updated.nextReminderDate = '';
        }
      }

      if (name === 'filingDate' && value && ['ITR Filing', 'GST Registration'].includes(updated.service)) {
        const dateObj = new Date(value);
        if (updated.service === 'ITR Filing') {
          dateObj.setFullYear(dateObj.getFullYear() + 1); 
        } else if (updated.service === 'GST Registration') {
          dateObj.setMonth(dateObj.getMonth() + 1); 
        }
        updated.nextReminderDate = dateObj.toISOString().split('T')[0];
      }

      // AUTO-CALCULATE REFUND / PAYABLE logic
      if (['incomeTax', 'tds', 'tcs', 'selfAdvTax'].includes(name)) {
        const iTax = name === 'incomeTax' ? Number(value) : Number(updated.incomeTax || 0);
        const tdsVal = name === 'tds' ? Number(value) : Number(updated.tds || 0);
        const tcsVal = name === 'tcs' ? Number(value) : Number(updated.tcs || 0);
        const advVal = name === 'selfAdvTax' ? Number(value) : Number(updated.selfAdvTax || 0);
        
        updated.refund = iTax - tdsVal - tcsVal - advVal;
      }

      return updated;
    });
  };

  const handleExportExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Clients');

    worksheet.columns = [
      { header: 'Client ID', key: 'clientId', width: 15 },
      { header: 'Assessee Name', key: 'assesseeName', width: 25 },
      { header: 'PAN', key: 'pan', width: 15 },
      { header: 'Mobile', key: 'mobile', width: 15 },
      { header: 'Email', key: 'email', width: 25 },
      { header: 'DOB', key: 'dob', width: 15 },
      { header: 'Service', key: 'service', width: 20 },
      { header: 'Bank Name', key: 'bankName', width: 20 },
      { header: 'Account No', key: 'accountNo', width: 20 },
      { header: 'IFSC Code', key: 'ifscCode', width: 15 },
      { header: 'ITR AY', key: 'itrFiledUpToAY', width: 15 },
      { header: 'Form No', key: 'formNo', width: 12 },
      { header: 'Regime', key: 'regime', width: 12 },
      { header: 'ITR Filed By', key: 'itrFiledBy', width: 18 },
      { header: 'Total Income', key: 'totalIncome', width: 15 },
      { header: 'Income Tax', key: 'incomeTax', width: 15 },
      { header: 'TDS', key: 'tds', width: 15 },
      { header: 'TCS', key: 'tcs', width: 15 },
      { header: 'Self/Adv Tax', key: 'selfAdvTax', width: 15 },
      { header: 'Payable/(Refund)', key: 'refund', width: 15 },
      { header: 'Verification', key: 'verificationMethod', width: 20 },
      { header: 'ITR Status', key: 'itrProcessedStatus', width: 20 },
      { header: 'Filing Date', key: 'filingDate', width: 15 },
      { header: 'Next Reminder', key: 'nextReminderDate', width: 15 },
      { header: 'Source', key: 'leadSource', width: 15 },
      { header: 'Fee Status', key: 'feeStatus', width: 15 },
      { header: 'Total Fee', key: 'feeAmount', width: 15 },
      { header: 'Received Amount', key: 'amountReceived', width: 18 },
      { header: 'Owner / Created By', key: 'createdBy', width: 20 },
      { header: 'Remarks', key: 'remarks', width: 40 }
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

    filteredClients.forEach(client => { 
      worksheet.addRow({
        clientId: client.clientId || '',
        assesseeName: client.assesseeName || '',
        pan: client.pan || '',
        mobile: client.mobile || '',
        email: client.email || '',
        dob: client.dob ? new Date(client.dob).toLocaleDateString('en-IN') : '',
        service: client.service || '',
        bankName: client.bankName || '',
        accountNo: client.accountNo || '',
        ifscCode: client.ifscCode || '',
        itrFiledUpToAY: client.itrFiledUpToAY || '',
        formNo: client.formNo || 'ITR-1',
        regime: client.regime || 'New',
        itrFiledBy: client.itrFiledBy || '',
        totalIncome: client.totalIncome || 0,
        incomeTax: client.incomeTax || 0,
        tds: client.tds || 0,
        tcs: client.tcs || 0,
        selfAdvTax: client.selfAdvTax || 0,
        refund: client.refund || 0,
        verificationMethod: client.verificationMethod || 'Pending',
        itrProcessedStatus: client.itrProcessedStatus || 'Pending',
        filingDate: client.filingDate ? new Date(client.filingDate).toLocaleDateString('en-IN') : '',
        nextReminderDate: client.nextReminderDate ? new Date(client.nextReminderDate).toLocaleDateString('en-IN') : '',
        leadSource: client.leadSource || '',
        feeStatus: client.feeStatus || '',
        feeAmount: client.feeAmount || 0,
        amountReceived: client.amountReceived || 0,
        createdBy: client.createdBy?.name || 'Admin',
        remarks: getFilteredCrmRemarks(client.remarks)
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `Clients_${serviceFilter}_${new Date().toISOString().split('T')[0]}.xlsx`);
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

        if (data.length === 0) return alert("Uploaded Excel file is empty!");

        const parseDate = (raw) => {
          if (!raw) return null;
          if (raw instanceof Date && !isNaN(raw.getTime())) return `${raw.getFullYear()}-${String(raw.getMonth() + 1).padStart(2, '0')}-${String(raw.getDate()).padStart(2, '0')}`;
          if (typeof raw === 'string') {
            const parts = raw.split(/[\/\-]/); 
            if (parts.length === 3) {
              let day = parts[0], month = parts[1], year = parts[2];
              if (day.length === 4) { year = parts[0]; month = parts[1]; day = parts[2]; }
              return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            } else {
              const d = new Date(raw);
              if (!isNaN(d.getTime())) return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            }
          }
          return null;
        };

        const formattedClients = data.map(row => {
          return {
            assesseeName: row['Assessee Name'] || row['Name'] || row['assesseeName'] || '',
            pan: row['PAN'] || row['pan'] || '',
            mobile: row['Mobile'] || row['mobile'] || '',
            email: row['Email'] || row['email'] || '',
            dob: parseDate(row['DOB'] || row['dob'] || row['Date of Birth']),
            service: row['Service'] || row['service'] || (serviceFilter !== 'ALL' ? serviceFilter : 'ITR Filing'),
            bankName: row['Bank Name'] || row['bankName'] || '',
            accountNo: row['Account No'] || row['accountNo'] || '',
            ifscCode: row['IFSC Code'] || row['ifscCode'] || '',
            leadSource: row['Source'] || row['leadSource'] || 'Manual Entry',
            itrFiledUpToAY: row['ITR AY'] || row['itrFiledUpToAY'] || 'AY 2025-26',
            formNo: row['Form No'] || row['formNo'] || 'ITR-1',
            regime: row['Regime'] || row['regime'] || 'New',
            itrFiledBy: row['ITR Filed By'] || row['itrFiledBy'] || '',
            totalIncome: Number(row['Total Income'] || row['totalIncome'] || 0),
            incomeTax: Number(row['Income Tax'] || row['incomeTax'] || 0),
            tds: Number(row['TDS'] || row['tds'] || 0),
            tcs: Number(row['TCS'] || row['tcs'] || 0),
            selfAdvTax: Number(row['Self/Adv Tax'] || row['selfAdvTax'] || 0),
            refund: Number(row['Payable/(Refund)'] || row['refund'] || 0),
            verificationMethod: row['Verification'] || row['verificationMethod'] || 'Pending',
            itrProcessedStatus: row['ITR Status'] || row['itrProcessedStatus'] || 'Pending',
            filingDate: parseDate(row['Filing Date'] || row['filingDate']),
            nextReminderDate: parseDate(row['Next Reminder'] || row['nextReminderDate']),
            feeStatus: row['Fee Status'] || row['feeStatus'] || 'Dues',
            feeAmount: Number(row['Total Fee'] || row['feeAmount'] || 0),
            amountReceived: Number(row['Received Amount'] || row['amountReceived'] || 0),
            remarks: row['Remarks'] || row['remarks'] || ''
          };
        }).filter(item => item.assesseeName && (item.mobile || item.pan)); 

        if (formattedClients.length === 0) return alert("No valid rows found. Ensure 'Assessee Name' and 'PAN' or 'Mobile' columns exist.");

        const headers = { Authorization: `Bearer ${user.token}` };
        const response = await axios.post(`${import.meta.env.VITE_API_URL}/clients/import`, { clients: formattedClients }, { headers });
        
        alert(`Successfully imported ${response.data.count} clients!`);
        fetchData();
      } catch (error) {
        console.error("Import Error:", error);
        alert("Error importing clients: " + (error.response?.data?.message || error.message));
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = ""; 
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleLeadSelect = (e) => {
    const leadId = e.target.value;
    setSelectedLeadId(leadId);
    if (!leadId) {
      setFormData({ ...initialForm, service: serviceFilter === 'ALL' ? '' : serviceFilter });
      return;
    }

    const lead = convertedLeads.find(l => l._id === leadId);
    if (lead) {
      const extractedService = Array.isArray(lead.queryService) ? lead.queryService[0] : (lead.queryService || (serviceFilter !== 'ALL' ? serviceFilter : ''));
      setFormData({
        ...initialForm,
        assesseeName: lead.name || '',
        mobile: lead.mobile || '',
        email: lead.email || '',
        service: extractedService,
        leadSource: lead.source || 'Google',
        referredByBA: lead.referredByBA ? (lead.referredByBA._id || lead.referredByBA) : '',
        referenceName: lead.referenceName || '',
        otherSourceName: lead.otherSourceName || '',
        remarks: lead.remarks || ''
      });
    }
  };

  const handleOpenAdd = () => {
    setEditMode(false);
    setCurrentClientId(null);
    setOriginalData(null);
    setFormData({ ...initialForm, service: serviceFilter === 'ALL' ? '' : serviceFilter });
    setSelectedLeadId('');
    setNewRemark('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (client) => {
    setEditMode(true);
    setCurrentClientId(client._id);
    setOriginalData(client);

    setFormData({
      assesseeName: client.assesseeName || '',
      dob: client.dob ? new Date(client.dob).toISOString().split('T')[0] : '',
      pan: client.pan || '',
      district: client.district || '',
      state: client.state || '',
      pincode: client.pincode || client.pinCode || '',
      email: client.email || '',
      mobile: client.mobile || '',
      service: client.service || '',
      leadSource: client.leadSource || 'Google',
      referredByBA: client.referredByBA ? (client.referredByBA._id || client.referredByBA) : '',
      referenceName: client.referenceName || '',
      otherSourceName: client.otherSourceName || '',
      itrFiledUpToAY: client.itrFiledUpToAY || 'AY 2025-26',
      totalIncome: client.totalIncome || '',
      incomeTax: client.incomeTax || '',
      tds: client.tds || '',
      tcs: client.tcs || '',
      selfAdvTax: client.selfAdvTax || '',
      refund: client.refund || '',
      verificationMethod: client.verificationMethod || 'Pending',
      itrProcessedStatus: client.itrProcessedStatus || 'Pending',
      itrFiledBy: client.itrFiledBy || '',
      regime: client.regime || 'New',
      formNo: client.formNo || 'ITR-1',
      bankName: client.bankName || '',
      accountNo: client.accountNo || '',
      ifscCode: client.ifscCode || '',
      filingDate: client.filingDate ? new Date(client.filingDate).toISOString().split('T')[0] : '',
      nextReminderDate: client.nextReminderDate ? new Date(client.nextReminderDate).toISOString().split('T')[0] : '',
      feeStatus: client.feeStatus || 'Paid',
      feeAmount: client.feeAmount || '',
      amountReceived: client.amountReceived || '',
      remarks: client.remarks || '' 
    });
    setNewRemark('');
    setIsModalOpen(true);
  };

  const handleOpenView = (client) => {
    setClientToView(client);
    setIsViewModalOpen(true);
  };

  const handleOpenRemarks = (client) => {
    setClientForRemarks(client);
    setNewRemarkText('');
    setIsRemarksModalOpen(true);
  };

  const handleAddRemarkSubmit = async (e) => {
    e.preventDefault();
    if (!newRemarkText.trim() || !clientForRemarks) return;

    try {
      const headers = { Authorization: `Bearer ${user.token}` };
      const dateStamp = new Date().toLocaleString('en-IN', { 
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit' 
      });
      const authorInfo = user?.name ? `${user.name} ${user.empId ? `(${user.empId})` : ''}` : 'User';

      const entry = `\n\n--------------------------------------\n📅 ${dateStamp} | 👤 ${authorInfo}\n💬 ${newRemarkText.trim()}`;
      const updatedRemarks = (clientForRemarks.remarks || '') + entry;

      await axios.put(`${import.meta.env.VITE_API_URL}/clients/${clientForRemarks._id}`, { remarks: updatedRemarks }, { headers });
      
      setClientForRemarks(prev => ({ ...prev, remarks: updatedRemarks }));
      setClients(prev => prev.map(c => c._id === clientForRemarks._id ? { ...c, remarks: updatedRemarks } : c));
      setNewRemarkText('');
      alert("Remark added successfully!");
      fetchData();
    } catch (error) {
      alert("Failed to add remark");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const headers = { Authorization: `Bearer ${user.token}` };
      const dateStamp = new Date().toLocaleString('en-IN', { 
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit' 
      });
      const authorInfo = user?.name ? `${user.name} ${user.empId ? `(${user.empId})` : ''}` : 'Unknown User';

      let finalRemarks = formData.remarks || '';

      if (editMode && originalData) {
        let changes = [];
        if (originalData.feeStatus !== formData.feeStatus) changes.push(`Fee Status changed: [${originalData.feeStatus || 'N/A'}] ➔ [${formData.feeStatus}]`);
        if (Number(originalData.feeAmount || 0) !== Number(formData.feeAmount || 0)) changes.push(`Total Fee changed: [₹${originalData.feeAmount || 0}] ➔ [₹${formData.feeAmount || 0}]`);
        if (Number(originalData.amountReceived || 0) !== Number(formData.amountReceived || 0)) changes.push(`Amount Received changed: [₹${originalData.amountReceived || 0}] ➔ [₹${formData.amountReceived || 0}]`);
        
        if (originalData.itrProcessedStatus !== formData.itrProcessedStatus) changes.push(`ITR Status changed to [${formData.itrProcessedStatus}]`);
        
        let oldRem = originalData.nextReminderDate ? new Date(originalData.nextReminderDate).toISOString().split('T')[0] : 'None';
        let newRem = formData.nextReminderDate || 'None';
        if (oldRem !== newRem && ['ITR Filing', 'GST Registration'].includes(formData.service)) {
          changes.push(`Next Reminder updated: ${newRem}`);
        }

        if (changes.length > 0 || newRemark.trim()) {
          let auditBlock = `\n\n--------------------------------------\n📅 ${dateStamp} | 👤 ${authorInfo}`;
          if (changes.length > 0) auditBlock += `\n🔄 Updates:\n - ${changes.join('\n - ')}`;
          if (newRemark.trim()) auditBlock += `\n💬 Note: ${newRemark.trim()}`;
          finalRemarks += auditBlock;
        }
      } else {
        let createBlock = `📅 ${dateStamp} | 👤 ${authorInfo}\n✨ Client Profile Created${selectedLeadId ? ' (Converted from Lead)' : ''}.`;
        if (formData.remarks.trim()) createBlock += `\n💬 Initial Note: ${formData.remarks.trim()}`;
        finalRemarks = createBlock;
      }

      const payload = { 
        ...formData, 
        remarks: finalRemarks,
        itrFiledUpToAY: formData.service === 'ITR Filing' ? formData.itrFiledUpToAY : null,
        filingDate: ['ITR Filing', 'GST Registration'].includes(formData.service) && formData.filingDate ? formData.filingDate : null,
        nextReminderDate: ['ITR Filing', 'GST Registration'].includes(formData.service) && formData.nextReminderDate ? formData.nextReminderDate : null,
        referredByBA: formData.leadSource === 'BA' ? formData.referredByBA : null,
        referenceName: formData.leadSource === 'Reference' ? formData.referenceName : '',
        otherSourceName: formData.leadSource === 'Other' ? formData.otherSourceName : ''
      };
      
      if (editMode) {
        await axios.put(`${import.meta.env.VITE_API_URL}/clients/${currentClientId}`, payload, { headers });
      } else if (selectedLeadId) {
        await axios.post(`${import.meta.env.VITE_API_URL}/clients/convert/${selectedLeadId}`, payload, { headers });
      } else {
        await axios.post(`${import.meta.env.VITE_API_URL}/clients`, payload, { headers });
      }
      
      setIsModalOpen(false);
      setFormData(initialForm);
      setSelectedLeadId('');
      setNewRemark('');
      fetchData();
    } catch (error) {
      alert("Error saving client: " + (error.response?.data?.message || error.message));
    }
  };

  const confirmDelete = (client) => {
    setClientToDelete(client);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!clientToDelete) return;
    try {
      const headers = { Authorization: `Bearer ${user.token}` };
      await axios.delete(`${import.meta.env.VITE_API_URL}/clients/${clientToDelete._id}`, { headers });
      setIsDeleteModalOpen(false);
      setClientToDelete(null);
      fetchData();
    } catch (error) {
      alert("Error deleting client: " + (error.response?.data?.message || error.message));
    }
  };

  const filteredClients = useMemo(() => {
    const filtered = clients.filter((client) => {
      const matchesSearch = 
        client.assesseeName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.pan?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.clientId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.mobile?.toString().includes(searchQuery);
        
      const matchesFee = feeFilter === 'ALL' || client.feeStatus === feeFilter;
      const matchesService = serviceFilter === 'ALL' || client.service === serviceFilter; 
      
      return matchesSearch && matchesFee && matchesService;
    });

    return filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [clients, searchQuery, feeFilter, serviceFilter]);

  const stats = useMemo(() => {
    const totalBalance = filteredClients.reduce((sum, c) => {
      const due = Number(c.feeAmount || 0) - Number(c.amountReceived || 0);
      return sum + (due > 0 ? due : 0);
    }, 0);
    
    const pendingCount = filteredClients.filter(c => c.feeStatus === 'Dues').length;
    
    return {
      total: filteredClients.length,
      pendingCount,
      totalBalance,
      paidCount: filteredClients.filter(c => c.feeStatus === 'Paid').length
    };
  }, [filteredClients]);

  const getFeeBadge = (status) => {
    switch (status) {
      case 'Paid': return 'bg-emerald-50 text-emerald-700 border-emerald-200/60 ring-emerald-500/10';
      case 'FOC': return 'bg-violet-50 text-violet-700 border-violet-200/60 ring-violet-500/10';
      case 'Dues': return 'bg-rose-50 text-rose-700 border-rose-200/60 ring-rose-500/10';
      default: return 'bg-slate-100 text-slate-700 border-slate-200/60 ring-slate-500/10';
    }
  };

  const sourceNeedsExtraField = ['BA', 'Reference', 'Other'].includes(formData.leadSource);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* Financial Metric Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-[0_2px_4px_rgba(0,0,0,0.02)]">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Clients</p>
          <div className="flex items-center justify-between mt-2">
            <span className="text-2xl font-bold text-slate-800">{stats.total}</span>
            <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold"><Users size={16} /></div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-[0_2px_4px_rgba(0,0,0,0.02)]">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Fully Paid</p>
          <div className="flex items-center justify-between mt-2">
            <span className="text-2xl font-bold text-emerald-600">{stats.paidCount}</span>
            <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold"><CheckCircle2 size={16} /></div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-[0_2px_4px_rgba(0,0,0,0.02)]">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Pending Fees</p>
          <div className="flex items-center justify-between mt-2">
            <span className="text-2xl font-bold text-amber-600">{stats.pendingCount}</span>
            <div className="h-8 w-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold"><CreditCard size={16} /></div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-[0_2px_4px_rgba(0,0,0,0.02)] border-l-4 border-l-rose-500">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Outstanding</p>
          <div className="flex items-center justify-between mt-2">
            <span className="text-2xl font-bold text-rose-600 flex items-center"><IndianRupee size={20} strokeWidth={2.5} className="mr-0.5" />{stats.totalBalance.toLocaleString('en-IN')}</span>
            <div className="h-8 w-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold"><Wallet size={16} /></div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold text-slate-800 tracking-tight">
              {serviceFilter === 'ALL' ? 'All Existing Clients' : `Clients: ${serviceFilter}`}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">Manage tax filings, PAN details, and fee dues</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input type="text" placeholder="Search by Name, PAN, ID..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
            </div>

            <div className="relative">
              <select value={feeFilter} onChange={(e) => setFeeFilter(e.target.value)} className="text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none cursor-pointer">
                <option value="ALL">All Fee Status</option>
                <option value="Paid">Paid Fully</option>
                <option value="Dues">Payment Dues / Pending</option>
                <option value="FOC">Free of Cost (FOC)</option>
              </select>
            </div>

            <div className="flex items-center gap-2 border-l border-slate-200 pl-3 ml-1">
              <button onClick={handleExportExcel} className="inline-flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold px-3 py-2 rounded-lg transition-colors" title="Download Excel">
                <Download size={14} /> Export
              </button>
              <button onClick={() => fileInputRef.current.click()} className="inline-flex items-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold px-3 py-2 rounded-lg transition-colors" title="Upload Excel">
                <Upload size={14} /> Import
              </button>
              <input type="file" accept=".xlsx, .xls, .csv" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
            </div>
            <button onClick={handleOpenAdd} className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-sm transition-all ml-2">
              <Plus size={16} strokeWidth={2.5} />
              <span>Add Client</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                <th className="py-3.5 px-6">Client ID</th>
                <th className="py-3.5 px-6">Name & Contact</th>
                <th className="py-3.5 px-6">PAN</th>
                
                {serviceFilter === 'ITR Filing' && <th className="py-3.5 px-6">ITR AY</th>}
                {serviceFilter !== 'ITR Filing' && <th className="py-3.5 px-6">Service</th>}
                
                {['ITR Filing', 'GST Registration'].includes(serviceFilter) && (
                  <>
                    <th className="py-3.5 px-6">Filing Date</th>
                    <th className="py-3.5 px-6">Next Reminder</th>
                  </>
                )}
                
                <th className="py-3.5 px-6">Fee Status</th>
                <th className="py-3.5 px-6 text-right">Balance Due</th>
                <th className="py-3.5 px-6">Owner / Added By</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm font-normal text-slate-700">
              {loading ? (
                <tr><td colSpan="10" className="text-center py-16 text-slate-400">Loading client database...</td></tr>
              ) : filteredClients.length === 0 ? (
                <tr><td colSpan="10" className="text-center py-16 text-slate-400">No clients found.</td></tr>
              ) : (
                filteredClients.map((client) => {
                  const balance = Number(client.feeAmount || 0) - Number(client.amountReceived || 0);
                  return (
                    <tr key={client._id} className="hover:bg-slate-50/70 transition-colors group">
                      <td className="py-4 px-6 font-semibold text-blue-600 text-xs">{client.clientId || '—'}</td>
                      
                      <td className="py-4 px-6">
                        <div className="font-bold text-slate-800">{client.assesseeName}</div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-1">
                          <Phone size={11} className="text-slate-400" /> {client.mobile}
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        <div className="font-mono text-xs font-semibold text-slate-700 uppercase">{client.pan || 'NO PAN'}</div>
                      </td>

                      {serviceFilter === 'ITR Filing' && (
                        <td className="py-4 px-6 text-xs font-medium text-slate-600">
                          {client.itrFiledUpToAY || 'N/A'}
                        </td>
                      )}
                      
                      {serviceFilter !== 'ITR Filing' && (
                        <td className="py-4 px-6">
                          <span className="text-indigo-600 font-semibold text-[11px] bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100">
                            {client.service || 'N/A'}
                          </span>
                        </td>
                      )}

                      {['ITR Filing', 'GST Registration'].includes(serviceFilter) && (
                        <>
                          <td className="py-4 px-6 text-xs font-medium text-slate-600">
                            {client.filingDate ? new Date(client.filingDate).toLocaleDateString('en-IN') : 'N/A'}
                          </td>
                          <td className="py-4 px-6 text-xs font-bold text-amber-600">
                            {client.nextReminderDate ? new Date(client.nextReminderDate).toLocaleDateString('en-IN') : 'Not Set'}
                          </td>
                        </>
                      )}

                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${getFeeBadge(client.feeStatus)}`}>
                          {client.feeStatus}
                        </span>
                      </td>
                      
                      <td className="py-4 px-6 text-right font-bold text-rose-600">
                        <span className="flex items-center justify-end"><IndianRupee size={12} className="mr-0.5" />{balance.toLocaleString('en-IN')}</span>
                      </td>

                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 text-[10px] font-bold">
                            {client.createdBy?.name ? client.createdBy.name.charAt(0).toUpperCase() : 'A'}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-slate-700">
                              {client.createdBy?.name || 'System / Admin'}
                            </span>
                            {client.createdBy?.empId && (
                              <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">
                                {client.createdBy.empId}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => handleOpenView(client)} 
                            className="px-3 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors flex items-center gap-1.5 shadow-sm"
                            title="View Profile"
                          >
                            <Eye size={14} />
                          </button>
                          <button 
                            onClick={() => handleOpenRemarks(client)} 
                            className="px-3 py-1.5 text-xs font-bold text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-xl transition-colors flex items-center gap-1.5 shadow-sm"
                            title="Remarks"
                          >
                            <MessageSquare size={14} />
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

      {/* VIEW CLIENT MODAL */}
      {isViewModalOpen && clientToView && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center px-8 py-5 border-b border-slate-100 bg-slate-50/80">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                  <UserCircle size={28} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800 tracking-tight">{clientToView.assesseeName}</h2>
                  <p className="text-xs font-semibold text-blue-600 tracking-wider uppercase mt-0.5">{clientToView.clientId}</p>
                </div>
              </div>
              <button onClick={() => setIsViewModalOpen(false)} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors"><X size={20} /></button>
            </div>

            <div className="overflow-y-auto p-8 space-y-6 custom-scrollbar">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-5 bg-slate-50 p-5 rounded-2xl border border-slate-100">
                <div className="col-span-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Contact Details</p>
                  <div className="text-sm font-semibold text-slate-800 flex items-center gap-2 mb-1.5"><Phone size={14} className="text-slate-400"/> {clientToView.mobile}</div>
                  {clientToView.email && <div className="text-sm font-semibold text-slate-800 flex items-center gap-2"><Mail size={14} className="text-slate-400"/> {clientToView.email}</div>}
                </div>
                <div className="col-span-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">PAN & Location</p>
                  <div className="font-mono text-sm font-bold text-slate-800 uppercase mb-1.5">{clientToView.pan || 'N/A'}</div>
                  <div className="text-sm font-semibold text-slate-600 flex items-center gap-2">
                    <MapPin size={14} className="text-slate-400"/> 
                    {clientToView.district || clientToView.state ? `${clientToView.district}, ${clientToView.state}` : 'N/A'}
                  </div>
                </div>

                <div className="col-span-4 h-px bg-slate-200 my-1"></div>

                {/* VIEW MODAL: BANK DETAILS */}
                <div className="col-span-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-blue-600 flex items-center gap-1.5">
                    <CreditCard size={14} /> Bank Account Details
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400 uppercase font-bold block text-[9px]">Bank Name</span>
                      <span className="font-semibold text-slate-800">{clientToView.bankName || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 uppercase font-bold block text-[9px]">Account Number</span>
                      <span className="font-mono font-semibold text-slate-800">{clientToView.accountNo || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 uppercase font-bold block text-[9px]">IFSC Code</span>
                      <span className="font-mono font-semibold text-slate-800 uppercase">{clientToView.ifscCode || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                <div className="col-span-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Service Details</p>
                  <span className="text-sm font-bold text-slate-800 bg-white border px-2.5 py-1 rounded-lg shadow-sm flex items-center gap-2 w-max">
                    <Briefcase size={14} className="text-indigo-600"/> 
                    {clientToView.service || 'N/A'}
                    {clientToView.service === 'ITR Filing' && clientToView.itrFiledUpToAY && (
                      <span className="ml-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                        {clientToView.itrFiledUpToAY}
                      </span>
                    )}
                  </span>
                </div>
                
                {['ITR Filing', 'GST Registration'].includes(clientToView.service) && (
                  <div className="col-span-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Important Dates</p>
                    <div className="text-xs font-semibold text-slate-700 flex flex-col gap-1">
                      <span className="flex items-center gap-2"><CalendarClock size={12} className="text-slate-400"/> Filed On: {clientToView.filingDate ? new Date(clientToView.filingDate).toLocaleDateString('en-IN') : 'N/A'}</span>
                      <span className="flex items-center gap-2 text-amber-600"><CalendarClock size={12} className="text-amber-500"/> Next Reminder: {clientToView.nextReminderDate ? new Date(clientToView.nextReminderDate).toLocaleDateString('en-IN') : 'Not Set'}</span>
                    </div>
                  </div>
                )}

                {/* VIEW MODAL: ITR SPECIFIC TAX DETAILS */}
                {clientToView.service === 'ITR Filing' && (
                  <div className="col-span-4 bg-indigo-50 rounded-2xl p-4 border border-indigo-100 mt-2 space-y-3">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 flex items-center gap-1.5">
                      <FileText size={14} /> ITR Assessment & Tax Details
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 bg-white p-3 rounded-xl border border-indigo-100 text-xs">
                      <div>
                        <span className="text-slate-400 uppercase font-bold block text-[9px]">Form No</span>
                        <span className="font-bold text-slate-800">{clientToView.formNo || 'ITR-1'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 uppercase font-bold block text-[9px]">Tax Regime</span>
                        <span className="font-bold text-slate-800">{clientToView.regime || 'New'} Regime</span>
                      </div>
                      <div>
                        <span className="text-slate-400 uppercase font-bold block text-[9px]">ITR Filed By</span>
                        <span className="font-bold text-slate-800">{clientToView.itrFiledBy || 'N/A'}</span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-[10px] uppercase text-slate-500 font-bold mb-1">Total Income</p>
                        <p className="text-sm font-semibold text-slate-800">₹{clientToView.totalIncome || 0}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase text-slate-500 font-bold mb-1">Income Tax</p>
                        <p className="text-sm font-semibold text-slate-800">₹{clientToView.incomeTax || 0}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase text-slate-500 font-bold mb-1">TDS</p>
                        <p className="text-sm font-semibold text-slate-800">₹{clientToView.tds || 0}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase text-slate-500 font-bold mb-1">TCS</p>
                        <p className="text-sm font-semibold text-slate-800">₹{clientToView.tcs || 0}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase text-slate-500 font-bold mb-1">Self / Adv Tax</p>
                        <p className="text-sm font-semibold text-slate-800">₹{clientToView.selfAdvTax || 0}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase text-indigo-500 font-bold mb-1">Payable / (Refund)</p>
                        <p className={`text-sm font-bold ${Number(clientToView.refund) < 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          ₹{clientToView.refund || 0} {Number(clientToView.refund) < 0 ? '(Refund)' : ''}
                        </p>
                      </div>

                      <div className="col-span-2 md:col-span-3 h-px bg-indigo-200/50 my-1"></div>
                      
                      <div className="col-span-1 md:col-span-1">
                        <p className="text-[10px] uppercase text-slate-500 font-bold mb-1">Verification Method</p>
                        <p className="text-sm font-semibold text-slate-800">{clientToView.verificationMethod || 'Pending'}</p>
                      </div>
                      <div className="col-span-1 md:col-span-2">
                        <p className="text-[10px] uppercase text-slate-500 font-bold mb-1">ITR Status</p>
                        <p className="text-sm font-semibold text-slate-800">{clientToView.itrProcessedStatus || 'Pending'}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="col-span-2 mt-1">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Fee Status</p>
                  <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-bold border shadow-sm ${getFeeBadge(clientToView.feeStatus)}`}>{clientToView.feeStatus}</span>
                </div>

                <div className="col-span-2 mt-1">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Managed / Created By</p>
                  <span className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <ShieldUser size={15} className="text-blue-500"/>
                    {clientToView.createdBy?.name || 'System / Admin'}
                  </span>
                </div>

                <div className="col-span-4 flex gap-6 mt-2 bg-white p-3 border rounded-xl shadow-sm">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Total Fee</p>
                    <span className="text-sm font-bold text-slate-800 flex items-center"><IndianRupee size={12}/> {clientToView.feeAmount || 0}</span>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Received</p>
                    <span className="text-sm font-bold text-emerald-600 flex items-center"><IndianRupee size={12}/> {clientToView.amountReceived || 0}</span>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Balance Due</p>
                    <span className="text-sm font-bold text-rose-600 flex items-center"><IndianRupee size={12}/> {(clientToView.feeAmount || 0) - (clientToView.amountReceived || 0)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center p-5 border-t border-slate-100 bg-white rounded-b-3xl">
              {isAdmin ? (
                <button 
                  onClick={() => {
                    setIsViewModalOpen(false);
                    confirmDelete(clientToView);
                  }} 
                  className="px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors border border-rose-200 flex items-center gap-1.5"
                >
                  <Trash2 size={15} /> Delete Client
                </button>
              ) : <div></div>}

              <div className="flex items-center gap-2">
                <button onClick={() => setIsViewModalOpen(false)} className="px-5 py-2.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors">
                  Close
                </button>
                <button 
                  onClick={() => { 
                    setIsViewModalOpen(false); 
                    handleOpenEdit(clientToView); 
                  }} 
                  className="px-5 py-2.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5"
                >
                  <Pencil size={15} /> Edit Details
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DEDICATED REMARKS & TIMELINE MODAL */}
      {isRemarksModalOpen && clientForRemarks && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl border border-slate-100 flex flex-col max-h-[85vh] overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/80">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  <MessageSquare size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-800 tracking-tight">Client Remarks & Audit History</h2>
                  <p className="text-xs text-slate-500">{clientForRemarks.assesseeName} • <span className="font-mono font-semibold text-blue-600">{clientForRemarks.clientId}</span></p>
                </div>
              </div>
              <button onClick={() => setIsRemarksModalOpen(false)} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors"><X size={18} /></button>
            </div>
            
            <div className="overflow-y-auto p-6 space-y-4 custom-scrollbar">
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 text-xs text-slate-700 font-medium whitespace-pre-wrap min-h-[140px] max-h-[220px] overflow-y-auto shadow-inner leading-relaxed custom-scrollbar">
                {clientForRemarks.remarks && getFilteredCrmRemarks(clientForRemarks.remarks) 
                  ? getFilteredCrmRemarks(clientForRemarks.remarks) 
                  : <span className="text-slate-400 italic">No CRM remarks or audit history recorded for this client yet.</span>}
              </div>

              <form onSubmit={handleAddRemarkSubmit} className="space-y-3 pt-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">Add New Progress / Work Note</label>
                <div className="relative">
                  <textarea 
                    rows="3" 
                    value={newRemarkText} 
                    onChange={(e) => setNewRemarkText(e.target.value)} 
                    placeholder="Enter new remark, document pending update, etc..." 
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

            <div className="flex justify-between items-center px-6 py-4 border-t border-slate-100 bg-white rounded-b-3xl">
              <span className="text-xs text-slate-400 font-medium">PAN: {clientForRemarks.pan || 'N/A'}</span>
              <button onClick={() => setIsRemarksModalOpen(false)} className="px-5 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT CLIENT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center px-8 py-5 border-b border-slate-100 bg-slate-50/80">
              <div>
                <h2 className="text-lg font-bold text-slate-800 tracking-tight">{editMode ? 'Edit Client Record' : 'Add / Convert Client'}</h2>
                <p className="text-xs text-slate-500 mt-0.5">Manage comprehensive assessee information & financial status</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors"><X size={20} /></button>
            </div>

            <form onSubmit={handleSubmit} className="overflow-y-auto p-8 space-y-6 custom-scrollbar">
              
              {editMode && !isAdmin && (
                 <div className="md:col-span-2 flex items-center gap-2 bg-amber-50 text-amber-700 p-3 rounded-xl border border-amber-200 text-xs font-semibold mb-2">
                    <Lock size={16} className="shrink-0" />
                    Core details are locked for employees. You can only update Fee Details and add Notes. Updates are automatically tracked.
                 </div>
              )}

              {!editMode && convertedLeads.length > 0 && (
                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100 p-4 rounded-2xl shadow-sm">
                  <label className="block text-xs font-bold uppercase tracking-wider text-purple-700 mb-1.5 flex items-center gap-2">
                    <UserCheck size={15} /> Quick Import from Converted Leads
                  </label>
                  <select value={selectedLeadId} onChange={handleLeadSelect} className="w-full text-sm border border-purple-200 bg-white rounded-xl p-3 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500/20">
                    <option value="">-- Select Converted Lead (Optional) --</option>
                    {convertedLeads.map(lead => {
                      const srv = Array.isArray(lead.queryService) ? lead.queryService.join(', ') : lead.queryService || 'No Service';
                      return (
                        <option key={lead._id} value={lead._id}>{lead.name} ({lead.mobile}) — Service: {srv}</option>
                      )
                    })}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Service / Category <span className="text-rose-500">*</span></label>
                  <select name="service" required value={formData.service} onChange={handleChange} 
                    disabled={editMode && !isAdmin} 
                    className={`w-full text-sm border border-slate-200 rounded-xl p-3 transition-all ${editMode && !isAdmin ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold text-blue-700'}`} 
                  >
                    <option value="">-- Select Service --</option>
                    <option value="ITR Filing">ITR Filing</option>
                    <option value="GST Registration">GST Registration</option>
                    <option value="Company Registration">Company Registration</option>
                    <option value="Trademark Registration">Trademark Registration</option>
                    <option value="Accounting">Accounting & Audit</option>
                  </select>
                </div>

                {['ITR Filing', 'GST Registration'].includes(formData.service) && (
                  <>
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                      <label className="block text-xs font-bold uppercase tracking-wider text-blue-700 mb-1.5">
                        {formData.service === 'ITR Filing' ? 'Date of ITR Filing' : 'Date of GST Return/Filing'}
                      </label>
                      <input type="date" name="filingDate" value={formData.filingDate} onChange={handleChange} 
                        disabled={editMode && !isAdmin}
                        className={`w-full text-sm border border-blue-200 bg-white rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500/20 font-medium text-slate-700 ${editMode && !isAdmin ? 'cursor-not-allowed opacity-70' : ''}`} 
                      />
                    </div>

                    <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                      <label className="block text-xs font-bold uppercase tracking-wider text-amber-700 mb-1.5">
                        {formData.service === 'ITR Filing' ? 'Next ITR Reminder' : 'Next GST Reminder'}
                      </label>
                      <input type="date" name="nextReminderDate" value={formData.nextReminderDate} onChange={handleChange} 
                        disabled={editMode && !isAdmin}
                        className={`w-full text-sm border border-amber-200 bg-white rounded-lg p-2.5 focus:ring-2 focus:ring-amber-500/20 font-medium text-slate-700 ${editMode && !isAdmin ? 'cursor-not-allowed opacity-70' : ''}`} 
                      />
                    </div>
                  </>
                )}
                
                {/* ITR SPECIFIC NEW BLOCK */}
                {formData.service === 'ITR Filing' && (
                  <div className="md:col-span-2 bg-indigo-50/50 border border-indigo-100 rounded-2xl p-5 mt-1 space-y-4 shadow-sm">
                    <div className="flex items-center gap-2 border-b border-indigo-100 pb-2 mb-2">
                      <FileText size={18} className="text-indigo-600" />
                      <h3 className="text-sm font-bold text-indigo-900 tracking-tight">ITR Assessment & Status Details</h3>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="md:col-span-1">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">ITR Filed Up To AY</label>
                        <select name="itrFiledUpToAY" value={formData.itrFiledUpToAY} onChange={handleChange} disabled={editMode && !isAdmin} className={`w-full text-sm border border-indigo-200 bg-white rounded-xl p-2.5 font-medium transition-all focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500`}>
                          <option value="AY 2025-26">AY 2025-26</option>
                          <option value="AY 2024-25">AY 2024-25</option>
                          <option value="AY 2023-24">AY 2023-24</option>
                          <option value="AY 2022-23">AY 2022-23</option>
                        </select>
                      </div>

                      <div className="md:col-span-1">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">Form No</label>
                        <select name="formNo" value={formData.formNo} onChange={handleChange} disabled={editMode && !isAdmin} className="w-full text-sm border border-indigo-200 bg-white rounded-xl p-2.5 font-semibold text-indigo-900">
                          <option value="ITR-1">ITR-1</option>
                          <option value="ITR-2">ITR-2</option>
                          <option value="ITR-3">ITR-3</option>
                          <option value="ITR-4">ITR-4</option>
                          <option value="ITR-5">ITR-5</option>
                          <option value="ITR-6">ITR-6</option>
                          <option value="ITR-7">ITR-7</option>
                        </select>
                      </div>

                      <div className="md:col-span-1">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">Regime</label>
                        <select name="regime" value={formData.regime} onChange={handleChange} disabled={editMode && !isAdmin} className="w-full text-sm border border-indigo-200 bg-white rounded-xl p-2.5 font-semibold">
                          <option value="New">New Regime</option>
                          <option value="Old">Old Regime</option>
                        </select>
                      </div>

                      <div className="md:col-span-1">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">ITR Filed By</label>
                        <input type="text" name="itrFiledBy" value={formData.itrFiledBy} onChange={handleChange} disabled={editMode && !isAdmin} className="w-full text-sm border border-indigo-200 rounded-xl p-2.5 bg-white font-medium" placeholder="Staff / Name" />
                      </div>
                      
                      <div className="md:col-span-1">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">Verification Method</label>
                        <select name="verificationMethod" value={formData.verificationMethod} onChange={handleChange} disabled={editMode && !isAdmin} className="w-full text-sm border border-indigo-200 bg-white rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500/20 text-slate-700">
                           <option value="Pending">Pending / Not Verified</option>
                           <option value="Aadhaar OTP">Aadhaar OTP</option>
                           <option value="Net Banking / EVC">Net Banking / EVC</option>
                           <option value="Sent to CPC (Physical)">Sent to CPC (Physical)</option>
                        </select>
                      </div>
                      
                      <div className="md:col-span-1">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">ITR Processed Status</label>
                        <select name="itrProcessedStatus" value={formData.itrProcessedStatus} onChange={handleChange} disabled={editMode && !isAdmin} className="w-full text-sm border border-indigo-200 bg-white rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500/20 text-slate-700 font-semibold">
                           <option value="Pending">Pending / Just Filed</option>
                           <option value="Successfully E-verified">Successfully E-verified</option>
                           <option value="Processing">Processing</option>
                           <option value="Processed">Processed</option>
                           <option value="Processed with Refund">Processed with Refund</option>
                           <option value="Defective">Defective</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1.5">Total Income (₹)</label>
                        <input type="number" name="totalIncome" value={formData.totalIncome} onChange={handleChange} disabled={editMode && !isAdmin} className="w-full text-sm border border-indigo-200 rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500/20 bg-white" placeholder="0" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1.5">Income Tax (₹)</label>
                        <input type="number" name="incomeTax" value={formData.incomeTax} onChange={handleChange} disabled={editMode && !isAdmin} className="w-full text-sm border border-indigo-200 rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500/20 bg-white" placeholder="0" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1.5">TDS (₹)</label>
                        <input type="number" name="tds" value={formData.tds} onChange={handleChange} disabled={editMode && !isAdmin} className="w-full text-sm border border-indigo-200 rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500/20 bg-white" placeholder="0" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1.5">TCS (₹)</label>
                        <input type="number" name="tcs" value={formData.tcs} onChange={handleChange} disabled={editMode && !isAdmin} className="w-full text-sm border border-indigo-200 rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500/20 bg-white" placeholder="0" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1.5">Self / Adv Tax (₹)</label>
                        <input type="number" name="selfAdvTax" value={formData.selfAdvTax} onChange={handleChange} disabled={editMode && !isAdmin} className="w-full text-sm border border-indigo-200 rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500/20 bg-white" placeholder="0" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-indigo-700 mb-1.5">Payable / (Refund) (₹)</label>
                        <input type="number" name="refund" value={formData.refund} readOnly className="w-full text-sm border border-indigo-300 rounded-xl p-2.5 bg-indigo-100 font-bold text-indigo-900 cursor-not-allowed" placeholder="0" />
                        <p className="text-[9px] text-slate-500 mt-1 uppercase">Tax - TDS - TCS - Adv Tax</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Assessee Name *</label>
                  <input type="text" name="assesseeName" required value={formData.assesseeName} onChange={handleChange} 
                    disabled={editMode && !isAdmin} 
                    placeholder="e.g. Rajesh Kumar" 
                    className={`w-full text-sm border border-slate-200 rounded-xl p-3 transition-all ${editMode && !isAdmin ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'}`} 
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">PAN Number *</label>
                  <input type="text" name="pan" required value={formData.pan} onChange={handleChange} 
                    disabled={editMode && !isAdmin} 
                    placeholder="ABCDE1234F" 
                    className={`w-full text-sm border border-slate-200 rounded-xl p-3 uppercase font-mono transition-all ${editMode && !isAdmin ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'}`} 
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Mobile Number *</label>
                  <input type="tel" name="mobile" required value={formData.mobile} onChange={handleChange} 
                    disabled={editMode && !isAdmin} 
                    placeholder="10-digit number" 
                    className={`w-full text-sm border border-slate-200 rounded-xl p-3 transition-all ${editMode && !isAdmin ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'}`} 
                  />
                </div>

                {/* BANK DETAILS INPUTS */}
                <div className="md:col-span-2 bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-4">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <CreditCard size={14} className="text-blue-600"/> Bank Account Details
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Bank Name</label>
                      <input type="text" name="bankName" value={formData.bankName} onChange={handleChange} disabled={editMode && !isAdmin} placeholder="e.g. HDFC Bank" className="w-full text-sm border border-slate-200 rounded-xl p-2.5 bg-white focus:ring-2 focus:ring-blue-500/20" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Account No</label>
                      <input type="text" name="accountNo" value={formData.accountNo} onChange={handleChange} disabled={editMode && !isAdmin} placeholder="Account No" className="w-full text-sm border border-slate-200 rounded-xl p-2.5 bg-white focus:ring-2 focus:ring-blue-500/20 font-mono" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">IFSC Code</label>
                      <input type="text" name="ifscCode" value={formData.ifscCode} onChange={handleChange} disabled={editMode && !isAdmin} placeholder="HDFC0001234" className="w-full text-sm border border-slate-200 rounded-xl p-2.5 bg-white focus:ring-2 focus:ring-blue-500/20 uppercase font-mono" />
                    </div>
                  </div>
                </div>

                <div className={sourceNeedsExtraField ? 'md:col-span-1' : 'md:col-span-2'}>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Client Acquisition Source</label>
                  <select name="leadSource" value={formData.leadSource} onChange={handleChange} 
                    disabled={editMode && !isAdmin} 
                    className={`w-full text-sm border border-slate-200 rounded-xl p-3 transition-all ${editMode && !isAdmin ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'}`}
                  >
                    <option value="Google">Google Ads</option>
                    <option value="FB">Facebook</option>
                    <option value="Insta">Instagram</option>
                    <option value="Walk-in">Walk-in</option>
                    <option value="Reference">Reference</option>
                    <option value="BA">Business Associate (BA)</option>
                    <option value="Website">Website Form</option>
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {formData.leadSource === 'BA' && (
                  <div className="md:col-span-1 animate-in fade-in slide-in-from-top-1 duration-200">
                    <label className="block text-xs font-bold uppercase tracking-wider text-indigo-600 mb-1.5">Select BA Partner <span className="text-rose-500">*</span></label>
                    <select name="referredByBA" required={formData.leadSource === 'BA'} value={formData.referredByBA} onChange={handleChange} disabled={editMode && !isAdmin} className={`w-full text-sm font-medium border rounded-xl p-3 transition-all ${editMode && !isAdmin ? 'border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed' : 'border-indigo-200 bg-indigo-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500'}`}>
                      <option value="">-- Choose Partner --</option>
                      {bas.map(ba => (<option key={ba._id} value={ba._id}>{ba.baName || ba.name}</option>))}
                    </select>
                  </div>
                )}
                {formData.leadSource === 'Reference' && (
                  <div className="md:col-span-1 animate-in fade-in slide-in-from-top-1 duration-200">
                    <label className="block text-xs font-bold uppercase tracking-wider text-emerald-600 mb-1.5">Reference Name <span className="text-rose-500">*</span></label>
                    <input type="text" name="referenceName" required={formData.leadSource === 'Reference'} value={formData.referenceName} onChange={handleChange} disabled={editMode && !isAdmin} placeholder="Who referred them?" className={`w-full text-sm font-medium border rounded-xl p-3 transition-all ${editMode && !isAdmin ? 'border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed' : 'border-emerald-200 bg-emerald-50/50 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500'}`} />
                  </div>
                )}
                {formData.leadSource === 'Other' && (
                  <div className="md:col-span-1 animate-in fade-in slide-in-from-top-1 duration-200">
                    <label className="block text-xs font-bold uppercase tracking-wider text-orange-600 mb-1.5">Other Source <span className="text-rose-500">*</span></label>
                    <input type="text" name="otherSourceName" required={formData.leadSource === 'Other'} value={formData.otherSourceName} onChange={handleChange} disabled={editMode && !isAdmin} placeholder="Specify the source..." className={`w-full text-sm font-medium border rounded-xl p-3 transition-all ${editMode && !isAdmin ? 'border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed' : 'border-orange-200 bg-orange-50/50 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500'}`} />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Email ID</label>
                  <input type="email" name="email" value={formData.email} onChange={handleChange} disabled={editMode && !isAdmin} placeholder="rajesh@example.com" className={`w-full text-sm border border-slate-200 rounded-xl p-3 transition-all ${editMode && !isAdmin ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'}`} />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Date of Birth (DOB)</label>
                  <input type="date" name="dob" value={formData.dob} onChange={handleChange} disabled={editMode && !isAdmin} className={`w-full text-sm border border-slate-200 rounded-xl p-3 transition-all ${editMode && !isAdmin ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-700'}`} />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">District</label>
                  <input type="text" name="district" value={formData.district} onChange={handleChange} disabled={editMode && !isAdmin} placeholder="e.g. South Delhi" className={`w-full text-sm border border-slate-200 rounded-xl p-3 transition-all ${editMode && !isAdmin ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'}`} />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">State</label>
                  <input type="text" name="state" value={formData.state} onChange={handleChange} disabled={editMode && !isAdmin} placeholder="e.g. Delhi" className={`w-full text-sm border border-slate-200 rounded-xl p-3 transition-all ${editMode && !isAdmin ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'}`} />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">PIN Code</label>
                  <input type="text" name="pincode" value={formData.pincode} onChange={handleChange} disabled={editMode && !isAdmin} placeholder="110001" className={`w-full text-sm border border-slate-200 rounded-xl p-3 transition-all ${editMode && !isAdmin ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'}`} />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-emerald-600 mb-1.5">Fee Status</label>
                  <select name="feeStatus" value={formData.feeStatus} onChange={handleChange} className="w-full text-sm bg-white border border-emerald-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-semibold text-slate-700">
                    <option value="Paid">Paid Fully</option>
                    <option value="Dues">Payment Pending / Dues</option>
                    <option value="FOC">Free of Cost (FOC)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-emerald-600 mb-1.5">Total Fee Amount (₹)</label>
                  <input type="number" name="feeAmount" value={formData.feeAmount} onChange={handleChange} placeholder="2500" className="w-full text-sm bg-white border border-emerald-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-emerald-600 mb-1.5">Amount Received (₹)</label>
                  <input type="number" name="amountReceived" value={formData.amountReceived} onChange={handleChange} placeholder="2500" className="w-full text-sm bg-white border border-emerald-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all" />
                </div>

                {editMode && formData.remarks && getFilteredCrmRemarks(formData.remarks) && (
                  <div className="md:col-span-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                      <History size={14} /> Historical Timeline (Read Only)
                    </label>
                    <div className="text-sm text-slate-700 whitespace-pre-wrap max-h-40 overflow-y-auto custom-scrollbar font-medium leading-relaxed">
                      {getFilteredCrmRemarks(formData.remarks)}
                    </div>
                  </div>
                )}

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-blue-600 mb-1.5 flex items-center gap-2">
                    <Pencil size={14} className="text-blue-500"/>
                    {editMode ? 'Add Action Note / Fee Update Summary' : 'Initial Remarks'}
                  </label>
                  <textarea 
                    name={editMode ? 'newRemark' : 'remarks'} 
                    rows="3" 
                    value={editMode ? newRemark : formData.remarks} 
                    onChange={editMode ? (e) => setNewRemark(e.target.value) : handleChange} 
                    placeholder="Enter notes regarding filing or pending documents..." 
                    className="w-full text-sm bg-white border border-blue-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none shadow-inner" 
                  />
                </div>

              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 bg-white sticky bottom-0 py-3 mt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
                <button type="submit" className="px-6 py-2.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md shadow-blue-500/20 transition-all">
                  {editMode ? 'Update Client Record' : 'Save Client Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION POPUP MODAL */}
      {isDeleteModalOpen && clientToDelete && (
        <div className="fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 p-8 text-center space-y-4 animate-in fade-in zoom-in-95">
            <div className="mx-auto h-14 w-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle size={26} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 tracking-tight">Delete Client Record?</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Are you sure you want to delete <span className="font-bold text-slate-700">{clientToDelete.assesseeName}</span>? This action is permanent and cannot be undone.
              </p>
            </div>
            <div className="flex justify-center gap-3 pt-3">
              <button onClick={() => setIsDeleteModalOpen(false)} className="px-5 py-2.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors">Cancel</button>
              <button onClick={handleDelete} className="px-5 py-2.5 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-md shadow-rose-500/20 transition-colors">Yes, Delete</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Clients;