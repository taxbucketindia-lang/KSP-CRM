// import React, { useState, useEffect, useContext, useMemo, useRef } from 'react';
// import axios from 'axios';
// import { AuthContext } from '../context/AuthContext';
// import toast, { Toaster } from 'react-hot-toast';
// import * as XLSX from 'xlsx'; 
// import ExcelJS from 'exceljs'; 
// import { saveAs } from 'file-saver';
// import { 
//   FileText, Search, Phone, FileClock, FileCheck, RefreshCw, 
//   CheckCircle2, IndianRupee, AlertCircle, CalendarClock, Pencil,
//   Plus, X, UserCheck, Key, Activity, Eye, MessageSquare, Trash2, MapPin, ShieldUser, Briefcase,
//   UserCircle, Mail, AlertTriangle, Send, Calculator, CreditCard, Download, Upload, Hash, Navigation,
//   Wallet, CheckSquare, Loader2
// } from 'lucide-react';

// const ItrReturns = () => {
//   const { user } = useContext(AuthContext);
  
//   const [importList, setImportList] = useState([]); 
//   const [itrClients, setItrClients] = useState([]); 
//   const [bas, setBas] = useState([]);
//   const [loading, setLoading] = useState(true);
  
//   // 🔴 Autocomplete ke states
//   const [fetchingPan, setFetchingPan] = useState(false);
//   const [panSuggestions, setPanSuggestions] = useState([]);
//   const [showSuggestions, setShowSuggestions] = useState(false);

//   const [searchQuery, setSearchQuery] = useState('');
//   const [statusFilter, setStatusFilter] = useState('ALL');
//   const [verificationFilter, setVerificationFilter] = useState('ALL');
//   const [processedFilter, setProcessedFilter] = useState('ALL');
//   const [returnTypeFilter, setReturnTypeFilter] = useState('ALL');

//   const [selectedIds, setSelectedIds] = useState([]);

//   const fileInputRef = useRef(null);

//   // Modal States
//   const [isModalOpen, setIsModalOpen] = useState(false);
//   const [editMode, setEditMode] = useState(false);
//   const [currentItrId, setCurrentItrId] = useState(null);
//   const [importClientId, setImportClientId] = useState(''); 

//   const [isViewModalOpen, setIsViewModalOpen] = useState(false);
//   const [clientToView, setClientToView] = useState(null);
  
//   const [isRemarksModalOpen, setIsRemarksModalOpen] = useState(false);
//   const [clientForRemarks, setClientForRemarks] = useState(null);
//   const [newRemarkText, setNewRemarkText] = useState('');

//   const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
//   const [clientToDelete, setClientToDelete] = useState(null);

//   const isAdmin = user?.role === 'Admin';

//   const initialForm = {
//     assesseeName: '', pan: '', dob: '', mobile: '', email: '', 
//     district: '', state: '', pinCode: '',
//     leadSource: 'Google', referredByBA: '', referenceName: '', otherSourceName: '',
//     itrFiledUpToAY: 'AY 2025-26', filingDate: '', nextReminderDate: '',
//     feeStatus: 'Paid', feeAmount: '', amountReceived: '',
//     itrStatus: 'Documents Pending', portalPassword: '',
//     totalIncome: '', incomeTax: '', tds: '', tcs: '', selfAdvTax: '', refund: '',
//     verificationMethod: 'Pending', itrProcessedStatus: 'Pending',
//     itrFiledBy: '', regime: 'New', formNo: 'ITR-1',
//     bankName: '', accountNo: '', ifscCode: '',
//     acknowledgementNo: '', returnType: 'Original'
//   };
//   const [formData, setFormData] = useState(initialForm);

//   const getFilteredItrRemarks = (remarksStr) => {
//     if (!remarksStr) return '';
//     const blocks = remarksStr.split(/(?=\n\n--------------------------------------\n|\n?📅 )/);
//     const filtered = blocks.filter(block => {
//       const lower = block.toLowerCase();
//       return (
//         lower.includes('(itr return note)') ||
//         lower.includes('workspace note') ||
//         lower.includes('imported client') ||
//         lower.includes('itr workspace') ||
//         lower.includes('itr profile')
//       );
//     });
//     return filtered.join('').trim();
//   };

//   const fetchData = async () => {
//     try {
//       const headers = { Authorization: `Bearer ${user.token}` };
      
//       const [crmRes, itrRes, basRes] = await Promise.all([
//         axios.get(`${import.meta.env.VITE_API_URL}/clients`, { headers }), 
//         axios.get(`${import.meta.env.VITE_API_URL}/itr`, { headers }),      
//         axios.get(`${import.meta.env.VITE_API_URL}/bas`, { headers }).catch(() => ({ data: [] }))
//       ]);
      
//       const crmClients = crmRes.data || [];
//       const activeItrRecords = itrRes.data || [];

//       const availableForImport = crmClients.filter(c => c.service === 'ITR Filing');

//       setImportList(availableForImport); 
//       setItrClients(activeItrRecords); 
//       setBas(basRes.data || []);
//       setSelectedIds([]); 
//     } catch (error) {
//       toast.error("Failed to load data");
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchData();
//     // eslint-disable-next-line
//   }, [user.token]);

//   // 🔴 NAYA LOGIC: Smart PAN Autocomplete Search
//   const handlePanChange = async (e) => {
//     const val = e.target.value.toUpperCase();
//     setFormData(prev => ({ ...prev, pan: val }));

//     if (val.length >= 2) {
//       setFetchingPan(true);
//       try {
//         const headers = { Authorization: `Bearer ${user.token}` };
//         const res = await axios.get(`${import.meta.env.VITE_API_URL}/client-master?search=${val}`, { headers });
//         setPanSuggestions(res.data || []);
//         setShowSuggestions(true);
//       } catch (error) {
//         console.error("Error fetching PAN details", error);
//       } finally {
//         setFetchingPan(false);
//       }
//     } else {
//       setPanSuggestions([]);
//       setShowSuggestions(false);
//     }
//   };

//   // 🔴 NAYA LOGIC: Jab dropdown se PAN select karein tab baki fields auto-fill hongi
//   const handleSelectSuggestion = (client) => {
//     setFormData(prev => ({
//       ...prev,
//       pan: client.pan,
//       assesseeName: client.name || prev.assesseeName,
//       mobile: client.mobile || prev.mobile,
//       email: client.email || prev.email,
//       district: client.district || prev.district,
//       state: client.state || prev.state,
//       pinCode: client.pinCode || prev.pinCode
//     }));
//     setShowSuggestions(false); 
//     toast.success("✅ Client Data Auto-Filled!");
//   };

//   const filteredClients = useMemo(() => {
//     const filtered = itrClients.filter((client) => {
//       const searchStr = searchQuery.toLowerCase();
//       // Searching by PAN and Name
//       const matchesSearch = 
//         (client.assesseeName?.toLowerCase() || '').includes(searchStr) || 
//         (client.pan?.toLowerCase() || '').includes(searchStr);

//       const matchesStatus = statusFilter === 'ALL' || (client.itrStatus || 'Documents Pending') === statusFilter;
//       const matchesVerif = verificationFilter === 'ALL' || (client.verificationMethod || 'Pending') === verificationFilter;
//       const matchesProc = processedFilter === 'ALL' || (client.itrProcessedStatus || 'Pending') === processedFilter;
//       const matchesType = returnTypeFilter === 'ALL' || (client.returnType || 'Original') === returnTypeFilter; 

//       return matchesSearch && matchesStatus && matchesVerif && matchesProc && matchesType;
//     });
//     return filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
//   }, [itrClients, searchQuery, statusFilter, verificationFilter, processedFilter, returnTypeFilter]);

//   const stats = useMemo(() => {
//     let totalFeeAmount = 0;
//     let totalReceivedAmount = 0;

//     filteredClients.forEach(c => {
//       totalFeeAmount += Number(c.feeAmount || 0);
//       totalReceivedAmount += Number(c.amountReceived || 0);
//     });

//     return {
//       total: filteredClients.length,
//       pending: filteredClients.filter(c => (c.itrStatus || 'Documents Pending') === 'Documents Pending').length,
//       processing: filteredClients.filter(c => c.itrStatus === 'Processing').length,
//       completed: filteredClients.filter(c => ['Filed', 'E-Verified', 'Refund Issued'].includes(c.itrStatus)).length,
//       totalFeeAmount,
//       totalReceivedAmount,
//       totalPendingAmount: totalFeeAmount - totalReceivedAmount
//     };
//   }, [filteredClients]);

//   const handleExportExcel = async () => {
//     const workbook = new ExcelJS.Workbook();
//     const worksheet = workbook.addWorksheet('ITR Workspace');

//     worksheet.columns = [
//       { header: 'PAN', key: 'pan', width: 15 },
//       { header: 'Assessee Name', key: 'assesseeName', width: 25 },
//       { header: 'Mobile', key: 'mobile', width: 15 },
//       { header: 'Email', key: 'email', width: 25 },
//       { header: 'DOB', key: 'dob', width: 15 },
//       { header: 'District', key: 'district', width: 15 },
//       { header: 'State', key: 'state', width: 15 },
//       { header: 'Pin Code', key: 'pinCode', width: 15 },
//       { header: 'ITR Status', key: 'itrStatus', width: 25 },
//       { header: 'ITR AY', key: 'itrFiledUpToAY', width: 15 },
//       { header: 'Return Type', key: 'returnType', width: 15 },
//       { header: 'Acknowledgement No', key: 'acknowledgementNo', width: 25 },
//       { header: 'Filing Date', key: 'filingDate', width: 15 },
//       { header: 'Next Reminder', key: 'nextReminderDate', width: 15 },
//       { header: 'Portal Password', key: 'portalPassword', width: 20 },
//       { header: 'Form No', key: 'formNo', width: 15 },
//       { header: 'Regime', key: 'regime', width: 15 },
//       { header: 'ITR Filed By', key: 'itrFiledBy', width: 20 },
//       { header: 'Verification Method', key: 'verificationMethod', width: 25 },
//       { header: 'Processed Status', key: 'itrProcessedStatus', width: 25 },
//       { header: 'Total Income', key: 'totalIncome', width: 15 },
//       { header: 'Income Tax', key: 'incomeTax', width: 15 },
//       { header: 'TDS', key: 'tds', width: 15 },
//       { header: 'TCS', key: 'tcs', width: 15 },
//       { header: 'Self Adv Tax', key: 'selfAdvTax', width: 15 },
//       { header: 'Refund/Payable', key: 'refund', width: 15 },
//       { header: 'Bank Name', key: 'bankName', width: 20 },
//       { header: 'Account No', key: 'accountNo', width: 20 },
//       { header: 'IFSC Code', key: 'ifscCode', width: 15 },
//       { header: 'Fee Status', key: 'feeStatus', width: 15 },
//       { header: 'Total Fee', key: 'feeAmount', width: 15 },
//       { header: 'Received Amount', key: 'amountReceived', width: 18 },
//       { header: 'System Added By', key: 'createdBy', width: 20 } 
//     ];

//     worksheet.getRow(1).font = { bold: true };
//     worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

//     const dataToExport = selectedIds.length > 0 
//       ? filteredClients.filter(c => selectedIds.includes(c._id)) 
//       : filteredClients;

//     dataToExport.forEach(client => { 
//       worksheet.addRow({
//         pan: client.pan || '',
//         assesseeName: client.assesseeName || '',
//         mobile: client.mobile || '',
//         email: client.email || '',
//         dob: client.dob ? new Date(client.dob).toLocaleDateString('en-IN') : '',
//         district: client.district || '',
//         state: client.state || '',
//         pinCode: client.pinCode || client.pincode || '',
//         itrStatus: client.itrStatus || 'Documents Pending',
//         itrFiledUpToAY: client.itrFiledUpToAY || '',
//         returnType: client.returnType || 'Original',
//         acknowledgementNo: client.acknowledgementNo || '',
//         filingDate: client.filingDate ? new Date(client.filingDate).toLocaleDateString('en-IN') : '',
//         nextReminderDate: client.nextReminderDate ? new Date(client.nextReminderDate).toLocaleDateString('en-IN') : '',
//         portalPassword: client.portalPassword || '',
//         formNo: client.formNo || '',
//         regime: client.regime || '',
//         itrFiledBy: client.itrFiledBy || '',
//         verificationMethod: client.verificationMethod || '',
//         itrProcessedStatus: client.itrProcessedStatus || '',
//         totalIncome: client.totalIncome || 0,
//         incomeTax: client.incomeTax || 0,
//         tds: client.tds || 0,
//         tcs: client.tcs || 0,
//         selfAdvTax: client.selfAdvTax || 0,
//         refund: client.refund || 0,
//         bankName: client.bankName || '',
//         accountNo: client.accountNo || '',
//         ifscCode: client.ifscCode || '',
//         feeStatus: client.feeStatus || '',
//         feeAmount: client.feeAmount || 0,
//         amountReceived: client.amountReceived || 0,
//         createdBy: client.createdBy?.name || 'Admin' 
//       });
//     });

//     const buffer = await workbook.xlsx.writeBuffer();
//     const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
//     saveAs(blob, `ITR_Workspace_${selectedIds.length > 0 ? 'Selected_' : ''}${new Date().toISOString().split('T')[0]}.xlsx`);
    
//     if(selectedIds.length > 0) setSelectedIds([]);
//   };

//   const handleFileUpload = async (e) => {
//     const file = e.target.files[0];
//     if (!file) return;

//     const reader = new FileReader();
//     reader.onload = async (evt) => {
//       try {
//         const bstr = evt.target.result;
//         const wb = XLSX.read(bstr, { type: 'binary', cellDates: true }); 
//         const wsname = wb.SheetNames[0];
//         const data = XLSX.utils.sheet_to_json(wb.Sheets[wsname]);

//         if (data.length === 0) return toast.error("Uploaded Excel file is empty!");

//         const parseDate = (raw) => {
//           if (!raw) return null;
//           if (raw instanceof Date && !isNaN(raw.getTime())) return `${raw.getFullYear()}-${String(raw.getMonth() + 1).padStart(2, '0')}-${String(raw.getDate()).padStart(2, '0')}`;
//           if (typeof raw === 'string') {
//             const parts = raw.split(/[\/\-]/); 
//             if (parts.length === 3) {
//               let day = parts[0], month = parts[1], year = parts[2];
//               if (day.length === 4) { year = parts[0]; month = parts[1]; day = parts[2]; }
//               return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
//             }
//             const d = new Date(raw);
//             if (!isNaN(d.getTime())) return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
//           }
//           return null;
//         };

//         const getVal = (row, keys) => {
//           for (let key of keys) {
//             if (row[key] !== undefined && row[key] !== null) return row[key];
//           }
//           return '';
//         };

//         const normalizeFeeStatus = (val) => {
//           if (!val) return 'Dues';
//           const s = String(val).toLowerCase();
//           if (s.includes('paid')) return 'Paid';
//           if (s.includes('foc') || s.includes('free')) return 'FOC';
//           return 'Dues';
//         };

//         const normalizeItrStatus = (val) => {
//           if (!val) return 'Documents Pending';
//           const s = String(val).toLowerCase();
//           if (s.includes('file')) return 'Filed';
//           if (s.includes('process')) return 'Processing';
//           if (s.includes('verif')) return 'E-Verified';
//           if (s.includes('refund')) return 'Refund Issued';
//           return 'Documents Pending';
//         };

//         const normalizeReturnType = (val) => {
//           if (!val) return 'Original';
//           const s = String(val).toLowerCase();
//           if (s.includes('revis')) return 'Revised';
//           if (s.includes('updat')) return 'Updated';
//           return 'Original';
//         };

//         const formattedItrRecords = data.map(row => ({
//           assesseeName: getVal(row, ['Assessee Name', 'Name', 'Client Name', 'Client / Trade Name', 'assesseeName']),
//           pan: String(getVal(row, ['PAN', 'pan', 'Pan', 'PAN Number', 'PAN No', 'PAN No.'])),
//           mobile: getVal(row, ['Mobile', 'mobile', 'Phone', 'Contact', 'Contact Number']),
//           email: getVal(row, ['Email', 'email', 'Email ID']),
//           dob: parseDate(getVal(row, ['DOB', 'dob', 'Date of Birth'])),
//           district: getVal(row, ['District', 'district', 'City']),
//           state: getVal(row, ['State', 'state']),
//           pinCode: getVal(row, ['Pin Code', 'Pincode', 'pinCode', 'pincode', 'Zip']),
//           itrStatus: normalizeItrStatus(getVal(row, ['ITR Status', 'itrStatus'])),
//           itrFiledUpToAY: getVal(row, ['ITR AY', 'itrFiledUpToAY', 'AY']) || 'AY 2025-26',
//           returnType: normalizeReturnType(getVal(row, ['Return Type', 'returnType', 'Type'])), 
//           acknowledgementNo: String(getVal(row, ['Acknowledgement No', 'Ack No', 'acknowledgementNo', 'Ack Number']) || ''), 
//           filingDate: parseDate(getVal(row, ['Filing Date', 'filingDate'])),
//           nextReminderDate: parseDate(getVal(row, ['Next Reminder', 'nextReminderDate', 'Next Due Date'])),
//           portalPassword: getVal(row, ['Portal Password', 'portalPassword', 'Password']),
//           formNo: getVal(row, ['Form No', 'formNo', 'ITR Form']) || 'ITR-1',
//           regime: getVal(row, ['Regime', 'regime', 'Tax Regime']) || 'New',
//           itrFiledBy: getVal(row, ['ITR Filed By', 'itrFiledBy', 'Filed By']),
//           verificationMethod: getVal(row, ['Verification Method', 'verificationMethod']) || 'Pending',
//           itrProcessedStatus: getVal(row, ['Processed Status', 'itrProcessedStatus', 'Status']) || 'Pending',
//           totalIncome: Number(getVal(row, ['Total Income', 'totalIncome']) || 0),
//           incomeTax: Number(getVal(row, ['Income Tax', 'incomeTax']) || 0),
//           tds: Number(getVal(row, ['TDS', 'tds']) || 0),
//           tcs: Number(getVal(row, ['TCS', 'tcs']) || 0),
//           selfAdvTax: Number(getVal(row, ['Self Adv Tax', 'selfAdvTax', 'Advance Tax']) || 0),
//           refund: Number(getVal(row, ['Refund/Payable', 'refund', 'Refund']) || 0),
//           bankName: getVal(row, ['Bank Name', 'bankName', 'Bank']),
//           accountNo: String(getVal(row, ['Account No', 'accountNo', 'Account Number'])),
//           ifscCode: String(getVal(row, ['IFSC Code', 'ifscCode', 'IFSC'])),
//           feeStatus: normalizeFeeStatus(getVal(row, ['Fee Status', 'feeStatus'])), 
//           feeAmount: Number(getVal(row, ['Total Fee', 'feeAmount', 'Fee']) || 0),
//           amountReceived: Number(getVal(row, ['Received Amount', 'amountReceived', 'Received']) || 0)
//         })).filter(item => item.assesseeName && item.pan); 

//         if (formattedItrRecords.length === 0) {
//           return toast.error("Import Failed: No valid records found. Ensure your Excel has 'Name' and 'PAN' columns.");
//         }

//         const headers = { Authorization: `Bearer ${user.token}` };
//         const response = await axios.post(`${import.meta.env.VITE_API_URL}/itr/import`, { itrRecords: formattedItrRecords }, { headers });
        
//         toast.success(`Successfully imported ${response.data.count} ITR records!`);
//         fetchData();
//       } catch (error) {
//         console.error("Import Error:", error);
//         toast.error("Error importing records. Check backend limits.");
//       } finally {
//         if (fileInputRef.current) fileInputRef.current.value = ""; 
//       }
//     };
//     reader.readAsBinaryString(file);
//   };

//   const handleSelectAll = (e) => {
//     if (e.target.checked) {
//       setSelectedIds(filteredClients.map(c => c._id));
//     } else {
//       setSelectedIds([]);
//     }
//   };

//   const handleSelectOne = (id) => {
//     setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
//   };

//   const handleBulkDelete = async () => {
//     if (!window.confirm(`Are you sure you want to permanently delete ${selectedIds.length} selected records?`)) return;
    
//     try {
//       const headers = { Authorization: `Bearer ${user.token}` };
//       await axios.post(`${import.meta.env.VITE_API_URL}/itr/bulk-delete`, { ids: selectedIds }, { headers });
      
//       toast.success(`${selectedIds.length} Records deleted successfully!`);
//       setSelectedIds([]);
//       fetchData();
//     } catch (error) {
//       toast.error("Error deleting records: " + (error.response?.data?.message || error.message));
//     }
//   };

//   const handleStatusChange = async (clientId, newStatus) => {
//     try {
//       const headers = { Authorization: `Bearer ${user.token}` };
//       await axios.put(`${import.meta.env.VITE_API_URL}/itr/${clientId}`, { itrStatus: newStatus }, { headers });
//       setItrClients(prev => prev.map(c => c._id === clientId ? { ...c, itrStatus: newStatus } : c));
//       toast.success(`Status updated to ${newStatus}`);
//     } catch (error) {
//       toast.error("Error updating status");
//     }
//   };

//   const handleChange = (e) => {
//     const { name, value } = e.target;
//     setFormData(prev => {
//       const updated = { ...prev, [name]: value };
      
//       if (name === 'leadSource') {
//         if (value !== 'BA') updated.referredByBA = ''; 
//         if (value !== 'Reference') updated.referenceName = '';
//         if (value !== 'Other') updated.otherSourceName = '';
//       }

//       if (name === 'filingDate' && value) {
//         const dateObj = new Date(value);
//         dateObj.setFullYear(dateObj.getFullYear() + 1); 
//         updated.nextReminderDate = dateObj.toISOString().split('T')[0];
//       }

//       if (['incomeTax', 'tds', 'tcs', 'selfAdvTax'].includes(name)) {
//         const iTax = name === 'incomeTax' ? Number(value) : Number(updated.incomeTax || 0);
//         const tdsVal = name === 'tds' ? Number(value) : Number(updated.tds || 0);
//         const tcsVal = name === 'tcs' ? Number(value) : Number(updated.tcs || 0);
//         const advVal = name === 'selfAdvTax' ? Number(value) : Number(updated.selfAdvTax || 0);
//         updated.refund = iTax - tdsVal - tcsVal - advVal;
//       }

//       return updated;
//     });
//   };

//   const handleImportSelect = (e) => {
//     const cid = e.target.value;
//     setImportClientId(cid);
    
//     if (!cid) {
//       setFormData(initialForm); 
//       return;
//     }

//     const client = importList.find(c => c._id === cid);
//     if (client) {
//       const parseDate = (d) => {
//         if (!d) return '';
//         const dateObj = new Date(d);
//         if (!isNaN(dateObj.getTime())) return dateObj.toISOString().split('T')[0];
//         return '';
//       };

//       setFormData({
//         ...initialForm,
//         assesseeName: client.assesseeName || '',
//         pan: client.pan || '',
//         dob: client.dob ? parseDate(client.dob) : '',
//         mobile: client.mobile || '',
//         email: client.email || '',
//         district: client.district || '',
//         state: client.state || '',
//         pinCode: client.pinCode || client.pincode || '', 
//         leadSource: client.leadSource || 'Google',
//         referredByBA: client.referredByBA ? (client.referredByBA._id || client.referredByBA) : '',
//         referenceName: client.referenceName || '',
//         otherSourceName: client.otherSourceName || '',
//         itrFiledUpToAY: client.itrFiledUpToAY || 'AY 2025-26',
//         filingDate: parseDate(client.filingDate),
//         nextReminderDate: parseDate(client.nextReminderDate),
//         itrStatus: client.itrStatus || 'Documents Pending',
//         portalPassword: client.portalPassword || '',
//       });
//     }
//   };

//   const handleOpenAdd = () => {
//     setEditMode(false);
//     setCurrentItrId(null);
//     setImportClientId('');
//     setFormData(initialForm);
//     setShowSuggestions(false);
//     setIsModalOpen(true);
//   };

//   const handleOpenEdit = (client) => {
//     setEditMode(true);
//     setCurrentItrId(client._id);
//     setImportClientId('');
    
//     const parseDate = (d) => {
//       if (!d) return '';
//       const dateObj = new Date(d);
//       if (!isNaN(dateObj.getTime())) return dateObj.toISOString().split('T')[0];
//       return '';
//     };

//     setFormData({
//       assesseeName: client.assesseeName || '',
//       pan: client.pan || '',
//       dob: parseDate(client.dob),
//       mobile: client.mobile || '',
//       email: client.email || '',
//       district: client.district || '',
//       state: client.state || '',
//       pinCode: client.pinCode || client.pincode || '', 
//       leadSource: client.leadSource || 'Google',
//       referredByBA: client.referredByBA ? (client.referredByBA._id || client.referredByBA) : '',
//       referenceName: client.referenceName || '',
//       otherSourceName: client.otherSourceName || '',
//       itrFiledUpToAY: client.itrFiledUpToAY || 'AY 2025-26',
//       returnType: client.returnType || 'Original', 
//       acknowledgementNo: client.acknowledgementNo || '',
//       filingDate: parseDate(client.filingDate),
//       nextReminderDate: parseDate(client.nextReminderDate),
//       itrStatus: client.itrStatus || 'Documents Pending',
//       portalPassword: client.portalPassword || '',
//       feeStatus: client.feeStatus || 'Paid',
//       feeAmount: client.feeAmount || '',
//       amountReceived: client.amountReceived || '',
//       totalIncome: client.totalIncome || '',
//       incomeTax: client.incomeTax || '',
//       tds: client.tds || '',
//       tcs: client.tcs || '',
//       selfAdvTax: client.selfAdvTax || '',
//       refund: client.refund || '',
//       verificationMethod: client.verificationMethod || 'Pending',
//       itrProcessedStatus: client.itrProcessedStatus || 'Pending',
//       itrFiledBy: client.itrFiledBy || '',
//       regime: client.regime || 'New',
//       formNo: client.formNo || 'ITR-1',
//       bankName: client.bankName || '',
//       accountNo: client.accountNo || '',
//       ifscCode: client.ifscCode || ''
//     });
//     setIsModalOpen(true);
//   };

//   const handleOpenView = (client) => { 
//     setClientToView(client); 
//     setIsViewModalOpen(true); 
//   };
  
//   const handleOpenRemarks = (client) => { 
//     setClientForRemarks(client); 
//     setNewRemarkText('');
//     setIsRemarksModalOpen(true); 
//   };
  
//   const confirmDelete = (client) => { 
//     setClientToDelete(client); 
//     setIsDeleteModalOpen(true); 
//   };

//   const handleDelete = async () => {
//     if (!clientToDelete) return;
//     try {
//       const headers = { Authorization: `Bearer ${user.token}` };
//       await axios.delete(`${import.meta.env.VITE_API_URL}/itr/${clientToDelete._id}`, { headers });
      
//       setIsDeleteModalOpen(false);
//       setClientToDelete(null);
//       if (isViewModalOpen) setIsViewModalOpen(false);
//       toast.success("ITR Record removed! Client remains safe in CRM.");
//       fetchData();
//     } catch (error) {
//       toast.error("Error removing record");
//     }
//   };

//   const handleAddRemarkSubmit = async (e) => {
//     e.preventDefault();
//     if (!newRemarkText.trim() || !clientForRemarks) return;

//     try {
//       const headers = { Authorization: `Bearer ${user.token}` };
//       const dateStamp = new Date().toLocaleString('en-IN', { 
//         day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit' 
//       });
//       const authorInfo = user?.name ? `${user.name}` : 'User';

//       const entry = `\n\n--------------------------------------\n📅 ${dateStamp} | 👤 ${authorInfo} (ITR Return Note)\n💬 ${newRemarkText.trim()}`;
//       const updatedRemarks = (clientForRemarks.remarks || '') + entry;

//       await axios.put(`${import.meta.env.VITE_API_URL}/itr/${clientForRemarks._id}`, { remarks: updatedRemarks }, { headers });
      
//       setClientForRemarks(prev => ({ ...prev, remarks: updatedRemarks }));
//       setItrClients(prev => prev.map(c => c._id === clientForRemarks._id ? { ...c, remarks: updatedRemarks } : c));
//       setNewRemarkText('');
//       toast.success("Remark added successfully!");
//     } catch (error) {
//       toast.error("Failed to add remark");
//     }
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     try {
//       const headers = { Authorization: `Bearer ${user.token}` };
//       const dateStamp = new Date().toLocaleString('en-IN', { 
//         day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit' 
//       });
//       const authorInfo = user?.name ? `${user.name}` : 'User';
      
//       const payload = { 
//         ...formData, 
//         crmClientId: importClientId || null, 
//         createdBy: user._id 
//       };

//       if (editMode && currentItrId) {
//         await axios.put(`${import.meta.env.VITE_API_URL}/itr/${currentItrId}`, payload, { headers });
//         toast.success("ITR details updated!");
//       } else {
//         payload.remarks = `📅 ${dateStamp} | 👤 ${authorInfo}\n📌 ${importClientId ? 'Imported client to ITR workspace.' : 'Client profile created in ITR workspace.'}`;
//         await axios.post(`${import.meta.env.VITE_API_URL}/itr`, payload, { headers });
//         toast.success("ITR Client added to workspace!");
//       }
      
//       setIsModalOpen(false);
//       fetchData();
//     } catch (error) {
//       toast.error(error.response?.data?.message || "Error saving details");
//     }
//   };

//   const getStatusStyle = (status) => {
//     switch (status) {
//       case 'Documents Pending': return 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 ring-amber-500/20';
//       case 'Processing': return 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 ring-blue-500/20';
//       case 'Filed': return 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 ring-emerald-500/20';
//       case 'E-Verified': return 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 ring-purple-500/20';
//       case 'Refund Issued': return 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 ring-indigo-500/20';
//       default: return 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 ring-amber-500/20';
//     }
//   };

//   const getReturnTypeStyle = (type) => {
//     switch (type) {
//       case 'Revised': return 'bg-purple-100 text-purple-700 border border-purple-200';
//       case 'Updated': return 'bg-orange-100 text-orange-700 border border-orange-200';
//       default: return 'bg-blue-100 text-blue-700 border border-blue-200';
//     }
//   };

//   const sourceNeedsExtraField = ['BA', 'Reference', 'Other'].includes(formData.leadSource);

//   return (
//     <div className="space-y-6 max-w-7xl mx-auto pb-10">
//       <Toaster position="top-right" />

//       <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
//         <div>
//           <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
//             <FileText size={28} className="text-blue-600" /> ITR Return Workspace
//           </h1>
//           <p className="text-sm text-slate-500 mt-1 font-medium">Manage, track, and update all ITR filings in one place.</p>
//         </div>
//         <div className="flex items-center gap-3">
//           <button onClick={handleExportExcel} className="inline-flex items-center gap-2 bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200 hover:border-emerald-200 text-sm font-bold px-4 py-2.5 rounded-xl transition-colors shadow-sm">
//             <Download size={16} strokeWidth={2.5} /> Export All
//           </button>
//           <button onClick={() => fileInputRef.current.click()} className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-sm font-bold px-4 py-2.5 rounded-xl transition-colors shadow-sm">
//             <Upload size={16} strokeWidth={2.5} /> Import Excel
//           </button>
//           <input type="file" accept=".xlsx, .xls, .csv" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
          
//           <button onClick={handleOpenAdd} className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-5 py-2.5 rounded-xl shadow-md shadow-blue-500/20 transition-all">
//             <Plus size={18} strokeWidth={2.5} /> Add / Import Return
//           </button>
//         </div>
//       </div>

//       {/* 🔴 METRICS CARDS */}
//       <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
//         <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
//           <div className="flex items-start justify-between">
//             <div>
//               <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total ITR Files</p>
//               <h3 className="text-3xl font-black text-slate-800 mt-1">{stats.total}</h3>
//             </div>
//             <div className="h-12 w-12 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center font-bold border border-slate-100"><FileText size={20} /></div>
//           </div>
//         </div>
//         <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between border-b-4 border-b-amber-400">
//           <div className="flex items-start justify-between">
//             <div>
//               <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Docs Pending</p>
//               <h3 className="text-3xl font-black text-amber-600 mt-1">{stats.pending}</h3>
//             </div>
//             <div className="h-12 w-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold border border-amber-100"><FileClock size={20} /></div>
//           </div>
//         </div>
//         <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between border-b-4 border-b-blue-500">
//           <div className="flex items-start justify-between">
//             <div>
//               <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">In Processing</p>
//               <h3 className="text-3xl font-black text-blue-600 mt-1">{stats.processing}</h3>
//             </div>
//             <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold border border-blue-100"><RefreshCw size={20} /></div>
//           </div>
//         </div>
//         <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between border-b-4 border-b-emerald-500">
//           <div className="flex items-start justify-between">
//             <div>
//               <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Filed / Done</p>
//               <h3 className="text-3xl font-black text-emerald-600 mt-1">{stats.completed}</h3>
//             </div>
//             <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold border border-emerald-100"><FileCheck size={20} /></div>
//           </div>
//         </div>
//       </div>

//       {/* 🔴 FINANCIAL METRICS */}
//       <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
//         <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-[0_2px_4px_rgba(0,0,0,0.02)] flex items-center gap-4">
//           <div className="h-10 w-10 rounded-full bg-slate-50 text-slate-600 flex items-center justify-center font-bold border border-slate-100 shrink-0">
//             <Calculator size={18} />
//           </div>
//           <div>
//             <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Billed Fees</p>
//             <h3 className="text-lg font-black text-slate-800 flex items-center"><IndianRupee size={14} className="mr-0.5" />{stats.totalFeeAmount.toLocaleString('en-IN')}</h3>
//           </div>
//         </div>
//         <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-[0_2px_4px_rgba(0,0,0,0.02)] flex items-center gap-4">
//           <div className="h-10 w-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold border border-emerald-100 shrink-0">
//             <CheckCircle2 size={18} />
//           </div>
//           <div>
//             <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Received</p>
//             <h3 className="text-lg font-black text-emerald-600 flex items-center"><IndianRupee size={14} className="mr-0.5" />{stats.totalReceivedAmount.toLocaleString('en-IN')}</h3>
//           </div>
//         </div>
//         <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-[0_2px_4px_rgba(0,0,0,0.02)] border-l-4 border-l-rose-500 flex items-center gap-4">
//           <div className="h-10 w-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center font-bold border border-rose-100 shrink-0">
//             <Wallet size={18} />
//           </div>
//           <div>
//             <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pending Dues</p>
//             <h3 className="text-lg font-black text-rose-600 flex items-center"><IndianRupee size={14} className="mr-0.5" />{stats.totalPendingAmount.toLocaleString('en-IN')}</h3>
//           </div>
//         </div>
//       </div>

//       <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        
//         {/* FILTERS & SEARCH ROW */}
//         <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col xl:flex-row xl:items-center gap-4">
//           <div className="relative w-full xl:w-72 shrink-0">
//             <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
//             <input type="text" placeholder="Search Client, PAN or ID..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-3.5 py-2 text-sm font-medium bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors shadow-sm" />
//           </div>
          
//           <div className="flex flex-wrap items-center gap-3 w-full">
//             <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer shadow-sm">
//               <option value="ALL">Status: All</option>
//               <option value="Documents Pending">Documents Pending</option>
//               <option value="Processing">Processing</option>
//               <option value="Filed">Filed</option>
//               <option value="E-Verified">E-Verified</option>
//               <option value="Refund Issued">Refund Issued</option>
//             </select>

//             <select value={verificationFilter} onChange={(e) => setVerificationFilter(e.target.value)} className="text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer shadow-sm">
//               <option value="ALL">Verif: All</option>
//               <option value="Pending">Pending</option>
//               <option value="Aadhaar OTP">Aadhaar OTP</option>
//               <option value="Net Banking / EVC">Net Banking / EVC</option>
//               <option value="Sent to CPC (Physical)">Sent to CPC</option>
//             </select>

//             <select value={processedFilter} onChange={(e) => setProcessedFilter(e.target.value)} className="text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer shadow-sm">
//               <option value="ALL">Process: All</option>
//               <option value="Pending">Pending</option>
//               <option value="Successfully E-verified">E-verified</option>
//               <option value="Processing">Processing</option>
//               <option value="Processed">Processed</option>
//               <option value="Processed with Refund">Processed (Refund)</option>
//               <option value="Defective">Defective</option>
//             </select>

//             <select value={returnTypeFilter} onChange={(e) => setReturnTypeFilter(e.target.value)} className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer shadow-sm">
//               <option value="ALL">Type: All</option>
//               <option value="Original">Original</option>
//               <option value="Revised">Revised</option>
//               <option value="Updated">Updated</option>
//             </select>
//           </div>
//         </div>

//         {/* 🔴 SMART TOOLBAR FOR SELECTED ROWS */}
//         {selectedIds.length > 0 && (
//           <div className="bg-indigo-50 border-b border-indigo-100 p-3 px-6 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
//             <span className="text-sm font-bold text-indigo-800 flex items-center gap-2">
//               <CheckSquare size={16} /> {selectedIds.length} Clients Selected
//             </span>
//             <div className="flex items-center gap-3">
//               <button onClick={handleExportExcel} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors shadow-sm">
//                 <Download size={14} strokeWidth={2.5}/> Export Selected
//               </button>
//               {isAdmin && (
//                 <button onClick={handleBulkDelete} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-rose-500 hover:bg-rose-600 rounded-lg transition-colors shadow-sm">
//                   <Trash2 size={14} strokeWidth={2.5}/> Delete Selected
//                 </button>
//               )}
//             </div>
//           </div>
//         )}

//         <div className="overflow-x-auto">
//           {/* 🔴 SAME TABLE DESIGN PRESERVED */}
//           <table className="w-full text-left border-collapse">
//             <thead>
//               <tr className="bg-white border-b border-slate-200 text-slate-500 text-[11px] font-black uppercase tracking-wider">
//                 <th className="py-4 px-4 w-12 text-center border-r border-slate-100">
//                   <input 
//                     type="checkbox" 
//                     checked={selectedIds.length === filteredClients.length && filteredClients.length > 0} 
//                     onChange={handleSelectAll} 
//                     className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
//                   />
//                 </th>
//                 <th className="py-4 px-6">Client Details</th>
//                 <th className="py-4 px-6">Tax Info</th>
//                 <th className="py-4 px-6">Important Dates</th>
//                 <th className="py-4 px-6 bg-slate-50/50">Live Status Tracker</th>
//                 <th className="py-4 px-6">Added By</th>
//                 <th className="py-4 px-6 text-center">Actions</th>
//               </tr>
//             </thead>
//             <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-700">
//               {loading ? (
//                 <tr><td colSpan="7" className="text-center py-16 text-slate-400"><RefreshCw className="animate-spin inline-block mr-2" size={18}/> Loading ITR workflow...</td></tr>
//               ) : filteredClients.length === 0 ? (
//                 <tr><td colSpan="7" className="text-center py-16 text-slate-400 flex flex-col items-center"><AlertCircle size={36} className="mb-3 text-slate-300"/> No active clients match filters.</td></tr>
//               ) : (
//                 filteredClients.map((client) => {
//                   const currentStatus = client.itrStatus || 'Documents Pending';
//                   const isSelected = selectedIds.includes(client._id);

//                   return (
//                     <tr key={client._id} className={`transition-colors group ${isSelected ? 'bg-indigo-50/30' : 'hover:bg-slate-50/70'}`}>
//                       <td className="py-4 px-4 text-center border-r border-slate-50">
//                         <input 
//                           type="checkbox" 
//                           checked={isSelected} 
//                           onChange={() => handleSelectOne(client._id)} 
//                           className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
//                         />
//                       </td>
//                       <td className="py-4 px-6">
//                         <div className="font-bold text-slate-800 text-base flex items-center gap-2">
//                            {client.assesseeName} 
//                            {/* 🔴 CLIENT ID DISPLAY IN TABLE */}
                           
//                         </div>
//                         <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5 mt-1">
//                             <span className="font-mono text-sm font-bold text-slate-700 px-2 py-0.5 inline-block uppercase">
//                               {client.pan || 'N/A'}
//                            </span>
//                           </div>
//                       </td>
//                       <td className="py-4 pr-6">
                        
//                       </td>
//                       <td className="py-4 pl-6">
//                         <div className="flex flex-col gap-1.5 text-[11px] font-semibold">
//                           <span className="text-slate-800 font-bold mb-0.5 flex items-center gap-2">
//                             {client.itrFiledUpToAY || 'AY 2025-26'}
//                               <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase ${getReturnTypeStyle(client.returnType)}`}>
//                               {client.returnType || 'Original'}
//                             </span>
//                           </span>
//                         </div>
//                       </td>
                      
//                       <td className="py-4 px-6 bg-slate-50/30">
//                         <div className="relative">
//                           <select 
//                             value={currentStatus} 
//                             onChange={(e) => handleStatusChange(client._id, e.target.value)}
//                             className={`appearance-none w-full text-xs font-bold px-3 py-2.5 pr-8 rounded-lg border focus:outline-none focus:ring-2 transition-all cursor-pointer shadow-sm ${getStatusStyle(currentStatus)}`}
//                           >
//                             <option value="Documents Pending">⏳ Documents Pending</option>
//                             <option value="Processing">⚙️ Processing</option>
//                             <option value="Filed">✅ Filed</option>
//                             <option value="E-Verified">🛡️ E-Verified</option>
//                             <option value="Refund Issued">💸 Refund Issued</option>
//                           </select>
//                           <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
//                             <svg className="fill-current h-4 w-4 opacity-50" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
//                           </div>
//                         </div>
//                       </td>

//                       <td className="py-4 px-6">
//                         <div className="flex items-center gap-2">
//                           <div className="h-7 w-7 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 text-[11px] font-bold shrink-0">
//                             {client.createdBy?.name ? client.createdBy.name.charAt(0).toUpperCase() : 'A'}
//                           </div>
//                           <div className="flex flex-col">
//                             <span className="text-xs font-bold text-slate-700 truncate w-24">
//                               {client.createdBy?.name || 'Admin'}
//                             </span>
//                             <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
//                               {client.createdBy?.empId || 'System'}
//                             </span>
//                           </div>
//                         </div>
//                       </td>
                      
//                       <td className="py-4 px-6 text-right">
//                         <div className="flex items-center justify-end gap-2.5">
//                           <button onClick={() => handleOpenView(client)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-600 hover:text-white rounded-lg transition-all border border-blue-200 shadow-sm" title="View Profile">
//                             <Eye size={14} strokeWidth={2.5}/> View
//                           </button>
//                           <button onClick={() => handleOpenRemarks(client)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-500 hover:text-white rounded-lg transition-all border border-amber-200 shadow-sm" title="Remarks">
//                             <MessageSquare size={14} strokeWidth={2.5}/> Note
//                           </button>
//                         </div>
//                       </td>
//                     </tr>
//                   );
//                 })
//               )}
//             </tbody>
//           </table>
//         </div>
//       </div>

//       {/* VIEW PROFILE MODAL - REDESIGNED */}
//       {isViewModalOpen && clientToView && (
//         <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
//           <div className="bg-slate-50 rounded-3xl w-full max-w-4xl shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95">
            
//             {/* Sleek Gradient Header */}
//             <div className="relative px-8 pt-6 pb-16 bg-gradient-to-r from-blue-700 to-indigo-800 text-white rounded-t-3xl flex justify-between items-start overflow-hidden">
//               <div className="absolute top-0 right-0 -mt-10 -mr-10 h-40 w-40 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
              
//               <div className="flex items-center gap-5 z-10">
//                 <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md border border-white/30 shadow-inner">
//                   <UserCircle size={36} className="text-white" />
//                 </div>
//                 <div>
//                   <h2 className="text-2xl font-black tracking-tight">{clientToView.assesseeName}</h2>
//                   <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-blue-100 font-medium">
//                     <span className="flex items-center gap-1.5 bg-black/20 px-2.5 py-1 rounded-md border border-white/10 font-mono tracking-wider text-white">
//                       <Hash size={12} className="opacity-70"/> {clientToView.pan || 'N/A'}
//                     </span>
//                     <span className="flex items-center gap-1.5">
//                       <FileText size={14} className="opacity-70"/> {clientToView.itrFiledUpToAY || 'AY 2025-26'}
//                     </span>
//                     <span className="flex items-center gap-1.5">
//                       <Phone size={14} className="opacity-70"/> {clientToView.mobile}
//                     </span>
//                   </div>
//                 </div>
//               </div>
//               <button onClick={() => setIsViewModalOpen(false)} className="z-10 p-2 rounded-full bg-black/10 hover:bg-black/20 text-white transition-colors"><X size={20} strokeWidth={2.5} /></button>
//             </div>
            
//             <div className="overflow-y-auto p-6 md:p-8 space-y-6 custom-scrollbar">
              
//               {/* Top Row: General Info & Filing Status */}
//               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
//                 {/* Contact & Demographics Card */}
//                 <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden">
//                   <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
//                   <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
//                     <Navigation size={14}/> Contact & Address
//                   </h3>
                  
//                   <div className="space-y-4">
//                     <div>
//                       <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Email Address</p>
//                       <p className="text-sm font-semibold text-slate-800">{clientToView.email || 'N/A'}</p>
//                     </div>
                    
//                     <div className="grid grid-cols-2 gap-4">
//                       <div>
//                         <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Date of Birth</p>
//                         <p className="text-sm font-semibold text-slate-800">{clientToView.dob ? new Date(clientToView.dob).toLocaleDateString('en-IN') : 'N/A'}</p>
//                       </div>
//                       <div>
//                         <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Lead Source</p>
//                         <p className="text-sm font-semibold text-slate-800">
//                           {clientToView.leadSource || 'Google'}
//                           {clientToView.leadSource === 'BA' && clientToView.referredByBA && ` (${clientToView.referredByBA.baName || clientToView.referredByBA.name || 'BA'})`}
//                           {clientToView.leadSource === 'Reference' && clientToView.referenceName && ` (${clientToView.referenceName})`}
//                           {clientToView.leadSource === 'Other' && clientToView.otherSourceName && ` (${clientToView.otherSourceName})`}
//                         </p>
//                       </div>
//                     </div>
                    
//                     <div className="pt-3 border-t border-slate-100">
//                       <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Registered Address</p>
//                       <p className="text-sm font-semibold text-slate-700">
//                         {[clientToView.district, clientToView.state, clientToView.pinCode || clientToView.pincode].filter(Boolean).join(', ') || 'Address not registered'}
//                       </p>
//                     </div>
//                   </div>
//                 </div>

//                 {/* Workflow Status Card */}
//                 <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden">
//                   <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
//                   <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
//                     <Activity size={14}/> ITR Tracking Status
//                   </h3>
                  
//                   <div className="space-y-4">
//                     <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
//                       <span className="text-xs font-bold text-slate-500">Live Status</span>
//                       <span className={`px-3 py-1 rounded-lg text-xs font-bold shadow-sm border ${getStatusStyle(clientToView.itrStatus)}`}>
//                         {clientToView.itrStatus || 'Documents Pending'}
//                       </span>
//                     </div>

//                     <div className="grid grid-cols-2 gap-4">
//                       <div>
//                         <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Verification Method</p>
//                         <p className="text-sm font-bold text-slate-700">{clientToView.verificationMethod || 'Pending'}</p>
//                       </div>
//                       <div>
//                         <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Processing Status</p>
//                         <p className="text-sm font-bold text-slate-700">{clientToView.itrProcessedStatus || 'Pending'}</p>
//                       </div>
//                     </div>

//                     <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-100">
//                       <div>
//                         <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Filing Date</p>
//                         <p className="text-sm font-bold text-emerald-600">{clientToView.filingDate ? new Date(clientToView.filingDate).toLocaleDateString('en-IN') : 'N/A'}</p>
//                       </div>
//                       <div>
//                         <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Next Reminder</p>
//                         <p className="text-sm font-bold text-amber-600">{clientToView.nextReminderDate ? new Date(clientToView.nextReminderDate).toLocaleDateString('en-IN') : 'Not Set'}</p>
//                       </div>
//                     </div>
//                   </div>
//                 </div>
//               </div>

//               {/* Tax Computation Wide Card */}
//               <div className="bg-gradient-to-br from-indigo-50/50 to-blue-50/50 p-6 rounded-2xl border border-indigo-100 shadow-sm relative overflow-hidden">
//                 <div className="absolute top-0 right-0 text-indigo-500 opacity-5 -mt-6 -mr-6"><Calculator size={150} /></div>
                
//                 <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5">
//                   <h3 className="text-sm font-black text-indigo-900 flex items-center gap-2 z-10">
//                     <Calculator size={18} className="text-indigo-600"/> Tax Computation & Portal Info
//                   </h3>
                  
//                   {/* 🔴 ACKNOWLEDGEMENT NO IN VIEW PROFILE */}
//                   {clientToView.acknowledgementNo && clientToView.acknowledgementNo !== 'N/A' && (
//                     <div className="mt-3 sm:mt-0 flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-indigo-200 shadow-sm z-10">
//                       <span className="text-[10px] font-bold uppercase text-slate-500">Ack No.</span>
//                       <span className="text-sm font-mono font-black text-indigo-700">{clientToView.acknowledgementNo}</span>
//                     </div>
//                   )}
//                 </div>
                 
//                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 bg-white/70 p-4 rounded-xl border border-white mb-5 z-10 relative shadow-sm backdrop-blur-sm">
//                    <div>
//                      <span className="text-slate-400 uppercase font-bold block text-[10px] mb-1">Form No</span>
//                      <span className="font-black text-slate-800">{clientToView.formNo || 'ITR-1'}</span>
//                    </div>
//                    <div>
//                      <span className="text-slate-400 uppercase font-bold block text-[10px] mb-1">Tax Regime</span>
//                      <span className="font-black text-slate-800">{clientToView.regime || 'New'}</span>
//                    </div>
//                    <div>
//                      <span className="text-slate-400 uppercase font-bold block text-[10px] mb-1">Return Type</span>
//                      <span className={`font-bold px-2 py-0.5 rounded text-xs inline-block ${getReturnTypeStyle(clientToView.returnType)}`}>{clientToView.returnType || 'Original'}</span>
//                    </div>
//                    <div>
//                      <span className="text-slate-400 uppercase font-bold block text-[10px] mb-1">Filed By</span>
//                      <span className="font-black text-slate-800">{clientToView.itrFiledBy || 'N/A'}</span>
//                    </div>
//                    <div>
//                      <span className="text-slate-400 uppercase font-bold block text-[10px] mb-1">Portal Password</span>
//                      <span className="font-bold text-rose-600 flex items-center gap-1.5"><Key size={12}/> {clientToView.portalPassword || 'N/A'}</span>
//                    </div>
//                  </div>

//                  <div className="grid grid-cols-2 md:grid-cols-6 gap-4 z-10 relative bg-white p-4 rounded-xl border border-indigo-100 shadow-sm">
//                     <div>
//                       <p className="text-[10px] uppercase text-slate-500 font-bold mb-1">Total Income</p>
//                       <p className="text-base font-black text-slate-800">₹{clientToView.totalIncome || 0}</p>
//                     </div>
//                     <div>
//                       <p className="text-[10px] uppercase text-slate-500 font-bold mb-1">Income Tax</p>
//                       <p className="text-base font-black text-slate-800">₹{clientToView.incomeTax || 0}</p>
//                     </div>
//                     <div>
//                       <p className="text-[10px] uppercase text-slate-500 font-bold mb-1">TDS</p>
//                       <p className="text-base font-black text-slate-800">₹{clientToView.tds || 0}</p>
//                     </div>
//                     <div>
//                       <p className="text-[10px] uppercase text-slate-500 font-bold mb-1">TCS</p>
//                       <p className="text-base font-black text-slate-800">₹{clientToView.tcs || 0}</p>
//                     </div>
//                     <div>
//                       <p className="text-[10px] uppercase text-slate-500 font-bold mb-1">Self/Adv Tax</p>
//                       <p className="text-base font-black text-slate-800">₹{clientToView.selfAdvTax || 0}</p>
//                     </div>
//                     <div className="bg-indigo-50/80 -m-2 p-2 rounded-lg border border-indigo-100 flex flex-col justify-center">
//                       <p className="text-[10px] uppercase text-indigo-600 font-bold mb-1">Payable / (Refund)</p>
//                       <p className={`text-base font-black ${Number(clientToView.refund) < 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
//                         ₹{Math.abs(clientToView.refund || 0)} {Number(clientToView.refund) < 0 ? '(Ref)' : ''}
//                       </p>
//                     </div>
//                  </div>
//               </div>

//               {/* Bottom Row: Bank & Fees */}
//               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
//                 {/* Bank Details */}
//                 <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
//                   <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
//                     <CreditCard size={14}/> Bank Details
//                   </h3>
//                   <div className="space-y-4">
//                     <div>
//                       <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Bank Name</p>
//                       <p className="text-sm font-bold text-slate-800">{clientToView.bankName || 'N/A'}</p>
//                     </div>
//                     <div className="grid grid-cols-2 gap-4">
//                       <div>
//                         <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Account No.</p>
//                         <p className="text-sm font-mono font-bold text-slate-800">{clientToView.accountNo || 'N/A'}</p>
//                       </div>
//                       <div>
//                         <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">IFSC Code</p>
//                         <p className="text-sm font-mono font-bold text-slate-800 uppercase">{clientToView.ifscCode || 'N/A'}</p>
//                       </div>
//                     </div>
//                   </div>
//                 </div>

//                 {/* Fee Status */}
//                 <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
//                   <div className="flex justify-between items-center mb-4">
//                     <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
//                       <IndianRupee size={14}/> Professional Fees
//                     </h3>
//                     <div className="flex gap-2">
//                        <span className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-md border ${['Paid', 'Monthly', 'Yearly', 'Quarterly', 'Half-Yearly'].includes(clientToView.feeStatus) ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : clientToView.feeStatus === 'FOC' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
//                          {clientToView.feeStatus || 'Paid'}
//                        </span>
//                     </div>
//                   </div>
                  
//                   <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex justify-between items-center h-20">
//                     <div>
//                       <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Total Fee</p>
//                       <p className="text-lg font-black text-slate-800">₹{clientToView.feeAmount || 0}</p>
//                     </div>
//                     <div className="w-px h-10 bg-slate-200"></div>
//                     <div>
//                       <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Received</p>
//                       <p className="text-lg font-black text-emerald-600">₹{clientToView.amountReceived || 0}</p>
//                     </div>
//                     <div className="w-px h-10 bg-slate-200"></div>
//                     <div>
//                       <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Balance Due</p>
//                       <p className="text-lg font-black text-rose-600">₹{(clientToView.feeAmount || 0) - (clientToView.amountReceived || 0)}</p>
//                     </div>
//                   </div>
//                 </div>

//               </div>

//             </div>
            
//             <div className="flex justify-between items-center px-6 py-4 border-t border-slate-100 bg-white rounded-b-3xl">
//               {isAdmin ? (
//                 <button 
//                   onClick={() => { setIsViewModalOpen(false); confirmDelete(clientToView); }} 
//                   className="px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors border border-transparent hover:border-rose-200 flex items-center gap-1.5"
//                 >
//                   <Trash2 size={15} /> Remove Workspace
//                 </button>
//               ) : <div></div>}

//               <div className="flex items-center gap-3">
//                 <button onClick={() => setIsViewModalOpen(false)} className="px-5 py-2.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors">
//                   Close Profile
//                 </button>
//                 <button 
//                   onClick={() => { setIsViewModalOpen(false); handleOpenEdit(clientToView); }} 
//                   className="px-5 py-2.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center gap-2"
//                 >
//                   <Pencil size={15} strokeWidth={2.5}/> Edit Details
//                 </button>
//               </div>
//             </div>

//           </div>
//         </div>
//       )}

//       {/* REMARKS MODAL */}
//       {isRemarksModalOpen && clientForRemarks && (
//         <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
//           <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl border border-slate-100 flex flex-col max-h-[85vh] overflow-hidden animate-in fade-in zoom-in-95">
//             <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/80">
//               <div className="flex items-center gap-3">
//                 <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold"><MessageSquare size={20} /></div>
//                 <div>
//                   <h2 className="text-base font-bold text-slate-800 tracking-tight">ITR Notes & Remarks</h2>
//                   <p className="text-xs text-slate-500">{clientForRemarks.assesseeName} • <span className="font-mono font-semibold text-blue-600">{clientForRemarks.pan}</span></p>
//                 </div>
//               </div>
//               <button onClick={() => setIsRemarksModalOpen(false)} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors"><X size={18} /></button>
//             </div>
            
//             <div className="overflow-y-auto p-6 space-y-4 custom-scrollbar">
//               <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 text-xs text-slate-700 font-medium whitespace-pre-wrap min-h-[140px] max-h-[220px] overflow-y-auto shadow-inner leading-relaxed custom-scrollbar">
//                 {clientForRemarks.remarks && getFilteredItrRemarks(clientForRemarks.remarks) 
//                   ? getFilteredItrRemarks(clientForRemarks.remarks) 
//                   : <span className="text-slate-400 italic">No ITR specific notes or history recorded yet.</span>}
//               </div>

//               <form onSubmit={handleAddRemarkSubmit} className="space-y-3 pt-2">
//                 <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">Add New Progress Note</label>
//                 <div className="relative">
//                   <textarea 
//                     rows="3" 
//                     value={newRemarkText} 
//                     onChange={(e) => setNewRemarkText(e.target.value)} 
//                     placeholder="Enter ITR filing update, document pending notes, etc..." 
//                     className="w-full text-xs font-medium border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none shadow-sm"
//                   />
//                   <button 
//                     type="submit" 
//                     disabled={!newRemarkText.trim()}
//                     className="absolute right-3 bottom-3 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm transition-all"
//                   >
//                     <Send size={12} /> Post Note
//                   </button>
//                 </div>
//               </form>
//             </div>
//             <div className="flex justify-end items-center px-6 py-4 border-t border-slate-100 bg-white rounded-b-3xl">
//               <button onClick={() => setIsRemarksModalOpen(false)} className="px-5 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors">Close</button>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* UNLINK CONFIRMATION MODAL */}
//       {isDeleteModalOpen && clientToDelete && (
//         <div className="fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
//           <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 p-8 text-center space-y-4 animate-in fade-in zoom-in-95">
//             <div className="mx-auto h-14 w-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center"><AlertTriangle size={26} /></div>
//             <div>
//               <h3 className="text-lg font-bold text-slate-800 tracking-tight">Remove from Workspace?</h3>
//               <p className="text-xs text-slate-500 mt-1 leading-relaxed">
//                 Are you sure you want to remove <span className="font-bold text-slate-700">{clientToDelete.assesseeName}</span> from the active ITR workflow? <br/><br/>
//                 <span className="text-blue-600 bg-blue-50 px-2 py-1 rounded font-medium">This client will remain safe in the main CRM list.</span>
//               </p>
//             </div>
//             <div className="flex justify-center gap-3 pt-3">
//               <button onClick={() => setIsDeleteModalOpen(false)} className="px-5 py-2.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors">Cancel</button>
//               <button onClick={handleDelete} className="px-5 py-2.5 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-md shadow-rose-500/20 transition-colors">Yes, Remove</button>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* ADD / EDIT MODAL */}
//       {isModalOpen && (
//         <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
//           <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95">
            
//             <div className="flex justify-between items-center px-8 py-5 border-b border-slate-100 bg-slate-50/80">
//               <div>
//                 <h2 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
//                   <FileText className="text-blue-600" size={24}/> {editMode ? 'Edit ITR Return Details' : 'Add ITR Return'}
//                 </h2>
//                 <p className="text-xs text-slate-500 mt-1">Manage portal credentials, tax computations, and filing dates.</p>
//               </div>
//               <button onClick={() => setIsModalOpen(false)} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors"><X size={20} /></button>
//             </div>

//             <form onSubmit={handleSubmit} className="overflow-y-auto p-8 space-y-8 custom-scrollbar">

//               {/* SECTION 1: CORE INFO */}
//               <div>
//                 <h3 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4">1. Primary Information</h3>
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  
//                   {/* 🔴 PAN AUTOCOMPLETE DROPDOWN */}
//                   <div className="md:col-span-1 relative">
//                     <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">PAN Number *</label>
//                     <input 
//                       type="text" 
//                       name="pan" 
//                       required 
//                       maxLength="10"
//                       value={formData.pan} 
//                       onChange={handlePanChange}
//                       onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
//                       autoComplete="off"
//                       disabled={editMode && !isAdmin} 
//                       className="w-full text-sm font-bold border border-slate-200 rounded-xl p-3 uppercase focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-100 outline-none relative z-10" 
//                     />
//                     {fetchingPan && !editMode && <Loader2 size={14} className="absolute right-3 top-10 animate-spin text-blue-500 z-20"/>}
                    
//                     {/* Suggestion List Box */}
//                     {showSuggestions && !editMode && panSuggestions.length > 0 && (
//                       <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto custom-scrollbar">
//                         {panSuggestions.map((client) => (
//                           <div 
//                             key={client._id} 
//                             onClick={() => handleSelectSuggestion(client)}
//                             className="p-3 border-b border-slate-50 hover:bg-blue-50 cursor-pointer transition-colors"
//                           >
//                             <p className="text-xs font-black text-slate-800 tracking-wider uppercase">{client.pan}</p>
//                             <p className="text-[10px] font-bold text-slate-500 truncate">{client.name}</p>
//                           </div>
//                         ))}
//                       </div>
//                     )}
//                   </div>

//                   <div className="md:col-span-1">
//                     <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Assessee Name *</label>
//                     <input type="text" name="assesseeName" required value={formData.assesseeName} onChange={handleChange} disabled={editMode && !isAdmin} className="w-full text-sm font-semibold border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-100" />
//                   </div>
                  
//                   <div>
//                     <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Mobile Number *</label>
//                     <input type="tel" name="mobile" required value={formData.mobile} onChange={handleChange} disabled={editMode && !isAdmin} className="w-full text-sm font-medium border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-100" />
//                   </div>

//                   <div className={sourceNeedsExtraField ? 'md:col-span-1' : 'md:col-span-2'}>
//                     <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Client Acquisition Source</label>
//                     <select name="leadSource" value={formData.leadSource} onChange={handleChange} 
//                       disabled={editMode && !isAdmin} 
//                       className={`w-full text-sm border border-slate-200 rounded-xl p-3 transition-all ${editMode && !isAdmin ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'}`}
//                     >
//                       <option value="Google">Google Ads</option>
//                       <option value="FB">Facebook</option>
//                       <option value="Insta">Instagram</option>
//                       <option value="Walk-in">Walk-in</option>
//                       <option value="Reference">Reference</option>
//                       <option value="BA">Business Associate (BA)</option>
//                       <option value="Website">Website Form</option>
//                       <option value="WhatsApp">WhatsApp</option>
//                       <option value="Other">Other</option>
//                     </select>
//                   </div>

//                   {formData.leadSource === 'BA' && (
//                     <div className="md:col-span-1 animate-in fade-in slide-in-from-top-1 duration-200">
//                       <label className="block text-xs font-bold uppercase tracking-wider text-indigo-600 mb-1.5">Select BA Partner <span className="text-rose-500">*</span></label>
//                       <select name="referredByBA" required={formData.leadSource === 'BA'} value={formData.referredByBA} onChange={handleChange} disabled={editMode && !isAdmin} className={`w-full text-sm font-medium border rounded-xl p-3 transition-all ${editMode && !isAdmin ? 'border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed' : 'border-indigo-200 bg-indigo-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500'}`}>
//                         <option value="">-- Choose Partner --</option>
//                         {bas.map(ba => (<option key={ba._id} value={ba._id}>{ba.baName || ba.name}</option>))}
//                       </select>
//                     </div>
//                   )}
//                   {formData.leadSource === 'Reference' && (
//                     <div className="md:col-span-1 animate-in fade-in slide-in-from-top-1 duration-200">
//                       <label className="block text-xs font-bold uppercase tracking-wider text-emerald-600 mb-1.5">Reference Name <span className="text-rose-500">*</span></label>
//                       <input type="text" name="referenceName" required={formData.leadSource === 'Reference'} value={formData.referenceName} onChange={handleChange} disabled={editMode && !isAdmin} placeholder="Who referred them?" className={`w-full text-sm font-medium border rounded-xl p-3 transition-all ${editMode && !isAdmin ? 'border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed' : 'border-emerald-200 bg-emerald-50/50 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500'}`} />
//                     </div>
//                   )}
//                   {formData.leadSource === 'Other' && (
//                     <div className="md:col-span-1 animate-in fade-in slide-in-from-top-1 duration-200">
//                       <label className="block text-xs font-bold uppercase tracking-wider text-orange-600 mb-1.5">Other Source <span className="text-rose-500">*</span></label>
//                       <input type="text" name="otherSourceName" required={formData.leadSource === 'Other'} value={formData.otherSourceName} onChange={handleChange} disabled={editMode && !isAdmin} placeholder="Specify the source..." className={`w-full text-sm font-medium border rounded-xl p-3 transition-all ${editMode && !isAdmin ? 'border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed' : 'border-orange-200 bg-orange-50/50 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500'}`} />
//                     </div>
//                   )}

//                   <div>
//                     <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Email ID</label>
//                     <input type="email" name="email" value={formData.email} onChange={handleChange} disabled={editMode && !isAdmin} placeholder="assessee@example.com" className="w-full text-sm font-medium border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-100" />
//                   </div>
//                   <div>
//                     <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Date of Birth (DOB)</label>
//                     <input type="date" name="dob" value={formData.dob} onChange={handleChange} disabled={editMode && !isAdmin} className="w-full text-sm font-medium border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500/20 text-slate-700 disabled:bg-slate-100" />
//                   </div>
//                   <div>
//                     <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">District</label>
//                     <input type="text" name="district" value={formData.district} onChange={handleChange} disabled={editMode && !isAdmin} placeholder="e.g. South Delhi" className="w-full text-sm font-medium border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-100" />
//                   </div>
//                   <div>
//                     <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">State</label>
//                     <input type="text" name="state" value={formData.state} onChange={handleChange} disabled={editMode && !isAdmin} placeholder="e.g. Delhi" className="w-full text-sm font-medium border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-100" />
//                   </div>
//                   <div className="md:col-span-2">
//                     <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">PIN Code</label>
//                     <input type="text" name="pinCode" value={formData.pinCode} onChange={handleChange} disabled={editMode && !isAdmin} placeholder="110001" className="w-full text-sm font-medium border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-100" />
//                   </div>
//                 </div>
//               </div>

//               {/* BANK DETAILS SECTION */}
//               <div>
//                 <h3 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4 flex items-center gap-2"><CreditCard size={16} className="text-blue-600"/> Bank Account Details</h3>
//                 <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
//                   <div>
//                     <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Bank Name</label>
//                     <input type="text" name="bankName" value={formData.bankName} onChange={handleChange} disabled={editMode && !isAdmin} placeholder="e.g. HDFC Bank" className="w-full text-sm font-medium border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-100" />
//                   </div>
//                   <div>
//                     <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Account Number</label>
//                     <input type="text" name="accountNo" value={formData.accountNo} onChange={handleChange} disabled={editMode && !isAdmin} placeholder="Account No" className="w-full text-sm font-medium border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500/20 font-mono disabled:bg-slate-100" />
//                   </div>
//                   <div>
//                     <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">IFSC Code</label>
//                     <input type="text" name="ifscCode" value={formData.ifscCode} onChange={handleChange} disabled={editMode && !isAdmin} placeholder="HDFC0001234" className="w-full text-sm font-medium border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500/20 uppercase font-mono disabled:bg-slate-100" />
//                   </div>
//                 </div>
//               </div>

//               {/* TAX DETAILS FORM BLOCK WITH ALL FIELDS */}
//               <div className="bg-indigo-50/50 p-5 rounded-2xl border border-indigo-100">
//                 <h3 className="text-sm font-bold text-indigo-900 border-b border-indigo-200 pb-2 mb-4 flex items-center gap-2">
//                   <Calculator size={16} className="text-indigo-600"/> Tax Computation & Assessment
//                 </h3>
//                 <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                  
//                   <div className="md:col-span-1">
//                     <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">Form No</label>
//                     <select name="formNo" value={formData.formNo} onChange={handleChange} className="w-full text-sm border border-indigo-200 bg-white rounded-xl p-2.5 font-semibold text-indigo-900">
//                       <option value="ITR-1">ITR-1</option>
//                       <option value="ITR-2">ITR-2</option>
//                       <option value="ITR-3">ITR-3</option>
//                       <option value="ITR-4">ITR-4</option>
//                       <option value="ITR-5">ITR-5</option>
//                       <option value="ITR-6">ITR-6</option>
//                       <option value="ITR-7">ITR-7</option>
//                     </select>
//                   </div>

//                   <div className="md:col-span-1">
//                     <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">Regime</label>
//                     <select name="regime" value={formData.regime} onChange={handleChange} className="w-full text-sm border border-indigo-200 bg-white rounded-xl p-2.5 font-semibold">
//                       <option value="New">New Regime</option>
//                       <option value="Old">Old Regime</option>
//                     </select>
//                   </div>

//                   <div className="md:col-span-1">
//                     <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">Return Type</label>
//                     <select name="returnType" value={formData.returnType} onChange={handleChange} className="w-full text-sm border border-indigo-200 bg-white rounded-xl p-2.5 font-semibold text-indigo-700">
//                       <option value="Original">Original</option>
//                       <option value="Revised">Revised</option>
//                       <option value="Updated">Updated</option>
//                     </select>
//                   </div>

//                   <div className="md:col-span-1">
//                     <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">ITR Filed By</label>
//                     <input type="text" name="itrFiledBy" value={formData.itrFiledBy} onChange={handleChange} className="w-full text-sm border border-indigo-200 rounded-xl p-2.5 bg-white font-medium" placeholder="Staff / Name" />
//                   </div>

//                   <div className="md:col-span-2">
//                     <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">Acknowledgement No.</label>
//                     <input type="text" name="acknowledgementNo" value={formData.acknowledgementNo} onChange={handleChange} className="w-full text-sm border border-indigo-200 rounded-xl p-2.5 bg-white font-mono" placeholder="Enter Ack No." />
//                   </div>

//                   <div className="md:col-span-1">
//                     <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">Verification Method</label>
//                     <select name="verificationMethod" value={formData.verificationMethod} onChange={handleChange} className="w-full text-sm border border-indigo-200 bg-white rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500/20 text-slate-700">
//                        <option value="Pending">Pending / Not Verified</option>
//                        <option value="Aadhaar OTP">Aadhaar OTP</option>
//                        <option value="Net Banking / EVC">Net Banking / EVC</option>
//                        <option value="Sent to CPC (Physical)">Sent to CPC (Physical)</option>
//                     </select>
//                   </div>
//                   <div className="md:col-span-1">
//                     <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">Processed Status</label>
//                     <select name="itrProcessedStatus" value={formData.itrProcessedStatus} onChange={handleChange} className="w-full text-sm border border-indigo-200 bg-white rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500/20 text-slate-700 font-semibold">
//                        <option value="Pending">Pending / Just Filed</option>
//                        <option value="Successfully E-verified">Successfully E-verified</option>
//                        <option value="Processing">Processing</option>
//                        <option value="Processed">Processed</option>
//                        <option value="Processed with Refund">Processed with Refund</option>
//                        <option value="Defective">Defective</option>
//                     </select>
//                   </div>

//                   <div>
//                     <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1.5">Total Income (₹)</label>
//                     <input type="number" name="totalIncome" value={formData.totalIncome} onChange={handleChange} className="w-full text-sm border border-indigo-200 rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500/20 bg-white" placeholder="0" />
//                   </div>
//                   <div>
//                     <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1.5">Income Tax (₹)</label>
//                     <input type="number" name="incomeTax" value={formData.incomeTax} onChange={handleChange} className="w-full text-sm border border-indigo-200 rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500/20 bg-white" placeholder="0" />
//                   </div>
//                   <div>
//                     <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1.5">TDS (₹)</label>
//                     <input type="number" name="tds" value={formData.tds} onChange={handleChange} className="w-full text-sm border border-indigo-200 rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500/20 bg-white" placeholder="0" />
//                   </div>
//                   <div>
//                     <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1.5">TCS (₹)</label>
//                     <input type="number" name="tcs" value={formData.tcs} onChange={handleChange} className="w-full text-sm border border-indigo-200 rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500/20 bg-white" placeholder="0" />
//                   </div>
//                   <div>
//                     <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1.5">Self / Adv Tax (₹)</label>
//                     <input type="number" name="selfAdvTax" value={formData.selfAdvTax} onChange={handleChange} className="w-full text-sm border border-indigo-200 rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500/20 bg-white" placeholder="0" />
//                   </div>
//                   <div>
//                     <label className="block text-[10px] font-bold uppercase text-indigo-700 mb-1.5">Payable / (Refund)</label>
//                     <input type="number" name="refund" value={formData.refund} readOnly className="w-full text-sm border border-indigo-300 rounded-xl p-2.5 bg-indigo-100 font-bold text-indigo-900 cursor-not-allowed" placeholder="0" />
//                   </div>
//                 </div>
//               </div>

//               <div className="bg-blue-50/30 p-5 rounded-2xl border border-blue-100">
//                  <h3 className="text-sm font-bold text-slate-800 mb-4 pb-2 border-b border-blue-200 flex items-center gap-2"><Activity size={16} className="text-blue-600"/> Workflow & Portal Details</h3>
//                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                   
//                     <div className="md:col-span-1">
//                       <label className="block text-[11px] font-bold uppercase tracking-wider text-blue-600 mb-1.5">Live Workflow Status</label>
//                       <select name="itrStatus" value={formData.itrStatus} onChange={handleChange} className={`w-full text-sm font-bold border rounded-xl p-3 focus:ring-2 focus:outline-none shadow-sm ${getStatusStyle(formData.itrStatus)}`}>
//                         <option value="Documents Pending">⏳ Documents Pending</option>
//                         <option value="Processing">⚙️ Processing</option>
//                         <option value="Filed">✅ Filed</option>
//                         <option value="E-Verified">🛡️ E-Verified</option>
//                         <option value="Refund Issued">💸 Refund Issued</option>
//                       </select>
//                     </div>

//                     <div className="md:col-span-1">
//                       <label className="block text-[11px] font-bold uppercase tracking-wider text-rose-600 mb-1.5 flex items-center gap-1"><Key size={12}/> E-Filing Portal Password</label>
//                       <input type="text" name="portalPassword" value={formData.portalPassword} onChange={handleChange} placeholder="e.g. Ramesh@123" className="w-full text-sm font-medium border border-rose-200 bg-white rounded-xl p-3 focus:ring-2 focus:ring-rose-500/20" />
//                     </div>

//                     <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
//                       <div>
//                         <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Assessment Year</label>
//                         <select name="itrFiledUpToAY" value={formData.itrFiledUpToAY} onChange={handleChange} className="w-full text-sm font-medium border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500/20 bg-white">
//                           <option value="AY 2025-26">AY 2025-26</option>
//                           <option value="AY 2024-25">AY 2024-25</option>
//                           <option value="AY 2023-24">AY 2023-24</option>
//                         </select>
//                       </div>
//                       <div>
//                         <label className="block text-[11px] font-bold uppercase tracking-wider text-emerald-600 mb-1.5">Date of Filing</label>
//                         <input type="date" name="filingDate" value={formData.filingDate} onChange={handleChange} className="w-full text-sm font-medium border border-emerald-200 rounded-xl p-3 focus:ring-2 focus:ring-emerald-500/20 bg-white" />
//                       </div>
//                       <div>
//                         <label className="block text-[11px] font-bold uppercase tracking-wider text-amber-600 mb-1.5">Next Year Reminder</label>
//                         <input type="date" name="nextReminderDate" value={formData.nextReminderDate} onChange={handleChange} className="w-full text-sm font-medium border border-amber-200 rounded-xl p-3 focus:ring-2 focus:ring-amber-500/20 bg-white" />
//                       </div>
//                     </div>
//                  </div>
//               </div>

//               <div>
//                 <h3 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4">Fees & Remarks</h3>
//                 <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
//                   <div>
//                     <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Fee Status</label>
//                     <select name="feeStatus" value={formData.feeStatus} onChange={handleChange} className="w-full text-sm font-medium border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500/20 bg-white">
//                       <option value="Paid">Paid Fully</option>
//                       <option value="Dues">Payment Pending</option>
//                       <option value="FOC">Free of Cost (FOC)</option>
//                     </select>
//                   </div>
//                   <div>
//                     <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Total Fee (₹)</label>
//                     <input type="number" name="feeAmount" value={formData.feeAmount} onChange={handleChange} className="w-full text-sm font-medium border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500/20 bg-white" />
//                   </div>
//                   <div>
//                     <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Received (₹)</label>
//                     <input type="number" name="amountReceived" value={formData.amountReceived} onChange={handleChange} className="w-full text-sm font-medium border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500/20 bg-white" />
//                   </div>
//                 </div>
//               </div>

//               <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100">
//                 <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">Cancel</button>
//                 <button type="submit" className="px-8 py-2.5 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center gap-2">
//                   <CheckCircle2 size={18} /> {editMode ? 'Save Changes' : 'Save ITR Return'}
//                 </button>
//               </div>
//             </form>
//           </div>
//         </div>
//       )}

//     </div>
//   );
// };

// export default ItrReturns;











import React, { useState, useEffect, useContext, useMemo, useRef } from 'react';
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
  UserCircle, Mail, AlertTriangle, Send, Calculator, CreditCard, Download, Upload, Hash, Navigation,
  Wallet, CheckSquare, Loader2
} from 'lucide-react';

const ItrReturns = () => {
  const { user } = useContext(AuthContext);
  
  const [importList, setImportList] = useState([]); 
  const [itrClients, setItrClients] = useState([]); 
  const [bas, setBas] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // 🔴 Autocomplete ke states
  const [fetchingPan, setFetchingPan] = useState(false);
  const [panSuggestions, setPanSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [verificationFilter, setVerificationFilter] = useState('ALL');
  const [processedFilter, setProcessedFilter] = useState('ALL');
  const [returnTypeFilter, setReturnTypeFilter] = useState('ALL');

  const [selectedIds, setSelectedIds] = useState([]);

  const fileInputRef = useRef(null);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentItrId, setCurrentItrId] = useState(null);
  const [importClientId, setImportClientId] = useState(''); 

  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [clientToView, setClientToView] = useState(null);
  
  const [isRemarksModalOpen, setIsRemarksModalOpen] = useState(false);
  const [clientForRemarks, setClientForRemarks] = useState(null);
  const [newRemarkText, setNewRemarkText] = useState('');

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState(null);

  const isAdmin = user?.role === 'Admin';

  const initialForm = {
    assesseeName: '', pan: '', dob: '', mobile: '', email: '', 
    district: '', state: '', pinCode: '',
    leadSource: 'Google', referredByBA: '', referenceName: '', otherSourceName: '',
    itrFiledUpToAY: 'AY 2025-26', filingDate: '', nextReminderDate: '',
    feeStatus: 'Paid', feeAmount: '', amountReceived: '',
    itrStatus: 'Documents Pending', portalPassword: '',
    totalIncome: '', incomeTax: '', tds: '', tcs: '', selfAdvTax: '', refund: '',
    verificationMethod: 'Pending', itrProcessedStatus: 'Pending',
    itrFiledBy: '', regime: 'New', formNo: 'ITR-1',
    bankName: '', accountNo: '', ifscCode: '',
    acknowledgementNo: '', returnType: 'Original'
  };
  const [formData, setFormData] = useState(initialForm);

  const getFilteredItrRemarks = (remarksStr) => {
    if (!remarksStr) return '';
    const blocks = remarksStr.split(/(?=\n\n--------------------------------------\n|\n?📅 )/);
    const filtered = blocks.filter(block => {
      const lower = block.toLowerCase();
      return (
        lower.includes('(itr return note)') ||
        lower.includes('workspace note') ||
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
      
      const [crmRes, itrRes, basRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_URL}/clients`, { headers }), 
        axios.get(`${import.meta.env.VITE_API_URL}/itr`, { headers }),     
        axios.get(`${import.meta.env.VITE_API_URL}/bas`, { headers }).catch(() => ({ data: [] }))
      ]);
      
      const crmClients = crmRes.data || [];
      const activeItrRecords = itrRes.data || [];

      const availableForImport = crmClients.filter(c => c.service === 'ITR Filing');

      setImportList(availableForImport); 
      setItrClients(activeItrRecords); 
      setBas(basRes.data || []);
      setSelectedIds([]); 
    } catch (error) {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line
  }, [user.token]);

  // Smart PAN Autocomplete Search
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

  // Jab dropdown se PAN select karein tab baki fields auto-fill hongi
  const handleSelectSuggestion = (client) => {
    setFormData(prev => ({
      ...prev,
      pan: client.pan,
      assesseeName: client.name || prev.assesseeName,
      mobile: client.mobile || prev.mobile,
      email: client.email || prev.email,
      district: client.district || prev.district,
      state: client.state || prev.state,
      pinCode: client.pinCode || prev.pinCode
    }));
    setShowSuggestions(false); 
    toast.success("✅ Client Data Auto-Filled!");
  };

  const filteredClients = useMemo(() => {
    const filtered = itrClients.filter((client) => {
      const searchStr = searchQuery.toLowerCase();
      // Searching by PAN, Name, and ClientID
      const matchesSearch = 
        (client.assesseeName?.toLowerCase() || '').includes(searchStr) || 
        (client.pan?.toLowerCase() || '').includes(searchStr) ||
        (client.clientMasterId?.clientId?.toLowerCase() || '').includes(searchStr);

      const matchesStatus = statusFilter === 'ALL' || (client.itrStatus || 'Documents Pending') === statusFilter;
      const matchesVerif = verificationFilter === 'ALL' || (client.verificationMethod || 'Pending') === verificationFilter;
      const matchesProc = processedFilter === 'ALL' || (client.itrProcessedStatus || 'Pending') === processedFilter;
      const matchesType = returnTypeFilter === 'ALL' || (client.returnType || 'Original') === returnTypeFilter; 

      return matchesSearch && matchesStatus && matchesVerif && matchesProc && matchesType;
    });
    return filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [itrClients, searchQuery, statusFilter, verificationFilter, processedFilter, returnTypeFilter]);

  const stats = useMemo(() => {
    let totalFeeAmount = 0;
    let totalReceivedAmount = 0;

    filteredClients.forEach(c => {
      totalFeeAmount += Number(c.feeAmount || 0);
      totalReceivedAmount += Number(c.amountReceived || 0);
    });

    return {
      total: filteredClients.length,
      pending: filteredClients.filter(c => (c.itrStatus || 'Documents Pending') === 'Documents Pending').length,
      processing: filteredClients.filter(c => c.itrStatus === 'Processing').length,
      completed: filteredClients.filter(c => ['Filed', 'E-Verified', 'Refund Issued'].includes(c.itrStatus)).length,
      totalFeeAmount,
      totalReceivedAmount,
      totalPendingAmount: totalFeeAmount - totalReceivedAmount
    };
  }, [filteredClients]);

  const handleExportExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('ITR Workspace');

    worksheet.columns = [
      { header: 'Master Client ID', key: 'clientId', width: 20 }, // 🔴 Added Client ID to Export
      { header: 'PAN', key: 'pan', width: 15 },
      { header: 'Assessee Name', key: 'assesseeName', width: 25 },
      { header: 'Mobile', key: 'mobile', width: 15 },
      { header: 'Email', key: 'email', width: 25 },
      { header: 'DOB', key: 'dob', width: 15 },
      { header: 'District', key: 'district', width: 15 },
      { header: 'State', key: 'state', width: 15 },
      { header: 'Pin Code', key: 'pinCode', width: 15 },
      { header: 'ITR Status', key: 'itrStatus', width: 25 },
      { header: 'ITR AY', key: 'itrFiledUpToAY', width: 15 },
      { header: 'Return Type', key: 'returnType', width: 15 },
      { header: 'Acknowledgement No', key: 'acknowledgementNo', width: 25 },
      { header: 'Filing Date', key: 'filingDate', width: 15 },
      { header: 'Next Reminder', key: 'nextReminderDate', width: 15 },
      { header: 'Portal Password', key: 'portalPassword', width: 20 },
      { header: 'Form No', key: 'formNo', width: 15 },
      { header: 'Regime', key: 'regime', width: 15 },
      { header: 'ITR Filed By', key: 'itrFiledBy', width: 20 },
      { header: 'Verification Method', key: 'verificationMethod', width: 25 },
      { header: 'Processed Status', key: 'itrProcessedStatus', width: 25 },
      { header: 'Total Income', key: 'totalIncome', width: 15 },
      { header: 'Income Tax', key: 'incomeTax', width: 15 },
      { header: 'TDS', key: 'tds', width: 15 },
      { header: 'TCS', key: 'tcs', width: 15 },
      { header: 'Self Adv Tax', key: 'selfAdvTax', width: 15 },
      { header: 'Refund/Payable', key: 'refund', width: 15 },
      { header: 'Bank Name', key: 'bankName', width: 20 },
      { header: 'Account No', key: 'accountNo', width: 20 },
      { header: 'IFSC Code', key: 'ifscCode', width: 15 },
      { header: 'Fee Status', key: 'feeStatus', width: 15 },
      { header: 'Total Fee', key: 'feeAmount', width: 15 },
      { header: 'Received Amount', key: 'amountReceived', width: 18 },
      { header: 'System Added By', key: 'createdBy', width: 20 } 
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

    const dataToExport = selectedIds.length > 0 
      ? filteredClients.filter(c => selectedIds.includes(c._id)) 
      : filteredClients;

    dataToExport.forEach(client => { 
      worksheet.addRow({
        clientId: client.clientMasterId?.clientId || 'Pending', // 🔴 Populated ID
        pan: client.pan || '',
        assesseeName: client.assesseeName || '',
        mobile: client.mobile || '',
        email: client.email || '',
        dob: client.dob ? new Date(client.dob).toLocaleDateString('en-IN') : '',
        district: client.district || '',
        state: client.state || '',
        pinCode: client.pinCode || client.pincode || '',
        itrStatus: client.itrStatus || 'Documents Pending',
        itrFiledUpToAY: client.itrFiledUpToAY || '',
        returnType: client.returnType || 'Original',
        acknowledgementNo: client.acknowledgementNo || '',
        filingDate: client.filingDate ? new Date(client.filingDate).toLocaleDateString('en-IN') : '',
        nextReminderDate: client.nextReminderDate ? new Date(client.nextReminderDate).toLocaleDateString('en-IN') : '',
        portalPassword: client.portalPassword || '',
        formNo: client.formNo || '',
        regime: client.regime || '',
        itrFiledBy: client.itrFiledBy || '',
        verificationMethod: client.verificationMethod || '',
        itrProcessedStatus: client.itrProcessedStatus || '',
        totalIncome: client.totalIncome || 0,
        incomeTax: client.incomeTax || 0,
        tds: client.tds || 0,
        tcs: client.tcs || 0,
        selfAdvTax: client.selfAdvTax || 0,
        refund: client.refund || 0,
        bankName: client.bankName || '',
        accountNo: client.accountNo || '',
        ifscCode: client.ifscCode || '',
        feeStatus: client.feeStatus || '',
        feeAmount: client.feeAmount || 0,
        amountReceived: client.amountReceived || 0,
        createdBy: client.createdBy?.name || 'Admin' 
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `ITR_Workspace_${selectedIds.length > 0 ? 'Selected_' : ''}${new Date().toISOString().split('T')[0]}.xlsx`);
    
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
            if (parts.length === 3) {
              let day = parts[0], month = parts[1], year = parts[2];
              if (day.length === 4) { year = parts[0]; month = parts[1]; day = parts[2]; }
              return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            }
            const d = new Date(raw);
            if (!isNaN(d.getTime())) return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          }
          return null;
        };

        const getVal = (row, keys) => {
          for (let key of keys) {
            if (row[key] !== undefined && row[key] !== null) return row[key];
          }
          return '';
        };

        const normalizeFeeStatus = (val) => {
          if (!val) return 'Dues';
          const s = String(val).toLowerCase();
          if (s.includes('paid')) return 'Paid';
          if (s.includes('foc') || s.includes('free')) return 'FOC';
          return 'Dues';
        };

        const normalizeItrStatus = (val) => {
          if (!val) return 'Documents Pending';
          const s = String(val).toLowerCase();
          if (s.includes('file')) return 'Filed';
          if (s.includes('process')) return 'Processing';
          if (s.includes('verif')) return 'E-Verified';
          if (s.includes('refund')) return 'Refund Issued';
          return 'Documents Pending';
        };

        const normalizeReturnType = (val) => {
          if (!val) return 'Original';
          const s = String(val).toLowerCase();
          if (s.includes('revis')) return 'Revised';
          if (s.includes('updat')) return 'Updated';
          return 'Original';
        };

        const formattedItrRecords = data.map(row => ({
          assesseeName: getVal(row, ['Assessee Name', 'Name', 'Client Name', 'Client / Trade Name', 'assesseeName']),
          pan: String(getVal(row, ['PAN', 'pan', 'Pan', 'PAN Number', 'PAN No', 'PAN No.'])),
          mobile: getVal(row, ['Mobile', 'mobile', 'Phone', 'Contact', 'Contact Number']),
          email: getVal(row, ['Email', 'email', 'Email ID']),
          dob: parseDate(getVal(row, ['DOB', 'dob', 'Date of Birth'])),
          district: getVal(row, ['District', 'district', 'City']),
          state: getVal(row, ['State', 'state']),
          pinCode: getVal(row, ['Pin Code', 'Pincode', 'pinCode', 'pincode', 'Zip']),
          itrStatus: normalizeItrStatus(getVal(row, ['ITR Status', 'itrStatus'])),
          itrFiledUpToAY: getVal(row, ['ITR AY', 'itrFiledUpToAY', 'AY']) || 'AY 2025-26',
          returnType: normalizeReturnType(getVal(row, ['Return Type', 'returnType', 'Type'])), 
          acknowledgementNo: String(getVal(row, ['Acknowledgement No', 'Ack No', 'acknowledgementNo', 'Ack Number']) || ''), 
          filingDate: parseDate(getVal(row, ['Filing Date', 'filingDate'])),
          nextReminderDate: parseDate(getVal(row, ['Next Reminder', 'nextReminderDate', 'Next Due Date'])),
          portalPassword: getVal(row, ['Portal Password', 'portalPassword', 'Password']),
          formNo: getVal(row, ['Form No', 'formNo', 'ITR Form']) || 'ITR-1',
          regime: getVal(row, ['Regime', 'regime', 'Tax Regime']) || 'New',
          itrFiledBy: getVal(row, ['ITR Filed By', 'itrFiledBy', 'Filed By']),
          verificationMethod: getVal(row, ['Verification Method', 'verificationMethod']) || 'Pending',
          itrProcessedStatus: getVal(row, ['Processed Status', 'itrProcessedStatus', 'Status']) || 'Pending',
          totalIncome: Number(getVal(row, ['Total Income', 'totalIncome']) || 0),
          incomeTax: Number(getVal(row, ['Income Tax', 'incomeTax']) || 0),
          tds: Number(getVal(row, ['TDS', 'tds']) || 0),
          tcs: Number(getVal(row, ['TCS', 'tcs']) || 0),
          selfAdvTax: Number(getVal(row, ['Self Adv Tax', 'selfAdvTax', 'Advance Tax']) || 0),
          refund: Number(getVal(row, ['Refund/Payable', 'refund', 'Refund']) || 0),
          bankName: getVal(row, ['Bank Name', 'bankName', 'Bank']),
          accountNo: String(getVal(row, ['Account No', 'accountNo', 'Account Number'])),
          ifscCode: String(getVal(row, ['IFSC Code', 'ifscCode', 'IFSC'])),
          feeStatus: normalizeFeeStatus(getVal(row, ['Fee Status', 'feeStatus'])), 
          feeAmount: Number(getVal(row, ['Total Fee', 'feeAmount', 'Fee']) || 0),
          amountReceived: Number(getVal(row, ['Received Amount', 'amountReceived', 'Received']) || 0)
        })).filter(item => item.assesseeName && item.pan); 

        if (formattedItrRecords.length === 0) {
          return toast.error("Import Failed: No valid records found. Ensure your Excel has 'Name' and 'PAN' columns.");
        }

        const headers = { Authorization: `Bearer ${user.token}` };
        const response = await axios.post(`${import.meta.env.VITE_API_URL}/itr/import`, { itrRecords: formattedItrRecords }, { headers });
        
        toast.success(`Successfully imported ${response.data.count} ITR records!`);
        fetchData();
      } catch (error) {
        console.error("Import Error:", error);
        toast.error("Error importing records. Check backend limits.");
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
      await axios.post(`${import.meta.env.VITE_API_URL}/itr/bulk-delete`, { ids: selectedIds }, { headers });
      
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
      await axios.put(`${import.meta.env.VITE_API_URL}/itr/${clientId}`, { itrStatus: newStatus }, { headers });
      setItrClients(prev => prev.map(c => c._id === clientId ? { ...c, itrStatus: newStatus } : c));
      toast.success(`Status updated to ${newStatus}`);
    } catch (error) {
      toast.error("Error updating status");
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      
      if (name === 'leadSource') {
        if (value !== 'BA') updated.referredByBA = ''; 
        if (value !== 'Reference') updated.referenceName = '';
        if (value !== 'Other') updated.otherSourceName = '';
      }

      if (name === 'filingDate' && value) {
        const dateObj = new Date(value);
        dateObj.setFullYear(dateObj.getFullYear() + 1); 
        updated.nextReminderDate = dateObj.toISOString().split('T')[0];
      }

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

  const handleImportSelect = (e) => {
    const cid = e.target.value;
    setImportClientId(cid);
    
    if (!cid) {
      setFormData(initialForm); 
      return;
    }

    const client = importList.find(c => c._id === cid);
    if (client) {
      const parseDate = (d) => {
        if (!d) return '';
        const dateObj = new Date(d);
        if (!isNaN(dateObj.getTime())) return dateObj.toISOString().split('T')[0];
        return '';
      };

      setFormData({
        ...initialForm,
        assesseeName: client.assesseeName || '',
        pan: client.pan || '',
        dob: client.dob ? parseDate(client.dob) : '',
        mobile: client.mobile || '',
        email: client.email || '',
        district: client.district || '',
        state: client.state || '',
        pinCode: client.pinCode || client.pincode || '', 
        leadSource: client.leadSource || 'Google',
        referredByBA: client.referredByBA ? (client.referredByBA._id || client.referredByBA) : '',
        referenceName: client.referenceName || '',
        otherSourceName: client.otherSourceName || '',
        itrFiledUpToAY: client.itrFiledUpToAY || 'AY 2025-26',
        filingDate: parseDate(client.filingDate),
        nextReminderDate: parseDate(client.nextReminderDate),
        itrStatus: client.itrStatus || 'Documents Pending',
        portalPassword: client.portalPassword || '',
      });
    }
  };

  const handleOpenAdd = () => {
    setEditMode(false);
    setCurrentItrId(null);
    setImportClientId('');
    setFormData(initialForm);
    setShowSuggestions(false);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (client) => {
    setEditMode(true);
    setCurrentItrId(client._id);
    setImportClientId('');
    
    const parseDate = (d) => {
      if (!d) return '';
      const dateObj = new Date(d);
      if (!isNaN(dateObj.getTime())) return dateObj.toISOString().split('T')[0];
      return '';
    };

    setFormData({
      assesseeName: client.assesseeName || '',
      pan: client.pan || '',
      dob: parseDate(client.dob),
      mobile: client.mobile || '',
      email: client.email || '',
      district: client.district || '',
      state: client.state || '',
      pinCode: client.pinCode || client.pincode || '', 
      leadSource: client.leadSource || 'Google',
      referredByBA: client.referredByBA ? (client.referredByBA._id || client.referredByBA) : '',
      referenceName: client.referenceName || '',
      otherSourceName: client.otherSourceName || '',
      itrFiledUpToAY: client.itrFiledUpToAY || 'AY 2025-26',
      returnType: client.returnType || 'Original', 
      acknowledgementNo: client.acknowledgementNo || '',
      filingDate: parseDate(client.filingDate),
      nextReminderDate: parseDate(client.nextReminderDate),
      itrStatus: client.itrStatus || 'Documents Pending',
      portalPassword: client.portalPassword || '',
      feeStatus: client.feeStatus || 'Paid',
      feeAmount: client.feeAmount || '',
      amountReceived: client.amountReceived || '',
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
      ifscCode: client.ifscCode || ''
    });
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
  
  const confirmDelete = (client) => { 
    setClientToDelete(client); 
    setIsDeleteModalOpen(true); 
  };

  const handleDelete = async () => {
    if (!clientToDelete) return;
    try {
      const headers = { Authorization: `Bearer ${user.token}` };
      await axios.delete(`${import.meta.env.VITE_API_URL}/itr/${clientToDelete._id}`, { headers });
      
      setIsDeleteModalOpen(false);
      setClientToDelete(null);
      if (isViewModalOpen) setIsViewModalOpen(false);
      toast.success("ITR Record removed! Client remains safe in CRM.");
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
      const dateStamp = new Date().toLocaleString('en-IN', { 
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit' 
      });
      const authorInfo = user?.name ? `${user.name}` : 'User';

      const entry = `\n\n--------------------------------------\n📅 ${dateStamp} | 👤 ${authorInfo} (ITR Return Note)\n💬 ${newRemarkText.trim()}`;
      const updatedRemarks = (clientForRemarks.remarks || '') + entry;

      await axios.put(`${import.meta.env.VITE_API_URL}/itr/${clientForRemarks._id}`, { remarks: updatedRemarks }, { headers });
      
      setClientForRemarks(prev => ({ ...prev, remarks: updatedRemarks }));
      setItrClients(prev => prev.map(c => c._id === clientForRemarks._id ? { ...c, remarks: updatedRemarks } : c));
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
      const dateStamp = new Date().toLocaleString('en-IN', { 
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit' 
      });
      const authorInfo = user?.name ? `${user.name}` : 'User';
      
      const payload = { 
        ...formData, 
        crmClientId: importClientId || null, 
        createdBy: user._id 
      };

      if (editMode && currentItrId) {
        await axios.put(`${import.meta.env.VITE_API_URL}/itr/${currentItrId}`, payload, { headers });
        toast.success("ITR details updated!");
      } else {
        payload.remarks = `📅 ${dateStamp} | 👤 ${authorInfo}\n📌 ${importClientId ? 'Imported client to ITR workspace.' : 'Client profile created in ITR workspace.'}`;
        await axios.post(`${import.meta.env.VITE_API_URL}/itr`, payload, { headers });
        toast.success("ITR Client added to workspace!");
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
      case 'Filed': return 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 ring-emerald-500/20';
      case 'E-Verified': return 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 ring-purple-500/20';
      case 'Refund Issued': return 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 ring-indigo-500/20';
      default: return 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 ring-amber-500/20';
    }
  };

  const getReturnTypeStyle = (type) => {
    switch (type) {
      case 'Revised': return 'bg-purple-100 text-purple-700 border border-purple-200';
      case 'Updated': return 'bg-orange-100 text-orange-700 border border-orange-200';
      default: return 'bg-blue-100 text-blue-700 border border-blue-200';
    }
  };

  const sourceNeedsExtraField = ['BA', 'Reference', 'Other'].includes(formData.leadSource);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <Toaster position="top-right" />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <FileText size={28} className="text-blue-600" /> ITR Return Workspace
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Manage, track, and update all ITR filings in one place.</p>
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

      {/* METRICS CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total ITR Files</p>
              <h3 className="text-3xl font-black text-slate-800 mt-1">{stats.total}</h3>
            </div>
            <div className="h-12 w-12 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center font-bold border border-slate-100"><FileText size={20} /></div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between border-b-4 border-b-amber-400">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Docs Pending</p>
              <h3 className="text-3xl font-black text-amber-600 mt-1">{stats.pending}</h3>
            </div>
            <div className="h-12 w-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold border border-amber-100"><FileClock size={20} /></div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between border-b-4 border-b-blue-500">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">In Processing</p>
              <h3 className="text-3xl font-black text-blue-600 mt-1">{stats.processing}</h3>
            </div>
            <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold border border-blue-100"><RefreshCw size={20} /></div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between border-b-4 border-b-emerald-500">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Filed / Done</p>
              <h3 className="text-3xl font-black text-emerald-600 mt-1">{stats.completed}</h3>
            </div>
            <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold border border-emerald-100"><FileCheck size={20} /></div>
          </div>
        </div>
      </div>

      {/* FINANCIAL METRICS */}
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
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col xl:flex-row xl:items-center gap-4">
          <div className="relative w-full xl:w-72 shrink-0">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input type="text" placeholder="Search Client, PAN or ID..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-3.5 py-2 text-sm font-medium bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors shadow-sm" />
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer shadow-sm">
              <option value="ALL">Status: All</option>
              <option value="Documents Pending">Documents Pending</option>
              <option value="Processing">Processing</option>
              <option value="Filed">Filed</option>
              <option value="E-Verified">E-Verified</option>
              <option value="Refund Issued">Refund Issued</option>
            </select>

            <select value={verificationFilter} onChange={(e) => setVerificationFilter(e.target.value)} className="text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer shadow-sm">
              <option value="ALL">Verif: All</option>
              <option value="Pending">Pending</option>
              <option value="Aadhaar OTP">Aadhaar OTP</option>
              <option value="Net Banking / EVC">Net Banking / EVC</option>
              <option value="Sent to CPC (Physical)">Sent to CPC</option>
            </select>

            <select value={processedFilter} onChange={(e) => setProcessedFilter(e.target.value)} className="text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer shadow-sm">
              <option value="ALL">Process: All</option>
              <option value="Pending">Pending</option>
              <option value="Successfully E-verified">E-verified</option>
              <option value="Processing">Processing</option>
              <option value="Processed">Processed</option>
              <option value="Processed with Refund">Processed (Refund)</option>
              <option value="Defective">Defective</option>
            </select>

            <select value={returnTypeFilter} onChange={(e) => setReturnTypeFilter(e.target.value)} className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer shadow-sm">
              <option value="ALL">Type: All</option>
              <option value="Original">Original</option>
              <option value="Revised">Revised</option>
              <option value="Updated">Updated</option>
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

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-slate-200 text-slate-500 text-[11px] font-black uppercase tracking-wider">
                <th className="py-4 px-4 w-12 text-center border-r border-slate-100">
                  <input 
                    type="checkbox" 
                    checked={selectedIds.length === filteredClients.length && filteredClients.length > 0} 
                    onChange={handleSelectAll} 
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                  />
                </th>
                <th className="py-4 px-6">Client Details</th>
                <th className="py-4 px-6">Tax Info</th>
                <th className="py-4 px-6">Important Dates</th>
                <th className="py-4 px-6 bg-slate-50/50">Live Status Tracker</th>
                <th className="py-4 px-6">Added By</th>
                <th className="py-4 px-6 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-700">
              {loading ? (
                <tr><td colSpan="7" className="text-center py-16 text-slate-400"><RefreshCw className="animate-spin inline-block mr-2" size={18}/> Loading ITR workflow...</td></tr>
              ) : filteredClients.length === 0 ? (
                <tr><td colSpan="7" className="text-center py-16 text-slate-400 flex flex-col items-center"><AlertCircle size={36} className="mb-3 text-slate-300"/> No active clients match filters.</td></tr>
              ) : (
                filteredClients.map((client) => {
                  const currentStatus = client.itrStatus || 'Documents Pending';
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
                      <td className="py-4 px-6">
                        <div className="font-bold text-slate-800 text-base flex items-center gap-2">
                           {client.assesseeName} 
                           {/* 🔴 CLIENT ID DISPLAY IN TABLE */}
                           {client.clientMasterId?.clientId && (
                             <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-slate-200/70 text-slate-600 tracking-wider">
                               {client.clientMasterId.clientId}
                             </span>
                           )}
                        </div>
                        <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5 mt-1">
                            <span className="font-mono text-sm font-bold text-slate-700 px-2 py-0.5 inline-block uppercase">
                              {client.pan || 'N/A'}
                           </span>
                          </div>
                      </td>
                      <td className="py-4 pr-6">
                        
                      </td>
                      <td className="py-4 pl-6">
                        <div className="flex flex-col gap-1.5 text-[11px] font-semibold">
                          <span className="text-slate-800 font-bold mb-0.5 flex items-center gap-2">
                            {client.itrFiledUpToAY || 'AY 2025-26'}
                              <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase ${getReturnTypeStyle(client.returnType)}`}>
                              {client.returnType || 'Original'}
                            </span>
                          </span>
                        </div>
                      </td>
                      
                      <td className="py-4 px-6 bg-slate-50/30">
                        <div className="relative">
                          <select 
                            value={currentStatus} 
                            onChange={(e) => handleStatusChange(client._id, e.target.value)}
                            className={`appearance-none w-full text-xs font-bold px-3 py-2.5 pr-8 rounded-lg border focus:outline-none focus:ring-2 transition-all cursor-pointer shadow-sm ${getStatusStyle(currentStatus)}`}
                          >
                            <option value="Documents Pending">⏳ Documents Pending</option>
                            <option value="Processing">⚙️ Processing</option>
                            <option value="Filed">✅ Filed</option>
                            <option value="E-Verified">🛡️ E-Verified</option>
                            <option value="Refund Issued">💸 Refund Issued</option>
                          </select>
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                            <svg className="fill-current h-4 w-4 opacity-50" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 text-[11px] font-bold shrink-0">
                            {client.createdBy?.name ? client.createdBy.name.charAt(0).toUpperCase() : 'A'}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-slate-700 truncate w-24">
                              {client.createdBy?.name || 'Admin'}
                            </span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                              {client.createdBy?.empId || 'System'}
                            </span>
                          </div>
                        </div>
                      </td>
                      
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2.5">
                          <button onClick={() => handleOpenView(client)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-600 hover:text-white rounded-lg transition-all border border-blue-200 shadow-sm" title="View Profile">
                            <Eye size={14} strokeWidth={2.5}/> View
                          </button>
                          <button onClick={() => handleOpenRemarks(client)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-500 hover:text-white rounded-lg transition-all border border-amber-200 shadow-sm" title="Remarks">
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

      {/* VIEW PROFILE MODAL - REDESIGNED */}
      {isViewModalOpen && clientToView && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-slate-50 rounded-3xl w-full max-w-4xl shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95">
            
            {/* Sleek Gradient Header */}
            <div className="relative px-8 pt-6 pb-16 bg-gradient-to-r from-blue-700 to-indigo-800 text-white rounded-t-3xl flex justify-between items-start overflow-hidden">
              <div className="absolute top-0 right-0 -mt-10 -mr-10 h-40 w-40 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
              
              <div className="flex items-center gap-5 z-10">
                <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md border border-white/30 shadow-inner">
                  <UserCircle size={36} className="text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-black tracking-tight">{clientToView.assesseeName}</h2>
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-blue-100 font-medium">
                    {/* 🔴 CLIENT ID DISPLAY IN MODAL HEADER */}
                    {clientToView.clientMasterId?.clientId && (
                      <span className="flex items-center gap-1.5 bg-white/20 px-2.5 py-1 rounded-md border border-white/30 font-mono tracking-wider text-white font-bold">
                        ID: {clientToView.clientMasterId.clientId}
                      </span>
                    )}
                    <span className="flex items-center gap-1.5 bg-black/20 px-2.5 py-1 rounded-md border border-white/10 font-mono tracking-wider text-white">
                      <Hash size={12} className="opacity-70"/> {clientToView.pan || 'N/A'}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <FileText size={14} className="opacity-70"/> {clientToView.itrFiledUpToAY || 'AY 2025-26'}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Phone size={14} className="opacity-70"/> {clientToView.mobile}
                    </span>
                  </div>
                </div>
              </div>
              <button onClick={() => setIsViewModalOpen(false)} className="z-10 p-2 rounded-full bg-black/10 hover:bg-black/20 text-white transition-colors"><X size={20} strokeWidth={2.5} /></button>
            </div>
            
            <div className="overflow-y-auto p-6 md:p-8 space-y-6 custom-scrollbar">
              
              {/* Top Row: General Info & Filing Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Contact & Demographics Card */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                    <Navigation size={14}/> Contact & Address
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Email Address</p>
                      <p className="text-sm font-semibold text-slate-800">{clientToView.email || 'N/A'}</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Date of Birth</p>
                        <p className="text-sm font-semibold text-slate-800">{clientToView.dob ? new Date(clientToView.dob).toLocaleDateString('en-IN') : 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Lead Source</p>
                        <p className="text-sm font-semibold text-slate-800">
                          {clientToView.leadSource || 'Google'}
                          {clientToView.leadSource === 'BA' && clientToView.referredByBA && ` (${clientToView.referredByBA.baName || clientToView.referredByBA.name || 'BA'})`}
                          {clientToView.leadSource === 'Reference' && clientToView.referenceName && ` (${clientToView.referenceName})`}
                          {clientToView.leadSource === 'Other' && clientToView.otherSourceName && ` (${clientToView.otherSourceName})`}
                        </p>
                      </div>
                    </div>
                    
                    <div className="pt-3 border-t border-slate-100">
                      <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Registered Address</p>
                      <p className="text-sm font-semibold text-slate-700">
                        {[clientToView.district, clientToView.state, clientToView.pinCode || clientToView.pincode].filter(Boolean).join(', ') || 'Address not registered'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Workflow Status Card */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                    <Activity size={14}/> ITR Tracking Status
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <span className="text-xs font-bold text-slate-500">Live Status</span>
                      <span className={`px-3 py-1 rounded-lg text-xs font-bold shadow-sm border ${getStatusStyle(clientToView.itrStatus)}`}>
                        {clientToView.itrStatus || 'Documents Pending'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Verification Method</p>
                        <p className="text-sm font-bold text-slate-700">{clientToView.verificationMethod || 'Pending'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Processing Status</p>
                        <p className="text-sm font-bold text-slate-700">{clientToView.itrProcessedStatus || 'Pending'}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-100">
                      <div>
                        <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Filing Date</p>
                        <p className="text-sm font-bold text-emerald-600">{clientToView.filingDate ? new Date(clientToView.filingDate).toLocaleDateString('en-IN') : 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Next Reminder</p>
                        <p className="text-sm font-bold text-amber-600">{clientToView.nextReminderDate ? new Date(clientToView.nextReminderDate).toLocaleDateString('en-IN') : 'Not Set'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tax Computation Wide Card */}
              <div className="bg-gradient-to-br from-indigo-50/50 to-blue-50/50 p-6 rounded-2xl border border-indigo-100 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 text-indigo-500 opacity-5 -mt-6 -mr-6"><Calculator size={150} /></div>
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5">
                  <h3 className="text-sm font-black text-indigo-900 flex items-center gap-2 z-10">
                    <Calculator size={18} className="text-indigo-600"/> Tax Computation & Portal Info
                  </h3>
                  
                  {/* ACKNOWLEDGEMENT NO IN VIEW PROFILE */}
                  {clientToView.acknowledgementNo && clientToView.acknowledgementNo !== 'N/A' && (
                    <div className="mt-3 sm:mt-0 flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-indigo-200 shadow-sm z-10">
                      <span className="text-[10px] font-bold uppercase text-slate-500">Ack No.</span>
                      <span className="text-sm font-mono font-black text-indigo-700">{clientToView.acknowledgementNo}</span>
                    </div>
                  )}
                </div>
                 
                 <div className="grid grid-cols-2 md:grid-cols-5 gap-3 bg-white/70 p-4 rounded-xl border border-white mb-5 z-10 relative shadow-sm backdrop-blur-sm">
                   <div>
                     <span className="text-slate-400 uppercase font-bold block text-[10px] mb-1">Form No</span>
                     <span className="font-black text-slate-800">{clientToView.formNo || 'ITR-1'}</span>
                   </div>
                   <div>
                     <span className="text-slate-400 uppercase font-bold block text-[10px] mb-1">Tax Regime</span>
                     <span className="font-black text-slate-800">{clientToView.regime || 'New'}</span>
                   </div>
                   <div>
                     <span className="text-slate-400 uppercase font-bold block text-[10px] mb-1">Return Type</span>
                     <span className={`font-bold px-2 py-0.5 rounded text-xs inline-block ${getReturnTypeStyle(clientToView.returnType)}`}>{clientToView.returnType || 'Original'}</span>
                   </div>
                   <div>
                     <span className="text-slate-400 uppercase font-bold block text-[10px] mb-1">Filed By</span>
                     <span className="font-black text-slate-800">{clientToView.itrFiledBy || 'N/A'}</span>
                   </div>
                   <div>
                     <span className="text-slate-400 uppercase font-bold block text-[10px] mb-1">Portal Password</span>
                     <span className="font-bold text-rose-600 flex items-center gap-1.5"><Key size={12}/> {clientToView.portalPassword || 'N/A'}</span>
                   </div>
                 </div>

                 <div className="grid grid-cols-2 md:grid-cols-6 gap-4 z-10 relative bg-white p-4 rounded-xl border border-indigo-100 shadow-sm">
                    <div>
                      <p className="text-[10px] uppercase text-slate-500 font-bold mb-1">Total Income</p>
                      <p className="text-base font-black text-slate-800">₹{clientToView.totalIncome || 0}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-slate-500 font-bold mb-1">Income Tax</p>
                      <p className="text-base font-black text-slate-800">₹{clientToView.incomeTax || 0}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-slate-500 font-bold mb-1">TDS</p>
                      <p className="text-base font-black text-slate-800">₹{clientToView.tds || 0}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-slate-500 font-bold mb-1">TCS</p>
                      <p className="text-base font-black text-slate-800">₹{clientToView.tcs || 0}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-slate-500 font-bold mb-1">Self/Adv Tax</p>
                      <p className="text-base font-black text-slate-800">₹{clientToView.selfAdvTax || 0}</p>
                    </div>
                    <div className="bg-indigo-50/80 -m-2 p-2 rounded-lg border border-indigo-100 flex flex-col justify-center">
                      <p className="text-[10px] uppercase text-indigo-600 font-bold mb-1">Payable / (Refund)</p>
                      <p className={`text-base font-black ${Number(clientToView.refund) < 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        ₹{Math.abs(clientToView.refund || 0)} {Number(clientToView.refund) < 0 ? '(Ref)' : ''}
                      </p>
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
                </div>

              </div>

            </div>
            
            <div className="flex justify-between items-center px-6 py-4 border-t border-slate-100 bg-white rounded-b-3xl">
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

      {/* REMARKS MODAL */}
      {isRemarksModalOpen && clientForRemarks && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl border border-slate-100 flex flex-col max-h-[85vh] overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/80">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold"><MessageSquare size={20} /></div>
                <div>
                  <h2 className="text-base font-bold text-slate-800 tracking-tight">ITR Notes & Remarks</h2>
                  <p className="text-xs text-slate-500">{clientForRemarks.assesseeName} • <span className="font-mono font-semibold text-blue-600">{clientForRemarks.pan}</span></p>
                </div>
              </div>
              <button onClick={() => setIsRemarksModalOpen(false)} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors"><X size={18} /></button>
            </div>
            
            <div className="overflow-y-auto p-6 space-y-4 custom-scrollbar">
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 text-xs text-slate-700 font-medium whitespace-pre-wrap min-h-[140px] max-h-[220px] overflow-y-auto shadow-inner leading-relaxed custom-scrollbar">
                {clientForRemarks.remarks && getFilteredItrRemarks(clientForRemarks.remarks) 
                  ? getFilteredItrRemarks(clientForRemarks.remarks) 
                  : <span className="text-slate-400 italic">No ITR specific notes or history recorded yet.</span>}
              </div>

              <form onSubmit={handleAddRemarkSubmit} className="space-y-3 pt-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">Add New Progress Note</label>
                <div className="relative">
                  <textarea 
                    rows="3" 
                    value={newRemarkText} 
                    onChange={(e) => setNewRemarkText(e.target.value)} 
                    placeholder="Enter ITR filing update, document pending notes, etc..." 
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
                Are you sure you want to remove <span className="font-bold text-slate-700">{clientToDelete.assesseeName}</span> from the active ITR workflow? <br/><br/>
                <span className="text-blue-600 bg-blue-50 px-2 py-1 rounded font-medium">This client will remain safe in the main CRM list.</span>
              </p>
            </div>
            <div className="flex justify-center gap-3 pt-3">
              <button onClick={() => setIsDeleteModalOpen(false)} className="px-5 py-2.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors">Cancel</button>
              <button onClick={handleDelete} className="px-5 py-2.5 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-md shadow-rose-500/20 transition-colors">Yes, Remove</button>
            </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95">
            
            <div className="flex justify-between items-center px-8 py-5 border-b border-slate-100 bg-slate-50/80">
              <div>
                <h2 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
                  <FileText className="text-blue-600" size={24}/> {editMode ? 'Edit ITR Return Details' : 'Add ITR Return'}
                </h2>
                <p className="text-xs text-slate-500 mt-1">Manage portal credentials, tax computations, and filing dates.</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors"><X size={20} /></button>
            </div>

            <form onSubmit={handleSubmit} className="overflow-y-auto p-8 space-y-8 custom-scrollbar">

              {/* SECTION 1: CORE INFO */}
              <div>
                <h3 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4">1. Primary Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  
                  {/* PAN AUTOCOMPLETE DROPDOWN */}
                  <div className="md:col-span-1 relative">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">PAN Number *</label>
                    <input 
                      type="text" 
                      name="pan" 
                      required 
                      maxLength="10"
                      value={formData.pan} 
                      onChange={handlePanChange}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                      autoComplete="off"
                      disabled={editMode && !isAdmin} 
                      className="w-full text-sm font-bold border border-slate-200 rounded-xl p-3 uppercase focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-100 outline-none relative z-10" 
                    />
                    {fetchingPan && !editMode && <Loader2 size={14} className="absolute right-3 top-10 animate-spin text-blue-500 z-20"/>}
                    
                    {/* Suggestion List Box */}
                    {showSuggestions && !editMode && panSuggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto custom-scrollbar">
                        {panSuggestions.map((client) => (
                          <div 
                            key={client._id} 
                            onClick={() => handleSelectSuggestion(client)}
                            className="p-3 border-b border-slate-50 hover:bg-blue-50 cursor-pointer transition-colors"
                          >
                            <p className="text-xs font-black text-slate-800 tracking-wider uppercase">{client.pan}</p>
                            <p className="text-[10px] font-bold text-slate-500 truncate">{client.name}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="md:col-span-1">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Assessee Name *</label>
                    <input type="text" name="assesseeName" required value={formData.assesseeName} onChange={handleChange} disabled={editMode && !isAdmin} className="w-full text-sm font-semibold border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-100" />
                  </div>
                  
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Mobile Number *</label>
                    <input type="tel" name="mobile" required value={formData.mobile} onChange={handleChange} disabled={editMode && !isAdmin} className="w-full text-sm font-medium border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-100" />
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
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Email ID</label>
                    <input type="email" name="email" value={formData.email} onChange={handleChange} disabled={editMode && !isAdmin} placeholder="assessee@example.com" className="w-full text-sm font-medium border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-100" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Date of Birth (DOB)</label>
                    <input type="date" name="dob" value={formData.dob} onChange={handleChange} disabled={editMode && !isAdmin} className="w-full text-sm font-medium border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500/20 text-slate-700 disabled:bg-slate-100" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">District</label>
                    <input type="text" name="district" value={formData.district} onChange={handleChange} disabled={editMode && !isAdmin} placeholder="e.g. South Delhi" className="w-full text-sm font-medium border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-100" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">State</label>
                    <input type="text" name="state" value={formData.state} onChange={handleChange} disabled={editMode && !isAdmin} placeholder="e.g. Delhi" className="w-full text-sm font-medium border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-100" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">PIN Code</label>
                    <input type="text" name="pinCode" value={formData.pinCode} onChange={handleChange} disabled={editMode && !isAdmin} placeholder="110001" className="w-full text-sm font-medium border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-100" />
                  </div>
                </div>
              </div>

              {/* BANK DETAILS SECTION */}
              <div>
                <h3 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4 flex items-center gap-2"><CreditCard size={16} className="text-blue-600"/> Bank Account Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Bank Name</label>
                    <input type="text" name="bankName" value={formData.bankName} onChange={handleChange} disabled={editMode && !isAdmin} placeholder="e.g. HDFC Bank" className="w-full text-sm font-medium border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-100" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Account Number</label>
                    <input type="text" name="accountNo" value={formData.accountNo} onChange={handleChange} disabled={editMode && !isAdmin} placeholder="Account No" className="w-full text-sm font-medium border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500/20 font-mono disabled:bg-slate-100" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">IFSC Code</label>
                    <input type="text" name="ifscCode" value={formData.ifscCode} onChange={handleChange} disabled={editMode && !isAdmin} placeholder="HDFC0001234" className="w-full text-sm font-medium border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500/20 uppercase font-mono disabled:bg-slate-100" />
                  </div>
                </div>
              </div>

              {/* TAX DETAILS FORM BLOCK WITH ALL FIELDS */}
              <div className="bg-indigo-50/50 p-5 rounded-2xl border border-indigo-100">
                <h3 className="text-sm font-bold text-indigo-900 border-b border-indigo-200 pb-2 mb-4 flex items-center gap-2">
                  <Calculator size={16} className="text-indigo-600"/> Tax Computation & Assessment
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                  
                  <div className="md:col-span-1">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">Form No</label>
                    <select name="formNo" value={formData.formNo} onChange={handleChange} className="w-full text-sm border border-indigo-200 bg-white rounded-xl p-2.5 font-semibold text-indigo-900">
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
                    <select name="regime" value={formData.regime} onChange={handleChange} className="w-full text-sm border border-indigo-200 bg-white rounded-xl p-2.5 font-semibold">
                      <option value="New">New Regime</option>
                      <option value="Old">Old Regime</option>
                    </select>
                  </div>

                  <div className="md:col-span-1">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">Return Type</label>
                    <select name="returnType" value={formData.returnType} onChange={handleChange} className="w-full text-sm border border-indigo-200 bg-white rounded-xl p-2.5 font-semibold text-indigo-700">
                      <option value="Original">Original</option>
                      <option value="Revised">Revised</option>
                      <option value="Updated">Updated</option>
                    </select>
                  </div>

                  <div className="md:col-span-1">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">ITR Filed By</label>
                    <input type="text" name="itrFiledBy" value={formData.itrFiledBy} onChange={handleChange} className="w-full text-sm border border-indigo-200 rounded-xl p-2.5 bg-white font-medium" placeholder="Staff / Name" />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">Acknowledgement No.</label>
                    <input type="text" name="acknowledgementNo" value={formData.acknowledgementNo} onChange={handleChange} className="w-full text-sm border border-indigo-200 rounded-xl p-2.5 bg-white font-mono" placeholder="Enter Ack No." />
                  </div>

                  <div className="md:col-span-1">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">Verification Method</label>
                    <select name="verificationMethod" value={formData.verificationMethod} onChange={handleChange} className="w-full text-sm border border-indigo-200 bg-white rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500/20 text-slate-700">
                       <option value="Pending">Pending / Not Verified</option>
                       <option value="Aadhaar OTP">Aadhaar OTP</option>
                       <option value="Net Banking / EVC">Net Banking / EVC</option>
                       <option value="Sent to CPC (Physical)">Sent to CPC (Physical)</option>
                    </select>
                  </div>
                  <div className="md:col-span-1">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">Processed Status</label>
                    <select name="itrProcessedStatus" value={formData.itrProcessedStatus} onChange={handleChange} className="w-full text-sm border border-indigo-200 bg-white rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500/20 text-slate-700 font-semibold">
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
                    <input type="number" name="totalIncome" value={formData.totalIncome} onChange={handleChange} className="w-full text-sm border border-indigo-200 rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500/20 bg-white" placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1.5">Income Tax (₹)</label>
                    <input type="number" name="incomeTax" value={formData.incomeTax} onChange={handleChange} className="w-full text-sm border border-indigo-200 rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500/20 bg-white" placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1.5">TDS (₹)</label>
                    <input type="number" name="tds" value={formData.tds} onChange={handleChange} className="w-full text-sm border border-indigo-200 rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500/20 bg-white" placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1.5">TCS (₹)</label>
                    <input type="number" name="tcs" value={formData.tcs} onChange={handleChange} className="w-full text-sm border border-indigo-200 rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500/20 bg-white" placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1.5">Self / Adv Tax (₹)</label>
                    <input type="number" name="selfAdvTax" value={formData.selfAdvTax} onChange={handleChange} className="w-full text-sm border border-indigo-200 rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500/20 bg-white" placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-indigo-700 mb-1.5">Payable / (Refund)</label>
                    <input type="number" name="refund" value={formData.refund} readOnly className="w-full text-sm border border-indigo-300 rounded-xl p-2.5 bg-indigo-100 font-bold text-indigo-900 cursor-not-allowed" placeholder="0" />
                  </div>
                </div>
              </div>

              <div className="bg-blue-50/30 p-5 rounded-2xl border border-blue-100">
                 <h3 className="text-sm font-bold text-slate-800 mb-4 pb-2 border-b border-blue-200 flex items-center gap-2"><Activity size={16} className="text-blue-600"/> Workflow & Portal Details</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                   
                    <div className="md:col-span-1">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-blue-600 mb-1.5">Live Workflow Status</label>
                      <select name="itrStatus" value={formData.itrStatus} onChange={handleChange} className={`w-full text-sm font-bold border rounded-xl p-3 focus:ring-2 focus:outline-none shadow-sm ${getStatusStyle(formData.itrStatus)}`}>
                        <option value="Documents Pending">⏳ Documents Pending</option>
                        <option value="Processing">⚙️ Processing</option>
                        <option value="Filed">✅ Filed</option>
                        <option value="E-Verified">🛡️ E-Verified</option>
                        <option value="Refund Issued">💸 Refund Issued</option>
                      </select>
                    </div>

                    <div className="md:col-span-1">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-rose-600 mb-1.5 flex items-center gap-1"><Key size={12}/> E-Filing Portal Password</label>
                      <input type="text" name="portalPassword" value={formData.portalPassword} onChange={handleChange} placeholder="e.g. Ramesh@123" className="w-full text-sm font-medium border border-rose-200 bg-white rounded-xl p-3 focus:ring-2 focus:ring-rose-500/20" />
                    </div>

                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Assessment Year</label>
                        <select name="itrFiledUpToAY" value={formData.itrFiledUpToAY} onChange={handleChange} className="w-full text-sm font-medium border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500/20 bg-white">
                          <option value="AY 2025-26">AY 2025-26</option>
                          <option value="AY 2024-25">AY 2024-25</option>
                          <option value="AY 2023-24">AY 2023-24</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-emerald-600 mb-1.5">Date of Filing</label>
                        <input type="date" name="filingDate" value={formData.filingDate} onChange={handleChange} className="w-full text-sm font-medium border border-emerald-200 rounded-xl p-3 focus:ring-2 focus:ring-emerald-500/20 bg-white" />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-amber-600 mb-1.5">Next Year Reminder</label>
                        <input type="date" name="nextReminderDate" value={formData.nextReminderDate} onChange={handleChange} className="w-full text-sm font-medium border border-amber-200 rounded-xl p-3 focus:ring-2 focus:ring-amber-500/20 bg-white" />
                      </div>
                    </div>
                 </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4">Fees & Remarks</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Fee Status</label>
                    <select name="feeStatus" value={formData.feeStatus} onChange={handleChange} className="w-full text-sm font-medium border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500/20 bg-white">
                      <option value="Paid">Paid Fully</option>
                      <option value="Dues">Payment Pending</option>
                      <option value="FOC">Free of Cost (FOC)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Total Fee (₹)</label>
                    <input type="number" name="feeAmount" value={formData.feeAmount} onChange={handleChange} className="w-full text-sm font-medium border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500/20 bg-white" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Received (₹)</label>
                    <input type="number" name="amountReceived" value={formData.amountReceived} onChange={handleChange} className="w-full text-sm font-medium border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500/20 bg-white" />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">Cancel</button>
                <button type="submit" className="px-8 py-2.5 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center gap-2">
                  <CheckCircle2 size={18} /> {editMode ? 'Save Changes' : 'Save ITR Return'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default ItrReturns;