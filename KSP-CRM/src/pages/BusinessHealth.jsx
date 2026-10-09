import React, { useState, useEffect, useContext, useMemo } from 'react';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import { useNavigate, useLocation } from 'react-router-dom';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AuthContext } from '../context/AuthContext';
import { formatIstDate, formatIstDateTime, istToday } from '../utils/time';
import { loadLogo } from '../utils/logo';
import {
  HeartPulse, LayoutDashboard, ClipboardEdit, ListChecks, SlidersHorizontal, Download, FileText, Lock, Unlock,
  RefreshCw, Plus, X, Save, AlertTriangle, CheckCircle2, ArrowUpRight, ArrowDownRight, Minus, Search,
  History, Target, Trash2, Edit, ArrowLeft, Info, Building2, Users
} from 'lucide-react';

const API = `${import.meta.env.VITE_API_URL}/business-health`;

const STATUS_STYLE = {
  GREEN: { chip: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', text: 'text-emerald-600', bar: 'bg-emerald-500', label: 'Green' },
  YELLOW: { chip: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-400', text: 'text-amber-600', bar: 'bg-amber-400', label: 'Yellow' },
  RED: { chip: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500', text: 'text-rose-600', bar: 'bg-rose-500', label: 'Red' },
  GREY: { chip: 'bg-slate-100 text-slate-500 border-slate-200', dot: 'bg-slate-300', text: 'text-slate-400', bar: 'bg-slate-300', label: 'N/A' }
};

const CLIENT_TYPES = ['Private Limited', 'Public Limited', 'LLP', 'Partnership Firm', 'Proprietorship', 'Individual', 'HUF', 'Trust', 'Other'];
const emptyClientForm = { pan: '', name: '', tradeName: '', clientType: 'Private Limited', gstin: '', mobile: '', email: '', contactPerson: '', address: '', state: '' };

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const inr = (v) => `₹${Number(v).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const fmt = (value, unit) => {
  if (!isNum(value)) return 'N/A';
  if (unit === 'inr') return inr(value);
  if (unit === 'pct') return `${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}%`;
  if (unit === 'x') return `${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}x`;
  if (unit === 'days') return `${Math.round(value)} days`;
  if (unit === 'months') return `${value.toLocaleString('en-IN', { maximumFractionDigits: 1 })} months`;
  return value.toLocaleString('en-IN');
};

const monthLabel = (month) => (month ? new Date(`${month}-01T00:00:00Z`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' }) : '');
const shortMonth = (month) => new Date(`${month}-01T00:00:00Z`).toLocaleDateString('en-IN', { month: 'short', year: '2-digit', timeZone: 'UTC' });

const StatusBadge = ({ status }) => {
  const s = STATUS_STYLE[status] || STATUS_STYLE.GREY;
  return <span className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border whitespace-nowrap ${s.chip}`}><span className={`h-1.5 w-1.5 rounded-full ${s.dot}`}></span>{s.label}</span>;
};

const Card = ({ title, hint, icon: Icon, right, children, className = '' }) => (
  <div className={`bg-white rounded-3xl border border-slate-200 shadow-sm p-5 md:p-6 ${className}`}>
    {(title || right) && (
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          {Icon && <div className="h-9 w-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0"><Icon size={18}/></div>}
          <div className="min-w-0">
            <h2 className="text-base font-black text-slate-800 leading-tight">{title}</h2>
            {hint && <p className="text-[11px] font-medium text-slate-400">{hint}</p>}
          </div>
        </div>
        {right}
      </div>
    )}
    {children}
  </div>
);

// Current vs previous month ka chhota arrow
const Change = ({ current, previous, lowerIsBetter = false, unit }) => {
  if (!isNum(current) || !isNum(previous)) return <span className="text-[10px] font-semibold text-slate-400">No previous month</span>;
  const diff = current - previous;
  if (Math.abs(diff) < 0.005) return <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1"><Minus size={11}/> Same as last month</span>;
  const good = lowerIsBetter ? diff < 0 : diff > 0;
  const text = unit === 'inr' && previous !== 0 ? `${Math.abs((diff / Math.abs(previous)) * 100).toFixed(1)}%` : fmt(Math.abs(Math.round(diff * 100) / 100), unit);
  return <span className={`text-[10px] font-bold flex items-center gap-0.5 ${good ? 'text-emerald-600' : 'text-rose-600'}`}>{diff > 0 ? <ArrowUpRight size={12}/> : <ArrowDownRight size={12}/>} {text} vs last month</span>;
};

const BusinessHealth = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const headers = { Authorization: `Bearer ${user.token}` };

  // 🔴 Yeh report CLIENT ki company ki hoti hai: pehle client chuno, phir uska data aur report
  const [client, setClient] = useState(location.state?.client || null); // Client Master se aaye toh seedha wahi client
  const [clientSearch, setClientSearch] = useState('');
  const [clientList, setClientList] = useState({ reports: [], results: [] });
  const [clientLoading, setClientLoading] = useState(true);
  const [newClientForm, setNewClientForm] = useState(null); // null = popup band
  const [addingClient, setAddingClient] = useState(false);

  const [tab, setTab] = useState('dashboard');
  const [month, setMonth] = useState(location.state?.month || istToday().slice(0, 7));
  const [dash, setDash] = useState(null);
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);

  // Inputs tab
  const [fields, setFields] = useState([]);
  const [form, setForm] = useState({});
  const [recordMeta, setRecordMeta] = useState(null);
  const [saving, setSaving] = useState(false);

  // Recommendations / settings
  const [actionModal, setActionModal] = useState(null);
  const [settingsData, setSettingsData] = useState(null);
  const [settingsForm, setSettingsForm] = useState(null);

  const access = dash?.access || { canView: true, canEdit: false, canAdmin: false };
  const locked = dash?.record?.status === 'Approved';

  const scope = client ? `client=${client._id}&month=${month}` : '';

  const loadClients = async () => {
    setClientLoading(true);
    try {
      const res = await axios.get(`${API}/clients?search=${encodeURIComponent(clientSearch)}`, { headers });
      setClientList({ reports: res.data.reports || [], results: res.data.results || [] });
      setDenied(false);
    } catch (error) {
      if (error.response?.status === 403) setDenied(true);
    } finally {
      setClientLoading(false);
    }
  };

  // Client search (thoda rukh kar, taaki har akshar par request na jaye)
  useEffect(() => {
    if (client) return;
    const timer = setTimeout(loadClients, 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line
  }, [clientSearch, client, user.token]);

  const loadDashboard = async () => {
    if (!client) return;
    setLoading(true);
    try {
      const [dashRes, trendRes] = await Promise.all([
        axios.get(`${API}/dashboard?${scope}`, { headers }),
        axios.get(`${API}/trends?client=${client._id}&months=12&upto=${month}`, { headers }).catch(() => ({ data: { data: [] } }))
      ]);
      setDash(dashRes.data);
      setTrends(trendRes.data.data || []);
      setDenied(false);
    } catch (error) {
      if (error.response?.status === 403) setDenied(true);
      else toast.error(error.response?.data?.message || 'Failed to load Business Health');
    } finally {
      setLoading(false);
    }
  };

  const loadInputs = async () => {
    if (!client) return;
    try {
      const res = await axios.get(`${API}/monthly?${scope}`, { headers });
      setFields(res.data.fields || []);
      setRecordMeta(res.data.data || null);
      const next = {};
      (res.data.fields || []).forEach(f => { const v = res.data.data?.[f.key]; next[f.key] = v === null || v === undefined ? '' : String(v); });
      next.remarks = res.data.data?.remarks || '';
      setForm(next);
    } catch (error) {
      if (error.response?.status !== 403) toast.error('Failed to load monthly inputs');
    }
  };

  useEffect(() => {
    loadDashboard();
    loadInputs();
    // eslint-disable-next-line
  }, [month, client?._id, user.token]);

  // 🔴 NAYA CLIENT: pehle Client Master me add hota hai (PAN se Client ID banti hai), phir seedha uski report khulti hai
  const handleAddClient = async (e) => {
    e.preventDefault();
    const pan = newClientForm.pan.trim().toUpperCase();
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) return toast.error('Enter a valid 10-character PAN (e.g. ABCDE1234F).');
    if (!newClientForm.name.trim()) return toast.error('Company / legal name is required.');

    setAddingClient(true);
    try {
      // Khali fields mat bhejo (Client Master ke kuch fields khali value nahi lete)
      const payload = { pan };
      Object.entries(newClientForm).forEach(([key, value]) => { if (key !== 'pan' && String(value).trim()) payload[key] = String(value).trim(); });

      const res = await axios.post(`${import.meta.env.VITE_API_URL}/client-master`, payload, { headers });
      const created = res.data.data;
      toast.success(`Added to Client Master. Client ID: ${created.clientId}`);
      setNewClientForm(null);
      openClient(created);
      setTab('inputs'); // seedha data bharne wali screen
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to add client';
      // Is PAN ka client pehle se ho toh wahi khol do
      if (/already exists/i.test(message)) {
        const found = await axios.get(`${API}/clients?search=${pan}`, { headers }).then(r => (r.data.results || []).find(c => c.pan === pan)).catch(() => null);
        if (found) {
          toast.success(`This PAN is already in Client Master (${found.name}). Opening it.`);
          setNewClientForm(null);
          openClient(found);
          return;
        }
      }
      toast.error(message);
    } finally {
      setAddingClient(false);
    }
  };

  const openClient = (c) => { setDash(null); setTrends([]); setTab('dashboard'); setClient(c); };
  const closeClient = () => { setClient(null); setDash(null); setClientSearch(''); };

  const loadSettings = async () => {
    try {
      const res = await axios.get(`${API}/settings`, { headers });
      setSettingsData(res.data);
      setSettingsForm(JSON.parse(JSON.stringify(res.data.settings)));
    } catch (error) {
      toast.error('Failed to load settings');
    }
  };

  useEffect(() => {
    if (tab === 'settings' && !settingsData) loadSettings();
    // eslint-disable-next-line
  }, [tab]);

  const kpi = (code) => dash?.kpis?.find(k => k.code === code);
  const inp = dash?.inputs || {};
  const prev = dash?.previousInputs || {};

  // ================= MONTHLY INPUTS =================
  const grossProfitPreview = form.revenue !== '' && form.direct_cost !== '' && form.revenue !== undefined ? Number(form.revenue) - Number(form.direct_cost) : null;

  const handleSaveInputs = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { client: client._id, month, remarks: form.remarks || '' };
      fields.forEach(f => { payload[f.key] = form[f.key] === '' || form[f.key] === undefined ? null : Number(form[f.key]); });
      if (recordMeta?._id) await axios.put(`${API}/monthly/${recordMeta._id}`, payload, { headers });
      else await axios.post(`${API}/monthly`, payload, { headers });
      toast.success('Monthly data saved. KPIs recalculated.');
      await Promise.all([loadDashboard(), loadInputs()]);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleApproval = async (approve) => {
    if (!dash?.record?._id) return;
    if (approve && !window.confirm(`Finalize the ${monthLabel(month)} report of ${client.name}? It will be locked for editing.`)) return;
    try {
      const res = await axios.put(`${API}/monthly/${dash.record._id}/${approve ? 'approve' : 'reopen'}`, {}, { headers });
      toast.success(res.data.message);
      await Promise.all([loadDashboard(), loadInputs()]);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed');
    }
  };

  const handleDeleteMonth = async () => {
    if (!recordMeta?._id || !window.confirm(`Delete the ${monthLabel(month)} data of ${client.name}?`)) return;
    try {
      await axios.delete(`${API}/monthly/${recordMeta._id}`, { headers });
      toast.success('Month deleted.');
      await Promise.all([loadDashboard(), loadInputs()]);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete');
    }
  };

  // ================= ACTION PLAN =================
  const openAction = (source) => {
    if (source?._id) {
      setActionModal({ ...source, dueDate: source.dueDate ? String(source.dueDate).slice(0, 10) : '' });
    } else {
      const k = source;
      setActionModal({
        client: client._id, month, kpiCode: k?.code || '', kpiName: k?.name || '', kpiStatus: k?.status || '',
        issue: k ? `${k.name} is ${fmt(k.actual, k.unit)} against target ${fmt(k.target, k.unit)}` : '',
        rootCause: '', action: '', ownerName: '', dueDate: '', status: 'Open', remarks: ''
      });
    }
  };

  const saveAction = async (e) => {
    e.preventDefault();
    try {
      if (actionModal._id) await axios.put(`${API}/actions/${actionModal._id}`, actionModal, { headers });
      else await axios.post(`${API}/actions`, actionModal, { headers });
      toast.success('Recommendation saved.');
      setActionModal(null);
      loadDashboard();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save action');
    }
  };

  const quickActionStatus = async (item, status) => {
    try {
      await axios.put(`${API}/actions/${item._id}`, { status }, { headers });
      loadDashboard();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update');
    }
  };

  const deleteAction = async (item) => {
    if (!window.confirm('Delete this recommendation?')) return;
    try {
      await axios.delete(`${API}/actions/${item._id}`, { headers });
      loadDashboard();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete');
    }
  };

  // ================= SETTINGS =================
  const saveSettings = async () => {
    try {
      const res = await axios.put(`${API}/settings`, settingsForm, { headers });
      toast.success(res.data.message);
      setSettingsData(prevData => ({ ...prevData, settings: res.data.settings }));
      loadDashboard();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save settings');
    }
  };

  const weightTotal = settingsForm ? Object.values(settingsForm.weights).reduce((s, w) => s + (Number(w) || 0), 0) : 0;

  // ================= EXPORT (wahi numbers jo screen par hain) =================
  const exportRows = () => (dash?.kpis || []).map(k => ({
    Area: k.area, KPI: k.name, Actual: fmt(k.actual, k.unit), 'Previous Month': fmt(k.previous, k.unit),
    Target: fmt(k.target, k.unit), Variance: fmt(k.variance, k.unit), Status: STATUS_STYLE[k.status]?.label || k.status, Formula: k.formula
  }));

  const clientLabel = client ? (client.tradeName || client.name) : '';
  const fileName = () => `Business_Health_${clientLabel.replace(/[^a-zA-Z0-9]+/g, '_')}_${month}`;

  // Red / Yellow KPI ko seedhi bhasha me likhna (report ke "Key Observations" ke liye)
  const observations = () => (dash?.risks || []).map(k => {
    const gap = k.direction === 'lower' ? 'higher than' : 'below';
    return `${k.name} is ${fmt(k.actual, k.unit)}, ${gap} the benchmark of ${fmt(k.target, k.unit)} (${STATUS_STYLE[k.status].label}).`;
  });

  const exportExcel = () => {
    if (!dash?.exists) return toast.error('No data to export for this month.');
    const wb = XLSX.utils.book_new();
    const summary = [
      ['Business Health Report'],
      ['Company', client.name],
      ['Trade Name', client.tradeName || ''],
      ['PAN', client.pan || ''],
      ['GSTIN', client.gstin || ''],
      ['Reporting Month', monthLabel(month)],
      ['Report Status', dash.record.status === 'Approved' ? 'Final' : 'Draft'],
      ['Overall Health Score', dash.overallScore ?? 'N/A', STATUS_STYLE[dash.overallStatus]?.label],
      ['Prepared by', 'TaxBucket'],
      ['Data as of', formatIstDateTime(dash.calculatedAt)],
      [],
      ['Area', 'Weight %', 'Score'],
      ...dash.areas.map(a => [a.area, a.weight, a.score ?? 'N/A']),
      [],
      ['Key Observations'],
      ...observations().map(o => [o])
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summary), 'Summary');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(exportRows()), 'KPIs');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(fields.map(f => ({ Group: f.group, Field: f.label, Value: inp[f.key] ?? '' }))), 'Company Data');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet((dash.actions || []).map(a => ({ KPI: a.kpiName, Issue: a.issue, 'Root Cause': a.rootCause, 'Recommended Action': a.action, Responsible: a.ownerName, 'Target Date': a.dueDate ? formatIstDate(a.dueDate) : '', Status: a.status, Remarks: a.remarks }))), 'Recommendations');
    XLSX.writeFile(wb, `${fileName()}.xlsx`);
  };

  // 🔴 CLIENT KO DENE WALI PDF REPORT
  const exportPdf = async () => {
    if (!dash?.exists) return toast.error('No data to export for this month.');
    const logo = await loadLogo();
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const rupee = (text) => String(text).replace(/₹/g, 'Rs. ');
    const statusColors = { Green: [5, 150, 105], Yellow: [217, 119, 6], Red: [225, 29, 72] };
    const colorStatus = (column) => (data) => {
      if (data.section !== 'body' || data.column.index !== column) return;
      if (statusColors[data.cell.raw]) { data.cell.styles.textColor = statusColors[data.cell.raw]; data.cell.styles.fontStyle = 'bold'; }
    };
    const heading = (text, y) => { doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 41, 59); doc.text(text, 14, y); };
    const nextY = (gap = 10) => {
      const y = doc.lastAutoTable.finalY + gap;
      if (y > 265) { doc.addPage(); return 20; }
      return y;
    };

    // Header (TaxBucket logo safed dabbe me, taaki gehre header par saaf dikhe)
    doc.setFillColor(30, 41, 59); doc.rect(0, 0, pageWidth, 30, 'F');
    let titleX = 14;
    if (logo) {
      const boxH = 20, boxW = Math.min(46, Math.max(20, boxH * logo.ratio));
      const imgH = Math.min(boxH - 4, (boxW - 4) / logo.ratio), imgW = imgH * logo.ratio;
      doc.setFillColor(255, 255, 255); doc.roundedRect(14, 5, boxW, boxH, 2, 2, 'F');
      doc.addImage(logo.dataUrl, 'PNG', 14 + (boxW - imgW) / 2, 5 + (boxH - imgH) / 2, imgW, imgH);
      titleX = 14 + boxW + 6;
    }
    doc.setTextColor(255); doc.setFontSize(17); doc.setFont('helvetica', 'bold');
    doc.text('Business Health Report', titleX, 14);
    doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    doc.text(`${monthLabel(month)}  |  ${dash.record.status === 'Approved' ? 'Final Report' : 'Draft (not final)'}`, titleX, 22);
    doc.text('Prepared by TaxBucket', pageWidth - 14, 14, { align: 'right' });
    doc.text(`Date: ${formatIstDate(new Date(), { day: '2-digit', month: 'short', year: 'numeric' })}`, pageWidth - 14, 22, { align: 'right' });

    // Company
    autoTable(doc, {
      startY: 36, theme: 'plain', styles: { fontSize: 9, cellPadding: 1.5 },
      columnStyles: { 0: { fontStyle: 'bold', textColor: [100, 116, 139], cellWidth: 30 }, 1: { cellWidth: 62 }, 2: { fontStyle: 'bold', textColor: [100, 116, 139], cellWidth: 30 } },
      body: [
        ['Company', client.name, 'PAN', client.pan || '-'],
        ['Trade Name', client.tradeName || '-', 'GSTIN', client.gstin || '-']
      ]
    });

    // Score
    let y = nextY(6);
    const scoreColor = statusColors[STATUS_STYLE[dash.overallStatus]?.label] || [100, 116, 139];
    doc.setDrawColor(226, 232, 240); doc.setFillColor(248, 250, 252); doc.roundedRect(14, y, pageWidth - 28, 22, 3, 3, 'FD');
    doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(100, 116, 139); doc.text('OVERALL BUSINESS HEALTH SCORE', 20, y + 8);
    doc.setFontSize(20); doc.setTextColor(...scoreColor); doc.text(`${dash.overallScore ?? 'N/A'} / 100`, 20, y + 18);
    doc.setFontSize(12); doc.text(String(STATUS_STYLE[dash.overallStatus]?.label || '').toUpperCase(), pageWidth - 20, y + 14, { align: 'right' });

    autoTable(doc, {
      startY: y + 28, head: [['Area', 'Weight %', 'Score (out of 100)']],
      body: dash.areas.map(a => [a.area, a.weight, a.score ?? 'N/A']),
      styles: { fontSize: 9 }, headStyles: { fillColor: [30, 41, 59] }
    });

    // Observations
    const obs = observations();
    y = nextY();
    heading('Key Observations', y);
    autoTable(doc, {
      startY: y + 3, theme: 'plain', styles: { fontSize: 9, cellPadding: 1.5 },
      body: (obs.length ? obs : ['All measured ratios are within the healthy range for this month.']).map((o, i) => [`${i + 1}.`, rupee(o)]),
      columnStyles: { 0: { cellWidth: 8 } }
    });

    // KPIs
    y = nextY();
    heading('Ratio Analysis', y);
    autoTable(doc, {
      startY: y + 3,
      head: [['Area', 'KPI', 'Actual', 'Last Month', 'Benchmark', 'Status']],
      body: dash.kpis.map(k => [k.area, k.name, rupee(fmt(k.actual, k.unit)), rupee(fmt(k.previous, k.unit)), isNum(k.target) ? `${k.direction === 'lower' ? '<=' : '>='} ${rupee(fmt(k.target, k.unit))}` : '-', STATUS_STYLE[k.status]?.label]),
      styles: { fontSize: 8 }, headStyles: { fillColor: [30, 41, 59] },
      didParseCell: colorStatus(5)
    });

    // Recommendations
    if (dash.actions?.length) {
      y = nextY();
      heading('Recommendations / Action Plan', y);
      autoTable(doc, {
        startY: y + 3,
        head: [['KPI', 'Issue', 'Recommended Action', 'Responsible', 'Target Date']],
        body: dash.actions.map(a => [a.kpiName || 'General', rupee(a.issue), rupee(a.action), a.ownerName || '-', a.dueDate ? formatIstDate(a.dueDate, { day: '2-digit', month: 'short', year: 'numeric' }) : '-']),
        styles: { fontSize: 8 }, headStyles: { fillColor: [30, 41, 59] },
        columnStyles: { 1: { cellWidth: 45 }, 2: { cellWidth: 55 } }
      });
    }

    y = nextY(8);
    doc.setFontSize(7.5); doc.setFont('helvetica', 'italic'); doc.setTextColor(120);
    doc.text(doc.splitTextToSize('Note: This report is based on the figures provided by the company for the month. Benchmarks are management guides, not statutory standards. N/A means the required figure was not available.', pageWidth - 28), 14, y);

    doc.save(`${fileName()}.pdf`);
  };

  // ================= TREND CHART (bina kisi chart library ke) =================
  const trendMax = useMemo(() => Math.max(1, ...trends.flatMap(t => [t.revenue, t.ebitda, t.pat].filter(isNum).map(Math.abs))), [trends]);

  if (denied) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <Lock size={44} className="text-rose-500 mb-4" />
        <h2 className="text-xl font-bold text-slate-800">Restricted</h2>
        <p className="text-sm text-slate-500 mt-2">Business Health reports can be opened only by CEO, Admin, Finance and the Service Team.</p>
      </div>
    );
  }

  const inputClass = "w-full p-2.5 border rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:bg-slate-100 disabled:text-slate-500";

  // 🔴 STEP 1: CLIENT CHUNO (jis company ki health report banani hai)
  if (!client) {
    const ClientRow = ({ c, extra }) => (
      <button onClick={() => openClient(c)} className="w-full text-left bg-white hover:bg-indigo-50/50 border border-slate-200 hover:border-indigo-300 rounded-2xl p-4 flex items-center gap-4 transition-all">
        <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0"><Building2 size={20}/></div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-800 truncate">{c.tradeName || c.name} {c.clientId && <span className="ml-1 text-[9px] font-black uppercase bg-slate-200/70 text-slate-600 px-1.5 py-0.5 rounded">{c.clientId}</span>}</p>
          <p className="text-[11px] font-medium text-slate-500 truncate">{c.name}{c.pan ? ` · PAN ${c.pan}` : ''}{c.gstin ? ` · GSTIN ${c.gstin}` : ''}</p>
        </div>
        {extra}
        <ArrowUpRight size={16} className="text-slate-400 shrink-0"/>
      </button>
    );

    return (
      <div className="max-w-4xl mx-auto space-y-6 pb-12">
        <Toaster position="top-right" />
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <HeartPulse size={28} className="text-indigo-600" /> Business Health / CFO Report
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Enter a client company's monthly numbers and get its health report (ratios, Green / Yellow / Red and a score out of 100) to share with the client.</p>
        </div>

        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 text-xs font-semibold text-indigo-800">
          <p className="font-black mb-1">How it works</p>
          <p>1. Select the client company → 2. Enter its figures for a month → 3. The report is calculated automatically → 4. Add recommendations and download the PDF for the client.</p>
        </div>

        <Card title="Select Client Company" hint="Search by name, PAN, GSTIN or client ID" icon={Users} right={
          <button onClick={() => setNewClientForm({ ...emptyClientForm })} className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3 py-2 rounded-xl shadow-sm"><Plus size={14}/> Add New Client</button>
        }>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input type="text" autoFocus value={clientSearch} onChange={(e) => setClientSearch(e.target.value)} placeholder="Type at least 2 letters to search Client Master..." className="w-full pl-10 pr-4 py-3 text-sm font-semibold border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
          </div>

          {clientSearch.trim().length >= 2 && (
            <div className="mt-4 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Search Results</p>
              {clientLoading ? <p className="text-xs text-slate-400 py-4 text-center"><RefreshCw size={14} className="animate-spin inline-block mr-2"/> Searching...</p>
                : clientList.results.length === 0 ? (
                  <div className="text-center py-6 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                    <p className="text-sm font-bold text-slate-600">No client found.</p>
                    <p className="text-xs text-slate-500 mt-1">New company? Add it here and start its report right away.</p>
                    <button onClick={() => setNewClientForm({ ...emptyClientForm, name: /^[A-Za-z]{5}[0-9]{4}[A-Za-z]$/.test(clientSearch.trim()) ? '' : clientSearch.trim(), pan: /^[A-Za-z]{5}[0-9]{4}[A-Za-z]$/.test(clientSearch.trim()) ? clientSearch.trim().toUpperCase() : '' })} className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-2 rounded-xl"><Plus size={14}/> Add New Client</button>
                  </div>
                ) : clientList.results.map(c => <ClientRow key={c._id} c={c} />)}
            </div>
          )}
        </Card>

        <Card title="Clients With Reports" hint="Companies whose health report you have already started" icon={History}>
          <div className="space-y-2">
            {clientLoading && clientList.reports.length === 0 ? <p className="text-xs text-slate-400 py-6 text-center"><RefreshCw size={14} className="animate-spin inline-block mr-2"/> Loading...</p>
              : clientList.reports.length === 0 ? <p className="text-xs text-slate-400 italic py-6 text-center">No reports yet. Search a client above to make the first one.</p>
              : clientList.reports.map(c => (
                <ClientRow key={c._id} c={c} extra={
                  <div className="text-right shrink-0 hidden sm:block">
                    <p className="text-xs font-bold text-slate-700">{c.months} month(s)</p>
                    <p className="text-[10px] font-semibold text-slate-400">Latest: {shortMonth(c.latestMonth)} · {c.latestStatus === 'Approved' ? 'Final' : 'Draft'}</p>
                  </div>
                } />
              ))}
          </div>
        </Card>

        {/* 🔴 MODAL: NAYA CLIENT (Client Master me add -> seedha uski report) */}
        {newClientForm && (
          <div className="fixed inset-0 z-[80] bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-100 overflow-hidden max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95">
              <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50 shrink-0">
                <div>
                  <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Building2 size={18} className="text-indigo-600"/> Add New Client</h2>
                  <p className="text-[11px] font-medium text-slate-500">The client is saved in Client Master first (Client ID is generated from PAN), then its report opens.</p>
                </div>
                <button onClick={() => setNewClientForm(null)} className="p-2 rounded-xl text-slate-400 hover:bg-slate-200/50"><X size={18}/></button>
              </div>

              <form onSubmit={handleAddClient} className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">PAN *</label>
                    <input type="text" required autoFocus maxLength="10" value={newClientForm.pan} onChange={(e) => setNewClientForm({ ...newClientForm, pan: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') })} placeholder="ABCDE1234F" className={`${inputClass} border-slate-200 font-mono uppercase tracking-wider`} />
                    <p className="text-[10px] font-medium text-slate-400 mt-1">Client ID will be made from this PAN.</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Company Type</label>
                    <select value={newClientForm.clientType} onChange={(e) => setNewClientForm({ ...newClientForm, clientType: e.target.value })} className={`${inputClass} border-slate-200 bg-white`}>
                      {CLIENT_TYPES.map(type => <option key={type}>{type}</option>)}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Company / Legal Name *</label>
                    <input type="text" required value={newClientForm.name} onChange={(e) => setNewClientForm({ ...newClientForm, name: e.target.value })} placeholder="As per PAN" className={`${inputClass} border-slate-200`} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Trade Name</label>
                    <input type="text" value={newClientForm.tradeName} onChange={(e) => setNewClientForm({ ...newClientForm, tradeName: e.target.value })} className={`${inputClass} border-slate-200`} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">GSTIN</label>
                    <input type="text" maxLength="15" value={newClientForm.gstin} onChange={(e) => setNewClientForm({ ...newClientForm, gstin: e.target.value.toUpperCase() })} className={`${inputClass} border-slate-200 font-mono uppercase`} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Contact Person</label>
                    <input type="text" value={newClientForm.contactPerson} onChange={(e) => setNewClientForm({ ...newClientForm, contactPerson: e.target.value })} className={`${inputClass} border-slate-200`} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Mobile</label>
                    <input type="tel" maxLength="10" value={newClientForm.mobile} onChange={(e) => setNewClientForm({ ...newClientForm, mobile: e.target.value.replace(/[^0-9]/g, '') })} className={`${inputClass} border-slate-200`} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Email</label>
                    <input type="email" value={newClientForm.email} onChange={(e) => setNewClientForm({ ...newClientForm, email: e.target.value })} className={`${inputClass} border-slate-200`} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">State</label>
                    <input type="text" value={newClientForm.state} onChange={(e) => setNewClientForm({ ...newClientForm, state: e.target.value })} className={`${inputClass} border-slate-200`} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Address</label>
                    <input type="text" value={newClientForm.address} onChange={(e) => setNewClientForm({ ...newClientForm, address: e.target.value })} className={`${inputClass} border-slate-200`} />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                  <button type="button" onClick={() => setNewClientForm(null)} className="px-5 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl">Cancel</button>
                  <button type="submit" disabled={addingClient} className="px-6 py-2.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md disabled:opacity-50 inline-flex items-center gap-2">
                    {addingClient ? <RefreshCw size={14} className="animate-spin"/> : <CheckCircle2 size={14}/>} Add Client & Start Report
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  const tabs = [
    { id: 'dashboard', label: 'Health Report', icon: LayoutDashboard },
    { id: 'inputs', label: 'Company Data (Monthly)', icon: ClipboardEdit },
    { id: 'actions', label: `Recommendations${dash?.actions?.length ? ` (${dash.actions.length})` : ''}`, icon: ListChecks },
    { id: 'settings', label: 'Targets & Weights', icon: SlidersHorizontal }
  ];

  const topCards = dash?.exists ? [
    { label: 'Revenue', value: fmt(inp.revenue, 'inr'), change: <Change current={inp.revenue} previous={prev.revenue} unit="inr"/> },
    { label: 'Revenue Growth', value: fmt(kpi('revenue_growth')?.actual, 'pct'), status: kpi('revenue_growth')?.status },
    { label: 'EBITDA Margin', value: fmt(kpi('ebitda_margin')?.actual, 'pct'), status: kpi('ebitda_margin')?.status, change: <Change current={kpi('ebitda_margin')?.actual} previous={kpi('ebitda_margin')?.previous} unit="pct"/> },
    { label: 'Net Profit Margin', value: fmt(kpi('net_profit_margin')?.actual, 'pct'), status: kpi('net_profit_margin')?.status, change: <Change current={kpi('net_profit_margin')?.actual} previous={kpi('net_profit_margin')?.previous} unit="pct"/> },
    { label: 'Cash + Bank', value: fmt(inp.cash_bank, 'inr'), change: <Change current={inp.cash_bank} previous={prev.cash_bank} unit="inr"/> },
    { label: 'Receivables', value: fmt(inp.receivables, 'inr'), change: <Change current={inp.receivables} previous={prev.receivables} unit="inr" lowerIsBetter/> },
    { label: 'DSO', value: fmt(kpi('dso')?.actual, 'days'), status: kpi('dso')?.status, change: <Change current={kpi('dso')?.actual} previous={kpi('dso')?.previous} unit="days" lowerIsBetter/> },
    { label: 'Overall Health', value: dash.overallScore === null ? 'N/A' : `${dash.overallScore} / 100`, status: dash.overallStatus }
  ] : [];

  const budgetRows = dash?.exists ? [
    { label: 'Revenue', actual: inp.revenue, budget: inp.budget_revenue, kpi: kpi('revenue_budget_achievement'), higherGood: true },
    { label: 'Expense', actual: inp.actual_expense, budget: inp.budget_expense, kpi: kpi('expense_variance'), higherGood: false },
    { label: 'Profit (PAT)', actual: inp.pat, budget: inp.budget_profit, kpi: kpi('profit_budget_achievement'), higherGood: true }
  ] : [];

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      <Toaster position="top-right" />

      {/* HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <button onClick={closeClient} className="text-[11px] font-bold text-slate-400 hover:text-indigo-600 flex items-center gap-1 mb-1"><ArrowLeft size={12}/> All Clients</button>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <HeartPulse size={28} className="text-indigo-600" /> {client.tradeName || client.name}
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Business Health Report · {client.name}{client.pan ? ` · PAN ${client.pan}` : ''}{client.gstin ? ` · GSTIN ${client.gstin}` : ''}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} className="p-2.5 border border-slate-200 rounded-xl text-sm font-bold bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
          {dash?.exists && (
            <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-lg border flex items-center gap-1 ${locked ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
              {locked ? <Lock size={11}/> : <Unlock size={11}/>} {locked ? 'Final' : 'Draft'}
            </span>
          )}
          <button onClick={exportExcel} className="inline-flex items-center gap-1.5 bg-white hover:bg-emerald-50 text-slate-700 border border-slate-200 text-xs font-bold px-3 py-2.5 rounded-xl shadow-sm"><Download size={14}/> Excel</button>
          <button onClick={exportPdf} className="inline-flex items-center gap-1.5 bg-white hover:bg-rose-50 text-slate-700 border border-slate-200 text-xs font-bold px-3 py-2.5 rounded-xl shadow-sm"><FileText size={14}/> Client Report (PDF)</button>
          {access.canAdmin && dash?.exists && (
            locked
              ? <button onClick={() => handleApproval(false)} className="inline-flex items-center gap-1.5 bg-white hover:bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold px-3 py-2.5 rounded-xl shadow-sm"><Unlock size={14}/> Reopen</button>
              : <button onClick={() => handleApproval(true)} className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md"><CheckCircle2 size={14}/> Finalize Report</button>
          )}
        </div>
      </div>

      {/* TABS */}
      <div className="flex flex-wrap gap-1.5 bg-slate-100 p-1.5 rounded-2xl w-max max-w-full">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${tab === t.id ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <t.icon size={14}/> {t.label}
          </button>
        ))}
      </div>

      {/* ============================ DASHBOARD ============================ */}
      {tab === 'dashboard' && (
        loading ? (
          <div className="text-center py-24 text-slate-400"><RefreshCw className="animate-spin inline-block mr-2" size={18}/> Calculating Business Health...</div>
        ) : !dash?.exists ? (
          <Card>
            <div className="text-center py-12">
              <ClipboardEdit size={44} className="mx-auto text-slate-300 mb-3"/>
              <h3 className="text-lg font-black text-slate-700">No data for {monthLabel(month)} yet</h3>
              <p className="text-sm text-slate-500 mt-1">Enter this company's numbers for the month once. Ratios, Green / Yellow / Red status and the health score are calculated automatically.</p>
              {access.canEdit && <button onClick={() => setTab('inputs')} className="mt-5 inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold px-5 py-2.5 rounded-xl shadow-md"><Plus size={16}/> Enter Company Data</button>}
            </div>
          </Card>
        ) : (
          <>
            {/* TOP KPI CARDS */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {topCards.map(c => (
                <div key={c.label} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{c.label}</p>
                    {c.status && <StatusBadge status={c.status}/>}
                  </div>
                  <h3 className={`text-xl font-black mt-2 break-words ${c.status ? STATUS_STYLE[c.status]?.text.replace('text-slate-400', 'text-slate-800') : 'text-slate-900'}`}>{c.value}</h3>
                  <div className="mt-2">{c.change || <span></span>}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              {/* OVERALL SCORE */}
              <Card title="Overall Business Health" hint={`Weighted score · ${monthLabel(month)}`} icon={HeartPulse}>
                <div className="flex items-center gap-5">
                  <div className={`h-24 w-24 rounded-full flex flex-col items-center justify-center shrink-0 border-[6px] ${dash.overallStatus === 'GREEN' ? 'border-emerald-400' : dash.overallStatus === 'YELLOW' ? 'border-amber-400' : dash.overallStatus === 'RED' ? 'border-rose-400' : 'border-slate-200'}`}>
                    <span className="text-3xl font-black text-slate-800 leading-none">{dash.overallScore ?? '--'}</span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase">of 100</span>
                  </div>
                  <div>
                    <StatusBadge status={dash.overallStatus}/>
                    <p className="text-[11px] text-slate-500 font-medium mt-2 leading-relaxed">
                      Green {dash.settings.scoreBands.green}+ · Yellow {dash.settings.scoreBands.yellow}–{dash.settings.scoreBands.green - 1} · Red below {dash.settings.scoreBands.yellow}
                    </p>
                    {dash.coverage.scoredWeight < dash.coverage.totalWeight && (
                      <p className="text-[10px] font-bold text-amber-600 mt-1">Based on {dash.coverage.scoredWeight}% of the weight. Some areas have no data yet.</p>
                    )}
                  </div>
                </div>
                <div className="mt-5 space-y-3">
                  {dash.areas.map(a => {
                    const st = a.score === null ? 'GREY' : a.score >= dash.settings.scoreBands.green ? 'GREEN' : a.score >= dash.settings.scoreBands.yellow ? 'YELLOW' : 'RED';
                    return (
                      <div key={a.area}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-bold text-slate-700">{a.area} <span className="text-[10px] font-semibold text-slate-400">({a.weight}%)</span></span>
                          <span className={`font-black ${STATUS_STYLE[st].text}`}>{a.score ?? 'N/A'}</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5"><div className={`${STATUS_STYLE[st].bar} h-1.5 rounded-full`} style={{ width: `${a.score ?? 0}%` }}></div></div>
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* RISK PANEL */}
              <Card title="Risk Panel" hint="Red and Yellow KPIs that need attention" icon={AlertTriangle}>
                <div className="space-y-2 max-h-[340px] overflow-y-auto custom-scrollbar pr-1">
                  {dash.risks.length === 0 ? (
                    <p className="text-xs text-slate-400 italic text-center py-8">No Red or Yellow KPI this month. 🎉</p>
                  ) : dash.risks.map(k => (
                    <div key={k.code} className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-100 bg-slate-50">
                      <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${STATUS_STYLE[k.status].dot}`}></span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">{k.name}</p>
                        <p className="text-[10px] font-semibold text-slate-500">{fmt(k.actual, k.unit)} vs target {fmt(k.target, k.unit)}</p>
                      </div>
                      <button onClick={() => openAction(k)} className="text-[10px] font-bold text-indigo-600 bg-white hover:bg-indigo-50 border border-indigo-100 px-2 py-1 rounded-lg whitespace-nowrap">+ Suggest</button>
                    </div>
                  ))}
                </div>
              </Card>

              {/* ACTION PANEL */}
              <Card title="Recommendations" hint="Suggested actions for the client" icon={ListChecks} right={<button onClick={() => setTab('actions')} className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800">View all</button>}>
                <div className="space-y-2 max-h-[340px] overflow-y-auto custom-scrollbar pr-1">
                  {dash.actions.filter(a => a.status !== 'Closed').length === 0 ? (
                    <p className="text-xs text-slate-400 italic text-center py-8">No recommendations added yet.</p>
                  ) : dash.actions.filter(a => a.status !== 'Closed').map(a => {
                    const overdue = a.dueDate && new Date(a.dueDate) < new Date();
                    return (
                      <div key={a._id} className="p-2.5 rounded-xl border border-slate-100 bg-slate-50">
                        <p className="text-xs font-bold text-slate-800 break-words">{a.action}</p>
                        <p className="text-[10px] font-semibold text-slate-500 mt-0.5">{a.kpiName || 'General'}{a.ownerName ? ` · ${a.ownerName}` : ''}</p>
                        <p className={`text-[10px] font-bold mt-0.5 ${overdue ? 'text-rose-600' : 'text-slate-400'}`}>{a.dueDate ? `Due ${formatIstDate(a.dueDate, { day: '2-digit', month: 'short' })}${overdue ? ' (overdue)' : ''}` : 'No due date'} · {a.status}</p>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>

            {/* PROFITABILITY TREND */}
            <Card title="Revenue vs EBITDA vs PAT" hint="Last 12 months trend" icon={History} right={
              <div className="flex items-center gap-3 text-[10px] font-bold text-slate-500">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-indigo-500"></span> Revenue</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-emerald-500"></span> EBITDA</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-amber-400"></span> PAT</span>
              </div>
            }>
              <div className="overflow-x-auto custom-scrollbar">
                <div className="flex items-end gap-3 min-w-max h-48 pt-2">
                  {trends.map(t => (
                    <button key={t.month} onClick={() => setMonth(t.month)} title={`${monthLabel(t.month)}\nRevenue ${fmt(t.revenue, 'inr')}\nEBITDA ${fmt(t.ebitda, 'inr')}\nPAT ${fmt(t.pat, 'inr')}`} className={`flex flex-col items-center gap-1 px-1.5 pb-1 rounded-xl ${t.month === month ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}>
                      <div className="flex items-end gap-1 h-36">
                        {[['revenue', 'bg-indigo-500'], ['ebitda', 'bg-emerald-500'], ['pat', 'bg-amber-400']].map(([key, color]) => (
                          <div key={key} className={`w-3 rounded-t ${isNum(t[key]) && t[key] < 0 ? 'bg-rose-400' : color}`} style={{ height: `${isNum(t[key]) ? Math.max(2, (Math.abs(t[key]) / trendMax) * 100) : 0}%` }}></div>
                        ))}
                      </div>
                      <span className={`text-[9px] font-bold ${t.month === month ? 'text-indigo-700' : 'text-slate-500'}`}>{shortMonth(t.month)}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="overflow-x-auto custom-scrollbar mt-4">
                <table className="w-full text-left text-xs min-w-[640px]">
                  <thead><tr className="text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                    <th className="py-2 pr-3">Month</th><th className="py-2 px-3 text-right">EBITDA Margin</th><th className="py-2 px-3 text-right">Net Margin</th><th className="py-2 px-3 text-right">Cash + Bank</th><th className="py-2 px-3 text-right">Receivables</th><th className="py-2 px-3 text-right">Overdue</th><th className="py-2 px-3 text-right">DSO</th><th className="py-2 pl-3 text-right">Health</th>
                  </tr></thead>
                  <tbody className="divide-y divide-slate-50">
                    {[...trends].reverse().slice(0, 6).map(t => (
                      <tr key={t.month} className={t.month === month ? 'bg-indigo-50/50' : ''}>
                        <td className="py-2 pr-3 font-bold text-slate-700">{shortMonth(t.month)}</td>
                        <td className="py-2 px-3 text-right font-semibold">{fmt(t.ebitda_margin, 'pct')}</td>
                        <td className="py-2 px-3 text-right font-semibold">{fmt(t.net_profit_margin, 'pct')}</td>
                        <td className="py-2 px-3 text-right font-semibold">{fmt(t.cash_bank, 'inr')}</td>
                        <td className="py-2 px-3 text-right font-semibold">{fmt(t.receivables, 'inr')}</td>
                        <td className="py-2 px-3 text-right font-semibold text-rose-600">{fmt(t.overdue_receivables, 'inr')}</td>
                        <td className="py-2 px-3 text-right font-semibold">{fmt(t.dso, 'days')}</td>
                        <td className={`py-2 pl-3 text-right font-black ${STATUS_STYLE[t.overallStatus]?.text}`}>{t.overallScore ?? 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              {/* SALES */}
              <Card title="Sales" hint="Leads to conversion" icon={Target}>
                <div className="space-y-2">
                  {[['Qualified Leads', inp.qualified_leads, 100], ['Converted', inp.converted_leads, isNum(inp.qualified_leads) && inp.qualified_leads > 0 && isNum(inp.converted_leads) ? Math.max(8, (inp.converted_leads / inp.qualified_leads) * 100) : 8]].map(([label, value, width]) => (
                    <div key={label}>
                      <div className="flex justify-between text-xs font-bold text-slate-700 mb-1"><span>{label}</span><span>{fmt(value, 'nos')}</span></div>
                      <div className="w-full bg-slate-100 rounded-full h-2"><div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${Math.min(100, width)}%` }}></div></div>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                  {[['Conversion', fmt(kpi('lead_conversion')?.actual, 'pct')], ['New Clients', fmt(inp.new_clients, 'nos')], ['Avg Billing', fmt(kpi('average_billing')?.actual, 'inr')]].map(([l, v]) => (
                    <div key={l} className="bg-slate-50 rounded-xl p-2 border border-slate-100"><p className="text-sm font-black text-slate-800 break-words">{v}</p><p className="text-[9px] font-bold uppercase text-slate-400 mt-0.5">{l}</p></div>
                  ))}
                </div>
              </Card>

              {/* PRODUCTIVITY */}
              <Card title="Employee Productivity" hint="Headcount, cost and output" icon={Target}>
                <div className="grid grid-cols-2 gap-2 text-center">
                  {[['Employees', fmt(inp.average_employees, 'nos')], ['Employee Cost', fmt(inp.employee_cost, 'inr')], ['Revenue / Employee', fmt(kpi('revenue_per_employee')?.actual, 'inr')], ['Revenue / Emp. Cost', fmt(kpi('revenue_per_employee_cost')?.actual, 'x')]].map(([l, v]) => (
                    <div key={l} className="bg-slate-50 rounded-xl p-3 border border-slate-100"><p className="text-sm font-black text-slate-800 break-words">{v}</p><p className="text-[9px] font-bold uppercase text-slate-400 mt-0.5">{l}</p></div>
                  ))}
                </div>
                <div className="mt-3"><StatusBadge status={kpi('revenue_per_employee_cost')?.status}/> <span className="text-[10px] font-semibold text-slate-500 ml-1">Revenue / Employee Cost target {fmt(kpi('revenue_per_employee_cost')?.target, 'x')}</span></div>
              </Card>

              {/* BUDGET VS ACTUAL */}
              <Card title="Budget vs Actual" hint="Revenue, expense and profit variance" icon={Target}>
                <div className="space-y-4">
                  {budgetRows.map(row => {
                    const pct = isNum(row.actual) && isNum(row.budget) && row.budget !== 0 ? (row.actual / row.budget) * 100 : null;
                    const variance = isNum(row.actual) && isNum(row.budget) ? row.actual - row.budget : null;
                    const st = row.kpi?.status || 'GREY';
                    return (
                      <div key={row.label}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-bold text-slate-700">{row.label}</span>
                          <StatusBadge status={st}/>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2"><div className={`${STATUS_STYLE[st].bar} h-2 rounded-full`} style={{ width: `${pct === null ? 0 : Math.min(100, Math.max(0, pct))}%` }}></div></div>
                        <div className="flex justify-between text-[10px] font-semibold text-slate-500 mt-1">
                          <span>Actual {fmt(row.actual, 'inr')} / Budget {fmt(row.budget, 'inr')}</span>
                          <span className={variance === null ? '' : (variance >= 0) === row.higherGood ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>{variance === null ? 'N/A' : `${variance >= 0 ? '+' : '-'}${inr(Math.abs(variance))}`}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>

            {/* ALL KPIs */}
            <Card title="All KPIs" hint="Actual, target, variance and status for every ratio" icon={LayoutDashboard}>
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left text-sm min-w-[820px]">
                  <thead><tr className="text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 bg-slate-50">
                    <th className="py-3 px-4">KPI</th><th className="py-3 px-4 text-right">Actual</th><th className="py-3 px-4 text-right">Last Month</th><th className="py-3 px-4 text-right">Target</th><th className="py-3 px-4 text-right">Variance</th><th className="py-3 px-4">Status</th><th className="py-3 px-4 text-right">Recommend</th>
                  </tr></thead>
                  <tbody>
                    {dash.areas.map(area => (
                      <React.Fragment key={area.area}>
                        <tr className="bg-slate-50/60"><td colSpan="7" className="py-2 px-4 text-[10px] font-black uppercase tracking-widest text-slate-500">{area.area} <span className="font-semibold text-slate-400 normal-case tracking-normal">· weight {area.weight}% · score {area.score ?? 'N/A'}</span></td></tr>
                        {dash.kpis.filter(k => k.area === area.area).map(k => (
                          <tr key={k.code} className="border-b border-slate-50 hover:bg-slate-50/60">
                            <td className="py-3 px-4">
                              <p className="font-bold text-slate-800">{k.name}</p>
                              <p className="text-[10px] text-slate-400 font-medium">{k.formula}</p>
                            </td>
                            <td className={`py-3 px-4 text-right font-black whitespace-nowrap ${k.status === 'GREY' ? 'text-slate-400' : 'text-slate-800'}`} title={k.note}>{fmt(k.actual, k.unit)}</td>
                            <td className="py-3 px-4 text-right font-semibold text-slate-500 whitespace-nowrap">{fmt(k.previous, k.unit)}</td>
                            <td className="py-3 px-4 text-right font-semibold text-slate-600 whitespace-nowrap">{isNum(k.target) ? `${k.direction === 'lower' ? '≤' : '≥'} ${fmt(k.target, k.unit)}` : <span className="text-slate-400">Not set</span>}</td>
                            <td className={`py-3 px-4 text-right font-bold whitespace-nowrap ${!isNum(k.variance) ? 'text-slate-400' : (k.direction === 'lower' ? k.variance <= 0 : k.variance >= 0) ? 'text-emerald-600' : 'text-rose-600'}`}>{isNum(k.variance) ? `${k.variance > 0 ? '+' : ''}${fmt(k.variance, k.unit)}` : 'N/A'}</td>
                            <td className="py-3 px-4"><StatusBadge status={k.status}/></td>
                            <td className="py-3 px-4 text-right whitespace-nowrap">
                              {['RED', 'YELLOW'].includes(k.status) && <button onClick={() => openAction(k)} className="text-[10px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-lg">+ Suggest</button>}
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[10px] font-medium text-slate-400 mt-3 flex items-center gap-1"><Info size={11}/> Calculated from the company data entered for this month. N/A means the data is missing or the denominator is zero. Data as of {formatIstDateTime(dash.calculatedAt)}.</p>
            </Card>
          </>
        )
      )}

      {/* ============================ MONTHLY INPUTS ============================ */}
      {tab === 'inputs' && (
        <Card title={`Company Data · ${monthLabel(month)}`} hint={`Figures of ${client.tradeName || client.name} for this month. Leave a field blank if the client has not given the number (its ratio will show N/A).`} icon={ClipboardEdit}>
          {locked && <div className="mb-4 bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs font-bold text-emerald-700 flex items-center gap-2"><Lock size={14}/> This report is final and locked{dash?.record?.approvedBy ? ` by ${dash.record.approvedBy}` : ''}. {access.canAdmin ? 'Use "Reopen" above to edit.' : 'Ask CEO / Admin to reopen it.'}</div>}
          {!access.canEdit && <div className="mb-4 bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-600 flex items-center gap-2"><Lock size={14}/> You can view these numbers but you are not allowed to edit them.</div>}

          <form onSubmit={handleSaveInputs} className="space-y-6">
            {[...new Set(fields.map(f => f.group))].map(group => (
              <div key={group}>
                <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-100 pb-2 mb-3">{group}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {fields.filter(f => f.group === group).map(f => (
                    <div key={f.key}>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">{f.label} <span className="text-slate-400 normal-case">({f.unit === 'inr' ? '₹' : 'Nos.'})</span></label>
                      <input type="number" step="any" value={form[f.key] ?? ''} disabled={!access.canEdit || locked} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} placeholder="-" className={`${inputClass} border-slate-200`} />
                    </div>
                  ))}
                  {group === 'Profit & Loss' && (
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Gross Profit <span className="text-slate-400 normal-case">(auto)</span></label>
                      <div className="p-2.5 border border-dashed border-slate-200 rounded-xl text-sm font-black text-slate-700 bg-slate-50">{grossProfitPreview === null || Number.isNaN(grossProfitPreview) ? 'Revenue − Direct Cost' : inr(grossProfitPreview)}</div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Remarks for this month</label>
              <textarea rows="2" value={form.remarks || ''} disabled={!access.canEdit || locked} onChange={(e) => setForm({ ...form, remarks: e.target.value })} className={`${inputClass} border-slate-200 resize-none font-medium`} placeholder="Any note about this month's data..." />
            </div>

            {access.canEdit && !locked && (
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
                {access.canAdmin && recordMeta?._id ? <button type="button" onClick={handleDeleteMonth} className="text-xs font-bold text-slate-400 hover:text-rose-600 flex items-center gap-1"><Trash2 size={13}/> Delete this month</button> : <span></span>}
                <button type="submit" disabled={saving} className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold px-6 py-2.5 rounded-xl shadow-md disabled:opacity-50">{saving ? <RefreshCw size={16} className="animate-spin"/> : <Save size={16}/>} {recordMeta?._id ? 'Save Changes' : 'Create Monthly Record'}</button>
              </div>
            )}
          </form>

          {recordMeta?.auditLog?.length > 0 && (
            <div className="mt-6 pt-4 border-t border-slate-100">
              <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-2"><History size={13}/> Audit Log</h3>
              <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                {[...recordMeta.auditLog].reverse().map((log, idx) => (
                  <div key={idx} className="text-[11px] bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                    <span className="font-bold text-slate-700">{log.action}</span> by <span className="font-bold text-slate-700">{log.byName || 'User'}</span> <span className="text-slate-400">on {formatIstDateTime(log.at)}</span>
                    {log.changes?.length > 0 && <p className="text-slate-500 mt-0.5 break-words">{log.changes.map(c => `${c.field}: ${c.from ?? 'blank'} → ${c.to ?? 'blank'}`).join(' · ')}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* ============================ ACTION PLAN ============================ */}
      {tab === 'actions' && (
        <Card title={`Recommendations · ${monthLabel(month)}`} hint="What the client should do about Red / Yellow ratios. These are printed in the client report." icon={ListChecks} right={access.canEdit &&
          <button onClick={() => openAction(null)} className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3 py-2 rounded-xl shadow-sm"><Plus size={14}/> Add Recommendation</button>
        }>
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-sm min-w-[860px]">
              <thead><tr className="text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 bg-slate-50">
                <th className="py-3 px-4">KPI / Issue</th><th className="py-3 px-4">Root Cause</th><th className="py-3 px-4">Recommended Action</th><th className="py-3 px-4">Responsible</th><th className="py-3 px-4">Target Date</th><th className="py-3 px-4">Status</th><th className="py-3 px-4 text-right"></th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {!dash?.actions?.length ? (
                  <tr><td colSpan="7" className="text-center py-12 text-slate-400 text-sm">No recommendations yet. Add one from a Red / Yellow ratio in the Health Report tab.</td></tr>
                ) : dash.actions.map(a => {
                  const overdue = a.status !== 'Closed' && a.dueDate && new Date(a.dueDate) < new Date();
                  return (
                    <tr key={a._id} className={`align-top hover:bg-slate-50/60 ${a.status === 'Closed' ? 'opacity-60' : ''}`}>
                      <td className="py-3 px-4"><div className="flex items-center gap-2">{a.kpiStatus && <StatusBadge status={a.kpiStatus}/>}<span className="font-bold text-slate-800">{a.kpiName || 'General'}</span></div><p className="text-[11px] text-slate-500 mt-1 break-words">{a.issue}</p></td>
                      <td className="py-3 px-4 text-xs text-slate-600 break-words max-w-[180px]">{a.rootCause || '-'}</td>
                      <td className="py-3 px-4 text-xs font-semibold text-slate-700 break-words max-w-[220px]">{a.action}{a.remarks && <p className="text-[10px] font-medium text-slate-400 mt-1">Remarks: {a.remarks}</p>}</td>
                      <td className="py-3 px-4 text-xs font-bold text-slate-700 whitespace-nowrap">{a.ownerName || '-'}</td>
                      <td className={`py-3 px-4 text-xs font-bold whitespace-nowrap ${overdue ? 'text-rose-600' : 'text-slate-600'}`}>{a.dueDate ? formatIstDate(a.dueDate, { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}{overdue && <span className="block text-[9px] uppercase">Overdue</span>}</td>
                      <td className="py-3 px-4">
                        <select value={a.status} disabled={!access.canEdit} onChange={(e) => quickActionStatus(a, e.target.value)} className={`text-[11px] font-bold border rounded-lg px-2 py-1 ${a.status === 'Closed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : a.status === 'In Progress' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                          <option>Open</option><option>In Progress</option><option>Closed</option>
                        </select>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {access.canEdit && <button onClick={() => openAction(a)} className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50" title="Edit"><Edit size={14}/></button>}
                        {access.canEdit && <button onClick={() => deleteAction(a)} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50" title="Delete"><Trash2 size={14}/></button>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ============================ SETTINGS ============================ */}
      {tab === 'settings' && (
        !settingsForm ? <div className="text-center py-16 text-slate-400"><RefreshCw className="animate-spin inline-block mr-2" size={18}/> Loading settings...</div> : (
          <>
            <Card title="Health Score Weights" hint="How much each area counts in the overall score" icon={SlidersHorizontal} right={<span className={`text-xs font-black ${weightTotal === 100 ? 'text-emerald-600' : 'text-amber-600'}`}>Total {weightTotal}%{weightTotal !== 100 ? ' (auto-balanced)' : ''}</span>}>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {settingsData.areas.map(area => (
                  <div key={area}>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">{area} %</label>
                    <input type="number" min="0" value={settingsForm.weights[area]} disabled={!access.canAdmin} onChange={(e) => setSettingsForm({ ...settingsForm, weights: { ...settingsForm.weights, [area]: e.target.value === '' ? '' : Number(e.target.value) } })} className={`${inputClass} border-slate-200`} />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4 max-w-md">
                <div><label className="block text-[10px] font-bold uppercase text-emerald-600 mb-1">Green from score</label><input type="number" value={settingsForm.scoreBands.green} disabled={!access.canAdmin} onChange={(e) => setSettingsForm({ ...settingsForm, scoreBands: { ...settingsForm.scoreBands, green: Number(e.target.value) } })} className={`${inputClass} border-emerald-200`} /></div>
                <div><label className="block text-[10px] font-bold uppercase text-amber-600 mb-1">Yellow from score</label><input type="number" value={settingsForm.scoreBands.yellow} disabled={!access.canAdmin} onChange={(e) => setSettingsForm({ ...settingsForm, scoreBands: { ...settingsForm.scoreBands, yellow: Number(e.target.value) } })} className={`${inputClass} border-amber-200`} /></div>
              </div>
            </Card>

            <Card title="KPI Targets (Green / Yellow / Red)" hint="Starting guides. Change them as your own company targets become clear. Leave Green blank to switch a KPI's status off." icon={Target}>
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left text-sm min-w-[760px]">
                  <thead><tr className="text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 bg-slate-50">
                    <th className="py-3 px-4">KPI</th><th className="py-3 px-4">Better when</th><th className="py-3 px-4">Green limit</th><th className="py-3 px-4">Yellow limit</th><th className="py-3 px-4">Meaning</th>
                  </tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {settingsData.kpis.map(k => {
                      const t = settingsForm.thresholds[k.code];
                      const setT = (patch) => setSettingsForm({ ...settingsForm, thresholds: { ...settingsForm.thresholds, [k.code]: { ...t, ...patch } } });
                      const sign = t.direction === 'lower' ? '≤' : '≥';
                      return (
                        <tr key={k.code}>
                          <td className="py-2.5 px-4"><p className="font-bold text-slate-800">{k.name}</p><p className="text-[10px] text-slate-400">{k.area} · {k.formula}</p></td>
                          <td className="py-2.5 px-4"><select value={t.direction} disabled={!access.canAdmin} onChange={(e) => setT({ direction: e.target.value })} className="text-xs font-bold border border-slate-200 rounded-lg px-2 py-1.5 bg-white"><option value="higher">Higher</option><option value="lower">Lower</option></select></td>
                          <td className="py-2.5 px-4"><input type="number" step="any" value={t.green ?? ''} disabled={!access.canAdmin} onChange={(e) => setT({ green: e.target.value === '' ? null : Number(e.target.value) })} placeholder="Not set" className="w-28 p-2 border border-emerald-200 rounded-lg text-xs font-bold disabled:bg-slate-100" /></td>
                          <td className="py-2.5 px-4"><input type="number" step="any" value={t.yellow ?? ''} disabled={!access.canAdmin} onChange={(e) => setT({ yellow: e.target.value === '' ? null : Number(e.target.value) })} placeholder="Not set" className="w-28 p-2 border border-amber-200 rounded-lg text-xs font-bold disabled:bg-slate-100" /></td>
                          <td className="py-2.5 px-4 text-[11px] font-medium text-slate-500">{t.green === null || t.green === undefined ? 'No status (Grey)' : `Green ${sign} ${t.green}, Yellow ${sign} ${t.yellow ?? t.green}, else Red`}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {access.canAdmin ? (
                <div className="flex justify-end pt-4 mt-4 border-t border-slate-100"><button onClick={saveSettings} className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold px-6 py-2.5 rounded-xl shadow-md"><Save size={16}/> Save Targets & Weights</button></div>
              ) : <p className="text-xs font-bold text-slate-500 mt-4 flex items-center gap-2"><Lock size={13}/> Only CEO / Admin can change targets and weights.</p>}
            </Card>
          </>
        )
      )}

      {/* ============================ MODAL: ACTION ============================ */}
      {actionModal && (
        <div className="fixed inset-0 z-[80] bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50 shrink-0">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><ListChecks size={18} className="text-indigo-600"/> {actionModal._id ? 'Update Recommendation' : 'New Recommendation'}</h2>
              <button onClick={() => setActionModal(null)} className="p-2 rounded-xl text-slate-400 hover:bg-slate-200/50"><X size={18}/></button>
            </div>
            <form onSubmit={saveAction} className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
              {actionModal.kpiName && <div className="flex items-center gap-2 text-xs font-bold text-slate-600">KPI: {actionModal.kpiName} {actionModal.kpiStatus && <StatusBadge status={actionModal.kpiStatus}/>}</div>}
              <div><label className="block text-xs font-bold uppercase text-slate-500 mb-1">Issue *</label><textarea rows="2" required value={actionModal.issue} onChange={(e) => setActionModal({ ...actionModal, issue: e.target.value })} className={`${inputClass} border-slate-200 resize-none font-medium`} /></div>
              <div><label className="block text-xs font-bold uppercase text-slate-500 mb-1">Root Cause</label><textarea rows="2" value={actionModal.rootCause} onChange={(e) => setActionModal({ ...actionModal, rootCause: e.target.value })} className={`${inputClass} border-slate-200 resize-none font-medium`} placeholder="Why did this happen?" /></div>
              <div><label className="block text-xs font-bold uppercase text-slate-500 mb-1">Recommended Action *</label><textarea rows="2" required value={actionModal.action} onChange={(e) => setActionModal({ ...actionModal, action: e.target.value })} className={`${inputClass} border-slate-200 resize-none font-medium`} placeholder="What should the client do?" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-bold uppercase text-slate-500 mb-1">Responsible (person / dept.)</label><input type="text" value={actionModal.ownerName || ''} onChange={(e) => setActionModal({ ...actionModal, ownerName: e.target.value })} placeholder="e.g. Accounts Head" className={`${inputClass} border-slate-200 font-medium`} /></div>
                <div><label className="block text-xs font-bold uppercase text-slate-500 mb-1">Target Date</label><input type="date" value={actionModal.dueDate || ''} onChange={(e) => setActionModal({ ...actionModal, dueDate: e.target.value })} className={`${inputClass} border-slate-200`} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-bold uppercase text-slate-500 mb-1">Status</label><select value={actionModal.status} onChange={(e) => setActionModal({ ...actionModal, status: e.target.value })} className={`${inputClass} border-slate-200 bg-white`}><option>Open</option><option>In Progress</option><option>Closed</option></select></div>
                <div><label className="block text-xs font-bold uppercase text-slate-500 mb-1">Remarks</label><input type="text" value={actionModal.remarks || ''} onChange={(e) => setActionModal({ ...actionModal, remarks: e.target.value })} className={`${inputClass} border-slate-200 font-medium`} /></div>
              </div>
              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button type="button" onClick={() => setActionModal(null)} className="px-5 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl">Cancel</button>
                <button type="submit" className="px-6 py-2.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md inline-flex items-center gap-2"><Save size={14}/> Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default BusinessHealth;
