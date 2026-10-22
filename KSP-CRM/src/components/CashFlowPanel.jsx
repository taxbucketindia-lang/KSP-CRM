import React, { useState, useEffect, useContext, useCallback, useMemo, useRef } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AuthContext } from '../context/AuthContext';
import { istToday, formatIstDateTime } from '../utils/time';
import { loadLogo, COMPANY } from '../utils/logo';
import {
  Wallet, Banknote, Landmark, CreditCard, PiggyBank, TrendingUp, TrendingDown, ArrowLeftRight, Plus, X, Eye, EyeOff,
  Pencil, Trash2, History, Download, FileText, Search, ChevronLeft, ChevronRight, RotateCcw, Loader2, ArrowUpRight, Lock
} from 'lucide-react';

// 🔴 PERSONAL CASH FLOW (sirf owner / CEO ka personal hisaab). Company ke accounts aur client data se alag.
// CEO Dashboard par chhota card dikhta hai; click karne par poora panel popup me khulta hai.

const SHOW_KEY = 'taxbucket_cashflow_show';
const TYPES = ['Expense', 'Income', 'Transfer', 'Card Purchase', 'Card Settlement', 'Refund', 'Investment', 'Redemption'];
const ACCOUNT_TYPE_LABEL = { CASH: 'Cash', BANK: 'Bank', CREDIT_CARD: 'Credit Card', OTHER: 'Wallet / Other', INVESTMENT: 'Investment' };

// Har transaction type me kaun sa account chahiye aur uska hisaab par kya asar hota hai
const TYPE_INFO = {
  Expense: { from: 'asset', fromLabel: 'Paid From', cat: 'EXPENSE', hint: 'Money spent from cash or bank. For UPI, choose the bank account the money went from.' },
  Income: { to: 'asset', toLabel: 'Received In', cat: 'INCOME', hint: 'Money received in cash or in a bank account.' },
  Transfer: { from: 'asset', to: 'asset', fromLabel: 'From Account', toLabel: 'To Account', hint: 'Cash deposit, cash withdrawal or bank to bank. Not counted as income or expense.' },
  'Card Purchase': { from: 'card', fromLabel: 'Credit Card', cat: 'EXPENSE', hint: 'Counted as expense on this date. Cash / bank does not reduce until you pay the card bill.' },
  'Card Settlement': { from: 'asset', to: 'card', fromLabel: 'Paid From', toLabel: 'Credit Card', hint: 'Card bill payment. Reduces the card outstanding; not counted as expense again.' },
  Refund: { to: 'any', toLabel: 'Refund Received In', cat: 'EXPENSE', catOptional: true, hint: 'Money returned to you. It reduces your expense total.' },
  // 🔴 INVESTMENT: SIP / mutual fund / FD me paisa lagana. Bank / cash ghatta hai par kharcha nahi ginta
  Investment: { from: 'asset', to: 'investment', fromLabel: 'Paid From', toLabel: 'Invested In', hint: 'Money put into a SIP, mutual fund, FD etc. Your bank / cash goes down, but it is not an expense. It shows in the Investments box.' },
  // Redemption: investment se paisa wapas. Lagaye hue se zyada aaya = munafa (income), kam = nuksaan
  Redemption: { from: 'investment', to: 'asset', fromLabel: 'Withdrawn From', toLabel: 'Received In', cost: true, hint: 'Money taken out of an investment. Enter the amount you received and how much of your invested money it was. The difference is counted as profit (income) or loss.' }
};
// Kharcha kiska: apna (Personal) ya office ka. Ek kharche ko dono me baant (split) bhi sakte hain.
const NATURES = ['Personal', 'Office'];
const NATURE_STYLE = {
  Personal: 'bg-violet-50 text-violet-700 border-violet-200',
  Office: 'bg-blue-50 text-blue-700 border-blue-200',
  Mixed: 'bg-slate-100 text-slate-700 border-slate-200'
};
const EXPENSE_LIKE = ['Expense', 'Card Purchase', 'Refund'];
const SPLIT_TYPES = ['Expense', 'Card Purchase'];
const toPaise = (value) => Math.round(Number(value || 0) * 100);

const TYPE_STYLE = {
  Income: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Expense: 'bg-rose-50 text-rose-700 border-rose-200',
  Transfer: 'bg-slate-100 text-slate-700 border-slate-200',
  'Card Purchase': 'bg-amber-50 text-amber-700 border-amber-200',
  'Card Settlement': 'bg-sky-50 text-sky-700 border-sky-200',
  Refund: 'bg-teal-50 text-teal-700 border-teal-200',
  Investment: 'bg-violet-50 text-violet-700 border-violet-200',
  Redemption: 'bg-cyan-50 text-cyan-700 border-cyan-200'
};

const inputClass = 'w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 bg-white outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 disabled:bg-slate-50';
const labelClass = 'block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1';
const buttonPrimary = 'inline-flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-colors';
const buttonGhost = 'inline-flex items-center justify-center gap-1.5 border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-60 text-slate-700 text-xs font-bold px-3 py-2 rounded-xl transition-colors';

const plain = (value) => Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const money = (value) => `${Number(value || 0) < 0 ? '-' : ''}₹${plain(Math.abs(Number(value || 0)))}`;
const showDay = (key) => (key ? String(key).split('-').reverse().join('/') : '');
const errorText = (error) => error?.response?.data?.message || 'Something went wrong. Please try again.';

const addDays = (key, days) => {
  const date = new Date(`${key}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};
// Hafta Monday se shuru
const weekStart = (key) => addDays(key, -((new Date(`${key}T00:00:00Z`).getUTCDay() + 6) % 7));
const monthLabel = (month) => {
  if (!month) return '';
  const [year, m] = month.split('-');
  return `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][Number(m) - 1]} ${year}`;
};
const newRequestId = () => (window.crypto?.randomUUID ? window.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

// Transaction me account ka naam (transfer me "From -> To")
const accountText = (t) => (t.fromAccountName && t.toAccountName ? `${t.fromAccountName} → ${t.toAccountName}` : (t.fromAccountName || t.toAccountName || ''));
const signedAmount = (t) => {
  if (t.type === 'Income' || t.type === 'Refund') return { text: `+ ${money(t.amount)}`, color: 'text-emerald-600' };
  if (t.type === 'Expense' || t.type === 'Card Purchase') return { text: `- ${money(t.amount)}`, color: 'text-rose-600' };
  // Redemption: haath me aaya + munafa / nuksaan
  if (t.type === 'Redemption' && t.profit != null) return { text: `${money(t.amount)} (${t.profit >= 0 ? 'profit +' : 'loss '}${money(t.profit)})`, color: t.profit >= 0 ? 'text-emerald-600' : 'text-rose-600' };
  return { text: money(t.amount), color: 'text-slate-700' };
};

// ============================================================
// EXPORT (Excel + PDF): jo table screen par hai wahi file me
// ============================================================
const exportExcel = ({ title, subtitle, columns, rows, fileName }) => {
  const sheet = XLSX.utils.aoa_to_sheet([[title], [subtitle || ''], [], columns, ...rows]);
  sheet['!cols'] = columns.map((_, index) => ({ wch: index === 1 ? 34 : 18 }));
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, 'Report');
  XLSX.writeFile(book, `${fileName}.xlsx`);
};

const exportPdf = async ({ title, subtitle, columns, rows, fileName, numericFrom = 99 }) => {
  const doc = new jsPDF({ orientation: columns.length > 6 ? 'landscape' : 'portrait', unit: 'mm', format: 'a4' });
  const width = doc.internal.pageSize.getWidth();
  const logo = await loadLogo();
  if (logo) doc.addImage(logo.dataUrl, 'PNG', 14, 10, 12 * logo.ratio, 12);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(30, 41, 59);
  doc.text(title, width - 14, 15, { align: 'right' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(100, 116, 139);
  doc.text(subtitle || '', width - 14, 20, { align: 'right' });
  doc.text('Personal & Confidential', width - 14, 24.5, { align: 'right' });
  doc.setDrawColor(226, 232, 240); doc.line(14, 27, width - 14, 27);

  autoTable(doc, {
    startY: 31,
    head: [columns],
    body: rows.map(row => row.map(cell => (typeof cell === 'number' ? plain(cell) : String(cell ?? '')))),
    styles: { fontSize: 8, cellPadding: 1.8, textColor: [30, 41, 59] },
    headStyles: { fillColor: [49, 46, 129], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: Object.fromEntries(columns.map((_, index) => [index, index >= numericFrom ? { halign: 'right' } : {}])),
    margin: { left: 14, right: 14 },
    didDrawPage: () => {
      doc.setFontSize(7.5); doc.setTextColor(148, 163, 184);
      doc.text(`${COMPANY.brand} CRM  |  Generated ${formatIstDateTime(new Date())}`, 14, doc.internal.pageSize.getHeight() - 7);
      doc.text(`Page ${doc.getNumberOfPages()}`, width - 14, doc.internal.pageSize.getHeight() - 7, { align: 'right' });
    }
  });
  doc.save(`${fileName}.pdf`);
};

const ExportButtons = ({ getTable, disabled }) => {
  const [busy, setBusy] = useState('');
  const runExport = async (kind) => {
    setBusy(kind);
    try {
      const table = await getTable();
      if (!table || table.rows.length === 0) { toast.error('Nothing to export for this filter'); return; }
      if (kind === 'excel') exportExcel(table); else await exportPdf(table);
    } catch (error) {
      toast.error(errorText(error));
    } finally {
      setBusy('');
    }
  };
  return (
    <div className="flex items-center gap-2">
      <button type="button" disabled={disabled || !!busy} onClick={() => runExport('excel')} className={buttonGhost}>
        {busy === 'excel' ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />} Excel
      </button>
      <button type="button" disabled={disabled || !!busy} onClick={() => runExport('pdf')} className={buttonGhost}>
        {busy === 'pdf' ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} />} PDF
      </button>
    </div>
  );
};

const Shell = ({ title, onClose, children, width = 'max-w-lg', z = 'z-[70]' }) => (
  <div className={`fixed inset-0 ${z} bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-3`} onClick={onClose}>
    <div className={`bg-white rounded-2xl shadow-2xl w-full ${width} max-h-[92vh] flex flex-col`} onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
        <h3 className="text-sm font-black text-slate-800">{title}</h3>
        <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={16} /></button>
      </div>
      <div className="overflow-y-auto p-5">{children}</div>
    </div>
  </div>
);

// ============================================================
// TRANSACTION FORM (nayi entry / edit / refund)
// ============================================================
const TransactionForm = ({ api, overview, initial, onClose, onSaved }) => {
  const editing = !!initial?._id;
  const [form, setForm] = useState({
    type: initial?.type || 'Expense',
    date: initial?.date || istToday(),
    particulars: initial?.particulars || '',
    category: initial?.category || '',
    mode: initial?.mode || '',
    fromAccount: initial?.fromAccount || '',
    toAccount: initial?.toAccount || '',
    amount: initial?.amount ?? '',
    cost: initial?.cost ?? '', // Redemption: lagaya hua kitna nikla
    notes: initial?.notes || '',
    linkedTransaction: initial?.linkedTransaction || '',
    nature: NATURES.includes(initial?.nature) ? initial.nature : 'Personal'
  });
  // Split ke hisse: [{ nature, category, amount }]. Khali list = split band.
  const [splits, setSplits] = useState(
    initial?.splits?.length ? initial.splits.map(s => ({ nature: s.nature, category: s.category || '', amount: String(s.amount) })) : []
  );
  const splitOn = splits.length > 0;
  const [saving, setSaving] = useState(false);
  const requestId = useRef(newRequestId()); // ek form = ek ID: double click par do entry nahi banti

  const info = TYPE_INFO[form.type];
  const activeAccounts = overview.accounts.filter(a => a.isActive);
  // asset = cash / bank / wallet (card aur investment nahi), card, investment, any = sab (investment nahi)
  const optionsFor = (kind) => activeAccounts.filter(a => (
    kind === 'asset' ? !['CREDIT_CARD', 'INVESTMENT'].includes(a.type)
      : kind === 'card' ? a.type === 'CREDIT_CARD'
        : kind === 'investment' ? a.type === 'INVESTMENT'
          : a.type !== 'INVESTMENT'));
  const fromOptions = info.from ? optionsFor(info.from) : [];
  const toOptions = info.to ? optionsFor(info.to).filter(a => !(form.type === 'Transfer' && a._id === form.fromAccount)) : [];
  // Sirf ek hi account ho toh wahi apne aap chun lo
  const pick = (value, options) => (options.some(o => o._id === value) ? value : (options.length === 1 ? options[0]._id : ''));
  const fromAccount = pick(form.fromAccount, fromOptions);
  const toAccount = pick(form.toAccount, toOptions);
  const categories = info.cat ? overview.categories.filter(c => c.type === info.cat && (c.isActive || c._id === form.category)) : [];

  // Payment mode account se tay hota hai: cash account = Cash, bank = Bank / UPI, card = Credit Card
  const funding = activeAccounts.find(a => a._id === (['Income', 'Refund', 'Redemption'].includes(form.type) ? toAccount : fromAccount));
  // Redemption: munafa / nuksaan turant dikhe
  const investmentAccount = form.type === 'Redemption' ? activeAccounts.find(a => a._id === fromAccount) : null;
  const redemptionProfit = form.type === 'Redemption' && Number(form.cost) > 0 && Number(form.amount) > 0 ? (toPaise(form.amount) - toPaise(form.cost)) / 100 : null;
  const modeOptions = !funding ? [] : funding.type === 'CREDIT_CARD' ? ['Credit Card'] : funding.type === 'CASH' ? ['Cash'] : ['Bank', 'UPI'];
  const mode = modeOptions.includes(form.mode) ? form.mode : (modeOptions[0] || '');

  const set = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));
  const changeType = (type) => {
    setForm(prev => ({ ...prev, type, category: '', fromAccount: '', toAccount: '', mode: '' }));
    if (!SPLIT_TYPES.includes(type)) setSplits([]);
  };

  // ---- Personal / Office aur split ----
  const isExpenseLike = EXPENSE_LIKE.includes(form.type);
  const canSplit = SPLIT_TYPES.includes(form.type);
  const expenseCategories = overview.categories.filter(c => c.type === 'EXPENSE' && (c.isActive || splits.some(s => s.category === c._id)));
  const allocatedPaise = splits.reduce((sum, s) => sum + toPaise(s.amount), 0);
  const remainingPaise = toPaise(form.amount) - allocatedPaise;

  const toggleSplit = () => {
    if (splitOn) {
      // Split band: pehle hisse ki category aur nature wapas main form me
      setForm(prev => ({ ...prev, category: splits[0]?.category || prev.category, nature: splits[0]?.nature || prev.nature }));
      setSplits([]);
    } else {
      setSplits([
        { nature: 'Personal', category: form.category || '', amount: '' },
        { nature: 'Office', category: '', amount: '' }
      ]);
    }
  };
  const setSplit = (index, field, value) => setSplits(prev => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
  const addSplit = () => setSplits(prev => (prev.length >= 10 ? prev : [...prev, { nature: 'Office', category: '', amount: remainingPaise > 0 ? (remainingPaise / 100).toFixed(2) : '' }]));
  const removeSplit = (index) => setSplits(prev => prev.filter((_, i) => i !== index));
  // Bacha hua paisa aakhri khali (ya aakhri) line me daal do
  const fillRemaining = () => setSplits(prev => {
    if (remainingPaise === 0 || prev.length === 0) return prev;
    const target = prev.findIndex(s => !s.amount) >= 0 ? prev.findIndex(s => !s.amount) : prev.length - 1;
    return prev.map((s, i) => (i === target ? { ...s, amount: ((toPaise(s.amount) + remainingPaise) / 100).toFixed(2) } : s));
  });

  const submit = async (e) => {
    e.preventDefault();
    if (saving) return;
    if (!form.particulars.trim()) return toast.error('Please enter particulars');
    if (!(Number(form.amount) > 0)) return toast.error('Amount must be more than zero');
    if (info.from && !fromAccount) return toast.error(`Please select ${info.fromLabel}`);
    if (info.to && !toAccount) return toast.error(`Please select ${info.toLabel}`);
    if (splitOn) {
      if (splits.length < 2) return toast.error('A split needs at least 2 lines');
      if (splits.some(s => !s.category)) return toast.error('Please select a category in every split line');
      if (splits.some(s => !(Number(s.amount) > 0))) return toast.error('Every split line needs an amount');
      if (remainingPaise !== 0) return toast.error(`Split total must equal the amount. ${remainingPaise > 0 ? 'Remaining' : 'Extra'}: ${money(Math.abs(remainingPaise) / 100)}`);
    } else if (info.cat && !info.catOptional && !form.category) return toast.error('Please select a category');
    if (info.cost && !(Number(form.cost) > 0)) return toast.error('Enter how much of your invested money you withdrew');

    setSaving(true);
    try {
      const payload = {
        type: form.type, date: form.date, particulars: form.particulars.trim(), amount: Number(form.amount), notes: form.notes.trim(),
        category: info.cat && !splitOn ? form.category : '', mode,
        fromAccount: info.from ? fromAccount : '', toAccount: info.to ? toAccount : '',
        linkedTransaction: form.type === 'Refund' ? form.linkedTransaction : '',
        cost: info.cost ? Number(form.cost) : undefined,
        nature: isExpenseLike && !splitOn ? form.nature : undefined,
        splits: splitOn ? splits.map(s => ({ nature: s.nature, category: s.category, amount: Number(s.amount) })) : []
      };
      if (editing) await api.put(`/transactions/${initial._id}`, payload);
      else await api.post('/transactions', { ...payload, requestId: requestId.current });
      toast.success(editing ? 'Transaction updated' : 'Transaction saved');
      onSaved();
    } catch (error) {
      toast.error(errorText(error));
      setSaving(false);
    }
  };

  const accountSelect = (label, value, field, options) => (
    <div>
      <label className={labelClass}>{label} *</label>
      <select value={value} onChange={set(field)} className={inputClass}>
        <option value="">Select account</option>
        {options.map(a => <option key={a._id} value={a._id}>{a.name} ({ACCOUNT_TYPE_LABEL[a.type]}) · {money(a.balance)}</option>)}
      </select>
      {options.length === 0 && <p className="text-[11px] text-rose-600 mt-1">No account of this kind yet. Add it in the Accounts tab.</p>}
    </div>
  );

  return (
    <Shell title={editing ? 'Edit Transaction' : (initial?.linkedTransaction ? 'Record Refund' : 'Add Transaction')} onClose={onClose} width="max-w-xl">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className={labelClass}>Transaction Type *</label>
          <div className="grid grid-cols-3 gap-1.5">
            {TYPES.map(type => (
              <button key={type} type="button" onClick={() => changeType(type)}
                className={`text-xs font-bold px-2 py-2 rounded-xl border transition-colors ${form.type === type ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
                {type}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-slate-500 mt-1.5">{info.hint}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Date *</label>
            <input type="date" required max={istToday()} value={form.date} onChange={set('date')} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Amount (₹) *</label>
            <input type="number" required min="0.01" step="0.01" value={form.amount} onChange={set('amount')} placeholder="0.00" className={inputClass} />
          </div>
        </div>

        <div>
          <label className={labelClass}>Particulars *</label>
          <input type="text" required maxLength={200} value={form.particulars} onChange={set('particulars')} placeholder="E.g. Monthly grocery, Salary for October" className={inputClass} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {info.from && accountSelect(info.fromLabel, fromAccount, 'fromAccount', fromOptions)}
          {info.to && accountSelect(info.toLabel, toAccount, 'toAccount', toOptions)}
          {info.cat && !splitOn && (
            <div>
              <label className={labelClass}>Category {info.catOptional ? '' : '*'}</label>
              <select value={form.category} onChange={set('category')} className={inputClass}>
                <option value="">Select category</option>
                {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className={labelClass}>Payment Mode *</label>
            <select value={mode} onChange={set('mode')} disabled={modeOptions.length <= 1} className={inputClass}>
              {modeOptions.length === 0 && <option value="">Select account first</option>}
              {modeOptions.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>

        {/* 🔴 REDEMPTION: kitna lagaya tha + munafa / nuksaan */}
        {info.cost && (
          <div className="rounded-xl border border-cyan-200 bg-cyan-50/50 p-3 space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Invested Amount Withdrawn (₹) *</label>
                <input type="number" min="0.01" step="0.01" value={form.cost} onChange={set('cost')} placeholder="e.g. 3000" className={inputClass} />
                {investmentAccount && <p className="text-[11px] text-slate-500 mt-1">Currently invested in {investmentAccount.name}: <b>{money(investmentAccount.balance)}</b></p>}
              </div>
              <div className="flex flex-col justify-end">
                <p className={labelClass}>Profit / Loss</p>
                <p className={`text-lg font-black ${redemptionProfit == null ? 'text-slate-300' : redemptionProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {redemptionProfit == null ? '—' : `${redemptionProfit >= 0 ? '+ ' : '- '}${money(Math.abs(redemptionProfit))}`}
                </p>
                <p className="text-[11px] text-slate-500">{redemptionProfit == null ? 'Amount received − invested amount' : redemptionProfit >= 0 ? 'Counted as income (Investment Profit)' : 'Counted as expense (Investment Loss)'}</p>
              </div>
            </div>
            <p className="text-[11px] text-slate-500">Example: SIP of ₹1,000 × 3 months = ₹3,000 invested. You withdraw and get ₹3,100 → Amount ₹3,100, Invested Amount Withdrawn ₹3,000, Profit ₹100.</p>
          </div>
        )}

        {/* Personal / Office + Split */}
        {isExpenseLike && (
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-3">
              {!splitOn ? (
                <div>
                  <label className={labelClass}>Expense For *</label>
                  <div className="inline-flex bg-white border border-slate-200 rounded-xl p-0.5">
                    {NATURES.map(n => (
                      <button key={n} type="button" onClick={() => setForm(prev => ({ ...prev, nature: n }))}
                        className={`text-xs font-bold px-4 py-1.5 rounded-lg transition-colors ${form.nature === n ? (n === 'Office' ? 'bg-blue-600 text-white' : 'bg-violet-600 text-white') : 'text-slate-600 hover:bg-slate-50'}`}>
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs font-bold text-slate-700">Split this amount into parts</p>
              )}
              {canSplit && (
                <button type="button" onClick={toggleSplit} className={splitOn ? buttonGhost : `${buttonGhost} border-indigo-200 text-indigo-700`}>
                  {splitOn ? <><X size={13} /> Remove split</> : <><ArrowLeftRight size={13} /> Split (Personal + Office)</>}
                </button>
              )}
            </div>

            {splitOn && (
              <div className="space-y-2">
                {splits.map((s, index) => (
                  <div key={index} className="grid grid-cols-[96px_1fr_96px_28px] sm:grid-cols-[110px_1fr_120px_28px] gap-2 items-center">
                    <select value={s.nature} onChange={(e) => setSplit(index, 'nature', e.target.value)} className={`${inputClass} px-2 font-bold ${s.nature === 'Office' ? 'text-blue-700' : 'text-violet-700'}`}>
                      {NATURES.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                    <select value={s.category} onChange={(e) => setSplit(index, 'category', e.target.value)} className={inputClass}>
                      <option value="">Select category</option>
                      {expenseCategories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                    </select>
                    <input type="number" min="0.01" step="0.01" value={s.amount} onChange={(e) => setSplit(index, 'amount', e.target.value)} placeholder="0.00" className={inputClass} />
                    <button type="button" title="Remove line" disabled={splits.length <= 2} onClick={() => removeSplit(index)} className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 disabled:opacity-30 disabled:hover:bg-transparent"><Trash2 size={13} /></button>
                  </div>
                ))}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="flex gap-2">
                    <button type="button" onClick={addSplit} disabled={splits.length >= 10} className={buttonGhost}><Plus size={13} /> Add line</button>
                    {remainingPaise !== 0 && Number(form.amount) > 0 && (
                      <button type="button" onClick={fillRemaining} className={buttonGhost}>Fill remaining</button>
                    )}
                  </div>
                  <p className={`text-[11px] font-bold ${remainingPaise === 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    Split {money(allocatedPaise / 100)} of {money(Number(form.amount || 0))}
                    {remainingPaise === 0 ? ' · Matched' : ` · ${remainingPaise > 0 ? 'Remaining' : 'Extra'} ${money(Math.abs(remainingPaise) / 100)}`}
                  </p>
                </div>
                <p className="text-[11px] text-slate-500">Account balance reduces once by the full amount. Reports show each part under its own category and Personal / Office.</p>
              </div>
            )}
          </div>
        )}

        <div>
          <label className={labelClass}>Notes</label>
          <textarea rows={2} maxLength={500} value={form.notes} onChange={set('notes')} placeholder="Optional" className={inputClass} />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className={buttonGhost}>Cancel</button>
          <button type="submit" disabled={saving} className={buttonPrimary}>
            {saving && <Loader2 size={13} className="animate-spin" />} {editing ? 'Save Changes' : 'Save Transaction'}
          </button>
        </div>
      </form>
    </Shell>
  );
};

// ============================================================
// DASHBOARD TAB
// ============================================================
const BalanceCard = ({ icon: Icon, label, value, tone, note, children }) => (
  <div className="bg-white border border-slate-200 rounded-2xl p-4">
    <div className="flex items-center gap-2 mb-2">
      <span className={`h-8 w-8 rounded-xl flex items-center justify-center ${tone}`}><Icon size={16} /></span>
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
    </div>
    <p className="text-xl font-black text-slate-800">{money(value)}</p>
    {note && <p className="text-[11px] text-slate-400 mt-0.5">{note}</p>}
    {children}
  </div>
);

const AccountLines = ({ accounts }) => (
  accounts.length > 1 || (accounts[0] && accounts[0].institution) ? (
    <div className="mt-2 pt-2 border-t border-slate-100 space-y-1">
      {accounts.map(a => (
        <div key={a._id} className="flex justify-between gap-2 text-[11px]">
          <span className="text-slate-500 truncate">{a.name}</span>
          <span className="font-bold text-slate-700 shrink-0">{money(a.balance)}</span>
        </div>
      ))}
    </div>
  ) : null
);

const DashboardTab = ({ overview, month, setMonth, goTo, openForm }) => {
  const { totals, monthSummary, accounts, recent } = overview;
  const active = accounts.filter(a => a.isActive);
  const ofType = (type) => active.filter(a => a.type === type);
  const topCategory = Math.max(1, ...monthSummary.categoryWise.map(c => c.amount));

  if (accounts.length === 0) {
    return (
      <div className="text-center py-16 bg-white border border-dashed border-slate-300 rounded-2xl">
        <PiggyBank size={40} className="mx-auto text-slate-300 mb-3" />
        <p className="text-sm font-bold text-slate-700">Start by adding your accounts</p>
        <p className="text-xs text-slate-500 mt-1 mb-4">Add your Cash, Bank and Credit Card accounts with their opening balances.</p>
        <button type="button" onClick={() => goTo('accounts')} className={buttonPrimary}><Plus size={13} /> Add Accounts</button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <BalanceCard icon={Banknote} label="Cash Balance" value={totals.cash} tone="bg-emerald-50 text-emerald-600"><AccountLines accounts={ofType('CASH')} /></BalanceCard>
        <BalanceCard icon={Landmark} label="Bank Balance" value={totals.bank} tone="bg-blue-50 text-blue-600" note={`${ofType('BANK').length} bank account${ofType('BANK').length === 1 ? '' : 's'}`}><AccountLines accounts={ofType('BANK')} /></BalanceCard>
        <BalanceCard icon={Wallet} label="Total Available" value={totals.available} tone="bg-indigo-50 text-indigo-600" note="Cash + Bank (card limit not included)">
          {ofType('OTHER').length > 0 && <p className="text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100">Wallet / Other (separate): <b className="text-slate-700">{money(totals.other)}</b></p>}
        </BalanceCard>
        <BalanceCard icon={CreditCard} label="Credit Card Outstanding" value={totals.cardOutstanding} tone="bg-rose-50 text-rose-600" note="Liability: amount you owe"><AccountLines accounts={ofType('CREDIT_CARD')} /></BalanceCard>
        {/* 🔴 INVESTMENTS: alag box, Total Available me nahi judta */}
        <BalanceCard icon={TrendingUp} label="Investments" value={totals.investment} tone="bg-violet-50 text-violet-600" note={`Invested amount · not in Total Available${Number(totals.investmentProfit) ? ` · Profit booked ${money(totals.investmentProfit)}` : ''}`}>
          {ofType('INVESTMENT').length ? <AccountLines accounts={ofType('INVESTMENT')} /> : <button type="button" onClick={() => goTo('accounts')} className="mt-2 text-[11px] font-bold text-violet-700 hover:underline">+ Add an investment account</button>}
        </BalanceCard>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <p className="text-sm font-black text-slate-800">Monthly Cash Flow</p>
          <input type="month" value={month} max={istToday().slice(0, 7)} onChange={(e) => e.target.value && setMonth(e.target.value)} className="border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 outline-none" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3">
            <p className="text-[11px] font-bold uppercase text-emerald-700 flex items-center gap-1"><TrendingUp size={12} /> Income</p>
            <p className="text-lg font-black text-emerald-800 mt-0.5">{money(monthSummary.income)}</p>
          </div>
          <div className="rounded-xl bg-rose-50 border border-rose-100 p-3">
            <p className="text-[11px] font-bold uppercase text-rose-700 flex items-center gap-1"><TrendingDown size={12} /> Expenses</p>
            <p className="text-lg font-black text-rose-800 mt-0.5">{money(monthSummary.expense)}</p>
          </div>
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
            <p className="text-[11px] font-bold uppercase text-slate-600 flex items-center gap-1"><ArrowLeftRight size={12} /> Net Cash Flow</p>
            <p className={`text-lg font-black mt-0.5 ${monthSummary.net < 0 ? 'text-rose-700' : 'text-slate-800'}`}>{money(monthSummary.net)}</p>
          </div>
        </div>
        {/* Kharche ka bantwara: apna vs office */}
        <div className="grid grid-cols-2 gap-3 mt-3">
          {NATURES.map(n => {
            const value = monthSummary.natureWise?.find(x => x.nature === n)?.amount || 0;
            const share = monthSummary.expense > 0 ? Math.round((value / monthSummary.expense) * 100) : 0;
            return (
              <div key={n} className={`rounded-xl border px-3 py-2 ${n === 'Office' ? 'bg-blue-50/60 border-blue-100' : 'bg-violet-50/60 border-violet-100'}`}>
                <p className={`text-[11px] font-bold uppercase ${n === 'Office' ? 'text-blue-700' : 'text-violet-700'}`}>{n} Expenses</p>
                <p className="text-sm font-black text-slate-800">{money(value)} <span className="text-[11px] font-semibold text-slate-400">({share}%)</span></p>
              </div>
            );
          })}
        </div>
        {(Number(monthSummary.invested) > 0 || Number(monthSummary.redeemed) > 0) && (
          <p className="text-[11px] font-semibold text-violet-700 mt-2">Investments this month: put in {money(monthSummary.invested)} · withdrawn {money(monthSummary.redeemed)}{Number(monthSummary.investmentProfit) ? ` · ${Number(monthSummary.investmentProfit) >= 0 ? 'profit' : 'loss'} ${money(Math.abs(monthSummary.investmentProfit))} (already in income / expense)` : ''}</p>
        )}
        <p className="text-[11px] text-slate-400 mt-2">Own-account transfers, card bill payments and money put into investments are not counted. Card purchases count as expense on the purchase date. Profit on an investment withdrawal counts as income.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <p className="text-sm font-black text-slate-800 mb-3">Where the money went · {monthLabel(month)}</p>
          {monthSummary.categoryWise.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No expenses recorded in this month.</p>
          ) : (
            <div className="space-y-2.5">
              {monthSummary.categoryWise.map(c => (
                <div key={c.name}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-600">{c.name}</span>
                    <span className="font-bold text-slate-800">{money(c.amount)}</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${Math.max(2, (Math.max(0, c.amount) / topCategory) * 100)}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-black text-slate-800">Recent Transactions</p>
            <button type="button" onClick={() => goTo('transactions')} className="text-[11px] font-bold text-indigo-600 hover:underline flex items-center gap-0.5">View all <ArrowUpRight size={11} /></button>
          </div>
          {recent.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-xs text-slate-400 mb-3">No transactions yet.</p>
              <button type="button" onClick={() => openForm({})} className={buttonPrimary}><Plus size={13} /> Add First Transaction</button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recent.map(t => {
                const amount = signedAmount(t);
                return (
                  <div key={t._id} className="py-2 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">{t.particulars}</p>
                      <p className="text-[11px] text-slate-400 truncate">{showDay(t.date)} · {t.type} · {accountText(t)}</p>
                    </div>
                    <span className={`text-xs font-black shrink-0 ${amount.color}`}>{amount.text}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================
// TRANSACTIONS TAB (filter + list + edit / delete / history + export)
// ============================================================
const HistoryModal = ({ api, txn, onClose }) => {
  const [history, setHistory] = useState(null);
  useEffect(() => {
    api.get(`/transactions/${txn._id}/history`).then(res => setHistory(res.data.history)).catch(error => { toast.error(errorText(error)); onClose(); });
  }, [api, txn._id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Shell title={`Change History · ${txn.particulars}`} onClose={onClose} z="z-[80]">
      {!history ? (
        <div className="py-8 flex justify-center"><Loader2 className="animate-spin text-slate-400" /></div>
      ) : (
        <div className="space-y-3">
          {[...history].reverse().map((entry, index) => (
            <div key={index} className="border border-slate-200 rounded-xl p-3">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${entry.action === 'Deleted' ? 'bg-rose-50 text-rose-700' : entry.action === 'Edited' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>{entry.action}</span>
                <span className="text-[11px] text-slate-500">{entry.byName} · {formatIstDateTime(entry.at)}</span>
              </div>
              <div className="space-y-0.5">
                {Object.entries(entry.changes || {}).filter(([, value]) => value !== '' && value !== null).map(([field, value]) => (
                  <p key={field} className="text-xs text-slate-600">
                    <span className="font-bold text-slate-700">{field}:</span>{' '}
                    {value && typeof value === 'object'
                      ? <><span className="line-through text-slate-400">{String(value.old || '—')}</span> → <span className="font-semibold">{String(value.new || '—')}</span></>
                      : String(value)}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Shell>
  );
};

const TransactionsTab = ({ api, overview, refreshKey, openForm, onChanged }) => {
  const today = istToday();
  const [filters, setFilters] = useState({ period: 'month', from: `${today.slice(0, 7)}-01`, to: today, account: '', category: '', type: '', mode: '', nature: '', search: '', deleted: false });
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [historyOf, setHistoryOf] = useState(null);

  const range = useMemo(() => {
    if (filters.period === 'today') return { from: today, to: today };
    if (filters.period === 'week') return { from: weekStart(today), to: today };
    if (filters.period === 'month') return { from: `${today.slice(0, 7)}-01`, to: today };
    if (filters.period === 'custom') return { from: filters.from, to: filters.to };
    return { from: '', to: '' };
  }, [filters.period, filters.from, filters.to, today]);

  const params = useMemo(() => ({
    from: range.from, to: range.to, account: filters.account, category: filters.category, type: filters.type, mode: filters.mode,
    nature: filters.nature, search: filters.search.trim(), deleted: filters.deleted ? 'true' : ''
  }), [range, filters.account, filters.category, filters.type, filters.mode, filters.nature, filters.search, filters.deleted]);

  useEffect(() => {
    let cancelled = false;
    // Search likhte waqt har akshar par server ko call na jaye
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.get('/transactions', { params: { ...params, page, limit: 12 } });
        if (!cancelled) setResult(res.data);
      } catch (error) {
        if (!cancelled) toast.error(errorText(error));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [api, params, page, refreshKey]);

  const change = (field) => (e) => { setPage(1); setFilters(prev => ({ ...prev, [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })); };

  const remove = async (txn) => {
    if (!window.confirm(`Remove this transaction?\n\n${txn.particulars} · ${money(txn.amount)}\n\nBalances will be recalculated. The entry stays in the audit history.`)) return;
    try {
      await api.delete(`/transactions/${txn._id}`);
      toast.success('Transaction removed');
      onChanged();
    } catch (error) {
      toast.error(errorText(error));
    }
  };

  const periodText = range.from ? `${showDay(range.from)} to ${showDay(range.to)}` : 'All dates';
  const getTable = async () => {
    const res = await api.get('/transactions', { params: { ...params, all: 'true' } });
    const s = res.data.summary;
    // Split entry me har hissa "Personal / Grocery 50.00" ki tarah
    const categoryText = (t) => (t.splits?.length ? t.splits.map(p => `${p.nature} / ${p.categoryName} ${plain(p.amount)}`).join('; ') : t.categoryName);
    const natureText = (t) => (EXPENSE_LIKE.includes(t.type) ? t.nature : '');
    const rows = [...res.data.data].reverse().map(t => [showDay(t.date), t.particulars, t.type, natureText(t), categoryText(t), t.mode, t.fromAccountName, t.toAccountName, t.amount]);
    const personal = s.natureWise?.find(n => n.nature === 'Personal')?.amount || 0;
    const office = s.natureWise?.find(n => n.nature === 'Office')?.amount || 0;
    rows.push(
      ['', '', '', '', '', '', '', 'Income', s.income],
      ['', '', '', '', '', '', '', 'Expenses', s.expense],
      ['', '', '', '', '', '', '', '  Personal', personal],
      ['', '', '', '', '', '', '', '  Office', office],
      ['', '', '', '', '', '', '', 'Net Cash Flow', s.net]
    );
    return {
      title: 'Personal Cash Flow - Transaction Ledger', subtitle: `Period: ${periodText}${filters.nature ? ` · ${filters.nature} only` : ''}`,
      columns: ['Date', 'Particulars', 'Type', 'Personal / Office', 'Category', 'Mode', 'From Account', 'To Account', 'Amount (Rs.)'],
      rows, numericFrom: 8, fileName: `Personal_Transactions_${range.from || 'all'}_${range.to || today}`
    };
  };

  const selectClass = 'border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-700 bg-white outline-none';
  const rows = result?.data || [];

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-2xl p-3 space-y-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-slate-100 rounded-xl p-0.5">
            {[['today', 'Today'], ['week', 'This Week'], ['month', 'This Month'], ['custom', 'Custom'], ['all', 'All']].map(([value, label]) => (
              <button key={value} type="button" onClick={() => { setPage(1); setFilters(prev => ({ ...prev, period: value })); }}
                className={`text-[11px] font-bold px-2.5 py-1.5 rounded-lg transition-colors ${filters.period === value ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{label}</button>
            ))}
          </div>
          {filters.period === 'custom' && (
            <>
              <input type="date" value={filters.from} max={filters.to} onChange={change('from')} className={selectClass} />
              <span className="text-xs text-slate-400">to</span>
              <input type="date" value={filters.to} min={filters.from} max={today} onChange={change('to')} className={selectClass} />
            </>
          )}
          <div className="relative flex-1 min-w-[160px]">
            <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
            <input type="text" value={filters.search} onChange={change('search')} placeholder="Search particulars / notes" className={`${selectClass} w-full pl-8`} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={filters.account} onChange={change('account')} className={selectClass}>
            <option value="">All Accounts</option>
            {overview.accounts.map(a => <option key={a._id} value={a._id}>{a.name}</option>)}
          </select>
          <select value={filters.type} onChange={change('type')} className={selectClass}>
            <option value="">All Types</option>
            {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={filters.category} onChange={change('category')} className={selectClass}>
            <option value="">All Categories</option>
            {overview.categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
          <select value={filters.mode} onChange={change('mode')} className={selectClass}>
            <option value="">All Modes</option>
            {['Cash', 'Bank', 'UPI', 'Credit Card'].map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select value={filters.nature} onChange={change('nature')} className={selectClass} title="Personal or Office expenses">
            <option value="">Personal + Office</option>
            {NATURES.map(n => <option key={n} value={n}>{n} only</option>)}
          </select>
          <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 cursor-pointer select-none">
            <input type="checkbox" checked={filters.deleted} onChange={change('deleted')} className="rounded" /> Show removed
          </label>
          <div className="ml-auto"><ExportButtons getTable={getTable} disabled={filters.deleted} /></div>
        </div>
      </div>

      {result && !filters.deleted && (
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
          {[
            ['Entries', result.totalCount, 'text-slate-800', false],
            ['Income', result.summary.income, 'text-emerald-700', true],
            ['Expenses', result.summary.expense, 'text-rose-700', true],
            ['Personal Exp.', result.summary.natureWise?.find(n => n.nature === 'Personal')?.amount || 0, 'text-violet-700', true],
            ['Office Exp.', result.summary.natureWise?.find(n => n.nature === 'Office')?.amount || 0, 'text-blue-700', true],
            ['Net Cash Flow', result.summary.net, result.summary.net < 0 ? 'text-rose-700' : 'text-slate-800', true]
          ].map(([label, value, color, isMoney]) => (
            <div key={label} className="bg-white border border-slate-200 rounded-xl px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
              <p className={`text-sm font-black ${color}`}>{isMoney ? money(value) : value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="text-left font-bold px-3 py-2.5">Date</th>
                <th className="text-left font-bold px-3 py-2.5">Particulars</th>
                <th className="text-left font-bold px-3 py-2.5">Type</th>
                <th className="text-left font-bold px-3 py-2.5">Account</th>
                <th className="text-left font-bold px-3 py-2.5">Mode</th>
                <th className="text-right font-bold px-3 py-2.5">Amount</th>
                <th className="text-right font-bold px-3 py-2.5">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && rows.length === 0 ? (
                <tr><td colSpan={7} className="py-10 text-center"><Loader2 className="animate-spin text-slate-400 inline" /></td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={7} className="py-10 text-center text-slate-400 font-medium">No transactions found for this filter.</td></tr>
              ) : rows.map(t => {
                const amount = signedAmount(t);
                return (
                  <tr key={t._id} className={`hover:bg-slate-50/60 ${loading ? 'opacity-60' : ''}`}>
                    <td className="px-3 py-2.5 whitespace-nowrap font-semibold text-slate-600">{showDay(t.date)}</td>
                    <td className="px-3 py-2.5 max-w-[260px]">
                      <p className="font-bold text-slate-800 truncate">{t.particulars}</p>
                      {t.splits?.length ? (
                        <>
                          {/* Split: har hissa alag (Personal / Office, category, raqam) */}
                          <div className="flex flex-wrap gap-1 mt-1">
                            {t.splits.map((p, i) => (
                              <span key={i} className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border whitespace-nowrap ${NATURE_STYLE[p.nature]}`}>
                                {p.nature} · {p.categoryName} · {money(p.amount)}
                              </span>
                            ))}
                          </div>
                          {t.notes && <p className="text-[11px] text-slate-400 truncate mt-0.5">{t.notes}</p>}
                        </>
                      ) : (
                        <p className="text-[11px] text-slate-400 truncate">{[t.categoryName, t.notes].filter(Boolean).join(' · ')}</p>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-col items-start gap-1">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border whitespace-nowrap ${TYPE_STYLE[t.type]}`}>{t.type}</span>
                        {EXPENSE_LIKE.includes(t.type) && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border whitespace-nowrap ${NATURE_STYLE[t.nature] || NATURE_STYLE.Personal}`}>{t.nature === 'Mixed' ? 'Split' : t.nature}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">{accountText(t)}</td>
                    <td className="px-3 py-2.5 text-slate-600">{t.mode}</td>
                    <td className={`px-3 py-2.5 text-right font-black whitespace-nowrap ${t.deletedAt ? 'text-slate-400 line-through' : amount.color}`}>{amount.text}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        {!t.deletedAt && ['Expense', 'Card Purchase'].includes(t.type) && (
                          <button type="button" title="Record a refund for this" onClick={() => openForm({ type: 'Refund', linkedTransaction: t._id, category: t.category || t.splits?.[0]?.category || '', nature: t.nature === 'Mixed' ? (t.splits?.[0]?.nature || 'Personal') : t.nature, toAccount: t.fromAccount, particulars: `Refund: ${t.particulars}`.slice(0, 200), amount: t.amount })} className="p-1.5 rounded-lg text-teal-600 hover:bg-teal-50"><RotateCcw size={13} /></button>
                        )}
                        {!t.deletedAt && <button type="button" title="Edit" onClick={() => openForm(t)} className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50"><Pencil size={13} /></button>}
                        <button type="button" title="Change history" onClick={() => setHistoryOf(t)} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"><History size={13} /></button>
                        {!t.deletedAt && <button type="button" title="Remove" onClick={() => remove(t)} className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50"><Trash2 size={13} /></button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {result && result.totalPages > 1 && (
          <div className="flex items-center justify-between px-3 py-2 border-t border-slate-100">
            <p className="text-[11px] text-slate-500">Page {result.page} of {result.totalPages} · {result.totalCount} entries</p>
            <div className="flex gap-1">
              <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className={buttonGhost}><ChevronLeft size={13} /></button>
              <button type="button" disabled={page >= result.totalPages} onClick={() => setPage(page + 1)} className={buttonGhost}><ChevronRight size={13} /></button>
            </div>
          </div>
        )}
      </div>

      {historyOf && <HistoryModal api={api} txn={historyOf} onClose={() => setHistoryOf(null)} />}
    </div>
  );
};

// ============================================================
// ACCOUNTS TAB
// ============================================================
const AccountForm = ({ api, initial, onClose, onSaved }) => {
  const [form, setForm] = useState({
    name: initial?.name || '', type: initial?.type || 'BANK', institution: initial?.institution || '',
    openingBalance: initial?.openingBalance ?? '', openingDate: initial?.openingDate || istToday(), isActive: initial?.isActive !== false
  });
  const [saving, setSaving] = useState(false);
  const set = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const payload = { ...form, name: form.name.trim(), openingBalance: Number(form.openingBalance || 0) };
      if (initial?._id) await api.put(`/accounts/${initial._id}`, payload); else await api.post('/accounts', payload);
      toast.success(initial?._id ? 'Account updated' : 'Account added');
      onSaved();
    } catch (error) {
      toast.error(errorText(error));
      setSaving(false);
    }
  };

  return (
    <Shell title={initial?._id ? 'Edit Account' : 'Add Account'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className={labelClass}>Account Type *</label>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
            {Object.entries(ACCOUNT_TYPE_LABEL).map(([value, label]) => (
              <button key={value} type="button" onClick={() => setForm(prev => ({ ...prev, type: value }))}
                className={`text-[11px] font-bold px-1 py-2 rounded-xl border ${form.type === value ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>{label}</button>
            ))}
          </div>
          {initial?._id && <p className="text-[11px] text-slate-400 mt-1">Type cannot be changed once the account has transactions.</p>}
        </div>
        <div>
          <label className={labelClass}>Account Name *</label>
          <input type="text" required maxLength={80} value={form.name} onChange={set('name')} placeholder={form.type === 'CASH' ? 'Cash in Hand' : form.type === 'CREDIT_CARD' ? 'HDFC Credit Card' : form.type === 'INVESTMENT' ? 'Axis Bluechip SIP' : 'HDFC Savings (UPI)'} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Bank / Institution</label>
          <input type="text" maxLength={80} value={form.institution} onChange={set('institution')} placeholder="Optional" className={inputClass} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>{form.type === 'CREDIT_CARD' ? 'Opening Outstanding (₹)' : form.type === 'INVESTMENT' ? 'Already Invested (₹)' : 'Opening Balance (₹)'}</label>
            <input type="number" step="0.01" min={form.type === 'CREDIT_CARD' ? '0' : undefined} value={form.openingBalance} onChange={set('openingBalance')} placeholder="0.00" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>As On Date *</label>
            <input type="date" required max={istToday()} value={form.openingDate} onChange={set('openingDate')} className={inputClass} />
          </div>
        </div>
        <p className="text-[11px] text-slate-400">Opening balance is only your starting position. It is not counted as income or expense. Record transactions from this date onward.</p>
        <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer">
          <input type="checkbox" checked={form.isActive} onChange={set('isActive')} className="rounded" /> Active (inactive accounts are left out of the totals)
        </label>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className={buttonGhost}>Cancel</button>
          <button type="submit" disabled={saving} className={buttonPrimary}>{saving && <Loader2 size={13} className="animate-spin" />} Save Account</button>
        </div>
      </form>
    </Shell>
  );
};

const AccountsTab = ({ api, overview, onChanged }) => {
  const [editing, setEditing] = useState(null); // null | {} (naya) | account
  const icons = { CASH: Banknote, BANK: Landmark, CREDIT_CARD: CreditCard, OTHER: Wallet, INVESTMENT: TrendingUp };

  const remove = async (account) => {
    if (!window.confirm(`Delete account "${account.name}"?`)) return;
    try {
      await api.delete(`/accounts/${account._id}`);
      toast.success('Account deleted');
      onChanged();
    } catch (error) {
      toast.error(errorText(error));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-slate-500">Set up one Cash account, your Bank accounts (UPI goes from these), Credit Cards and Investments (SIP, mutual fund, FD), each with an opening balance.</p>
        <button type="button" onClick={() => setEditing({})} className={`${buttonPrimary} shrink-0`}><Plus size={13} /> Add Account</button>
      </div>
      {overview.accounts.length === 0 ? (
        <div className="text-center py-12 bg-white border border-dashed border-slate-300 rounded-2xl text-xs text-slate-400 font-medium">No accounts yet.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {overview.accounts.map(account => {
            const Icon = icons[account.type];
            return (
              <div key={account._id} className={`bg-white border border-slate-200 rounded-2xl p-4 ${account.isActive ? '' : 'opacity-60'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="h-9 w-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0"><Icon size={16} /></span>
                    <div className="min-w-0">
                      <p className="text-sm font-black text-slate-800 truncate">{account.name}</p>
                      <p className="text-[11px] text-slate-400 truncate">{ACCOUNT_TYPE_LABEL[account.type]}{account.institution ? ` · ${account.institution}` : ''}{account.isActive ? '' : ' · Inactive'}</p>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button type="button" title="Edit" onClick={() => setEditing(account)} className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50"><Pencil size={13} /></button>
                    <button type="button" title="Delete" onClick={() => remove(account)} className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50"><Trash2 size={13} /></button>
                  </div>
                </div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-3">{account.type === 'CREDIT_CARD' ? 'Outstanding' : account.type === 'INVESTMENT' ? 'Invested Amount' : 'Current Balance'}</p>
                <p className={`text-lg font-black ${account.type === 'CREDIT_CARD' ? 'text-rose-700' : account.balance < 0 ? 'text-rose-700' : 'text-slate-800'}`}>{money(account.balance)}</p>
                <p className="text-[11px] text-slate-400 mt-1">Opening {money(account.openingBalance)} as on {showDay(account.openingDate)}</p>
              </div>
            );
          })}
        </div>
      )}
      {editing && <AccountForm api={api} initial={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); onChanged(); }} />}
    </div>
  );
};

// ============================================================
// CATEGORIES TAB
// ============================================================
const CategoriesTab = ({ api, overview, onChanged }) => {
  const [names, setNames] = useState({ INCOME: '', EXPENSE: '' });
  const [busy, setBusy] = useState(false);

  const call = async (request, message) => {
    if (busy) return;
    setBusy(true);
    try {
      await request();
      if (message) toast.success(message);
      onChanged();
    } catch (error) {
      toast.error(errorText(error));
    } finally {
      setBusy(false);
    }
  };

  const add = (type) => (e) => {
    e.preventDefault();
    const name = names[type].trim();
    if (!name) return;
    call(async () => { await api.post('/categories', { name, type }); setNames(prev => ({ ...prev, [type]: '' })); }, 'Category added');
  };
  const rename = (category) => {
    const name = window.prompt('Category name', category.name);
    if (name && name.trim() && name.trim() !== category.name) call(() => api.put(`/categories/${category._id}`, { name: name.trim() }), 'Category renamed');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {[['INCOME', 'Income Categories', 'text-emerald-700'], ['EXPENSE', 'Expense Categories', 'text-rose-700']].map(([type, title, color]) => (
        <div key={type} className="bg-white border border-slate-200 rounded-2xl p-4">
          <p className={`text-sm font-black mb-3 ${color}`}>{title}</p>
          <form onSubmit={add(type)} className="flex gap-2 mb-3">
            <input type="text" maxLength={60} value={names[type]} onChange={(e) => setNames(prev => ({ ...prev, [type]: e.target.value }))} placeholder="New category name" className={inputClass} />
            <button type="submit" disabled={busy} className={`${buttonPrimary} shrink-0`}><Plus size={13} /> Add</button>
          </form>
          <div className="divide-y divide-slate-100">
            {overview.categories.filter(c => c.type === type).map(category => (
              <div key={category._id} className="py-2 flex items-center justify-between gap-2">
                <span className={`text-xs font-semibold ${category.isActive ? 'text-slate-700' : 'text-slate-400 line-through'}`}>{category.name}</span>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => call(() => api.put(`/categories/${category._id}`, { isActive: !category.isActive }))} className={`text-[10px] font-bold px-2 py-1 rounded-lg border ${category.isActive ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>{category.isActive ? 'On' : 'Off'}</button>
                  <button type="button" title="Rename" onClick={() => rename(category)} className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50"><Pencil size={12} /></button>
                  <button type="button" title="Delete" onClick={() => window.confirm(`Delete category "${category.name}"?`) && call(() => api.delete(`/categories/${category._id}`), 'Category deleted')} className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50"><Trash2 size={12} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      <p className="lg:col-span-2 text-[11px] text-slate-400">Own Account Transfer and Card Settlement are movements, not categories: they never count as income or expense. A category that is already used cannot be deleted, only turned off.</p>
    </div>
  );
};

// ============================================================
// REPORTS TAB
// ============================================================
const REPORTS = [
  ['monthly', 'Monthly Summary'], ['category', 'Category-wise Expense'], ['nature', 'Personal vs Office Expense'], ['mode', 'Payment-mode Totals'],
  ['daily', 'Daily Closing Balances'], ['ledger', 'Account Ledger']
];

const ReportsTab = ({ api, overview, refreshKey }) => {
  const today = istToday();
  const [report, setReport] = useState('monthly');
  const [from, setFrom] = useState(`${today.slice(0, 4)}-${today.slice(5, 7)}-01`);
  const [to, setTo] = useState(today);
  const [account, setAccount] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const accountId = account || overview.accounts[0]?._id || '';

  useEffect(() => {
    if (report === 'ledger' && !accountId) { setData(null); return undefined; }
    let cancelled = false;
    setLoading(true);
    const request = report === 'ledger' ? api.get('/ledger', { params: { from, to, account: accountId } }) : api.get('/reports', { params: { from, to } });
    request
      .then(res => { if (!cancelled) setData({ kind: report === 'ledger' ? 'ledger' : 'reports', ...res.data }); })
      .catch(error => { if (!cancelled) { setData(null); toast.error(errorText(error)); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [api, report, from, to, accountId, refreshKey]);

  // Screen aur export dono ke liye ek hi table
  const table = useMemo(() => {
    const period = `Period: ${showDay(from)} to ${showDay(to)}`;
    const file = (name) => `Personal_${name}_${from}_${to}`;
    if (!data) return null;
    if (report === 'ledger') {
      if (data.kind !== 'ledger') return null;
      const isCardAccount = data.account.type === 'CREDIT_CARD';
      return {
        title: `Account Ledger - ${data.account.name}`, subtitle: period, fileName: file(`Ledger_${data.account.name.replace(/\W+/g, '_')}`), numericFrom: 4,
        columns: ['Date', 'Particulars', 'Type', 'Mode', isCardAccount ? 'Paid / Refund (Rs.)' : 'Money In (Rs.)', isCardAccount ? 'Spent (Rs.)' : 'Money Out (Rs.)', isCardAccount ? 'Outstanding (Rs.)' : 'Balance (Rs.)'],
        rows: [
          [showDay(data.from), 'Opening Balance', '', '', '', '', data.opening],
          ...data.rows.map(r => [showDay(r.date), r.particulars, r.type, r.mode, r.in || '', r.out || '', r.balance]),
          [showDay(data.to), 'Closing Balance', '', '', data.totalIn, data.totalOut, data.closing]
        ]
      };
    }
    if (data.kind !== 'reports') return null;
    if (report === 'monthly') {
      return {
        title: 'Monthly Summary', subtitle: period, fileName: file('Monthly_Summary'), numericFrom: 2,
        columns: ['Month', 'Entries', 'Income (Rs.)', 'Expenses (Rs.)', 'Net Cash Flow (Rs.)'],
        rows: [...data.monthly.map(m => [monthLabel(m.month), String(m.count), m.income, m.expense, m.net]), ...(data.monthly.length ? [['Total', '', data.summary.income, data.summary.expense, data.summary.net]] : [])]
      };
    }
    if (report === 'category') {
      return {
        title: 'Category-wise Expense', subtitle: period, fileName: file('Category_Expense'), numericFrom: 1,
        columns: ['Category', 'Expense (Rs.)', 'Share'],
        rows: [...data.summary.categoryWise.map(c => [c.name, c.amount, data.summary.expense > 0 ? `${((c.amount / data.summary.expense) * 100).toFixed(1)}%` : '']), ...(data.summary.categoryWise.length ? [['Total', data.summary.expense, '']] : [])]
      };
    }
    if (report === 'nature') {
      const list = data.summary.natureWise || [];
      return {
        title: 'Personal vs Office Expense', subtitle: period, fileName: file('Personal_vs_Office'), numericFrom: 1,
        columns: ['Expense For', 'Expense (Rs.)', 'Share'],
        rows: [
          ...list.map(n => [n.nature, n.amount, data.summary.expense > 0 ? `${((n.amount / data.summary.expense) * 100).toFixed(1)}%` : '']),
          ['Total', data.summary.expense, '']
        ]
      };
    }
    if (report === 'mode') {
      return {
        title: 'Payment-mode Totals', subtitle: period, fileName: file('Payment_Modes'), numericFrom: 1,
        columns: ['Payment Mode', 'Income (Rs.)', 'Expenses (Rs.)', 'Transfers / Settlements (Rs.)'],
        rows: data.summary.modeWise.map(m => [m.mode, m.income, m.expense, m.other])
      };
    }
    return {
      title: 'Daily Closing Balances', subtitle: period, fileName: file('Daily_Closing'), numericFrom: 1,
      columns: ['Date', 'Cash (Rs.)', 'Bank (Rs.)', 'Total Available (Rs.)', 'Card Outstanding (Rs.)'],
      rows: data.daily.map(d => [showDay(d.date), d.cash, d.bank, d.available, d.cardOutstanding])
    };
  }, [data, report, from, to]);

  const selectClass = 'border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-700 bg-white outline-none';

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-2xl p-3 flex flex-wrap items-center gap-2">
        <select value={report} onChange={(e) => setReport(e.target.value)} className={selectClass}>
          {REPORTS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        {report === 'ledger' && (
          <select value={accountId} onChange={(e) => setAccount(e.target.value)} className={selectClass}>
            {overview.accounts.length === 0 && <option value="">No accounts</option>}
            {overview.accounts.map(a => <option key={a._id} value={a._id}>{a.name}</option>)}
          </select>
        )}
        <input type="date" value={from} max={to} onChange={(e) => e.target.value && setFrom(e.target.value)} className={selectClass} />
        <span className="text-xs text-slate-400">to</span>
        <input type="date" value={to} min={from} max={today} onChange={(e) => e.target.value && setTo(e.target.value)} className={selectClass} />
        <div className="ml-auto"><ExportButtons getTable={async () => table} disabled={!table} /></div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        {loading && !table ? (
          <div className="py-12 flex justify-center"><Loader2 className="animate-spin text-slate-400" /></div>
        ) : !table || table.rows.length === 0 ? (
          <p className="py-12 text-center text-xs text-slate-400 font-medium">No data for this period.</p>
        ) : (
          <div className={`overflow-x-auto ${loading ? 'opacity-60' : ''}`}>
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                <tr>{table.columns.map((column, index) => <th key={column} className={`font-bold px-3 py-2.5 whitespace-nowrap ${index >= table.numericFrom ? 'text-right' : 'text-left'}`}>{column}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {table.rows.map((row, rowIndex) => {
                  const strong = ['Total', 'Opening Balance', 'Closing Balance'].includes(row[0]) || ['Opening Balance', 'Closing Balance'].includes(row[1]);
                  return (
                    <tr key={rowIndex} className={strong ? 'bg-slate-50 font-black text-slate-800' : 'text-slate-700'}>
                      {row.map((cell, index) => (
                        <td key={index} className={`px-3 py-2 ${index >= table.numericFrom ? 'text-right whitespace-nowrap font-semibold' : ''} ${index === 1 ? 'max-w-[260px] truncate' : ''}`}>
                          {typeof cell === 'number' ? plain(cell) : cell}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================
// MAIN: dashboard ka chhota card + popup panel
// ============================================================
const TABS = [['dashboard', 'Dashboard'], ['transactions', 'Transactions'], ['accounts', 'Accounts & Opening Balances'], ['categories', 'Categories'], ['reports', 'Reports']];

const CashFlowPanel = () => {
  const { user } = useContext(AuthContext);
  const api = useMemo(() => axios.create({
    baseURL: `${import.meta.env.VITE_API_URL}/personal-finance`,
    headers: { Authorization: `Bearer ${user.token}` }
  }), [user.token]);

  const [overview, setOverview] = useState(null);
  const [failed, setFailed] = useState(false);
  const [month, setMonth] = useState(istToday().slice(0, 7));
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('dashboard');
  const [form, setForm] = useState(null);       // null | transaction form ka shuruaati data
  const [refreshKey, setRefreshKey] = useState(0);
  // Rakam default me chhupi rehti hai (dashboard koi aur bhi dekh sakta hai); aankh dabane par dikhti hai
  const [show, setShow] = useState(() => { try { return localStorage.getItem(SHOW_KEY) === '1'; } catch { return false; } });

  const loadOverview = useCallback(async () => {
    try {
      const res = await api.get('/overview', { params: { month } });
      setOverview(res.data);
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, [api, month]);

  useEffect(() => { loadOverview(); }, [loadOverview]);

  // Kuch bhi save / edit / delete hone par balances turant taaza
  const changed = useCallback(() => { loadOverview(); setRefreshKey(key => key + 1); }, [loadOverview]);

  const toggleShow = (e) => {
    e.stopPropagation();
    setShow(prev => { try { localStorage.setItem(SHOW_KEY, prev ? '0' : '1'); } catch { /* storage band ho toh bhi chale */ } return !prev; });
  };
  const openPanel = (nextTab = 'dashboard') => { setTab(nextTab); setOpen(true); };
  const openForm = (initial) => {
    if (!overview || overview.accounts.filter(a => a.isActive).length === 0) { toast.error('Add an account first'); setTab('accounts'); setOpen(true); return; }
    setForm(initial || {});
  };

  const totals = overview?.totals;
  const masked = (value) => (show ? money(value) : '₹ ••••••');
  const tiles = [
    ['Cash', totals?.cash, Banknote, 'text-emerald-600'], ['Bank', totals?.bank, Landmark, 'text-blue-600'],
    ['Total Available', totals?.available, Wallet, 'text-indigo-600'], ['Card Outstanding', totals?.cardOutstanding, CreditCard, 'text-rose-600'],
    ['Investments', totals?.investment, TrendingUp, 'text-violet-600']
  ];

  return (
    <>
      {/* CEO DASHBOARD PAR CHHOTA CARD */}
      <div onClick={() => openPanel()} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && openPanel()}
        className="bg-white rounded-3xl border border-slate-200 shadow-sm px-5 py-4 cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <div className="flex items-center gap-3 mr-auto">
            <span className="h-10 w-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center"><PiggyBank size={18} /></span>
            <div>
              <p className="text-sm font-black text-slate-800 flex items-center gap-1.5">Personal Cash Flow <Lock size={11} className="text-slate-400" /></p>
              <p className="text-[11px] text-slate-400">Private to you · click to open</p>
            </div>
          </div>
          {failed ? (
            <p className="text-xs font-semibold text-rose-600">Could not load. Check that the server is restarted.</p>
          ) : !overview ? (
            <Loader2 size={16} className="animate-spin text-slate-400" />
          ) : overview.accounts.length === 0 ? (
            <p className="text-xs font-semibold text-slate-500">Not set up yet · add your accounts to start</p>
          ) : tiles.map(([label, value, Icon, color]) => (
            <div key={label} className="min-w-[110px]">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1"><Icon size={11} className={color} /> {label}</p>
              <p className="text-sm font-black text-slate-800">{masked(value)}</p>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={toggleShow} title={show ? 'Hide amounts' : 'Show amounts'} className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50">{show ? <EyeOff size={14} /> : <Eye size={14} />}</button>
            <button type="button" onClick={(e) => { e.stopPropagation(); openForm({}); }} className={buttonPrimary}><Plus size={13} /> Add</button>
          </div>
        </div>
      </div>

      {/* POORA PANEL (POPUP) */}
      {open && (
        <div className="fixed inset-0 z-[60] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4" onClick={() => setOpen(false)}>
          <div className="bg-slate-50 rounded-3xl shadow-2xl w-full max-w-6xl h-[94vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="bg-white border-b border-slate-200 px-5 pt-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="h-10 w-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0"><PiggyBank size={18} /></span>
                  <div className="min-w-0">
                    <h2 className="text-base font-black text-slate-800 truncate">Personal Cash Flow & Live Balance</h2>
                    <p className="text-[11px] text-slate-400 flex items-center gap-1"><Lock size={10} /> Only you can see this. Separate from company accounts.</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button type="button" onClick={() => openForm({})} className={buttonPrimary}><Plus size={13} /> <span className="hidden sm:inline">Add Transaction</span></button>
                  <button type="button" onClick={() => setOpen(false)} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={18} /></button>
                </div>
              </div>
              <div className="flex gap-1 mt-3 overflow-x-auto">
                {TABS.map(([value, label]) => (
                  <button key={value} type="button" onClick={() => setTab(value)}
                    className={`text-xs font-bold px-3 py-2 border-b-2 whitespace-nowrap transition-colors ${tab === value ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>{label}</button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-5">
              {!overview ? (
                <div className="py-20 flex flex-col items-center gap-2 text-slate-400">
                  {failed ? <p className="text-xs font-semibold text-rose-600">Could not load. Restart the backend server and try again.</p> : <Loader2 className="animate-spin" />}
                </div>
              ) : (
                <>
                  {tab === 'dashboard' && <DashboardTab overview={overview} month={month} setMonth={setMonth} goTo={setTab} openForm={openForm} />}
                  {tab === 'transactions' && <TransactionsTab api={api} overview={overview} refreshKey={refreshKey} openForm={openForm} onChanged={changed} />}
                  {tab === 'accounts' && <AccountsTab api={api} overview={overview} onChanged={changed} />}
                  {tab === 'categories' && <CategoriesTab api={api} overview={overview} onChanged={changed} />}
                  {tab === 'reports' && <ReportsTab api={api} overview={overview} refreshKey={refreshKey} />}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {form && overview && (
        <TransactionForm api={api} overview={overview} initial={form} onClose={() => setForm(null)} onSaved={() => { setForm(null); changed(); }} />
      )}
    </>
  );
};

export default CashFlowPanel;
