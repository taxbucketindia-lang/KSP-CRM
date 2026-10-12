import React, { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { AuthContext } from '../context/AuthContext';
import { can } from '../utils/permissions';
import { istToday, formatIstDateTime } from '../utils/time';
import {
  Handshake, Plus, Search, X, Pencil, Trash2, Eye, IndianRupee, Wallet, AlertCircle, CheckCircle2, Users, Download,
  Loader2, MapPin, Phone, Mail, UserCheck, ClipboardList, ChevronLeft, ChevronRight, FilterX, Scale, Briefcase, MessageSquare, Send, List, LayoutGrid
} from 'lucide-react';

// 🔴 VENDORS (Finance): bahar ke CA / CS / Advocate jinse kaam karwate hain.
// Har vendor ke kaam ki list aur use diye gaye payment; Total, Paid aur Balance apne aap bante hain.

// Taiyaar categories. "Other" dabane par apna naam likhne ka box khulta hai.
const CATEGORIES = ['CA', 'CS', 'Advocate', 'CMA', 'Tax Consultant', 'Notary', 'Valuer', 'Trademark Agent', 'DSC Vendor', 'Licence Agent', 'Labour Law Consultant', 'Other'];
const PRESET_CATEGORIES = CATEGORIES.filter(category => category !== 'Other');
const VIEW_KEY = 'taxbucket_vendor_view';
const WORK_STATUSES = ['Pending', 'In Progress', 'Completed'];
const PAYMENT_MODES = ['Bank', 'UPI', 'Cash', 'Cheque'];
const STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan',
  'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
];

const categoryStyle = {
  CA: 'bg-blue-50 text-blue-700 border-blue-200', CS: 'bg-purple-50 text-purple-700 border-purple-200',
  Advocate: 'bg-amber-50 text-amber-700 border-amber-200', CMA: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  'Tax Consultant': 'bg-emerald-50 text-emerald-700 border-emerald-200', Notary: 'bg-orange-50 text-orange-700 border-orange-200',
  Valuer: 'bg-teal-50 text-teal-700 border-teal-200', 'Trademark Agent': 'bg-pink-50 text-pink-700 border-pink-200',
  'DSC Vendor': 'bg-indigo-50 text-indigo-700 border-indigo-200', 'Licence Agent': 'bg-lime-50 text-lime-700 border-lime-200',
  'Labour Law Consultant': 'bg-rose-50 text-rose-700 border-rose-200',
  // Khud likhi hui category bhi isi rang me dikhti hai
  Other: 'bg-slate-100 text-slate-600 border-slate-200'
};
const workStatusStyle = {
  Pending: 'bg-amber-50 text-amber-700 border-amber-200', 'In Progress': 'bg-blue-50 text-blue-700 border-blue-200', Completed: 'bg-emerald-50 text-emerald-700 border-emerald-200'
};

const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const showDay = (key) => (key ? String(key).split('-').reverse().join('/') : '');
const sum = (list, field) => Math.round(list.reduce((total, item) => total + Number(item[field] || 0), 0) * 100) / 100;
const rowKey = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const errorText = (error) => error?.response?.data?.message || 'Something went wrong. Please try again.';

const emptyForm = () => ({ partyName: '', category: 'CA', otherCategory: false, state: '', reference: '', mobile: '', email: '', remarks: '', works: [], payments: [] });
const newWork = () => ({ key: rowKey(), date: istToday(), description: '', clientName: '', amount: '', status: 'Pending' });
const newPayment = () => ({ key: rowKey(), date: istToday(), amount: '', mode: 'Bank', note: '' });

const inputClass = 'w-full text-sm font-medium border border-slate-200 rounded-xl px-3 py-2.5 bg-white text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400';
const cellInput = 'w-full text-xs font-semibold border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20';
const labelClass = 'block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5';

const Vendors = () => {
  const { user } = useContext(AuthContext);
  const headers = useMemo(() => ({ Authorization: `Bearer ${user.token}` }), [user.token]);
  const api = `${import.meta.env.VITE_API_URL}/vendors`;
  const canDelete = can(user, 'DELETE_RECORDS');

  const [vendors, setVendors] = useState([]);
  const [stats, setStats] = useState({ total: 0, totalAmount: 0, paidAmount: 0, balanceAmount: 0, withDues: 0 });
  const [stateOptions, setStateOptions] = useState([]);
  const [categoryOptions, setCategoryOptions] = useState(CATEGORIES); // filter ke liye: taiyaar + khud likhi hui
  const [usedCategories, setUsedCategories] = useState([]);           // jo categories abhi kisi vendor me hain (chips)
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({ search: '', category: '', state: 'ALL', dues: '' });
  const [page, setPage] = useState(1);
  // 🔴 VIEW: 'list' (table, default) | 'box' (cards). Jo chuna wo is browser me yaad rehta hai.
  const [view, setView] = useState(() => { try { return localStorage.getItem(VIEW_KEY) === 'box' ? 'box' : 'list'; } catch { return 'list'; } });
  const changeView = (next) => {
    setView(next);
    setPage(1);
    try { localStorage.setItem(VIEW_KEY, next); } catch { /* storage band ho toh bhi chale */ }
  };
  // List me 10, box me 9 (3 ki 3 line, koi box akela na bache)
  const pageSize = view === 'box' ? 9 : 10;

  const [form, setForm] = useState(null);     // null | form ka data (add / edit)
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [viewVendor, setViewVendor] = useState(null);
  // 🔴 REMARKS: vendor ko edit kiye bina alag se remark jodna
  const [remarkVendor, setRemarkVendor] = useState(null);
  const [remarkText, setRemarkText] = useState('');
  const [remarkSaving, setRemarkSaving] = useState(false);

  const params = useMemo(() => ({ search: filters.search.trim(), category: filters.category, state: filters.state, dues: filters.dues }), [filters]);

  const fetchVendors = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(api, { headers, params: { ...params, page, limit: pageSize } });
      setVendors(res.data.data || []);
      setStats(res.data.stats || {});
      setStateOptions(res.data.states || []);
      setCategoryOptions(res.data.categories?.length ? res.data.categories : CATEGORIES);
      setUsedCategories(res.data.usedCategories || []);
      setTotalPages(res.data.totalPages || 1);
      setTotalCount(res.data.totalCount || 0);
    } catch (error) {
      toast.error(errorText(error));
    } finally {
      setLoading(false);
    }
  }, [api, headers, params, page, pageSize]);

  // Search likhte waqt har akshar par server ko call na jaye
  useEffect(() => {
    const timer = setTimeout(fetchVendors, 300);
    return () => clearTimeout(timer);
  }, [fetchVendors]);

  const setFilter = (field) => (e) => { setPage(1); setFilters(prev => ({ ...prev, [field]: e.target.value })); };
  const activeFilters = [filters.search, filters.category, filters.state !== 'ALL', filters.dues].filter(Boolean).length;
  const clearFilters = () => { setPage(1); setFilters({ search: '', category: '', state: 'ALL', dues: '' }); };

  const openAdd = () => { setEditId(null); setForm(emptyForm()); };
  const openEdit = (vendor) => {
    setViewVendor(null);
    setEditId(vendor._id);
    setForm({
      partyName: vendor.partyName || '',
      // List wali category waise hi; khud likhi hui ho toh "Other" khula aur naam box me
      category: vendor.category === 'Other' ? '' : (vendor.category || 'CA'),
      otherCategory: !PRESET_CATEGORIES.includes(vendor.category),
      state: vendor.state || '', reference: vendor.reference || '',
      mobile: vendor.mobile || '', email: vendor.email || '', remarks: vendor.remarks || '',
      works: (vendor.works || []).map(work => ({ ...work, key: work._id || rowKey(), amount: work.amount || '' })),
      payments: (vendor.payments || []).map(payment => ({ ...payment, key: payment._id || rowKey(), amount: payment.amount || '' }))
    });
  };

  const setField = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));
  const updateRow = (list, key, changes) => setForm(prev => ({ ...prev, [list]: prev[list].map(row => (row.key === key ? { ...row, ...changes } : row)) }));
  const removeRow = (list, key) => setForm(prev => ({ ...prev, [list]: prev[list].filter(row => row.key !== key) }));
  const addRow = (list) => setForm(prev => ({ ...prev, [list]: [...prev[list], list === 'works' ? newWork() : newPayment()] }));

  const formTotal = form ? sum(form.works, 'amount') : 0;
  const formPaid = form ? sum(form.payments, 'amount') : 0;
  const formBalance = Math.round((formTotal - formPaid) * 100) / 100;

  const handleSave = async (e) => {
    e.preventDefault();
    if (saving) return;
    if (!form.partyName.trim()) return toast.error('Please enter the party name');
    if (form.works.some(work => !work.description.trim())) return toast.error('Every work row needs a description. Remove empty rows.');
    if (form.payments.some(payment => !(Number(payment.amount) > 0))) return toast.error('Every payment row needs an amount. Remove empty rows.');

    setSaving(true);
    try {
      const { otherCategory, ...details } = form;
      const payload = {
        ...details,
        // "Other" me naam na likha ho toh "Other" hi save hota hai
        category: otherCategory ? (form.category.trim() || 'Other') : form.category,
        works: form.works.map(({ key, ...work }) => ({ ...work, amount: Number(work.amount || 0) })),
        payments: form.payments.map(({ key, ...payment }) => ({ ...payment, amount: Number(payment.amount || 0) }))
      };
      if (editId) await axios.put(`${api}/${editId}`, payload, { headers });
      else await axios.post(api, payload, { headers });
      toast.success(editId ? 'Vendor updated' : 'Vendor added');
      setForm(null);
      fetchVendors();
    } catch (error) {
      toast.error(errorText(error));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (vendor) => {
    if (!window.confirm(`Delete vendor "${vendor.partyName}" with all its work and payment records?`)) return;
    try {
      await axios.delete(`${api}/${vendor._id}`, { headers });
      toast.success('Vendor deleted');
      setViewVendor(null);
      fetchVendors();
    } catch (error) {
      toast.error(errorText(error));
    }
  };

  const openRemarks = (vendor) => { setRemarkText(''); setRemarkVendor(vendor); };

  // Remark save / delete ke baad list aur khule hue popup dono me naya data
  const applyVendor = (updated) => {
    setVendors(prev => prev.map(v => (v._id === updated._id ? updated : v)));
    setRemarkVendor(prev => (prev && prev._id === updated._id ? updated : prev));
    setViewVendor(prev => (prev && prev._id === updated._id ? updated : prev));
  };

  const addRemark = async (e) => {
    e.preventDefault();
    if (remarkSaving || !remarkVendor) return;
    if (!remarkText.trim()) return toast.error('Please write a remark');
    setRemarkSaving(true);
    try {
      const res = await axios.post(`${api}/${remarkVendor._id}/remarks`, { text: remarkText.trim() }, { headers });
      applyVendor(res.data);
      setRemarkText('');
      toast.success('Remark added');
    } catch (error) {
      toast.error(errorText(error));
    } finally {
      setRemarkSaving(false);
    }
  };

  const deleteRemark = async (vendor, remark) => {
    if (!window.confirm('Delete this remark?')) return;
    try {
      const res = await axios.delete(`${api}/${vendor._id}/remarks/${remark._id}`, { headers });
      applyVendor(res.data);
      toast.success('Remark deleted');
    } catch (error) {
      toast.error(errorText(error));
    }
  };

  // Excel: jo filter laga hai usi ke saare vendor (sirf is page ke nahi)
  const handleExport = async () => {
    try {
      const res = await axios.get(api, { headers, params: { ...params, all: 'true' } });
      const list = res.data.data || [];
      if (list.length === 0) return toast.error('Nothing to export for this filter');
      const summary = list.map(v => ({
        'Vendor ID': v.vendorId, 'Party Name': v.partyName, Category: v.category, State: v.state, Reference: v.reference, Mobile: v.mobile, Email: v.email,
        'No. of Works': (v.works || []).length, 'Total Amount': v.totalAmount, Paid: v.paidAmount, Balance: v.balanceAmount, Remarks: v.remarks
      }));
      const works = list.flatMap(v => (v.works || []).map(w => ({ 'Vendor ID': v.vendorId, 'Party Name': v.partyName, Date: showDay(w.date), Work: w.description, Client: w.clientName, Amount: w.amount, Status: w.status })));
      const payments = list.flatMap(v => (v.payments || []).map(p => ({ 'Vendor ID': v.vendorId, 'Party Name': v.partyName, Date: showDay(p.date), Amount: p.amount, Mode: p.mode, Note: p.note })));
      const book = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(summary), 'Vendors');
      XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(works), 'List of Work');
      XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(payments), 'Payments');
      const remarkRows = list.flatMap(v => (v.remarkLog || []).map(r => ({ 'Vendor ID': v.vendorId, 'Party Name': v.partyName, Date: formatIstDateTime(r.at), By: r.byName, Remark: r.text })));
      XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(remarkRows), 'Remarks');
      XLSX.writeFile(book, `Vendors_${istToday()}.xlsx`);
    } catch (error) {
      toast.error(errorText(error));
    }
  };

  const selectClass = 'text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer';
  const paidPercent = stats.totalAmount > 0 ? Math.min(100, Math.round((Number(stats.paidAmount || 0) / stats.totalAmount) * 100)) : 0;
  const initials = (name) => String(name || '?').trim().split(/\s+/).slice(0, 2).map(word => word.charAt(0).toUpperCase()).join('');
  const chipClass = (active) => `shrink-0 text-xs font-bold px-3 py-1.5 rounded-full border transition-colors ${active ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`;
  const pickFilter = (field, value) => { setPage(1); setFilters(prev => ({ ...prev, [field]: value })); };

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-10">
      <Toaster position="top-right" />

      {/* HEADER */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 md:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <span className="h-12 w-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shrink-0"><Handshake size={22} /></span>
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight leading-tight">Vendors</h1>
            <p className="text-xs md:text-sm text-slate-500 font-medium">CA, CS, Advocates and other professionals you get work done from.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {/* List / Box */}
          <div className="flex bg-slate-100 p-1 rounded-xl">
            {[['list', 'List', List], ['box', 'Box', LayoutGrid]].map(([value, label, Icon]) => (
              <button key={value} onClick={() => changeView(value)} className={`px-3.5 py-2 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all ${view === value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>
          <button onClick={handleExport} className="inline-flex items-center gap-2 bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 text-sm font-bold px-4 py-2.5 rounded-xl shadow-sm transition-all"><Download size={16} /> Excel</button>
          <button onClick={openAdd} className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold px-4 py-2.5 rounded-xl shadow-md transition-all"><Plus size={16} strokeWidth={2.5} /> Add Vendor</button>
        </div>
      </div>

      {/* SUMMARY BOXES (filter ke hisaab se) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5"><Users size={12} /> Vendors</p>
          <p className="text-2xl font-black text-slate-800 mt-1.5 leading-none">{stats.total || 0}</p>
          <p className="text-[11px] font-semibold text-amber-600 mt-1.5">{stats.withDues || 0} with balance pending</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5"><Briefcase size={12} /> Total Work Value</p>
          <p className="text-2xl font-black text-slate-800 mt-1.5 leading-none truncate">{money(stats.totalAmount)}</p>
          <p className="text-[11px] font-semibold text-slate-400 mt-1.5">Sum of all work amounts</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5"><CheckCircle2 size={12} /> Paid</p>
          <p className="text-2xl font-black text-emerald-600 mt-1.5 leading-none truncate">{money(stats.paidAmount)}</p>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mt-2"><div className="h-full bg-emerald-500 rounded-full" style={{ width: `${paidPercent}%` }}></div></div>
          <p className="text-[11px] font-semibold text-slate-400 mt-1">{paidPercent}% of total paid</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5"><Wallet size={12} /> Balance to Pay</p>
          <p className="text-2xl font-black text-rose-600 mt-1.5 leading-none truncate">{money(stats.balanceAmount)}</p>
          <p className="text-[11px] font-semibold text-slate-400 mt-1.5">Total − Paid</p>
        </div>
      </div>

      {/* FILTERS */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input type="text" value={filters.search} onChange={setFilter('search')} placeholder="Search party name, vendor ID, reference or work..." className="w-full pl-10 pr-9 py-2.5 text-sm font-medium bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20" />
            {filters.search && <button onClick={() => pickFilter('search', '')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700" title="Clear search"><X size={15} /></button>}
          </div>
          <select value={filters.state} onChange={setFilter('state')} className={`${selectClass} ${filters.state !== 'ALL' ? 'border-blue-300 bg-blue-50 text-blue-700' : ''}`}>
            <option value="ALL">All States</option>
            {stateOptions.map(state => <option key={state} value={state}>{state}</option>)}
          </select>
          <div className="flex bg-slate-100 p-1 rounded-xl shrink-0">
            {[['', 'All'], ['Pending', 'Balance Pending'], ['Cleared', 'Fully Paid']].map(([value, label]) => (
              <button key={label} onClick={() => pickFilter('dues', value)} className={`px-3 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap transition-all ${filters.dues === value ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{label}</button>
            ))}
          </div>
        </div>

        {/* Category: jo categories abhi use ho rahi hain unke chips */}
        <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0">Category</span>
          <button onClick={() => pickFilter('category', '')} className={chipClass(!filters.category)}>All</button>
          {usedCategories.map(category => (
            <button key={category} onClick={() => pickFilter('category', filters.category === category ? '' : category)} className={chipClass(filters.category === category)}>{category}</button>
          ))}
          {usedCategories.length === 0 && <span className="text-xs text-slate-400 font-medium">Categories will appear here once you add vendors.</span>}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
          <p className="text-xs font-semibold text-slate-500 pt-2"><span className="font-black text-slate-800">{totalCount}</span> vendor{totalCount === 1 ? '' : 's'} {activeFilters > 0 ? 'match your filters' : 'in total'}</p>
          {activeFilters > 0 && <button onClick={clearFilters} className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-100 px-3 py-1.5 rounded-lg"><FilterX size={13} /> Clear filters</button>}
        </div>
      </div>

      {/* LIST VIEW (default): table */}
      {view === 'list' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {/* LIST */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-black uppercase tracking-widest">
                <th className="py-3 px-5">Party Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">State</th>
                <th className="py-3 px-4">Reference</th>
                <th className="py-3 px-4">List of Work</th>
                <th className="py-3 px-4 text-right">Payment (Total)</th>
                <th className="py-3 px-4 text-right">Paid</th>
                <th className="py-3 px-4 text-right">Balance</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-700">
              {loading && vendors.length === 0 ? (
                <tr><td colSpan="9" className="text-center py-16 text-slate-400"><Loader2 className="animate-spin inline-block mr-2" size={18} /> Loading vendors...</td></tr>
              ) : vendors.length === 0 ? (
                <tr><td colSpan="9" className="py-16 text-slate-400">
                  <div className="flex flex-col items-center text-center">
                    <Handshake size={36} className="mb-3 text-slate-300" />
                    <p className="text-sm font-bold text-slate-500">{activeFilters > 0 ? 'No vendors match these filters.' : 'No vendors added yet.'}</p>
                    {activeFilters === 0 && <button onClick={openAdd} className="mt-2 text-xs font-bold text-blue-600 hover:underline">Add your first vendor</button>}
                  </div>
                </td></tr>
              ) : vendors.map(vendor => {
                const works = vendor.works || [];
                return (
                  <tr key={vendor._id} className={`hover:bg-blue-50/40 transition-colors ${loading ? 'opacity-60' : ''}`}>
                    <td className="py-3.5 px-5">
                      <button onClick={() => setViewVendor(vendor)} className="font-bold text-slate-800 text-sm text-left hover:text-blue-700">{vendor.partyName}</button>
                      <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-slate-500 font-medium mt-0.5">
                        <span className="font-mono font-bold text-blue-700 bg-blue-50 border border-blue-100 px-1.5 rounded">{vendor.vendorId}</span>
                        {vendor.mobile && <span className="flex items-center gap-1"><Phone size={10} /> {vendor.mobile}</span>}
                      </div>
                    </td>
                    <td className="py-3.5 px-4"><span className={`text-[11px] font-bold px-2 py-1 rounded-md border ${categoryStyle[vendor.category] || categoryStyle.Other}`}>{vendor.category}</span></td>
                    <td className="py-3.5 px-4 text-xs font-semibold text-slate-600">{vendor.state || <span className="text-slate-300">—</span>}</td>
                    <td className="py-3.5 px-4 text-xs font-semibold text-slate-600 max-w-[140px] truncate" title={vendor.reference}>{vendor.reference || <span className="text-slate-300">—</span>}</td>
                    <td className="py-3.5 px-4 max-w-[240px]">
                      {works.length === 0 ? <span className="text-xs text-slate-300">No work added</span> : (
                        <>
                          <p className="text-xs font-semibold text-slate-700 truncate" title={works[works.length - 1].description}>{works[works.length - 1].description}</p>
                          <p className="text-[11px] text-slate-400 font-medium">{works.length} work{works.length === 1 ? '' : 's'} · {works.filter(w => w.status !== 'Completed').length} open</p>
                        </>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-800 whitespace-nowrap">{money(vendor.totalAmount)}</td>
                    <td className="py-3.5 px-4 text-right font-bold text-emerald-700 whitespace-nowrap">{money(vendor.paidAmount)}</td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      {vendor.balanceAmount > 0
                        ? <span className="text-sm font-black text-rose-600">{money(vendor.balanceAmount)}</span>
                        : vendor.balanceAmount < 0
                          ? <span className="text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">Advance {money(-vendor.balanceAmount)}</span>
                          : <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">{vendor.totalAmount > 0 ? 'Paid' : '—'}</span>}
                    </td>
                    <td className="py-3.5 px-5">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => openRemarks(vendor)} className="relative p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50" title="Remarks">
                          <MessageSquare size={15} />
                          {(vendor.remarkLog || []).length > 0 && <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-[9px] font-black min-w-[15px] h-[15px] px-0.5 rounded-full flex items-center justify-center">{vendor.remarkLog.length}</span>}
                        </button>
                        <button onClick={() => setViewVendor(vendor)} className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50" title="View"><Eye size={15} /></button>
                        <button onClick={() => openEdit(vendor)} className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50" title="Edit / add work or payment"><Pencil size={15} /></button>
                        {canDelete && <button onClick={() => handleDelete(vendor)} className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50" title="Delete"><Trash2 size={15} /></button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        </div>
      )}

      {/* BOX VIEW: vendor cards */}
      {view === 'box' && (loading && vendors.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map(n => <div key={n} className="h-64 rounded-3xl bg-white border border-slate-200 animate-pulse"></div>)}
        </div>
      ) : vendors.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-slate-300 py-16 px-4 flex flex-col items-center text-center">
          <span className="h-16 w-16 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center mb-4"><Handshake size={30} /></span>
          <p className="text-base font-black text-slate-700">{activeFilters > 0 ? 'No vendors match these filters' : 'No vendors added yet'}</p>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">{activeFilters > 0 ? 'Try a different search or clear the filters.' : 'Add the CA, CS, Advocates and other professionals you work with, then track their work and payments here.'}</p>
          {activeFilters > 0
            ? <button onClick={clearFilters} className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-xl"><FilterX size={13} /> Clear filters</button>
            : <button onClick={openAdd} className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2.5 rounded-xl shadow-md"><Plus size={15} /> Add your first vendor</button>}
        </div>
      ) : (
        <div className={`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 ${loading ? 'opacity-60' : ''}`}>
          {vendors.map(vendor => {
            const works = vendor.works || [];
            const openWorks = works.filter(work => work.status !== 'Completed').length;
            const latest = works.length ? [...works].sort((a, b) => String(b.date).localeCompare(String(a.date)))[0] : null;
            const percent = vendor.totalAmount > 0 ? Math.min(100, Math.round((Number(vendor.paidAmount || 0) / vendor.totalAmount) * 100)) : 0;
            const style = categoryStyle[vendor.category] || categoryStyle.Other;
            const remarkCount = (vendor.remarkLog || []).length;

            return (
              <div key={vendor._id} className="group bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-blue-200 hover:-translate-y-0.5 transition-all flex flex-col overflow-hidden">
                <div className="p-5 pb-4 cursor-pointer" onClick={() => setViewVendor(vendor)}>
                  <div className="flex items-start gap-3">
                    <span className={`h-12 w-12 rounded-2xl border flex items-center justify-center font-black text-base shrink-0 ${style}`}>{initials(vendor.partyName)}</span>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base font-black text-slate-800 leading-tight truncate group-hover:text-blue-700 transition-colors">{vendor.partyName}</h3>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${style}`}>{vendor.category}</span>
                        <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{vendor.vendorId}</span>
                      </div>
                    </div>
                    {vendor.balanceAmount > 0
                      ? <span className="shrink-0 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">Due</span>
                      : vendor.totalAmount > 0 ? <span className="shrink-0 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">Paid</span> : null}
                  </div>

                  <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mt-4 text-[11px] font-semibold text-slate-600">
                    <span className="flex items-center gap-1.5 min-w-0"><MapPin size={12} className="text-slate-400 shrink-0" /><span className="truncate">{vendor.state || 'State not set'}</span></span>
                    <span className="flex items-center gap-1.5 min-w-0"><Phone size={12} className="text-slate-400 shrink-0" /><span className="truncate">{vendor.mobile || 'No mobile'}</span></span>
                    <span className="col-span-2 flex items-center gap-1.5 min-w-0"><UserCheck size={12} className="text-slate-400 shrink-0" /><span className="truncate">Ref: {vendor.reference || '—'}</span></span>
                  </div>

                  <div className="mt-3 rounded-2xl bg-slate-50 border border-slate-100 px-3 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1"><ClipboardList size={11} /> List of Work</span>
                      <span className="normal-case tracking-normal text-slate-500">{works.length} total{openWorks > 0 ? ` · ${openWorks} open` : ''}</span>
                    </p>
                    <p className={`text-xs font-semibold mt-0.5 truncate ${latest ? 'text-slate-700' : 'text-slate-300'}`} title={latest?.description}>{latest ? latest.description : 'No work added yet'}</p>
                  </div>

                  <div className="mt-4">
                    <div className="flex items-end justify-between gap-2 mb-1.5">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{vendor.balanceAmount < 0 ? 'Advance Paid' : 'Balance'}</p>
                        <p className={`text-xl font-black leading-none ${vendor.balanceAmount > 0 ? 'text-rose-600' : vendor.balanceAmount < 0 ? 'text-blue-700' : 'text-slate-800'}`}>{money(Math.abs(vendor.balanceAmount || 0))}</p>
                      </div>
                      <p className="text-[11px] font-semibold text-slate-500 text-right">Paid <span className="font-black text-emerald-700">{money(vendor.paidAmount)}</span><br />of <span className="font-black text-slate-700">{money(vendor.totalAmount)}</span></p>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden"><div className={`h-full rounded-full ${percent >= 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${percent}%` }}></div></div>
                  </div>
                </div>

                <div className="mt-auto flex items-center border-t border-slate-100 bg-slate-50/60 divide-x divide-slate-100">
                  <button onClick={() => openRemarks(vendor)} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold text-slate-600 hover:text-amber-700 hover:bg-amber-50 transition-colors">
                    <MessageSquare size={13} /> Remarks{remarkCount > 0 && <span className="bg-amber-500 text-white text-[9px] font-black min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center">{remarkCount}</span>}
                  </button>
                  <button onClick={() => setViewVendor(vendor)} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold text-slate-600 hover:text-blue-700 hover:bg-blue-50 transition-colors"><Eye size={13} /> View</button>
                  <button onClick={() => openEdit(vendor)} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 transition-colors"><Pencil size={13} /> Edit</button>
                  {canDelete && <button onClick={() => handleDelete(vendor)} className="px-3.5 py-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors" title="Delete"><Trash2 size={14} /></button>}
                </div>
              </div>
            );
          })}
        </div>
      ))}

      {vendors.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white rounded-2xl border border-slate-200 shadow-sm px-4 py-3">
          <span className="text-xs font-bold text-slate-500">Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, totalCount)} of {totalCount} vendors</span>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-white text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-50"><ChevronLeft size={13} /> Previous</button>
              <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100">Page {page} of {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-blue-600 text-white border border-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">Next <ChevronRight size={13} /></button>
            </div>
          )}
        </div>
      )}

      {/* ============================ ADD / EDIT ============================ */}
      {form && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-2 sm:p-4">
          <div className="bg-slate-50 rounded-3xl w-full max-w-4xl shadow-2xl border border-slate-100 flex flex-col max-h-[94vh] overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-white">
              <h2 className="text-lg font-black text-slate-800 flex items-center gap-2"><Handshake className="text-blue-600" size={20} /> {editId ? 'Edit Vendor' : 'Add Vendor'}</h2>
              <button onClick={() => setForm(null)} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"><X size={18} /></button>
            </div>

            <form onSubmit={handleSave} className="overflow-y-auto p-4 sm:p-6 space-y-5 custom-scrollbar">
              {/* BASIC DETAILS */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2"><UserCheck size={14} /> Vendor Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Party Name *</label>
                    <input type="text" required maxLength={120} value={form.partyName} onChange={setField('partyName')} placeholder="e.g. Sharma & Associates" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Category *</label>
                    <select
                      value={form.otherCategory ? 'Other' : form.category}
                      // "Other" chunne par neeche naam likhne ka box khulta hai
                      onChange={(e) => setForm(prev => (e.target.value === 'Other' ? { ...prev, otherCategory: true, category: prev.otherCategory ? prev.category : '' } : { ...prev, otherCategory: false, category: e.target.value }))}
                      className={`${inputClass} font-bold`}
                    >
                      {CATEGORIES.map(category => <option key={category} value={category}>{category === 'Other' ? 'Other (type your own)' : category}</option>)}
                    </select>
                    {form.otherCategory && (
                      <div className="mt-2">
                        <input type="text" maxLength={40} autoFocus value={form.category} onChange={setField('category')} placeholder="Type the category, e.g. Translator, ISO Agency" className={inputClass} />
                        <p className="text-[11px] text-slate-400 font-medium mt-1">Leave it empty to save as "Other". A typed category also appears in the filter.</p>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className={labelClass}>State</label>
                    <select value={form.state} onChange={setField('state')} className={inputClass}>
                      <option value="">Select state</option>
                      {form.state && !STATES.includes(form.state) && <option value={form.state}>{form.state}</option>}
                      {STATES.map(state => <option key={state} value={state}>{state}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Reference</label>
                    <input type="text" maxLength={120} value={form.reference} onChange={setField('reference')} placeholder="Who referred / how you know them" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Mobile</label>
                    <input type="tel" maxLength={20} value={form.mobile} onChange={setField('mobile')} placeholder="Optional" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Email</label>
                    <input type="email" maxLength={120} value={form.email} onChange={setField('email')} placeholder="Optional" className={inputClass} />
                  </div>
                </div>
              </div>

              {/* LIST OF WORK */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2"><ClipboardList size={14} /> List of Work</h3>
                  <button type="button" onClick={() => addRow('works')} className="inline-flex items-center gap-1 text-[11px] font-bold text-white bg-blue-600 hover:bg-blue-700 px-2.5 py-1.5 rounded-lg"><Plus size={12} /> Add Work</button>
                </div>
                {form.works.length === 0 ? (
                  <p className="text-xs font-semibold text-slate-400 text-center py-5 border border-dashed border-slate-200 rounded-xl">No work added. Click "Add Work" to enter the work given to this vendor.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[680px] border-collapse">
                      <thead>
                        <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-500 text-left">
                          <th className="pb-2 pr-2 w-[130px]">Date</th><th className="pb-2 pr-2">Work</th><th className="pb-2 pr-2 w-[150px]">Client (optional)</th>
                          <th className="pb-2 pr-2 w-[110px]">Amount (₹)</th><th className="pb-2 pr-2 w-[120px]">Status</th><th className="pb-2 w-8"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {form.works.map(work => (
                          <tr key={work.key}>
                            <td className="pb-2 pr-2"><input type="date" required value={work.date} onChange={(e) => updateRow('works', work.key, { date: e.target.value })} className={cellInput} /></td>
                            <td className="pb-2 pr-2"><input type="text" maxLength={300} value={work.description} onChange={(e) => updateRow('works', work.key, { description: e.target.value })} placeholder="e.g. Company incorporation, GST appeal" className={`${cellInput} font-medium`} /></td>
                            <td className="pb-2 pr-2"><input type="text" maxLength={120} value={work.clientName} onChange={(e) => updateRow('works', work.key, { clientName: e.target.value })} placeholder="Client name" className={`${cellInput} font-medium`} /></td>
                            <td className="pb-2 pr-2"><input type="number" min="0" step="0.01" value={work.amount} onChange={(e) => updateRow('works', work.key, { amount: e.target.value })} placeholder="0" className={`${cellInput} text-right`} /></td>
                            <td className="pb-2 pr-2">
                              <select value={work.status} onChange={(e) => updateRow('works', work.key, { status: e.target.value })} className={`${cellInput} ${workStatusStyle[work.status]}`}>
                                {WORK_STATUSES.map(status => <option key={status} value={status}>{status}</option>)}
                              </select>
                            </td>
                            <td className="pb-2"><button type="button" onClick={() => removeRow('works', work.key)} className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50" title="Remove"><Trash2 size={13} /></button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* PAYMENTS */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2"><IndianRupee size={14} /> Payments Made (Paid)</h3>
                  <button type="button" onClick={() => addRow('payments')} className="inline-flex items-center gap-1 text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1.5 rounded-lg"><Plus size={12} /> Add Payment</button>
                </div>
                {form.payments.length === 0 ? (
                  <p className="text-xs font-semibold text-slate-400 text-center py-5 border border-dashed border-slate-200 rounded-xl">No payment recorded yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[560px] border-collapse">
                      <thead>
                        <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-500 text-left">
                          <th className="pb-2 pr-2 w-[130px]">Date</th><th className="pb-2 pr-2 w-[120px]">Amount (₹)</th><th className="pb-2 pr-2 w-[110px]">Mode</th><th className="pb-2 pr-2">Note</th><th className="pb-2 w-8"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {form.payments.map(payment => (
                          <tr key={payment.key}>
                            <td className="pb-2 pr-2"><input type="date" required value={payment.date} onChange={(e) => updateRow('payments', payment.key, { date: e.target.value })} className={cellInput} /></td>
                            <td className="pb-2 pr-2"><input type="number" min="0" step="0.01" value={payment.amount} onChange={(e) => updateRow('payments', payment.key, { amount: e.target.value })} placeholder="0" className={`${cellInput} text-right`} /></td>
                            <td className="pb-2 pr-2">
                              <select value={payment.mode} onChange={(e) => updateRow('payments', payment.key, { mode: e.target.value })} className={cellInput}>
                                {PAYMENT_MODES.map(mode => <option key={mode} value={mode}>{mode}</option>)}
                              </select>
                            </td>
                            <td className="pb-2 pr-2"><input type="text" maxLength={200} value={payment.note} onChange={(e) => updateRow('payments', payment.key, { note: e.target.value })} placeholder="UTR / cheque no. / for which work" className={`${cellInput} font-medium`} /></td>
                            <td className="pb-2"><button type="button" onClick={() => removeRow('payments', payment.key)} className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50" title="Remove"><Trash2 size={13} /></button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* TOTAL / PAID / BALANCE: apne aap */}
                <div className="grid grid-cols-3 gap-3 mt-4">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center"><p className="text-[10px] font-bold uppercase text-slate-400">Payment (Total)</p><p className="text-lg font-black text-slate-800">{money(formTotal)}</p></div>
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-center"><p className="text-[10px] font-bold uppercase text-emerald-600">Paid</p><p className="text-lg font-black text-emerald-700">{money(formPaid)}</p></div>
                  <div className={`border rounded-xl p-3 text-center ${formBalance > 0 ? 'bg-rose-50 border-rose-100' : 'bg-slate-50 border-slate-200'}`}><p className={`text-[10px] font-bold uppercase ${formBalance > 0 ? 'text-rose-600' : 'text-slate-400'}`}>{formBalance < 0 ? 'Advance Paid' : 'Balance'}</p><p className={`text-lg font-black ${formBalance > 0 ? 'text-rose-700' : 'text-slate-800'}`}>{money(Math.abs(formBalance))}</p></div>
                </div>
                <p className="text-[11px] text-slate-400 font-medium mt-2">Total is the sum of all work amounts, Paid is the sum of all payments, and Balance = Total − Paid.</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <label className={labelClass}>General Note</label>
                <textarea rows="2" maxLength={1000} value={form.remarks} onChange={setField('remarks')} placeholder="A fixed note about this vendor (address, speciality...)" className={`${inputClass} resize-y`} />
                <p className="text-[11px] text-slate-400 font-medium mt-1.5">For day-to-day updates use the Remarks button in the list: each remark is saved with your name and time.</p>
              </div>

              <div className="sticky bottom-0 -mx-4 sm:-mx-6 -mb-4 sm:-mb-6 px-4 sm:px-6 py-3 bg-white/95 backdrop-blur border-t border-slate-200 flex flex-wrap items-center justify-end gap-3">
                <div className="mr-auto flex items-center gap-4 text-xs font-semibold text-slate-500">
                  <span>Total <b className="text-slate-800">{money(formTotal)}</b></span>
                  <span>Paid <b className="text-emerald-700">{money(formPaid)}</b></span>
                  <span>{formBalance < 0 ? 'Advance' : 'Balance'} <b className={formBalance > 0 ? 'text-rose-600' : 'text-slate-800'}>{money(Math.abs(formBalance))}</b></span>
                </div>
                <button type="button" onClick={() => setForm(null)} className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl">Cancel</button>
                <button type="submit" disabled={saving} className="px-6 py-2.5 text-sm font-bold bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl shadow-md flex items-center gap-2">
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} {editId ? 'Save Changes' : 'Save Vendor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================ VIEW ============================ */}
      {viewVendor && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-2 sm:p-4" onClick={() => setViewVendor(null)}>
          <div className="bg-slate-50 rounded-3xl w-full max-w-3xl shadow-2xl border border-slate-100 flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-5 bg-slate-900 text-white flex justify-between items-start gap-3">
              <div className="min-w-0">
                <h2 className="text-xl font-black tracking-tight truncate">{viewVendor.partyName}</h2>
                <div className="flex flex-wrap items-center gap-2 mt-2 text-xs font-semibold text-slate-300">
                  <span className="bg-white/20 border border-white/30 px-2 py-0.5 rounded-md font-mono font-bold text-white">{viewVendor.vendorId}</span>
                  <span className="bg-black/20 border border-white/10 px-2 py-0.5 rounded-md text-white flex items-center gap-1"><Scale size={11} /> {viewVendor.category}</span>
                  {viewVendor.state && <span className="flex items-center gap-1"><MapPin size={12} /> {viewVendor.state}</span>}
                  {viewVendor.mobile && <span className="flex items-center gap-1"><Phone size={12} /> {viewVendor.mobile}</span>}
                  {viewVendor.email && <span className="flex items-center gap-1"><Mail size={12} /> {viewVendor.email}</span>}
                </div>
              </div>
              <button onClick={() => setViewVendor(null)} className="p-2 rounded-full bg-black/10 hover:bg-black/20 shrink-0"><X size={18} /></button>
            </div>

            <div className="overflow-y-auto p-4 sm:p-6 space-y-5 custom-scrollbar">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white border border-slate-200 rounded-2xl p-3 text-center"><p className="text-[10px] font-bold uppercase text-slate-400">Payment (Total)</p><p className="text-lg font-black text-slate-800">{money(viewVendor.totalAmount)}</p></div>
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-3 text-center"><p className="text-[10px] font-bold uppercase text-emerald-600">Paid</p><p className="text-lg font-black text-emerald-700">{money(viewVendor.paidAmount)}</p></div>
                <div className={`border rounded-2xl p-3 text-center ${viewVendor.balanceAmount > 0 ? 'bg-rose-50 border-rose-100' : 'bg-white border-slate-200'}`}><p className={`text-[10px] font-bold uppercase ${viewVendor.balanceAmount > 0 ? 'text-rose-600' : 'text-slate-400'}`}>{viewVendor.balanceAmount < 0 ? 'Advance Paid' : 'Balance'}</p><p className={`text-lg font-black ${viewVendor.balanceAmount > 0 ? 'text-rose-700' : 'text-slate-800'}`}>{money(Math.abs(viewVendor.balanceAmount || 0))}</p></div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Reference</p><p className="text-sm font-bold text-slate-800">{viewVendor.reference || 'N/A'}</p></div>
                <div><p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Added By</p><p className="text-sm font-bold text-slate-800">{viewVendor.createdBy?.name || 'N/A'} · {formatIstDateTime(viewVendor.createdAt)}</p></div>
                {viewVendor.remarks && <div className="sm:col-span-2"><p className="text-[10px] font-bold uppercase text-slate-400 mb-1">General Note</p><p className="text-sm font-medium text-slate-700 whitespace-pre-wrap break-words">{viewVendor.remarks}</p></div>}
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2"><ClipboardList size={14} /> List of Work ({(viewVendor.works || []).length})</h3>
                {(viewVendor.works || []).length === 0 ? <p className="text-xs text-slate-400">No work added.</p> : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[520px] text-xs">
                      <thead><tr className="text-[10px] font-bold uppercase tracking-wider text-slate-500 text-left border-b border-slate-200"><th className="py-2 pr-3">Date</th><th className="py-2 pr-3">Work</th><th className="py-2 pr-3">Client</th><th className="py-2 pr-3">Status</th><th className="py-2 text-right">Amount</th></tr></thead>
                      <tbody className="divide-y divide-slate-100">
                        {[...viewVendor.works].sort((a, b) => String(b.date).localeCompare(String(a.date))).map(work => (
                          <tr key={work._id}>
                            <td className="py-2 pr-3 whitespace-nowrap font-semibold text-slate-600">{showDay(work.date)}</td>
                            <td className="py-2 pr-3 font-semibold text-slate-800 break-words">{work.description}</td>
                            <td className="py-2 pr-3 text-slate-600">{work.clientName || '—'}</td>
                            <td className="py-2 pr-3"><span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border whitespace-nowrap ${workStatusStyle[work.status]}`}>{work.status}</span></td>
                            <td className="py-2 text-right font-bold text-slate-800 whitespace-nowrap">{money(work.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2"><IndianRupee size={14} /> Payments Made ({(viewVendor.payments || []).length})</h3>
                {(viewVendor.payments || []).length === 0 ? <p className="text-xs text-slate-400">No payment recorded.</p> : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[420px] text-xs">
                      <thead><tr className="text-[10px] font-bold uppercase tracking-wider text-slate-500 text-left border-b border-slate-200"><th className="py-2 pr-3">Date</th><th className="py-2 pr-3">Mode</th><th className="py-2 pr-3">Note</th><th className="py-2 text-right">Amount</th></tr></thead>
                      <tbody className="divide-y divide-slate-100">
                        {[...viewVendor.payments].sort((a, b) => String(b.date).localeCompare(String(a.date))).map(payment => (
                          <tr key={payment._id}>
                            <td className="py-2 pr-3 whitespace-nowrap font-semibold text-slate-600">{showDay(payment.date)}</td>
                            <td className="py-2 pr-3 text-slate-600">{payment.mode}</td>
                            <td className="py-2 pr-3 text-slate-600 break-words">{payment.note || '—'}</td>
                            <td className="py-2 text-right font-bold text-emerald-700 whitespace-nowrap">{money(payment.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2"><MessageSquare size={14} /> Remarks ({(viewVendor.remarkLog || []).length})</h3>
                  <button onClick={() => openRemarks(viewVendor)} className="inline-flex items-center gap-1 text-[11px] font-bold text-white bg-amber-500 hover:bg-amber-600 px-2.5 py-1.5 rounded-lg"><Plus size={12} /> Add Remark</button>
                </div>
                {(viewVendor.remarkLog || []).length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">No remarks added yet.</p>
                ) : (
                  <div className="space-y-2">
                    {[...viewVendor.remarkLog].reverse().map(remark => (
                      <div key={remark._id} className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <p className="text-[10px] font-bold text-slate-500">{remark.byName || 'User'} · {formatIstDateTime(remark.at)}</p>
                          {canDelete && <button onClick={() => deleteRemark(viewVendor, remark)} className="p-1 rounded text-slate-300 hover:text-rose-600 hover:bg-rose-50" title="Delete remark"><Trash2 size={12} /></button>}
                        </div>
                        <p className="text-xs font-medium text-slate-700 whitespace-pre-wrap break-words">{remark.text}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-between items-center gap-3 px-6 py-4 border-t border-slate-100 bg-white">
              {canDelete ? <button onClick={() => handleDelete(viewVendor)} className="px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl flex items-center gap-1.5"><Trash2 size={14} /> Delete</button> : <span></span>}
              <div className="flex gap-2">
                <button onClick={() => setViewVendor(null)} className="px-5 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl">Close</button>
                <button onClick={() => openEdit(viewVendor)} className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center gap-1.5"><Pencil size={13} /> Edit / Add Work or Payment</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================ REMARKS ============================ */}
      {remarkVendor && (
        <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-2 sm:p-4" onClick={() => setRemarkVendor(null)}>
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl border border-slate-100 flex flex-col max-h-[88vh] overflow-hidden animate-in fade-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center gap-3 px-6 py-4 border-b border-slate-100 bg-slate-50/80">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0"><MessageSquare size={20} /></div>
                <div className="min-w-0">
                  <h2 className="text-base font-bold text-slate-800 tracking-tight">Vendor Remarks</h2>
                  <p className="text-xs text-slate-500 truncate">{remarkVendor.partyName} · {remarkVendor.vendorId}</p>
                </div>
              </div>
              <button onClick={() => setRemarkVendor(null)} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/50"><X size={18} /></button>
            </div>

            <form onSubmit={addRemark} className="px-6 py-4 border-b border-slate-100">
              <label className={labelClass}>Add a remark</label>
              <textarea rows="3" maxLength={1000} autoFocus value={remarkText} onChange={(e) => setRemarkText(e.target.value)} placeholder="e.g. Called today, documents will be sent by Friday..." className={`${inputClass} resize-y`} />
              <div className="flex items-center justify-between gap-2 mt-2">
                <p className="text-[11px] text-slate-400 font-medium">Saved with your name and the current time.</p>
                <button type="submit" disabled={remarkSaving || !remarkText.trim()} className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-50 px-4 py-2 rounded-xl shadow-sm">
                  {remarkSaving ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Add Remark
                </button>
              </div>
            </form>

            <div className="overflow-y-auto px-6 py-4 custom-scrollbar">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">All Remarks ({(remarkVendor.remarkLog || []).length})</p>
                {(remarkVendor.remarkLog || []).length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">No remarks added yet.</p>
                ) : (
                  <div className="space-y-2">
                    {[...remarkVendor.remarkLog].reverse().map(remark => (
                      <div key={remark._id} className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <p className="text-[10px] font-bold text-slate-500">{remark.byName || 'User'} · {formatIstDateTime(remark.at)}</p>
                          {canDelete && <button onClick={() => deleteRemark(remarkVendor, remark)} className="p-1 rounded text-slate-300 hover:text-rose-600 hover:bg-rose-50" title="Delete remark"><Trash2 size={12} /></button>}
                        </div>
                        <p className="text-xs font-medium text-slate-700 whitespace-pre-wrap break-words">{remark.text}</p>
                      </div>
                    ))}
                  </div>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Vendors;
