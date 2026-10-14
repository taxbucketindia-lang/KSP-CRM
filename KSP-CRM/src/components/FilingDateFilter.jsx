import React from 'react';
import { CalendarDays, X } from 'lucide-react';

// 🔴 DATE OF FILING FILTER: Day / Month / Year / Financial Year / Custom. Returns pages (ITR, GST, ROC, TDS) me.
// value = { mode, day, month, year, fy, from, to }  ->  filingRange(value) = { filedFrom, filedTo } (server ke liye)

const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
const pad = (n) => String(n).padStart(2, '0');
const lastDay = (year, month) => new Date(Date.UTC(year, month, 0)).getUTCDate();

// Abhi chal raha financial year (April se March)
const currentFyStart = () => { const [y, m] = today().split('-').map(Number); return m >= 4 ? y : y - 1; };

export const filingRange = (value = {}) => {
  const t = today();
  switch (value.mode) {
    case 'today': return { filedFrom: t, filedTo: t };
    case 'day': return value.day ? { filedFrom: value.day, filedTo: value.day } : {};
    case 'month': {
      if (!/^\d{4}-\d{2}$/.test(value.month || '')) return {};
      const [y, m] = value.month.split('-').map(Number);
      return { filedFrom: `${value.month}-01`, filedTo: `${value.month}-${pad(lastDay(y, m))}` };
    }
    case 'year': return /^\d{4}$/.test(String(value.year || '')) ? { filedFrom: `${value.year}-01-01`, filedTo: `${value.year}-12-31` } : {};
    case 'fy': {
      const start = Number(value.fy || currentFyStart());
      return { filedFrom: `${start}-04-01`, filedTo: `${start + 1}-03-31` };
    }
    case 'custom': {
      const out = {};
      if (value.from) out.filedFrom = value.from;
      if (value.to) out.filedTo = value.to;
      return out;
    }
    default: return {};
  }
};

export const isFilingFilterActive = (value) => Object.keys(filingRange(value)).length > 0;

const FilingDateFilter = ({ value = { mode: 'all' }, onChange, className = '' }) => {
  const set = (changes) => onChange({ ...value, ...changes });
  const nowYear = Number(today().slice(0, 4));
  const years = Array.from({ length: 8 }, (_, i) => nowYear - i);
  const fyStart = currentFyStart();
  const fys = Array.from({ length: 6 }, (_, i) => fyStart - i);
  const active = isFilingFilterActive(value);
  const inputClass = 'text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-blue-500/20';

  // Mode badalte hi us mode ki sahi default value
  const changeMode = (mode) => {
    const t = today();
    if (mode === 'day') return onChange({ mode, day: value.day || t });
    if (mode === 'month') return onChange({ mode, month: value.month || t.slice(0, 7) });
    if (mode === 'year') return onChange({ mode, year: value.year || String(nowYear) });
    if (mode === 'fy') return onChange({ mode, fy: value.fy || String(fyStart) });
    if (mode === 'custom') return onChange({ mode, from: value.from || `${t.slice(0, 7)}-01`, to: value.to || t });
    return onChange({ mode });
  };

  return (
    <div className={`flex flex-wrap items-center gap-1.5 border rounded-xl px-2.5 py-1.5 ${active ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-white'} ${className}`}>
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1 shrink-0"><CalendarDays size={12} /> Date of Filing</span>
      <select value={value.mode || 'all'} onChange={(e) => changeMode(e.target.value)} className={`${inputClass} ${active ? 'text-blue-700' : ''}`}>
        <option value="all">All Dates</option>
        <option value="today">Today</option>
        <option value="day">Day</option>
        <option value="month">Month</option>
        <option value="year">Year</option>
        <option value="fy">Financial Year</option>
        <option value="custom">Custom Range</option>
      </select>

      {value.mode === 'day' && <input type="date" value={value.day || ''} max={today()} onChange={(e) => set({ day: e.target.value })} className={inputClass} />}
      {value.mode === 'month' && <input type="month" value={value.month || ''} max={today().slice(0, 7)} onChange={(e) => set({ month: e.target.value })} className={inputClass} />}
      {value.mode === 'year' && (
        <select value={value.year || ''} onChange={(e) => set({ year: e.target.value })} className={inputClass}>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      )}
      {value.mode === 'fy' && (
        <select value={value.fy || ''} onChange={(e) => set({ fy: e.target.value })} className={inputClass}>
          {fys.map(y => <option key={y} value={y}>FY {y}-{String(y + 1).slice(2)}</option>)}
        </select>
      )}
      {value.mode === 'custom' && (
        <>
          <input type="date" value={value.from || ''} max={value.to || today()} onChange={(e) => set({ from: e.target.value })} className={inputClass} />
          <span className="text-[10px] font-bold text-slate-400">to</span>
          <input type="date" value={value.to || ''} min={value.from || undefined} max={today()} onChange={(e) => set({ to: e.target.value })} className={inputClass} />
        </>
      )}
      {active && <button type="button" onClick={() => onChange({ mode: 'all' })} className="p-1 rounded text-rose-500 hover:bg-rose-50" title="Clear date filter"><X size={13} /></button>}
    </div>
  );
};

export default FilingDateFilter;
