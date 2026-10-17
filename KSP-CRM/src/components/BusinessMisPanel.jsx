import React, { useState, useEffect, useContext, useCallback, useMemo, useRef } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { AuthContext } from '../context/AuthContext';
import { istToday, formatIstDateTime } from '../utils/time';
import {
  BarChart3, ChevronLeft, ChevronRight, X, Loader2, Download, Copy, Plus, Trash2, CheckCircle2, Info,
  TrendingUp, Receipt, Landmark, Percent, CloudOff, Lock, Pencil, Check
} from 'lucide-react';

// 🔴 BUSINESS MIS (company ka mahine ka hisaab), CEO Dashboard par card + popup.
// 4 hisse: Cash Flow & Bank Position (hafte-war), P&L Budget vs Actual, Expense Budget vs Actual, Billing & Collection.
// CRM ki asli figure (actual) LOCK hai: yahan se nahi badalti (source me badlo). Baaki (budget, target, remark) sirf "Edit" dabane par badalta hai.

// ---------------- FORMAT ----------------
const money = (v) => {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  const n = Math.round(v);
  return `${n < 0 ? '-' : ''}₹${Math.abs(n).toLocaleString('en-IN')}`;
};
const plain = (v) => (v === null || v === undefined ? '' : Math.round(v).toLocaleString('en-IN'));
const pct = (v) => (v === null || v === undefined || !Number.isFinite(v) ? '—' : `${Math.abs(v) < 10 && v % 1 !== 0 ? v.toFixed(1) : Math.round(v)}%`);
const ratio = (a, b) => (b ? (a / b) * 100 : null);
const sum = (list) => list.reduce((s, v) => s + (Number(v) || 0), 0);
const monthLabel = (month) => new Date(`${month}-01T12:00:00+05:30`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });
const shiftMonth = (month, by) => {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + by, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
};
const daysIn = (month) => { const [y, m] = month.split('-').map(Number); return new Date(Date.UTC(y, m, 0)).getUTCDate(); };

// ---------------- LINES (Excel sheets jaisi) ----------------
const EXPENSE_HEADS = [
  ['salaries', 'Salaries & Wages', 'Fixed'], ['incentives', 'Employee Incentives', 'Variable'], ['pfesi', 'Employer PF/ESI', 'Employee Cost'],
  ['rent', 'Office Rent', 'Fixed'], ['electricity', 'Electricity', 'Variable'], ['internet', 'Internet & Telephone', 'Fixed'],
  ['software', 'CRM / Software', 'Fixed'], ['ads', 'Google / Meta Advertising', 'Marketing'], ['marketing', 'Marketing & Promotion', 'Marketing'],
  ['commission', 'Business Associate Commission', 'Variable'], ['salesIncentive', 'Sales Incentive', 'Variable'], ['professional', 'Professional Fees', 'Admin'],
  ['legal', 'CA / Legal / Compliance', 'Admin'], ['supplies', 'Office Supplies / Stationery', 'Admin'], ['travel', 'Travel & Conveyance', 'Variable'],
  ['hospitality', 'Client Meeting / Hospitality', 'Variable'], ['repairs', 'Repairs & Maintenance', 'Variable'], ['welfare', 'Staff Welfare Expenses', 'Variable'],
  ['bank', 'Bank / Payment Gateway Charges', 'Variable'], ['training', 'Training & Development', 'Employee Cost'], ['recruitment', 'Recruitment Expense', 'HR'],
  ['depreciation', 'Depreciation', 'Non-Cash'], ['finance', 'Finance Cost / Interest', 'Finance'], ['misc', 'Miscellaneous', 'Other']
];
const EXPENSE_CATEGORIES = ['Fixed', 'Variable', 'Employee Cost', 'Marketing', 'Admin', 'HR', 'Non-Cash', 'Finance', 'Other'];
const defaultExpenses = () => EXPENSE_HEADS.map(([key, head, category]) => ({ key, head, category, budget: null, actual: null, reason: '', action: '' }));

const REVENUE_LINES = [
  ['itr', 'ITR Revenue'], ['gst', 'GST Revenue'], ['accounting', 'Accounting Revenue'], ['tds', 'TDS Revenue'], ['roc', 'ROC / Compliance Revenue'],
  ['registration', 'Registration Revenue'], ['audit', 'Audit / Tax Audit Revenue'], ['cfo', 'Virtual CFO Revenue'], ['otherRev', 'Other Revenue']
];
const DIRECT_LINES = [['outsourced', 'Outsourced Professional Work'], ['consultant', 'Consultant / Associate Cost'], ['otherDirect', 'Other Direct Cost']];
// P&L ke kharche Expense tab se jud kar aate hain (wahan bharo, yahan apne aap)
const OPEX_LINES = [
  ['salaries', 'Salaries & Wages', ['salaries', 'pfesi']], ['incentives', 'Employee Incentives', ['incentives', 'salesIncentive']],
  ['rent', 'Rent', ['rent']], ['electricity', 'Electricity', ['electricity']], ['marketing', 'Marketing & Advertising', ['ads', 'marketing']],
  ['software', 'CRM / Software', ['software']], ['commission', 'Business Associate Commission', ['commission']],
  ['professional', 'Professional Fees', ['professional', 'legal']], ['travel', 'Travel & Conveyance', ['travel']],
  ['admin', 'Office / Administrative', ['supplies', 'internet', 'hospitality', 'welfare', 'bank', 'training', 'recruitment']],
  ['repairs', 'Repairs & Maintenance', ['repairs']], ['otherOpex', 'Other Operating Expenses', ['misc', '*custom']]
];

const CASH_IN = [['collections', 'Client Collections'], ['advance', 'New Client Advance'], ['receivables', 'Existing Client Receivables'], ['otherReceipts', 'Other Receipts']];
const CASH_OUT = [
  ['salaries', 'Salaries & Wages'], ['rent', 'Office Rent'], ['marketing', 'Marketing & Advertising'], ['commission', 'Business Associate Commission'],
  ['professional', 'Professional Fees'], ['statutory', 'GST / TDS / Statutory Payments'], ['software', 'Software / CRM / Subscriptions'],
  ['utilities', 'Electricity / Internet / Telephone'], ['travel', 'Travel & Conveyance'], ['admin', 'Office / Administrative Expenses'], ['other', 'Other Payments']
];
const WEEKS = ['w1', 'w2', 'w3', 'w4', 'w5'];

// ============================================================
// HISAAB: jo bhara hai + CRM = har khane ka asli number
// ============================================================
const pick = (own, auto) => (own !== null && own !== undefined ? own : auto);

const computeMis = (month, data, crm, previous) => {
  const c = crm || {};
  // ---- Expense Budget vs Actual ----
  const expenseRows = (data.expenses?.length ? data.expenses : defaultExpenses()).map(row => {
    const auto = row.custom ? null : (c.expenses?.[row.key] ?? null);
    // Office Expense + Salary se aane wali line lock; apni jodi line aur Depreciation (cash kharcha nahi) tum bharte ho
    const locked = !row.custom && row.key !== 'depreciation';
    const budget = row.budget ?? 0;
    const actual = (locked ? auto : pick(row.actual, auto)) ?? 0;
    return { ...row, auto, locked, budgetValue: budget, actualValue: actual, variance: actual - budget, variancePct: ratio(actual - budget, budget), good: budget === 0 && actual === 0 ? null : actual <= budget };
  });
  const expenseTotal = { budget: sum(expenseRows.map(r => r.budgetValue)), actual: sum(expenseRows.map(r => r.actualValue)) };
  const expenseBy = (keys, field) => sum(expenseRows.filter(r => keys.includes(r.key) || (keys.includes('*custom') && r.custom)).map(r => r[field]));

  // ---- P&L ----
  const pl = data.pl || {};
  // lock.budget / lock.actual = woh khana kahin aur se aata hai (CRM ya Expense tab), yahan badal nahi sakte
  const line = (key, autoBudget, autoActual, lock = {}) => {
    const own = pl[key] || {};
    return {
      key, autoBudget, autoActual, own, lockBudget: !!lock.budget, lockActual: !!lock.actual,
      budget: (lock.budget ? autoBudget : pick(own.budget, autoBudget)) ?? 0,
      actual: (lock.actual ? autoActual : pick(own.actual, autoActual)) ?? 0
    };
  };
  const fromExpenses = { budget: true, actual: true };
  const revenue = REVENUE_LINES.map(([key, label]) => ({ ...line(key, null, c.revenue?.[key] ?? 0, { actual: true }), label }));
  const direct = DIRECT_LINES.map(([key, label]) => ({ ...(key === 'outsourced' ? line(key, null, c.vendorPaid ?? 0, { actual: true }) : line(key, null, null)), label }));
  const opex = OPEX_LINES.map(([key, label, from]) => ({ ...line(key, expenseBy(from, 'budgetValue'), expenseBy(from, 'actualValue'), fromExpenses), label }));
  const depreciation = { ...line('depreciation', expenseBy(['depreciation'], 'budgetValue'), expenseBy(['depreciation'], 'actualValue'), fromExpenses), label: 'Depreciation' };
  const financeCost = { ...line('financeCost', expenseBy(['finance'], 'budgetValue'), expenseBy(['finance'], 'actualValue'), fromExpenses), label: 'Finance Cost / Interest' };
  const tax = { ...line('tax', null, null), label: 'Tax Provision' };
  const tot = (list, f) => sum(list.map(l => l[f]));
  const both = (fn) => ({ budget: fn('budget'), actual: fn('actual') });
  const totalRevenue = both(f => tot(revenue, f));
  const totalDirect = both(f => tot(direct, f));
  const grossProfit = both(f => totalRevenue[f] - totalDirect[f]);
  const totalOpex = both(f => tot(opex, f));
  const ebitda = both(f => grossProfit[f] - totalOpex[f]);
  const pbt = both(f => ebitda[f] - depreciation[f] - financeCost[f]);
  const pat = both(f => pbt[f] - tax[f]);

  // ---- Billing & Collection ----
  const b = data.billing || {};
  const cb = c.billing || {};
  const target = (key) => b[key]?.target ?? null;
  const actualOf = (key) => cb[key === 'billing' ? 'current' : key] ?? 0; // invoices se, lock
  const billingActual = { billing: actualOf('billing'), collection: actualOf('collection'), opening: actualOf('opening'), closing: actualOf('closing') };
  const billingTarget = {
    billing: target('billing') ?? 0,
    collection: target('collection') ?? 0,
    opening: pick(target('opening'), billingActual.opening) ?? 0
  };
  billingTarget.closing = pick(target('closing'), billingTarget.opening + billingTarget.billing - billingTarget.collection);
  billingActual.efficiency = ratio(billingActual.collection, billingActual.opening + billingActual.billing);
  billingTarget.efficiency = pick(target('efficiency'), ratio(billingTarget.collection, billingTarget.opening + billingTarget.billing));

  // ---- Cash Flow (hafte-war) ----
  const cf = data.cashflow || {};
  const weekCount = daysIn(month) > 28 ? 5 : 4;
  const weeks = WEEKS.slice(0, weekCount);
  const autoCell = (key, i, side) => {
    if (side === 'in') return key === 'collections' ? c.weeks?.collections?.[i] : key === 'receivables' ? c.weeks?.receivables?.[i] : null;
    return c.weeks?.out?.[key]?.[i] ?? null;
  };
  // Client ka paisa = sirf invoices se (lock). Kharche = CRM (office expense / vendor, lock) + jo tum alag se bharo (salary, GST, TDS ...)
  const cellOf = (key, w, i, side) => {
    const own = cf.cells?.[key]?.[w] ?? null;
    const auto = autoCell(key, i, side) || null;
    if (side === 'in' && (key === 'collections' || key === 'receivables')) return { own: null, auto, locked: true, value: auto ?? 0 };
    return { own, auto, locked: false, value: (auto ?? 0) + (own ?? 0) };
  };
  const openingAuto = previous?.closingCash ?? null;
  const opening0 = pick(cf.opening, openingAuto) ?? 0;
  const cash = { weeks: [], opening: opening0, openingAuto };
  let running = opening0;
  weeks.forEach((w, i) => {
    const inflow = sum(CASH_IN.map(([key]) => cellOf(key, w, i, 'in').value));
    const outflow = sum(CASH_OUT.map(([key]) => cellOf(key, w, i, 'out').value));
    const week = { w, opening: running, inflow, outflow, net: inflow - outflow };
    running += week.net;
    week.closing = running;
    cash.weeks.push(week);
  });
  cash.inflow = sum(cash.weeks.map(w => w.inflow));
  cash.outflow = sum(cash.weeks.map(w => w.outflow));
  cash.net = cash.inflow - cash.outflow;
  cash.closing = running;
  cash.cellOf = cellOf;
  cash.weekKeys = weeks;

  return {
    expenseRows, expenseTotal,
    pl: { revenue, direct, opex, depreciation, financeCost, tax, totalRevenue, totalDirect, grossProfit, totalOpex, ebitda, pbt, pat },
    billing: { target: billingTarget, actual: billingActual, tds: cb.tds || 0, discount: cb.discount || 0, invoiceCount: cb.invoiceCount || 0 },
    cash
  };
};

// ============================================================
// CHHOTE HISSE
// ============================================================
// "Edit" dabaya hai ya nahi (poore panel me)
const EditContext = React.createContext(false);
const LOCK_TITLE = 'Real figure from the CRM. It cannot be changed here; change the invoice, payment, office expense, salary or vendor entry instead.';

// Number ka khana. locked = CRM ki asli figure (kabhi edit nahi). Baaki sirf Edit mode me input banta hai.
const AmountInput = ({ value, auto, onChange, locked, className = '' }) => {
  const editing = useContext(EditContext);
  const isAuto = (value === null || value === undefined) && auto !== null && auto !== undefined;
  if (locked) {
    return (
      <span title={LOCK_TITLE} className={`flex items-center justify-end gap-1 tabular-nums px-2 py-1.5 rounded-md bg-emerald-50/70 text-emerald-800 font-semibold cursor-not-allowed ${className}`}>
        {editing && <Lock size={10} className="text-emerald-500 shrink-0" />}{plain(auto ?? 0)}
      </span>
    );
  }
  if (!editing) return <span className={`block text-right tabular-nums px-2 py-1.5 ${isAuto ? 'text-slate-500' : 'text-slate-800'} ${className}`}>{plain(value ?? auto ?? 0)}</span>;
  return (
    <input
      type="number"
      inputMode="decimal"
      value={value ?? ''}
      placeholder={isAuto ? plain(auto) : '0'}
      title={isAuto ? 'Suggested figure. Type to replace it; clear the box to go back.' : undefined}
      onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
      className={`w-full min-w-[84px] text-right tabular-nums px-2 py-1.5 rounded-md text-[13px] outline-none border border-indigo-200 bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 transition-colors
        ${isAuto ? 'placeholder:text-indigo-500 placeholder:font-semibold' : 'placeholder:text-slate-300'} ${className}`}
    />
  );
};

// Likhne ka khana (remark, reason ...): Edit mode me hi input
const TextCell = ({ value, onChange, placeholder, warn, className = '' }) => {
  const editing = useContext(EditContext);
  if (!editing) return <span className="block px-2 py-1.5 text-xs text-slate-600 whitespace-normal break-words">{value || ''}</span>;
  return (
    <input value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      className={`w-full px-2 py-1.5 text-xs rounded-md border bg-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 ${warn ? 'border-rose-300 bg-rose-50/40' : 'border-indigo-200'} ${className}`} />
  );
};

// Cash flow ka kharche wala khana: CRM wala hissa lock, uske upar jo tum alag se bharo
const CashCell = ({ cell, onChange }) => {
  const editing = useContext(EditContext);
  if (cell.locked) return <AmountInput locked auto={cell.auto} />;
  if (!editing) {
    return (
      <span title={cell.auto ? `CRM ${plain(cell.auto)}${cell.own ? ` + entered ${plain(cell.own)}` : ''}` : undefined}
        className={`block text-right tabular-nums px-2 py-1.5 ${cell.auto ? 'text-emerald-800 font-semibold' : 'text-slate-800'}`}>{plain(cell.value)}</span>
    );
  }
  return (
    <div>
      <AmountInput value={cell.own} auto={null} onChange={onChange} />
      {cell.auto ? <span title={LOCK_TITLE} className="flex items-center justify-end gap-0.5 text-[9px] font-bold text-emerald-700 pr-1 mt-0.5"><Lock size={8} /> + CRM {plain(cell.auto)}</span> : null}
    </div>
  );
};

const Status = ({ good }) => (good === null || good === undefined
  ? <span className="text-slate-300 text-xs">—</span>
  : <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black tracking-wide ${good ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{good ? 'GREEN' : 'RED'}</span>);

const varianceClass = (v, higherIsGood) => (!v ? 'text-slate-500' : (v > 0) === higherIsGood ? 'text-emerald-600' : 'text-rose-600');

const th = 'px-2 py-2.5 text-[10px] font-black uppercase tracking-wider text-slate-500 text-right whitespace-nowrap';
const thLeft = 'px-3 py-2.5 text-[10px] font-black uppercase tracking-wider text-slate-500 text-left whitespace-nowrap sticky left-0 bg-slate-50 z-10';
const tdLabel = 'px-3 py-1 text-[13px] text-slate-700 whitespace-nowrap sticky left-0 z-10';
const td = 'px-1.5 py-1 text-right text-[13px] tabular-nums whitespace-nowrap';

const SectionRow = ({ label, span }) => (
  <tr className="bg-sky-50/80"><td className={`${tdLabel} bg-sky-50 font-black text-[11px] uppercase tracking-wider text-sky-800 py-2`}>{label}</td><td colSpan={span} className="bg-sky-50/80"></td></tr>
);

const TableBox = ({ children }) => (
  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
    <div className="overflow-x-auto custom-scrollbar">{children}</div>
  </div>
);

const Hint = ({ children }) => (
  <p className="flex items-start gap-1.5 text-[11px] text-slate-500 mb-3"><Info size={13} className="text-indigo-400 shrink-0 mt-px" /> <span>{children}</span></p>
);

// ============================================================
// 1. CASH FLOW & BANK POSITION (hafte-war)
// ============================================================
const CashFlowTab = ({ month, data, model, update }) => {
  const { cash } = model;
  const cf = data.cashflow || {};
  const days = daysIn(month);
  const short = new Date(`${month}-01T12:00:00+05:30`).toLocaleDateString('en-IN', { month: 'short', timeZone: 'Asia/Kolkata' });
  const range = (i) => `${i * 7 + 1}–${i === 4 || (i === 3 && days <= 28) ? days : i * 7 + 7} ${short}`;
  const setCell = (key, w, value) => update(d => {
    const cells = { ...(d.cashflow?.cells || {}) };
    cells[key] = { ...(cells[key] || {}), [w]: value };
    return { ...d, cashflow: { ...(d.cashflow || {}), cells } };
  });
  const setRemark = (key, value) => update(d => ({ ...d, cashflow: { ...(d.cashflow || {}), remarks: { ...(d.cashflow?.remarks || {}), [key]: value } } }));
  const remark = (key) => (
    <td className="px-1.5 py-1 min-w-[180px]"><TextCell value={cf.remarks?.[key]} onChange={(v) => setRemark(key, v)} placeholder="Remark / action" /></td>
  );
  const flowRow = (key, label, side) => {
    const cells = cash.weekKeys.map((w, i) => cash.cellOf(key, w, i, side));
    return (
      <tr key={`${side}-${key}`} className="border-t border-slate-100 hover:bg-slate-50/60">
        <td className={`${tdLabel} bg-white`}>{label}</td>
        {cells.map((cell, i) => <td key={i} className={td}><CashCell cell={cell} onChange={(v) => setCell(key, cash.weekKeys[i], v)} /></td>)}
        <td className={`${td} font-bold text-slate-800 px-3`}>{plain(sum(cells.map(c => c.value)))}</td>
        {remark(key)}
      </tr>
    );
  };
  const totalRow = (label, values, total, tone = 'bg-emerald-50') => (
    <tr className={`${tone} border-t border-slate-200`}>
      <td className={`${tdLabel} ${tone} font-black text-slate-800 py-2`}>{label}</td>
      {values.map((v, i) => <td key={i} className={`${td} font-black px-3 ${v < 0 ? 'text-rose-600' : 'text-slate-800'}`}>{plain(v)}</td>)}
      <td className={`${td} font-black px-3 ${total < 0 ? 'text-rose-600' : 'text-slate-900'}`}>{plain(total)}</td>
      <td></td>
    </tr>
  );
  const span = cash.weekKeys.length + 2;

  return (
    <>
      <Hint>Week 1 = 1–7, Week 2 = 8–14 and so on. Client payments, office expenses and vendor payments come from the CRM by date (green, locked). In Edit mode you can add other payments on top, like salary, GST or TDS, in the week they were paid. Each week starts with the previous week's closing balance.</Hint>
      <TableBox>
        <table className="w-full border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className={thLeft}>Particulars</th>
              {cash.weekKeys.map((w, i) => <th key={w} className={th}>Week {i + 1}<span className="block text-[9px] font-semibold normal-case tracking-normal text-slate-400">{range(i)}</span></th>)}
              <th className={`${th} px-3`}>{monthLabel(month).split(' ')[0]} Total</th>
              <th className={`${th} text-left`}>Remarks / Action</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-100 bg-amber-50/50">
              <td className={`${tdLabel} bg-amber-50 font-bold`}>Opening Cash / Bank Balance</td>
              {cash.weeks.map((wk, i) => (
                <td key={wk.w} className={td}>
                  {i === 0
                    ? <AmountInput value={cf.opening} auto={cash.openingAuto} onChange={(v) => update(d => ({ ...d, cashflow: { ...(d.cashflow || {}), opening: v } }))} />
                    : <span className="block px-2 py-1.5 font-semibold text-slate-600">{plain(wk.opening)}</span>}
                </td>
              ))}
              <td className={`${td} font-bold px-3`}>{plain(cash.opening)}</td>
              {remark('opening')}
            </tr>
            <SectionRow label="Cash Inflows" span={span} />
            {CASH_IN.map(([key, label]) => flowRow(key, label, 'in'))}
            {totalRow('Total Cash Inflow', cash.weeks.map(w => w.inflow), cash.inflow)}
            <SectionRow label="Cash Outflows" span={span} />
            {CASH_OUT.map(([key, label]) => flowRow(key, label, 'out'))}
            {totalRow('Total Cash Outflow', cash.weeks.map(w => w.outflow), cash.outflow)}
            <tr><td colSpan={span + 1} className="h-2"></td></tr>
            {totalRow('Net Cash Flow', cash.weeks.map(w => w.net), cash.net, 'bg-indigo-50')}
            {totalRow('Closing Cash / Bank Balance', cash.weeks.map(w => w.closing), cash.closing, 'bg-indigo-100')}
          </tbody>
        </table>
      </TableBox>
      {cash.openingAuto !== null && cf.opening == null && <p className="mt-2 text-[11px] text-slate-500 font-semibold">Opening balance is last month's closing ({money(cash.openingAuto)}). Use Edit to change it if the bank shows otherwise.</p>}
    </>
  );
};

// ============================================================
// 2. P&L BUDGET VS ACTUAL
// ============================================================
const PlTab = ({ model, update }) => {
  const { pl } = model;
  const rev = pl.totalRevenue;
  const setLine = (key, field, value) => update(d => ({ ...d, pl: { ...(d.pl || {}), [key]: { ...(d.pl?.[key] || {}), [field]: value } } }));
  const metrics = (budget, actual, higherIsGood) => {
    const variance = actual - budget;
    return (
      <>
        <td className={`${td} px-3 font-semibold ${varianceClass(variance, higherIsGood)}`}>{plain(variance)}</td>
        <td className={`${td} px-3 ${varianceClass(variance, higherIsGood)}`}>{pct(ratio(variance, budget))}</td>
        <td className={`${td} px-3 text-slate-500`}>{pct(ratio(budget, rev.budget))}</td>
        <td className={`${td} px-3 text-slate-500`}>{pct(ratio(actual, rev.actual))}</td>
        <td className={`${td} px-3 text-center`}><Status good={budget === 0 && actual === 0 ? null : higherIsGood ? actual >= budget : actual <= budget} /></td>
      </>
    );
  };
  const editRow = (l, higherIsGood) => (
    <tr key={l.key} className="border-t border-slate-100 hover:bg-slate-50/60">
      <td className={`${tdLabel} bg-white`}>{l.label}</td>
      <td className={td}><AmountInput value={l.own.budget} auto={l.lockBudget ? l.budget : (l.autoBudget || null)} locked={l.lockBudget} onChange={(v) => setLine(l.key, 'budget', v)} /></td>
      <td className={td}><AmountInput value={l.own.actual} auto={l.lockActual ? l.actual : (l.autoActual || null)} locked={l.lockActual} onChange={(v) => setLine(l.key, 'actual', v)} /></td>
      {metrics(l.budget, l.actual, higherIsGood)}
    </tr>
  );
  const totalRow = (label, t, higherIsGood, tone = 'bg-emerald-50') => (
    <tr className={`${tone} border-t border-slate-200`}>
      <td className={`${tdLabel} ${tone} font-black text-slate-800 py-2`}>{label}</td>
      <td className={`${td} px-3 font-black`}>{plain(t.budget)}</td>
      <td className={`${td} px-3 font-black ${t.actual < 0 ? 'text-rose-600' : ''}`}>{plain(t.actual)}</td>
      {metrics(t.budget, t.actual, higherIsGood)}
    </tr>
  );
  const marginRow = (label, t) => (
    <tr className="bg-amber-50 border-t border-amber-100">
      <td className={`${tdLabel} bg-amber-50 font-bold text-amber-900`}>{label}</td>
      <td className={`${td} px-3 font-bold text-amber-900`}>{pct(ratio(t.budget, rev.budget))}</td>
      <td className={`${td} px-3 font-bold text-amber-900`}>{pct(ratio(t.actual, rev.actual))}</td>
      <td colSpan={5}></td>
    </tr>
  );
  const gap = <tr><td colSpan={8} className="h-2"></td></tr>;

  return (
    <>
      <Hint>Revenue actual comes from this month's invoices (before GST), by the Service chosen on each invoice line. Outsourced work comes from Vendors. Expense lines (budget and actual) come from the Expense Budget tab, so set them there. Green = locked CRM figure. Margin % = share of total revenue.</Hint>
      <TableBox>
        <table className="w-full border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className={thLeft}>Particulars</th>
              <th className={th}>Budget ₹</th><th className={th}>Actual ₹</th><th className={th}>Variance ₹</th><th className={th}>Variance %</th>
              <th className={th}>Budget Margin</th><th className={th}>Actual Margin</th><th className={`${th} text-center`}>Status</th>
            </tr>
          </thead>
          <tbody>
            <SectionRow label="Revenue" span={7} />
            {pl.revenue.map(l => editRow(l, true))}
            {totalRow('Total Revenue', pl.totalRevenue, true)}
            {gap}
            <SectionRow label="Direct / Service Cost" span={7} />
            {pl.direct.map(l => editRow(l, false))}
            {totalRow('Total Direct Cost', pl.totalDirect, false)}
            {gap}
            {totalRow('Gross Profit', pl.grossProfit, true)}
            {marginRow('Gross Margin %', pl.grossProfit)}
            {gap}
            <SectionRow label="Operating Expenses" span={7} />
            {pl.opex.map(l => editRow(l, false))}
            {totalRow('Total Operating', pl.totalOpex, false)}
            {gap}
            {totalRow('EBITDA', pl.ebitda, true)}
            {marginRow('EBITDA Margin %', pl.ebitda)}
            {gap}
            {editRow(pl.depreciation, false)}
            {editRow(pl.financeCost, false)}
            {totalRow('Profit Before Tax (PBT)', pl.pbt, true)}
            {editRow(pl.tax, false)}
            {totalRow('Profit After Tax (PAT)', pl.pat, true, 'bg-indigo-100')}
            {marginRow('Net Profit Margin %', pl.pat)}
          </tbody>
        </table>
      </TableBox>
    </>
  );
};

// ============================================================
// 3. EXPENSE BUDGET VS ACTUAL
// ============================================================
const ExpensesTab = ({ model, update }) => {
  const editing = useContext(EditContext);
  const rows = model.expenseRows;
  const setRow = (index, patch) => update(d => {
    const list = (d.expenses?.length ? d.expenses : defaultExpenses()).map((r, i) => (i === index ? { ...r, ...patch } : r));
    return { ...d, expenses: list };
  });
  const addRow = () => update(d => ({ ...d, expenses: [...(d.expenses?.length ? d.expenses : defaultExpenses()), { key: `custom-${Date.now()}`, head: '', category: 'Other', custom: true, budget: null, actual: null, reason: '', action: '' }] }));
  const removeRow = (index) => update(d => ({ ...d, expenses: (d.expenses?.length ? d.expenses : defaultExpenses()).filter((_, i) => i !== index) }));
  const t = model.expenseTotal;
  const variance = t.actual - t.budget;

  return (
    <>
      <Hint>Actual comes from Office Expense (matched by its Nature) and the Salary module, and is locked. To change it, fix the entry there. Lines you add yourself and Depreciation can be filled here in Edit mode. GREEN = within budget, RED = over budget; write the reason when a line goes RED.</Hint>
      <TableBox>
        <table className="w-full border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className={`${th} text-center w-10`}>#</th>
              <th className={`${thLeft} min-w-[220px]`}>Expense Head</th>
              <th className={`${th} text-left`}>Category</th>
              <th className={th}>Budget ₹</th><th className={th}>Actual ₹</th><th className={th}>Variance ₹</th><th className={th}>Variance %</th>
              <th className={`${th} text-center`}>Status</th>
              <th className={`${th} text-left`}>Reason for Variance</th><th className={`${th} text-left`}>Action Required</th><th className="w-8"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.key} className="border-t border-slate-100 hover:bg-slate-50/60 group">
                <td className="px-2 text-center text-[11px] font-bold text-slate-400">{i + 1}</td>
                <td className={`${tdLabel} bg-white`}>
                  {r.custom
                    ? <TextCell value={r.head} onChange={(v) => setRow(i, { head: v })} placeholder="Expense head" />
                    : r.head}
                </td>
                <td className="px-1.5 py-1">
                  {editing
                    ? <select value={r.category} onChange={(e) => setRow(i, { category: e.target.value })} className="text-xs bg-white border border-indigo-200 rounded-md px-1.5 py-1.5 text-slate-700 outline-none focus:border-indigo-500">
                      {EXPENSE_CATEGORIES.map(cat => <option key={cat}>{cat}</option>)}
                    </select>
                    : <span className="text-xs text-slate-600 px-1.5">{r.category}</span>}
                </td>
                <td className={td}><AmountInput value={r.budget} auto={null} onChange={(v) => setRow(i, { budget: v })} /></td>
                <td className={td}><AmountInput value={r.actual} auto={r.locked ? r.actualValue : r.auto} locked={r.locked} onChange={(v) => setRow(i, { actual: v })} /></td>
                <td className={`${td} px-3 font-semibold ${varianceClass(r.variance, false)}`}>{plain(r.variance)}</td>
                <td className={`${td} px-3 ${varianceClass(r.variance, false)}`}>{pct(r.variancePct)}</td>
                <td className={`${td} px-3 text-center`}><Status good={r.good} /></td>
                <td className="px-1.5 py-1 min-w-[180px]"><TextCell value={r.reason} onChange={(v) => setRow(i, { reason: v })} placeholder={r.good === false ? 'Why over budget?' : ''} warn={r.good === false && !r.reason} /></td>
                <td className="px-1.5 py-1 min-w-[160px]"><TextCell value={r.action} onChange={(v) => setRow(i, { action: v })} /></td>
                <td className="pr-2">{editing && r.custom && <button type="button" onClick={() => removeRow(i)} className="p-1.5 rounded-md text-slate-300 hover:text-rose-600 hover:bg-rose-50" title="Remove line"><Trash2 size={13} /></button>}</td>
              </tr>
            ))}
            <tr className="bg-emerald-50 border-t-2 border-slate-200">
              <td></td>
              <td className={`${tdLabel} bg-emerald-50 font-black text-slate-800 py-2.5`}>TOTAL EXPENSE</td>
              <td></td>
              <td className={`${td} px-3 font-black`}>{plain(t.budget)}</td>
              <td className={`${td} px-3 font-black`}>{plain(t.actual)}</td>
              <td className={`${td} px-3 font-black ${varianceClass(variance, false)}`}>{plain(variance)}</td>
              <td className={`${td} px-3 font-black ${varianceClass(variance, false)}`}>{pct(ratio(variance, t.budget))}</td>
              <td className={`${td} px-3 text-center`}><Status good={t.budget === 0 && t.actual === 0 ? null : t.actual <= t.budget} /></td>
              <td colSpan={3}></td>
            </tr>
          </tbody>
        </table>
      </TableBox>
      {editing && <button type="button" onClick={addRow} className="mt-3 inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl"><Plus size={14} /> Add expense line</button>}
    </>
  );
};

// ============================================================
// 4. BILLING & COLLECTION
// ============================================================
const BillingTab = ({ data, model, crm, update }) => {
  const { target, actual } = model.billing;
  const b = data.billing || {};
  const cb = crm?.billing || {};
  const set = (key, field, value) => update(d => ({ ...d, billing: { ...(d.billing || {}), [key]: { ...(d.billing?.[key] || {}), [field]: value } } }));
  const ROWS = [
    ['billing', 'Current Billing', true, cb.current, 'Invoices raised this month (incl. GST, proforma not counted)'],
    ['collection', 'Collection Received', true, cb.collection, 'Payments received this month (money in hand, TDS not included)'],
    ['opening', 'Opening Receivables', null, cb.opening, 'Unpaid amount of earlier bills at the start of the month'],
    ['closing', 'Closing Receivables', false, cb.closing, 'Unpaid amount at the end of the month (after payments, TDS and discounts)']
  ];
  const effGood = target.efficiency ? actual.efficiency >= target.efficiency : null;

  return (
    <>
      <Hint>Actual comes straight from invoices and their payments, and is locked. Set targets in Edit mode. Opening and closing targets fill themselves (opening = actual opening, closing = opening + billing − collection) unless you type them.</Hint>
      <TableBox>
        <table className="w-full border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className={thLeft}>Revenue / Billing</th>
              <th className={th}>Budget / Target</th><th className={th}>Actual</th><th className={th}>Variance ₹</th><th className={th}>Variance %</th>
              <th className={th}>Achievement %</th><th className={`${th} text-center`}>Status</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map(([key, label, higherIsGood, , help]) => {
              const variance = actual[key] - target[key];
              const autoTarget = key === 'opening' ? actual.opening : key === 'closing' ? target.opening + target.billing - target.collection : null;
              return (
                <tr key={key} className="border-t border-slate-100 hover:bg-slate-50/60">
                  <td className={`${tdLabel} bg-white`}>
                    <span className="font-semibold">{label}</span>
                    <span className="block text-[10px] text-slate-400 whitespace-normal max-w-[260px]">{help}</span>
                  </td>
                  <td className={td}><AmountInput value={b[key]?.target} auto={autoTarget} onChange={(v) => set(key, 'target', v)} /></td>
                  <td className={td}><AmountInput locked auto={actual[key]} /></td>
                  <td className={`${td} px-3 font-semibold ${higherIsGood === null ? 'text-slate-500' : varianceClass(variance, higherIsGood)}`}>{plain(variance)}</td>
                  <td className={`${td} px-3 text-slate-600`}>{pct(ratio(variance, target[key]))}</td>
                  <td className={`${td} px-3 font-bold text-slate-700`}>{pct(ratio(actual[key], target[key]))}</td>
                  <td className={`${td} px-3 text-center`}><Status good={higherIsGood === null || (!target[key] && !actual[key]) ? null : higherIsGood ? actual[key] >= target[key] : actual[key] <= target[key]} /></td>
                </tr>
              );
            })}
            <tr className="bg-indigo-50 border-t-2 border-slate-200">
              <td className={`${tdLabel} bg-indigo-50 font-black text-slate-800 py-2.5`}>Collection Efficiency %</td>
              <td className={td}>
                <div className="flex items-center justify-end">
                  <AmountInput value={b.efficiency?.target} auto={target.efficiency === null ? null : Math.round(target.efficiency)} onChange={(v) => set('efficiency', 'target', v)} className="max-w-[90px]" />
                  <span className="text-xs font-bold text-slate-500 pr-1">%</span>
                </div>
              </td>
              <td className={`${td} px-3 font-black text-slate-800`}>{pct(actual.efficiency)}</td>
              <td className={`${td} px-3 font-semibold ${varianceClass((actual.efficiency ?? 0) - (target.efficiency ?? 0), true)}`}>{actual.efficiency === null || target.efficiency === null ? '—' : `${Math.round(actual.efficiency - target.efficiency)} pts`}</td>
              <td></td>
              <td className={`${td} px-3 font-bold text-slate-700`}>{pct(ratio(actual.efficiency ?? 0, target.efficiency))}</td>
              <td className={`${td} px-3 text-center`}><Status good={effGood} /></td>
            </tr>
          </tbody>
        </table>
      </TableBox>

      <div className="grid sm:grid-cols-3 gap-3 mt-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:col-span-2">
          <p className="text-[11px] font-black uppercase tracking-wider text-slate-500 mb-2">How collection efficiency is worked out</p>
          <div className="flex items-center gap-3 text-sm text-slate-700 font-semibold flex-wrap">
            <span>Collection Efficiency % =</span>
            <span className="inline-flex flex-col items-center text-center">
              <span className="px-2 border-b border-slate-400">Collection Received × 100</span>
              <span className="px-2">Opening Receivables + Current Billing</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-3">This month: {money(actual.collection)} × 100 ÷ ({money(actual.opening)} + {money(actual.billing)}) = <b className="text-slate-800">{pct(actual.efficiency)}</b></p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1.5 text-xs">
          <p className="text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1">Also this month (from CRM)</p>
          <p className="flex justify-between"><span className="text-slate-500">Invoices raised</span><b>{model.billing.invoiceCount}</b></p>
          <p className="flex justify-between"><span className="text-slate-500">TDS deducted by clients</span><b>{money(model.billing.tds)}</b></p>
          <p className="flex justify-between"><span className="text-slate-500">Discount given</span><b>{money(model.billing.discount)}</b></p>
        </div>
      </div>
    </>
  );
};

// ============================================================
// EXCEL (4 sheets ek file me)
// ============================================================
const exportExcel = (month, data, model) => {
  const title = (name) => [[`TaxBucket – ${name} – ${monthLabel(month)}`], []];
  const wb = XLSX.utils.book_new();
  const { cash, pl, expenseRows, expenseTotal, billing } = model;
  const r = (v) => (v === null || v === undefined || !Number.isFinite(v) ? '' : Math.round(v));
  const p = (v) => (v === null || v === undefined || !Number.isFinite(v) ? '' : `${Math.round(v)}%`);

  const cashRows = [...title('Cash Flow & Bank Position'), ['Particulars', ...cash.weekKeys.map((_, i) => `Week ${i + 1}`), 'Month Total', 'Remarks / Action']];
  cashRows.push(['Opening Cash / Bank Balance', ...cash.weeks.map(w => r(w.opening)), r(cash.opening), data.cashflow?.remarks?.opening || '']);
  const flow = (list, side) => list.forEach(([key, label]) => {
    const cells = cash.weekKeys.map((w, i) => cash.cellOf(key, w, i, side).value);
    cashRows.push([label, ...cells.map(r), r(sum(cells)), data.cashflow?.remarks?.[key] || '']);
  });
  cashRows.push(['CASH INFLOWS']); flow(CASH_IN, 'in');
  cashRows.push(['TOTAL CASH INFLOW', ...cash.weeks.map(w => r(w.inflow)), r(cash.inflow)]);
  cashRows.push(['CASH OUTFLOWS']); flow(CASH_OUT, 'out');
  cashRows.push(['TOTAL CASH OUTFLOW', ...cash.weeks.map(w => r(w.outflow)), r(cash.outflow)], []);
  cashRows.push(['NET CASH FLOW', ...cash.weeks.map(w => r(w.net)), r(cash.net)]);
  cashRows.push(['CLOSING CASH / BANK BALANCE', ...cash.weeks.map(w => r(w.closing)), r(cash.closing)]);

  const plRows = [...title('P&L Budget vs Actual'), ['Particulars', 'Budget ₹', 'Actual ₹', 'Variance ₹', 'Variance %', 'Budget Margin', 'Actual Margin %', 'Status']];
  const plLine = (label, budget, actual, higherIsGood) => plRows.push([label, r(budget), r(actual), r(actual - budget), p(ratio(actual - budget, budget)),
    p(ratio(budget, pl.totalRevenue.budget)), p(ratio(actual, pl.totalRevenue.actual)), budget === 0 && actual === 0 ? '' : (higherIsGood ? actual >= budget : actual <= budget) ? 'GREEN' : 'RED']);
  plRows.push(['REVENUE']); pl.revenue.forEach(l => plLine(l.label, l.budget, l.actual, true));
  plLine('TOTAL REVENUE', pl.totalRevenue.budget, pl.totalRevenue.actual, true); plRows.push([]);
  plRows.push(['DIRECT / SERVICE COST']); pl.direct.forEach(l => plLine(l.label, l.budget, l.actual, false));
  plLine('TOTAL DIRECT COST', pl.totalDirect.budget, pl.totalDirect.actual, false); plRows.push([]);
  plLine('GROSS PROFIT', pl.grossProfit.budget, pl.grossProfit.actual, true);
  plRows.push(['Gross Margin %', p(ratio(pl.grossProfit.budget, pl.totalRevenue.budget)), p(ratio(pl.grossProfit.actual, pl.totalRevenue.actual))], []);
  plRows.push(['OPERATING EXPENSES']); pl.opex.forEach(l => plLine(l.label, l.budget, l.actual, false));
  plLine('TOTAL OPERATING', pl.totalOpex.budget, pl.totalOpex.actual, false); plRows.push([]);
  plLine('EBITDA', pl.ebitda.budget, pl.ebitda.actual, true);
  plRows.push(['EBITDA Margin %', p(ratio(pl.ebitda.budget, pl.totalRevenue.budget)), p(ratio(pl.ebitda.actual, pl.totalRevenue.actual))], []);
  plLine('Depreciation', pl.depreciation.budget, pl.depreciation.actual, false);
  plLine('Finance Cost / Interest', pl.financeCost.budget, pl.financeCost.actual, false);
  plLine('PROFIT BEFORE TAX (PBT)', pl.pbt.budget, pl.pbt.actual, true);
  plLine('Tax Provision', pl.tax.budget, pl.tax.actual, false);
  plLine('PROFIT AFTER TAX (PAT)', pl.pat.budget, pl.pat.actual, true);

  const expRows = [...title('Exps. Budget vs Actual'), ['Sr. No.', 'Expense Head', 'Expense Category', 'Budget ₹', 'Actual ₹', 'Variance ₹', 'Variance %', 'Status', 'Reason for Variance', 'Action Required']];
  expenseRows.forEach((e, i) => expRows.push([i + 1, e.head, e.category, r(e.budgetValue), r(e.actualValue), r(e.variance), p(e.variancePct), e.good === null ? '' : e.good ? 'GREEN' : 'RED', e.reason || '', e.action || '']));
  expRows.push(['', 'TOTAL EXPENSE', '', r(expenseTotal.budget), r(expenseTotal.actual), r(expenseTotal.actual - expenseTotal.budget), p(ratio(expenseTotal.actual - expenseTotal.budget, expenseTotal.budget))]);

  const { target, actual } = billing;
  const billRows = [...title('Billing & Collection'), ['Revenue / Billing', 'Budget / Target', 'Actual', 'Variance ₹', 'Variance %', 'Achievement %']];
  [['Current Billing', 'billing'], ['Collection Received', 'collection'], ['Opening Receivables', 'opening'], ['Closing Receivables', 'closing']].forEach(([label, key]) =>
    billRows.push([label, r(target[key]), r(actual[key]), r(actual[key] - target[key]), p(ratio(actual[key] - target[key], target[key])), p(ratio(actual[key], target[key]))]));
  billRows.push(['Collection Efficiency %', p(target.efficiency), p(actual.efficiency)], [], ['Collection Efficiency % = Collection Received × 100 ÷ (Opening Receivables + Current Billing)']);

  [['Cash Flow', cashRows], ['P&L Budget vs Actual', plRows], ['Expense Budget', expRows], ['Billing & Collection', billRows]].forEach(([name, rows]) => {
    const sheet = XLSX.utils.aoa_to_sheet(rows);
    sheet['!cols'] = rows[2].map((_, i) => ({ wch: i === 0 || (name === 'Expense Budget' && i === 1) ? 34 : 15 }));
    XLSX.utils.book_append_sheet(wb, sheet, name);
  });
  XLSX.writeFile(wb, `TaxBucket-MIS-${month}.xlsx`);
};

// ============================================================
// CARD + POPUP
// ============================================================
const TABS = [['cash', 'Cash Flow & Bank'], ['pl', 'P&L Budget vs Actual'], ['expenses', 'Expense Budget'], ['billing', 'Billing & Collection']];

const Kpi = ({ icon: Icon, label, value, sub, tone }) => (
  <div className="bg-white rounded-2xl border border-slate-200 px-4 py-3 min-w-0">
    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5"><Icon size={12} className={tone} /> {label}</p>
    <p className="text-lg font-black text-slate-900 mt-0.5 truncate tabular-nums">{value}</p>
    {sub && <p className="text-[11px] text-slate-500 truncate">{sub}</p>}
  </div>
);

const kpis = (model) => {
  const { pl, expenseTotal, billing, cash } = model;
  const revGap = pl.totalRevenue.budget ? ratio(pl.totalRevenue.actual, pl.totalRevenue.budget) : null;
  return [
    { icon: TrendingUp, label: 'Revenue', value: money(pl.totalRevenue.actual), sub: revGap === null ? 'No budget set' : `${pct(revGap)} of budget ${money(pl.totalRevenue.budget)}`, tone: 'text-indigo-500' },
    { icon: Receipt, label: 'Expenses', value: money(expenseTotal.actual), sub: expenseTotal.budget ? `Budget ${money(expenseTotal.budget)}` : 'No budget set', tone: 'text-amber-500' },
    { icon: BarChart3, label: 'Profit (PBT)', value: money(pl.pbt.actual), sub: pl.totalRevenue.actual ? `${pct(ratio(pl.pbt.actual, pl.totalRevenue.actual))} margin` : '—', tone: pl.pbt.actual < 0 ? 'text-rose-500' : 'text-emerald-500' },
    { icon: Percent, label: 'Collection Eff.', value: pct(billing.actual.efficiency), sub: `${money(billing.actual.collection)} collected`, tone: 'text-sky-500' },
    { icon: Landmark, label: 'Closing Bank', value: money(cash.closing), sub: `Net ${money(cash.net)} this month`, tone: 'text-violet-500' }
  ];
};

const BusinessMisPanel = () => {
  const { user } = useContext(AuthContext);
  const api = useMemo(() => axios.create({ baseURL: `${import.meta.env.VITE_API_URL}/business-mis`, headers: { Authorization: `Bearer ${user.token}` } }), [user.token]);

  const [month, setMonth] = useState(istToday().slice(0, 7));
  const [payload, setPayload] = useState(null);   // { data, crm, previous, savedAt, savedBy }
  const [data, setData] = useState({});
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('cash');
  const [saveState, setSaveState] = useState('saved'); // saved | dirty | saving | error
  // 🔴 Normal me sab sirf dekhne ke liye; "Edit" dabane par hi budget / target / remark badalte hain (galti se badlav na ho)
  const [editing, setEditing] = useState(false);
  const dirtyRef = useRef(false);
  const dataRef = useRef({});
  const saveTimer = useRef(null);

  const load = useCallback(async (m) => {
    setPayload(null);
    try {
      const res = await api.get('/', { params: { month: m } });
      setPayload(res.data);
      setData(res.data.data || {});
      dataRef.current = res.data.data || {};
      dirtyRef.current = false;
      setSaveState('saved');
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, [api]);
  useEffect(() => { load(month); }, [load, month]);

  const model = useMemo(() => (payload ? computeMis(month, data, payload.crm, payload.previous) : null), [payload, data, month]);

  // Badlav ke 1 second baad apne aap save
  const saveNow = useCallback(async () => {
    clearTimeout(saveTimer.current);
    if (!dirtyRef.current || !payload) return;
    dirtyRef.current = false;
    setSaveState('saving');
    try {
      const current = dataRef.current;
      const closingCash = computeMis(month, current, payload.crm, payload.previous).cash.closing;
      const res = await api.put(`/${month}`, { data: current, closingCash });
      setPayload(prev => (prev ? { ...prev, savedAt: res.data.savedAt, savedBy: res.data.savedBy } : prev));
      setSaveState(dirtyRef.current ? 'dirty' : 'saved');
    } catch (error) {
      dirtyRef.current = true;
      setSaveState('error');
      toast.error(error.response?.data?.message || 'Could not save. Check the connection and try again.');
    }
  }, [api, month, payload]);

  const update = useCallback((fn) => {
    setData(prev => {
      const next = fn(prev);
      dataRef.current = next;
      return next;
    });
    dirtyRef.current = true;
    setSaveState('dirty');
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => { saveNow(); }, 1000);
  }, [saveNow]);

  useEffect(() => () => clearTimeout(saveTimer.current), []);

  const changeMonth = async (next) => { await saveNow(); setMonth(next); };
  const close = async () => { await saveNow(); setEditing(false); setOpen(false); };
  const finishEditing = async () => { await saveNow(); setEditing(false); };

  // Pichhle mahine ka budget / target copy (actual nahi)
  const copyBudgets = () => {
    const prev = payload?.previous?.data;
    if (!prev) return toast.error('Nothing saved for last month yet');
    const hasBudget = Object.values(data.pl || {}).some(l => l?.budget != null) || (data.expenses || []).some(e => e.budget != null) || Object.values(data.billing || {}).some(l => l?.target != null);
    if (hasBudget && !window.confirm('Replace this month\'s budgets and targets with last month\'s?')) return;
    update(d => {
      const pl = { ...(d.pl || {}) };
      Object.entries(prev.pl || {}).forEach(([key, l]) => { pl[key] = { ...(pl[key] || {}), budget: l?.budget ?? null }; });
      const billing = { ...(d.billing || {}) };
      Object.entries(prev.billing || {}).forEach(([key, l]) => { billing[key] = { ...(billing[key] || {}), target: l?.target ?? null }; });
      const mine = d.expenses?.length ? d.expenses : defaultExpenses();
      const fromPrev = prev.expenses || [];
      const expenses = mine.map(e => ({ ...e, budget: fromPrev.find(p => p.key === e.key)?.budget ?? e.budget }));
      fromPrev.filter(p => p.custom && !expenses.some(e => e.key === p.key)).forEach(p => expenses.push({ ...p, actual: null, reason: '', action: '' }));
      return { ...d, pl, billing, expenses };
    });
    toast.success(`Budgets copied from ${monthLabel(payload.previous.month)}`);
  };

  const cards = model ? kpis(model) : [];
  const isCurrent = month === istToday().slice(0, 7);
  const saveBadge = {
    saved: <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600"><CheckCircle2 size={12} /> {payload?.savedAt ? `Saved ${formatIstDateTime(payload.savedAt)}` : 'Nothing saved yet'}</span>,
    dirty: <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600"><Loader2 size={12} className="animate-spin" /> Unsaved changes…</span>,
    saving: <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600"><Loader2 size={12} className="animate-spin" /> Saving…</span>,
    error: <button type="button" onClick={() => { dirtyRef.current = true; saveNow(); }} className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:underline"><CloudOff size={12} /> Not saved. Retry</button>
  }[saveState];

  return (
    <>
      {/* CEO DASHBOARD PAR CARD */}
      <div onClick={() => setOpen(true)} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setOpen(true)}
        className="bg-white rounded-3xl border border-slate-200 shadow-sm px-5 py-4 cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <div className="flex items-center gap-3 mr-auto">
            <span className="h-10 w-10 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center"><BarChart3 size={18} /></span>
            <div>
              <p className="text-sm font-black text-slate-800">Business MIS · {monthLabel(month)}</p>
              <p className="text-[11px] text-slate-400">Cash flow, P&L, expense budget, billing & collection · click to open</p>
            </div>
          </div>
          {failed ? (
            <p className="text-xs font-semibold text-rose-600">Could not load. Check that the server is restarted.</p>
          ) : !model ? (
            <Loader2 size={16} className="animate-spin text-slate-400" />
          ) : cards.slice(0, 4).map(k => (
            <div key={k.label} className="min-w-[110px]">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1"><k.icon size={11} className={k.tone} /> {k.label}</p>
              <p className="text-sm font-black text-slate-800 tabular-nums">{k.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* POORA PANEL */}
      {open && (
        <div className="fixed inset-0 z-[60] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4" onClick={close}>
          <div className="bg-slate-50 rounded-3xl shadow-2xl w-full max-w-7xl h-[94vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-4 sm:px-5 pt-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="h-10 w-10 rounded-2xl bg-violet-600 text-white flex items-center justify-center shrink-0"><BarChart3 size={18} /></span>
                  <div className="min-w-0">
                    <h2 className="text-base font-black text-slate-800 truncate">Business MIS</h2>
                    <div className="flex items-center gap-2">{saveBadge}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Mahina */}
                  <div className="flex items-center bg-slate-100 rounded-xl p-1">
                    <button type="button" onClick={() => changeMonth(shiftMonth(month, -1))} className="p-1.5 rounded-lg text-slate-500 hover:bg-white hover:text-slate-800" title="Previous month"><ChevronLeft size={16} /></button>
                    <input type="month" value={month} onChange={(e) => e.target.value && changeMonth(e.target.value)} className="bg-transparent text-sm font-bold text-slate-800 px-1 outline-none w-[140px]" />
                    <button type="button" onClick={() => changeMonth(shiftMonth(month, 1))} className="p-1.5 rounded-lg text-slate-500 hover:bg-white hover:text-slate-800" title="Next month"><ChevronRight size={16} /></button>
                  </div>
                  {!isCurrent && <button type="button" onClick={() => changeMonth(istToday().slice(0, 7))} className="text-[11px] font-bold text-indigo-600 hover:underline">This month</button>}
                  {editing ? (
                    <button type="button" onClick={finishEditing} className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl"><Check size={14} /> Done</button>
                  ) : (
                    <button type="button" onClick={() => setEditing(true)} disabled={!model} className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 rounded-xl disabled:opacity-50"><Pencil size={13} /> Edit</button>
                  )}
                  {editing && <button type="button" onClick={copyBudgets} disabled={!payload} className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl disabled:opacity-50" title="Copy budgets and targets from last month"><Copy size={13} /> <span className="hidden md:inline">Copy last month's budget</span></button>}
                  <button type="button" onClick={() => model && exportExcel(month, data, model)} disabled={!model} className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl disabled:opacity-50"><Download size={13} /> Excel</button>
                  <button type="button" onClick={close} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700" title="Close"><X size={18} /></button>
                </div>
              </div>
              <div className="flex gap-1 mt-3 overflow-x-auto">
                {TABS.map(([value, label]) => (
                  <button key={value} type="button" onClick={() => setTab(value)}
                    className={`text-xs font-bold px-3 py-2 border-b-2 whitespace-nowrap transition-colors ${tab === value ? 'border-violet-600 text-violet-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>{label}</button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 sm:p-5">
              {!model ? (
                <div className="py-20 flex flex-col items-center gap-2 text-slate-400">
                  {failed ? <p className="text-xs font-semibold text-rose-600">Could not load. Restart the backend server and try again.</p> : <Loader2 className="animate-spin" />}
                </div>
              ) : (
                <>
                  {/* Mahine ki jhalak */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5 mb-4">
                    {cards.map(k => <Kpi key={k.label} {...k} />)}
                  </div>
                  <div className="flex items-center gap-3 mb-3 text-[11px] text-slate-500">
                    <span className="inline-flex items-center gap-1.5"><span className="h-3 w-5 rounded bg-emerald-50 border border-emerald-200"></span> <Lock size={10} className="text-emerald-600" /> Real figure from CRM (locked)</span>
                    {editing
                      ? <span className="inline-flex items-center gap-1.5 font-bold text-indigo-700"><span className="h-3 w-5 rounded bg-white border border-indigo-300"></span> Editing: budget, target and remarks. Press Done when finished.</span>
                      : <span className="inline-flex items-center gap-1.5"><Pencil size={11} /> Press Edit to change budgets, targets and remarks</span>}
                  </div>
                  <EditContext.Provider value={editing}>
                  {tab === 'cash' && <CashFlowTab month={month} data={data} model={model} update={update} />}
                  {tab === 'pl' && <PlTab model={model} update={update} />}
                  {tab === 'expenses' && <ExpensesTab model={model} update={update} />}
                  {tab === 'billing' && <BillingTab data={data} model={model} crm={payload.crm} update={update} />}
                  </EditContext.Provider>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BusinessMisPanel;
