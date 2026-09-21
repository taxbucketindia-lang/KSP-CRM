import { useState, useEffect, useContext, useMemo, useRef } from 'react';
import axios from 'axios';
import { useLocation } from 'react-router-dom'; 
import { AuthContext } from '../context/AuthContext';
import * as XLSX from 'xlsx'; 
import ExcelJS from 'exceljs'; 
import { saveAs } from 'file-saver'; 
import { 
  Plus, Search, X, Phone, Mail, Calendar, Flame, Sparkles, CheckCircle2, 
  AlertCircle, Briefcase, Pencil, History, Eye, UserCircle, CalendarDays, 
  CalendarClock, MessageCircle, Trash2, AlertTriangle, UserCheck, 
  Download, Upload, Lock, ShieldUser, MessageSquare 
} from 'lucide-react';

const Leads = () => {
  const { user } = useContext(AuthContext);
  const location = useLocation();
  const [leads, setLeads] = useState([]);
  const [bas, setBas] = useState([]); 
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isRemarksModalOpen, setIsRemarksModalOpen] = useState(false); 
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  
  const fileInputRef = useRef(null); 

  const [editMode, setEditMode] = useState(false);
  const [currentLeadId, setCurrentLeadId] = useState(null);
  const [originalData, setOriginalData] = useState(null); 
  const [viewLeadData, setViewLeadData] = useState(null);
  const [leadForRemarks, setLeadForRemarks] = useState(null); 
  const [newRemark, setNewRemark] = useState('');

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState(null);

  const isAdmin = user?.role === 'Admin';

  const initialForm = {
    name: '', mobile: '', email: '', 
    source: 'Google', referredByBA: '', referenceName: '', otherSourceName: '', 
    status: 'New', priority: 'Warm', queryService: '', remarks: '', nextFollowUpDate: '' 
  };
  const [formData, setFormData] = useState(initialForm);

  const fetchData = async () => {
    try {
      const headers = { Authorization: `Bearer ${user.token}` };
      const [leadsRes, basRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_URL}/leads`, { headers }),
        axios.get(`${import.meta.env.VITE_API_URL}/bas`, { headers }).catch(() => ({ data: [] })) 
      ]);
      setLeads(leadsRes.data || []);
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

  // 🔴 AUTO-OPEN LEAD PROFILE LOGIC FROM NOTIFICATION OR DASHBOARD
  useEffect(() => {
    if (leads.length > 0 && location.state?.openLeadId) {
      const leadToOpen = leads.find(l => l._id === location.state.openLeadId);
      if (leadToOpen) {
        handleView(leadToOpen);
        window.history.replaceState({}, document.title);
      }
    }
  }, [leads, location.state]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      if (name === 'source') {
        if (value !== 'BA') updated.referredByBA = '';
        if (value !== 'Reference') updated.referenceName = '';
        if (value !== 'Other') updated.otherSourceName = '';
      }
      return updated;
    });
  };

  const handleExportExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Leads');

    worksheet.columns = [
      { header: 'Lead ID', key: 'leadId', width: 15 },
      { header: 'Name', key: 'name', width: 25 },
      { header: 'Mobile', key: 'mobile', width: 15 },
      { header: 'Email', key: 'email', width: 25 },
      { header: 'Source', key: 'source', width: 15 },
      { header: 'Priority', key: 'priority', width: 15 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Required Service', key: 'queryService', width: 25 },
      { header: 'Next Follow-up Date', key: 'nextFollowUpDate', width: 20 },
      { header: 'Owner / Created By', key: 'createdBy', width: 25 },
      { header: 'Remarks', key: 'remarks', width: 50 }
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

    leads.forEach(lead => {
      worksheet.addRow({
        leadId: lead.leadId || '',
        name: lead.name || '',
        mobile: lead.mobile || '',
        email: lead.email || '',
        source: lead.source || '',
        priority: lead.priority || '',
        status: lead.status || '',
        queryService: Array.isArray(lead.queryService) ? lead.queryService.join(', ') : (lead.queryService || ''),
        nextFollowUpDate: lead.nextFollowUpDate ? new Date(lead.nextFollowUpDate).toLocaleDateString('en-IN') : '',
        createdBy: lead.createdBy?.name ? `${lead.createdBy.name} ${lead.createdBy.empId ? `(${lead.createdBy.empId})` : ''}` : 'Admin',
        remarks: lead.remarks || ''
      });
    });

    const sourceOptions = '"FB,Insta,Google,Walk-in,Reference,BA,Website,WhatsApp,Other"';
    const priorityOptions = '"Hot,Warm,Cold"';
    const statusOptions = '"New,Contacted,Interested,Follow-up,Proposal,Converted"';
    const serviceOptions = '"ITR Filing,GST Registration,Company Registration,Trademark Registration,Accounting"';

    for (let i = 2; i <= 1000; i++) {
      worksheet.getCell(`E${i}`).dataValidation = { type: 'list', allowBlank: true, formulae: [sourceOptions], showErrorMessage: true, errorTitle: 'Invalid Option', error: 'Please select from the dropdown.' };
      worksheet.getCell(`F${i}`).dataValidation = { type: 'list', allowBlank: true, formulae: [priorityOptions], showErrorMessage: true, errorTitle: 'Invalid Option', error: 'Please select from the dropdown.' };
      worksheet.getCell(`G${i}`).dataValidation = { type: 'list', allowBlank: true, formulae: [statusOptions], showErrorMessage: true, errorTitle: 'Invalid Option', error: 'Please select from the dropdown.' };
      worksheet.getCell(`H${i}`).dataValidation = { type: 'list', allowBlank: true, formulae: [serviceOptions], showErrorMessage: true, errorTitle: 'Invalid Option', error: 'Please select from the dropdown.' };
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `Leads_Template_With_Dropdowns_${new Date().toISOString().split('T')[0]}.xlsx`);
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
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        if (data.length === 0) return alert("Uploaded Excel file is empty!");

        const formattedLeads = data.map(row => {
          let parsedDateStr = null;
          const rawDate = row['Next Follow-up Date'] || row['nextFollowUpDate'];
          
          if (rawDate) {
            if (rawDate instanceof Date && !isNaN(rawDate.getTime())) {
              const yyyy = rawDate.getFullYear();
              const mm = String(rawDate.getMonth() + 1).padStart(2, '0');
              const dd = String(rawDate.getDate()).padStart(2, '0');
              parsedDateStr = `${yyyy}-${mm}-${dd}`;
            } 
            else if (typeof rawDate === 'string') {
              const parts = rawDate.split(/[\/\-]/); 
              if (parts.length === 3) {
                let day = parts[0], month = parts[1], year = parts[2];
                if (day.length === 4) { year = parts[0]; month = parts[1]; day = parts[2]; }
                parsedDateStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
              } else {
                const d = new Date(rawDate);
                if (!isNaN(d.getTime())) {
                  const yyyy = d.getFullYear();
                  const mm = String(d.getMonth() + 1).padStart(2, '0');
                  const dd = String(d.getDate()).padStart(2, '0');
                  parsedDateStr = `${yyyy}-${mm}-${dd}`;
                }
              }
            }
          }

          return {
            name: row['Name'] || row['name'] || '',
            mobile: row['Mobile'] || row['mobile'] || '',
            email: row['Email'] || row['email'] || '',
            source: row['Source'] || row['source'] || 'Other',
            priority: row['Priority'] || row['priority'] || 'Warm',
            status: row['Status'] || row['status'] || 'New',
            queryService: row['Required Service'] || row['Service Required'] || row['queryService'] ? [row['Required Service'] || row['Service Required'] || row['queryService']] : [],
            remarks: row['Remarks'] || row['remarks'] || '',
            nextFollowUpDate: parsedDateStr
          };
        }).filter(item => item.name && item.mobile);

        if (formattedLeads.length === 0) return alert("Could not find valid 'Name' and 'Mobile' columns in the Excel file.");

        const headers = { Authorization: `Bearer ${user.token}` };
        const response = await axios.post(`${import.meta.env.VITE_API_URL}/leads/import`, { leads: formattedLeads }, { headers });
        
        alert(`Successfully imported ${response.data.count} leads!`);
        fetchData();
      } catch (error) {
        console.error("Import Error:", error);
        alert("Error importing leads: " + (error.response?.data?.message || error.message));
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = ""; 
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleAddNew = () => {
    setEditMode(false);
    setCurrentLeadId(null);
    setOriginalData(null);
    setFormData(initialForm);
    setNewRemark('');
    setIsModalOpen(true);
  };

  const handleEdit = (lead) => {
    setEditMode(true);
    setCurrentLeadId(lead._id);
    setOriginalData(lead); 

    let formattedDate = '';
    if (lead.nextFollowUpDate) {
      const d = new Date(lead.nextFollowUpDate);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      formattedDate = `${yyyy}-${mm}-${dd}`; 
    }

    setFormData({
      name: lead.name || '',
      mobile: lead.mobile || '',
      email: lead.email || '',
      source: lead.source || 'Google',
      referredByBA: lead.referredByBA?._id || lead.referredByBA || '',
      referenceName: lead.referenceName || '',
      otherSourceName: lead.otherSourceName || '',
      status: lead.status || 'New',
      priority: lead.priority || 'Warm',
      queryService: Array.isArray(lead.queryService) ? (lead.queryService[0] || '') : (lead.queryService || ''),
      remarks: lead.remarks || '',
      nextFollowUpDate: formattedDate 
    });
    setNewRemark(''); 
    setIsModalOpen(true);
  };

  const handleView = (lead) => {
    setViewLeadData(lead);
    setIsViewModalOpen(true);
  };

  const handleOpenRemarks = (lead) => {
    setLeadForRemarks(lead);
    setIsRemarksModalOpen(true);
  };

  const confirmDelete = (lead) => {
    setLeadToDelete(lead);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!leadToDelete) return;
    try {
      const headers = { Authorization: `Bearer ${user.token}` };
      await axios.delete(`${import.meta.env.VITE_API_URL}/leads/${leadToDelete._id}`, { headers });
      setIsDeleteModalOpen(false);
      setLeadToDelete(null);
      fetchData();
    } catch (error) {
      alert("Error deleting lead: " + (error.response?.data?.message || error.message));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payloadDate = formData.status === 'Follow-up' && formData.nextFollowUpDate ? formData.nextFollowUpDate : null;
      let finalRemarks = formData.remarks || '';
      
      const authorInfo = user?.name ? `${user.name} ${user.empId ? `(${user.empId})` : ''}` : 'Unknown User';
      const dateStamp = new Date().toLocaleString('en-IN', { 
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit' 
      });

      if (editMode && originalData) {
        let changes = [];
        
        if (originalData.status !== formData.status) {
          changes.push(`Status changed: [${originalData.status}] ➔ [${formData.status}]`);
        }
        
        if (originalData.priority !== formData.priority) {
          changes.push(`Priority changed: [${originalData.priority}] ➔ [${formData.priority}]`);
        }

        let origDate = originalData.nextFollowUpDate ? new Date(originalData.nextFollowUpDate).toISOString().split('T')[0] : 'None';
        let newDateStr = payloadDate || 'None';
        if (origDate !== newDateStr && formData.status === 'Follow-up') {
          changes.push(`Follow-up scheduled: ${newDateStr}`);
        }

        if (changes.length > 0 || newRemark.trim()) {
          let auditBlock = `\n\n--------------------------------------\n📅 ${dateStamp} | 👤 ${authorInfo}`;
          if (changes.length > 0) auditBlock += `\n🔄 Updates:\n - ${changes.join('\n - ')}`;
          if (newRemark.trim()) auditBlock += `\n💬 Note: ${newRemark.trim()}`;
          finalRemarks += auditBlock;
        }
      } else {
        let createBlock = `📅 ${dateStamp} | 👤 ${authorInfo}\n✨ Lead Created.`;
        if (formData.remarks.trim()) {
          createBlock += `\n💬 Initial Note: ${formData.remarks.trim()}`;
        }
        finalRemarks = createBlock;
      }

      const payload = {
        ...formData,
        remarks: finalRemarks,
        queryService: [formData.queryService],
        nextFollowUpDate: payloadDate,
        referredByBA: formData.source === 'BA' ? formData.referredByBA : null,
        referenceName: formData.source === 'Reference' ? formData.referenceName : '',
        otherSourceName: formData.source === 'Other' ? formData.otherSourceName : ''
      };

      const headers = { Authorization: `Bearer ${user.token}` };

      if (editMode) {
        await axios.put(`${import.meta.env.VITE_API_URL}/leads/${currentLeadId}`, payload, { headers });
      } else {
        await axios.post(`${import.meta.env.VITE_API_URL}/leads`, payload, { headers });
      }

      setIsModalOpen(false);
      setFormData(initialForm);
      setNewRemark('');
      fetchData();
    } catch (error) {
      alert(`Error ${editMode ? 'updating' : 'creating'} lead: ` + (error.response?.data?.message || error.message));
    }
  };

  const filteredLeads = useMemo(() => {
    return leads.filter((item) => {
      const matchesSearch = 
        item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.leadId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.mobile?.toString().includes(searchQuery);
      const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [leads, searchQuery, statusFilter]);

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return {
      total: leads.length,
      hot: leads.filter(l => l.priority === 'Hot').length,
      followUpsToday: leads.filter(l => l.status === 'Follow-up' && l.nextFollowUpDate && new Date(l.nextFollowUpDate).toISOString().split('T')[0] === today).length,
      newLeads: leads.filter(l => l.status === 'New').length
    };
  }, [leads]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'New': return 'bg-blue-50 text-blue-700 border-blue-200/60 ring-blue-500/10';
      case 'Converted': return 'bg-emerald-50 text-emerald-700 border-emerald-200/60 ring-emerald-500/10';
      case 'Follow-up': return 'bg-purple-50 text-purple-700 border-purple-200/60 ring-purple-500/10';
      case 'Interested': return 'bg-cyan-50 text-cyan-700 border-cyan-200/60 ring-cyan-500/10';
      default: return 'bg-slate-100 text-slate-700 border-slate-200/60 ring-slate-500/10';
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'Hot': return 'bg-rose-50 text-rose-700 border-rose-200/60 font-semibold';
      case 'Warm': return 'bg-amber-50 text-amber-700 border-amber-200/60 font-medium';
      default: return 'bg-slate-100 text-slate-600 border-slate-200 font-medium';
    }
  };

  const getBaName = (baId) => {
    if (!baId) return '';
    const id = typeof baId === 'object' ? baId._id : baId;
    const ba = bas.find(b => b._id === id);
    return ba ? (ba.name || ba.baName) : 'Unknown Partner';
  };

  const sourceNeedsExtraField = ['BA', 'Reference', 'Other'].includes(formData.source);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Metric Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-[0_2px_4px_rgba(0,0,0,0.02)]">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Prospects</p>
          <div className="flex items-center justify-between mt-2">
            <span className="text-2xl font-bold text-slate-800">{stats.total}</span>
            <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Briefcase size={16} />
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-[0_2px_4px_rgba(0,0,0,0.02)]">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Fresh / New</p>
          <div className="flex items-center justify-between mt-2">
            <span className="text-2xl font-bold text-slate-800">{stats.newLeads}</span>
            <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Sparkles size={16} />
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-[0_2px_4px_rgba(0,0,0,0.02)]">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Hot Leads</p>
          <div className="flex items-center justify-between mt-2">
            <span className="text-2xl font-bold text-rose-600">{stats.hot}</span>
            <div className="h-8 w-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <Flame size={16} />
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-[0_2px_4px_rgba(0,0,0,0.02)] border-l-4 border-l-purple-500">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Today's Calls</p>
          <div className="flex items-center justify-between mt-2">
            <span className="text-2xl font-bold text-purple-600">{stats.followUpsToday}</span>
            <div className="h-8 w-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <CalendarClock size={16} />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold text-slate-800 tracking-tight">Leads & Prospects</h1>
            <p className="text-xs text-slate-500 mt-0.5">Manage pipeline activities and client conversions</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 sm:w-56">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Search lead, name, phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
              />
            </div>

            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="ALL">All Statuses</option>
                <option value="New">New</option>
                <option value="Contacted">Contacted</option>
                <option value="Interested">Interested</option>
                <option value="Follow-up">Follow-up</option>
                <option value="Proposal">Proposal</option>
                <option value="Converted">Converted</option>
              </select>
            </div>

            <div className="flex items-center gap-2 border-l border-slate-200 pl-3 ml-1">
              <button 
                onClick={handleExportExcel}
                className="inline-flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold px-3 py-2 rounded-lg transition-colors"
                title="Download Excel Template"
              >
                <Download size={14} /> Export
              </button>
              
              <button 
                onClick={() => fileInputRef.current.click()}
                className="inline-flex items-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold px-3 py-2 rounded-lg transition-colors"
                title="Upload Excel"
              >
                <Upload size={14} /> Import
              </button>
              
              <input 
                type="file" 
                accept=".xlsx, .xls, .csv" 
                className="hidden" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
              />
            </div>

            <button 
              onClick={handleAddNew}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-sm shadow-blue-500/20 transition-all duration-150 active:scale-95 ml-2"
            >
              <Plus size={16} strokeWidth={2.5} />
              <span>Create Lead</span>
            </button>
          </div>
        </div>

        {/* RESTRUCTURED TABLE HEADERS */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                <th className="py-3.5 px-6">Lead ID</th>
                <th className="py-3.5 px-6">Name & Contact</th>
                <th className="py-3.5 px-6">Service Required</th>
                <th className="py-3.5 px-6">Status & Action</th>
                <th className="py-3.5 px-6">Owner / Created By</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm font-normal text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan="6" className="text-center py-16 text-slate-400 text-sm">
                    <div className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-slate-300 border-t-blue-600 mb-2"></div>
                    <div>Loading prospect records...</div>
                  </td>
                </tr>
              ) : filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-16">
                    <div className="max-w-xs mx-auto text-slate-400">
                      <AlertCircle className="mx-auto mb-2 text-slate-300" size={32} />
                      <p className="font-semibold text-slate-600">No leads found</p>
                      <p className="text-xs text-slate-400 mt-1">Adjust your filters, import an Excel file, or add manually.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => (
                  <tr key={lead._id} className="hover:bg-slate-50/70 transition-colors group">
                    <td className="py-4 px-6 font-semibold text-blue-600 text-xs tracking-wide">
                      {lead.leadId || '—'}
                    </td>
                    <td className="py-4 px-6">
                      <div className="font-semibold text-slate-800">{lead.name}</div>
                      <div className="flex items-center gap-1 mt-1 text-[11px] font-medium text-slate-500">
                        <Phone size={11} className="text-slate-400" /> {lead.mobile}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-indigo-600 font-semibold text-[11px] bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100">
                        {Array.isArray(lead.queryService) ? lead.queryService.join(', ') : lead.queryService || 'General Inquiry'}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex flex-col gap-1.5 items-start">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ring-1 ${getStatusBadge(lead.status)}`}>
                          {lead.status}
                        </span>
                        {lead.status === 'Follow-up' && lead.nextFollowUpDate && (
                          <div className="flex items-center gap-1 text-[11px] font-semibold text-purple-600 bg-purple-50 px-2 py-0.5 rounded border border-purple-100">
                            <CalendarDays size={11} /> 
                            {new Date(lead.nextFollowUpDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                          </div>
                        )}
                      </div>
                    </td>
                    
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 text-[10px] font-bold">
                          {lead.createdBy?.name ? lead.createdBy.name.charAt(0).toUpperCase() : 'A'}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-700">
                            {lead.createdBy?.name || 'System / Admin'}
                          </span>
                          {lead.createdBy?.empId && (
                            <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">
                              {lead.createdBy.empId}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button 
                          onClick={() => handleView(lead)}
                          className="inline-flex items-center justify-center p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="View Full Details"
                        >
                          <Eye size={16} />
                        </button>
                        
                        <button 
                          onClick={() => handleOpenRemarks(lead)} 
                          className="inline-flex items-center justify-center p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" 
                          title="View Remarks & History"
                        >
                          <MessageSquare size={16} />
                        </button>

                        <button 
                          onClick={() => handleEdit(lead)}
                          className="inline-flex items-center justify-center p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit / Update Lead"
                        >
                          <Pencil size={16} />
                        </button>

                        {isAdmin && (
                          <button 
                            onClick={() => confirmDelete(lead)}
                            className="inline-flex items-center justify-center p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete Lead"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* VIEW LEAD MODAL */}
      {isViewModalOpen && viewLeadData && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95">
            
            <div className="flex-shrink-0 flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/50 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                  <UserCircle size={24} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">{viewLeadData.name}</h2>
                  <p className="text-xs font-semibold text-blue-600 tracking-wider uppercase">{viewLeadData.leadId}</p>
                </div>
              </div>
              <button onClick={() => setIsViewModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200">
                <X size={20} />
              </button>
            </div>

            <div className="overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="col-span-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Contact Info</p>
                  <div className="text-sm font-medium text-slate-800 flex items-center gap-2">
                    <Phone size={14} className="text-slate-400"/> {viewLeadData.mobile}
                  </div>
                  {viewLeadData.email && <div className="text-sm font-medium text-slate-800 flex items-center gap-2 mt-1"><Mail size={14} className="text-slate-400"/> {viewLeadData.email}</div>}
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Status</p>
                  <span className={`inline-flex px-2 py-0.5 rounded text-xs font-bold border ${getStatusBadge(viewLeadData.status)}`}>{viewLeadData.status}</span>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Priority</p>
                  <span className={`inline-flex px-2 py-0.5 rounded text-xs border ${getPriorityBadge(viewLeadData.priority)}`}>{viewLeadData.priority}</span>
                </div>
                
                <div className="col-span-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Created & Managed By</p>
                  <span className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <ShieldUser size={15} className="text-blue-500"/>
                    {viewLeadData.createdBy?.name || 'System / Admin'}
                  </span>
                </div>

                <div className="col-span-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Service Required</p>
                  <span className="text-sm font-semibold text-slate-700 bg-white border px-2 py-1 rounded">
                    {Array.isArray(viewLeadData.queryService) ? viewLeadData.queryService.join(', ') : viewLeadData.queryService || 'General'}
                  </span>
                </div>

                <div className="col-span-4 h-px bg-slate-200 my-2"></div>
                <div className="col-span-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Lead Acquisition Source</p>
                  <span className="text-sm font-bold text-slate-800 bg-white border px-2.5 py-1 rounded-lg shadow-sm flex items-center gap-2 w-max">
                    <Briefcase size={14} className="text-indigo-600"/> 
                    {viewLeadData.source || 'Manual Entry'}
                    
                    {viewLeadData.source === 'BA' && viewLeadData.referredByBA && (
                      <span className="ml-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                        {getBaName(viewLeadData.referredByBA)}
                      </span>
                    )}
                    {viewLeadData.source === 'Reference' && viewLeadData.referenceName && (
                      <span className="ml-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                        {viewLeadData.referenceName}
                      </span>
                    )}
                    {viewLeadData.source === 'Other' && viewLeadData.otherSourceName && (
                      <span className="ml-1 text-[11px] font-bold text-orange-700 bg-orange-50 px-2 py-0.5 rounded border border-orange-100">
                        {viewLeadData.otherSourceName}
                      </span>
                    )}
                  </span>
                </div>

              </div>
            </div>
            
            <div className="flex-shrink-0 p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 rounded-b-2xl">
              <button onClick={() => { setIsViewModalOpen(false); handleOpenRemarks(viewLeadData); }} className="px-4 py-2 text-xs font-semibold bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg transition-colors flex items-center gap-2">
                 <MessageSquare size={14} /> Remarks
               </button>
               <button onClick={() => { setIsViewModalOpen(false); handleEdit(viewLeadData); }} className="px-4 py-2 text-xs font-semibold bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg transition-colors flex items-center gap-2">
                 <Pencil size={14} /> Edit This Lead
               </button>
            </div>
          </div>
        </div>
      )}

      {/* DEDICATED REMARKS & TIMELINE MODAL */}
      {isRemarksModalOpen && leadForRemarks && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl border border-slate-100 flex flex-col max-h-[85vh] overflow-hidden animate-in fade-in zoom-in-95">
            
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/80">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  <MessageSquare size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-800 tracking-tight">Lead Remarks & Audit History</h2>
                  <p className="text-xs text-slate-500">{leadForRemarks.name} • <span className="font-mono font-semibold text-blue-600">{leadForRemarks.leadId}</span></p>
                </div>
              </div>
              <button onClick={() => setIsRemarksModalOpen(false)} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors"><X size={18} /></button>
            </div>

            <div className="overflow-y-auto p-6 space-y-4 custom-scrollbar">
              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200/80 text-sm text-slate-700 font-medium whitespace-pre-wrap min-h-[160px] shadow-inner leading-relaxed">
                {leadForRemarks.remarks ? (
                  leadForRemarks.remarks
                ) : (
                  <span className="text-slate-400 italic">No remarks or audit history recorded for this lead yet.</span>
                )}
              </div>
            </div>

            <div className="flex justify-end px-6 py-4 border-t border-slate-100 bg-white rounded-b-3xl">
              <button onClick={() => setIsRemarksModalOpen(false)} className="px-5 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors">
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ADD / EDIT LEAD MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">
            
            <div className="flex-shrink-0 flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/50 rounded-t-2xl">
              <div>
                <h2 className="text-base font-bold text-slate-800">
                  {editMode ? `Update Lead: ${formData.name}` : 'Add New Prospect'}
                </h2>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>

            <div className="overflow-y-auto p-6 space-y-4 custom-scrollbar">
              
              {editMode && !isAdmin && (
                 <div className="md:col-span-2 flex items-center gap-2 bg-amber-50 text-amber-700 p-2.5 rounded-lg border border-amber-200 text-xs font-medium mb-2">
                   <Lock size={14} className="shrink-0" />
                   Some fields are locked. You can only update Status, Priority, Date, and Add Notes. Updates are tracked.
                 </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Client / Prospect Name <span className="text-rose-500">*</span>
                  </label>
                  <input 
                    type="text" name="name" required value={formData.name} onChange={handleChange} 
                    disabled={editMode && !isAdmin} 
                    className={`w-full text-sm border border-slate-200 rounded-lg p-2.5 ${editMode && !isAdmin ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'focus:ring-2 focus:ring-blue-500/20'}`} 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Mobile Number <span className="text-rose-500">*</span></label>
                  <input 
                    type="tel" name="mobile" required value={formData.mobile} onChange={handleChange} 
                    disabled={editMode && !isAdmin}
                    className={`w-full text-sm border border-slate-200 rounded-lg p-2.5 ${editMode && !isAdmin ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'focus:ring-2 focus:ring-blue-500/20'}`} 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Email Address</label>
                  <input 
                    type="email" name="email" value={formData.email} onChange={handleChange} 
                    disabled={editMode && !isAdmin} 
                    className={`w-full text-sm border border-slate-200 rounded-lg p-2.5 ${editMode && !isAdmin ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'focus:ring-2 focus:ring-blue-500/20'}`} 
                  />
                </div>

                <div className={sourceNeedsExtraField ? 'md:col-span-1' : 'md:col-span-2'}>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Lead Source</label>
                  <select 
                    name="source" value={formData.source} onChange={handleChange} 
                    disabled={editMode && !isAdmin} 
                    className={`w-full text-sm border border-slate-200 rounded-lg p-2.5 ${editMode && !isAdmin ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'focus:ring-2 focus:ring-blue-500/20'}`} 
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

                {/* CONDITIONAL SOURCE FIELDS */}
                {formData.source === 'BA' && (
                  <div className="md:col-span-1 animate-in fade-in duration-200">
                    <label className="block text-xs font-bold uppercase tracking-wider text-indigo-600 mb-1">
                      Select BA <span className="text-rose-500">*</span>
                    </label>
                    <select 
                      name="referredByBA" required={formData.source === 'BA'} value={formData.referredByBA} onChange={handleChange} 
                      disabled={editMode && !isAdmin} 
                      className={`w-full text-sm border rounded-lg p-2.5 font-medium ${editMode && !isAdmin ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed' : 'bg-indigo-50/50 border-indigo-200 focus:ring-2 focus:ring-indigo-500/20'}`} 
                    >
                      <option value="">-- Choose Partner --</option>
                      {bas.map(ba => <option key={ba._id} value={ba._id}>{ba.baName || ba.name}</option>)}
                    </select>
                  </div>
                )}

                {formData.source === 'Reference' && (
                  <div className="md:col-span-1 animate-in fade-in duration-200">
                    <label className="block text-xs font-bold uppercase tracking-wider text-emerald-600 mb-1">
                      Reference Name <span className="text-rose-500">*</span>
                    </label>
                    <input 
                      type="text" name="referenceName" required={formData.source === 'Reference'} value={formData.referenceName} onChange={handleChange} 
                      disabled={editMode && !isAdmin} placeholder="Who referred them?"
                      className={`w-full text-sm border rounded-lg p-2.5 font-medium ${editMode && !isAdmin ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed' : 'bg-emerald-50/50 border-emerald-200 focus:ring-2 focus:ring-emerald-500/20'}`} 
                    />
                  </div>
                )}

                {formData.source === 'Other' && (
                  <div className="md:col-span-1 animate-in fade-in duration-200">
                    <label className="block text-xs font-bold uppercase tracking-wider text-orange-600 mb-1">
                      Other Source <span className="text-rose-500">*</span>
                    </label>
                    <input 
                      type="text" name="otherSourceName" required={formData.source === 'Other'} value={formData.otherSourceName} onChange={handleChange} 
                      disabled={editMode && !isAdmin} placeholder="Specify source..."
                      className={`w-full text-sm border rounded-lg p-2.5 font-medium ${editMode && !isAdmin ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed' : 'bg-orange-50/50 border-orange-200 focus:ring-2 focus:ring-orange-500/20'}`} 
                    />
                  </div>
                )}
                
                {/* UNLOCKED FIELDS FOR STATUS UPDATES */}
                <div className="md:col-span-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Priority Tier</label>
                  <select name="priority" value={formData.priority} onChange={handleChange} className="w-full text-sm border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500/20 bg-white">
                    <option value="Hot">Hot (Immediate closing)</option>
                    <option value="Warm">Warm (Follow-up needed)</option>
                    <option value="Cold">Cold (Inquiry only)</option>
                  </select>
                </div>

                <div className="md:col-span-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Lead Status</label>
                  <select name="status" value={formData.status} onChange={handleChange} className="w-full text-sm border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500/20 font-semibold bg-white">
                    <option value="New">New</option>
                    <option value="Contacted">Contacted</option>
                    <option value="Interested">Interested</option>
                    <option value="Follow-up">Follow-up</option>
                    <option value="Proposal">Proposal</option>
                    <option value="Converted">✅ Converted (Client)</option>
                  </select>
                </div>

                {formData.status === 'Follow-up' && (
                  <div className="md:col-span-2 bg-purple-50 p-3 rounded-lg border border-purple-200">
                    <label className="block text-xs font-bold uppercase tracking-wider text-purple-700 mb-1">
                      Schedule Follow-up Date <span className="text-rose-500">*</span>
                    </label>
                    <input type="date" name="nextFollowUpDate" required={formData.status === 'Follow-up'} value={formData.nextFollowUpDate} onChange={handleChange} min={new Date().toISOString().split("T")[0]} className="w-full text-sm border border-purple-200 bg-white rounded-md p-2.5 focus:ring-2 focus:ring-purple-500/20 font-medium text-purple-900" />
                  </div>
                )}

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Required Service</label>
                  <select 
                    name="queryService" value={formData.queryService} onChange={handleChange} 
                    disabled={editMode && !isAdmin} 
                    className={`w-full text-sm border border-slate-200 rounded-lg p-2.5 ${editMode && !isAdmin ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'focus:ring-2 focus:ring-blue-500/20'}`} 
                  >
                    <option value="">-- Choose Target Service --</option>
                    <option value="ITR Filing">ITR Filing</option>
                    <option value="GST Registration">GST Registration</option>
                    <option value="Company Registration">Company Registration</option>
                    <option value="Trademark Registration">Trademark Registration</option>
                    <option value="Accounting">Accounting & Audit</option>
                  </select>
                </div>
                
                {/* REMARKS INPUT */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-blue-600 mb-1 flex items-center gap-2">
                    <Pencil size={14} className="text-blue-500"/>
                    {editMode ? 'Add Action Note / Call Summary' : 'Initial Discussion Remarks'}
                  </label>
                  <textarea name={editMode ? 'newRemark' : 'remarks'} rows="3" placeholder={editMode ? "e.g. Client asked to call back on Monday..." : "Enter notes about timeline..."} value={editMode ? newRemark : formData.remarks} onChange={editMode ? (e) => setNewRemark(e.target.value) : handleChange} className="w-full text-sm border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500/20 resize-none bg-white shadow-inner" />
                </div>
              </div>
            </div>

            <div className="flex-shrink-0 flex items-center justify-end gap-3 p-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">Cancel</button>
              <button onClick={handleSubmit} className="px-5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm">
                {editMode ? 'Update Lead' : 'Save Lead'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {isDeleteModalOpen && leadToDelete && (
        <div className="fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 p-8 text-center space-y-4">
            <div className="mx-auto h-14 w-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle size={26} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 tracking-tight">Delete Lead Record?</h3>
            </div>
            <div className="flex justify-center gap-3 pt-3">
              <button onClick={() => setIsDeleteModalOpen(false)} className="px-5 py-2.5 text-xs font-semibold bg-slate-100 text-slate-700 rounded-xl">Cancel</button>
              <button onClick={handleDelete} className="px-5 py-2.5 text-xs font-semibold bg-rose-600 text-white rounded-xl">Yes, Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Leads;