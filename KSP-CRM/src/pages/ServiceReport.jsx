import React, { useState, useEffect, useContext, useMemo } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { AuthContext } from '../context/AuthContext';
import { istToday, formatIstDate } from '../utils/time';
import {
  FileBarChart, Loader2, Download, X, CheckCircle2, UserPlus, IndianRupee, Clock, CalendarDays, CalendarRange, ChevronRight
} from 'lucide-react';

// 🔴 SERVICE REPORT (Executive): saari services ka mahine-war hisaab ek jagah.
// Mahina view = ek mahine me har service ka kaam; Saal view = April se March tak har mahina. Kisi bhi number par click = list.

const KINDS = {
  done: { label: 'Work done', short: 'Done', hint: 'Returns / forms filed in the month (by filing date)', icon: CheckCircle2, tone: 'text-emerald-600' },
  added: { label: 'New added', short: 'New', hint: 'New records / clients added in the month', icon: UserPlus, tone: 'text-sky-600' },
  revenue: { label: 'Revenue billed', short: 'Revenue', hint: 'Invoice amount before GST, by the Service on each invoice line', icon: IndianRupee, tone: 'text-violet-600' },
  pending: { label: 'Pending', short: 'Pending', hint: 'Work that was due in the month and is still not done (ITR: added in the month and not filed; GST: return of the previous month\'s period)', icon: Clock, tone: 'text-amber-600' }
};
const GROUP_TONE = { 'Returns & Audits': 'bg-indigo-50 text-indigo-800', Registrations: 'bg-emerald-50 text-emerald-800', 'Other Billing': 'bg-violet-50 text-violet-800' };

const currentFy = () => {
  const [y, m] = istToday().split('-').map(Number);
  const start = m >= 4 ? y : y - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, '0')}`;
};
const fyOptions = () => {
  const start = Number(currentFy().slice(0, 4));
  return [start + 1, start, start - 1, start - 2, start - 3].map(y => `${y}-${String((y + 1) % 100).padStart(2, '0')}`);
};
const monthShort = (month) => new Date(`${month}-01T12:00:00+05:30`).toLocaleDateString('en-IN', { month: 'short', timeZone: 'Asia/Kolkata' });
const monthLong = (month) => new Date(`${month}-01T12:00:00+05:30`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });
const money = (v) => `₹${Math.round(v || 0).toLocaleString('en-IN')}`;
const show = (kind, v) => (kind === 'revenue' || kind === 'doneFee' ? (v ? money(v) : '—') : (v || '—'));

const ServiceReport = () => {
  const { user } = useContext(AuthContext);
  const headers = useMemo(() => ({ Authorization: `Bearer ${user.token}` }), [user.token]);
  const api = `${import.meta.env.VITE_API_URL}/service-report`;

  const [fy, setFy] = useState(currentFy());
  const [view, setView] = useState('month');          // month | year
  const [month, setMonth] = useState(istToday().slice(0, 7));
  const [metric, setMetric] = useState('done');        // year view ka number
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hideEmpty, setHideEmpty] = useState(true);
  const [details, setDetails] = useState(null);        // { title, line, month, kind, items, loading }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    axios.get(api, { headers, params: { fy } })
      .then(res => {
        if (cancelled) return;
        setReport(res.data);
        // FY badla aur chuna hua mahina us FY me nahi: FY ka sabse naya (aaj tak ka) mahina
        if (!res.data.months.includes(month)) {
          const today = istToday().slice(0, 7);
          setMonth(res.data.months.filter(m => m <= today).pop() || res.data.months[0]);
        }
      })
      .catch(error => { if (!cancelled) toast.error(error.response?.data?.message || 'Could not load the report'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, headers, fy]);

  const openDetails = async (line, kind, forMonth) => {
    const title = `${line.label} · ${KINDS[kind].label} · ${forMonth ? monthLong(forMonth) : `FY ${fy}`}`;
    setDetails({ title, kind, items: [], loading: true });
    try {
      const res = await axios.get(`${api}/details`, { headers, params: { fy, line: line.key, month: forMonth || '', kind } });
      setDetails({ title, kind, items: res.data.items, loading: false });
    } catch (error) {
      setDetails(null);
      toast.error(error.response?.data?.message || 'Could not load the list');
    }
  };

  const cell = (line, m) => line.months[m] || { added: 0, done: 0, doneFee: 0, revenue: 0, pending: 0 };
  const lines = useMemo(() => report?.lines || [], [report]);
  const months = report?.months || [];
  const sumOf = (line, field, list = months) => list.reduce((s, m) => s + (cell(line, m)[field] || 0), 0);
  const isEmpty = (line, list) => !sumOf(line, 'added', list) && !sumOf(line, 'done', list) && !sumOf(line, 'revenue', list) && !sumOf(line, 'pending', list);

  const monthTotals = useMemo(() => {
    const t = { done: 0, added: 0, revenue: 0, pending: 0 };
    lines.forEach(l => { const c = l.months[month] || {}; t.done += c.done || 0; t.added += c.added || 0; t.revenue += c.revenue || 0; t.pending += c.pending || 0; });
    return t;
  }, [lines, month]);

  const groups = [...new Set(lines.map(l => l.group))];
  const visible = (line) => !hideEmpty || !isEmpty(line, view === 'month' ? [month] : months);

  // Year view me rang ki gaadhapan (sabse bada number = sabse gaadha)
  const maxCell = Math.max(1, ...lines.flatMap(l => months.map(m => cell(l, m)[metric] || 0)));
  const heat = (v) => {
    if (!v) return '';
    const level = Math.ceil((v / maxCell) * 4);
    return ['', 'bg-indigo-50', 'bg-indigo-100', 'bg-indigo-200', 'bg-indigo-300'][level];
  };

  const exportExcel = () => {
    if (!report) return;
    const wb = XLSX.utils.book_new();
    const monthRows = [[`TaxBucket – Service Report – ${monthLong(month)}`], [], ['Group', 'Service', 'New added', 'Work done', 'Fee of work done', 'Revenue billed (before GST)', 'Pending (due in month)']];
    lines.forEach(l => { const c = cell(l, month); monthRows.push([l.group, l.label, c.added, c.done, Math.round(c.doneFee), Math.round(c.revenue), c.pending]); });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(monthRows), monthShort(month));
    Object.entries(KINDS).forEach(([kind, info]) => {
      const rows = [[`TaxBucket – ${info.label} – FY ${fy}`], [], ['Group', 'Service', ...months.map(monthShort), 'Total']];
      lines.forEach(l => rows.push([l.group, l.label, ...months.map(m => Math.round(cell(l, m)[kind] || 0)), Math.round(sumOf(l, kind))]));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), info.short);
    });
    XLSX.writeFile(wb, `TaxBucket-Service-Report-${fy}.xlsx`);
  };

  const exportDetails = () => {
    const rows = [[details.title], [], ['Date', 'Client', 'Work', 'Status', 'Amount']];
    details.items.forEach(i => rows.push([i.date, i.name, i.detail, i.status || '', i.amount ? Math.round(i.amount) : '']));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'List');
    XLSX.writeFile(wb, 'TaxBucket-Service-Report-List.xlsx');
  };

  const Count = ({ line, kind, value, forMonth, strong }) => (value
    ? <button type="button" onClick={() => openDetails(line, kind, forMonth)} className={`tabular-nums hover:underline hover:text-indigo-700 ${strong ? 'font-black text-slate-900' : 'font-semibold text-slate-700'}`} title="Click to see the list">{show(kind, value)}</button>
    : <span className="text-slate-300">—</span>);

  const tiles = [
    { label: 'Work done', value: monthTotals.done, icon: CheckCircle2, tone: 'bg-emerald-50 text-emerald-600', sub: `Filed in ${monthShort(month)}` },
    { label: 'New added', value: monthTotals.added, icon: UserPlus, tone: 'bg-sky-50 text-sky-600', sub: 'Clients / records added' },
    { label: 'Revenue billed', value: money(monthTotals.revenue), icon: IndianRupee, tone: 'bg-violet-50 text-violet-600', sub: 'Invoices, before GST' },
    { label: 'Pending', value: monthTotals.pending, icon: Clock, tone: 'bg-amber-50 text-amber-600', sub: `Due in ${monthShort(month)}, not done yet` }
  ];

  return (
    <div className="space-y-5 max-w-[1500px] mx-auto">
      {/* Header */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="h-11 w-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0"><FileBarChart size={20} /></span>
          <div>
            <h1 className="text-xl font-black text-slate-800">Service Report</h1>
            <p className="text-xs text-slate-500">Month-wise work for every service in one place: filed, new, pending and billed.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            {[['month', 'Month', CalendarDays], ['year', 'Full Year', CalendarRange]].map(([value, label, Icon]) => (
              <button key={value} type="button" onClick={() => setView(value)} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${view === value ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><Icon size={13} /> {label}</button>
            ))}
          </div>
          <select value={fy} onChange={(e) => setFy(e.target.value)} className="px-3 py-2 text-xs font-bold bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-400">
            {fyOptions().map(f => <option key={f} value={f}>FY {f}</option>)}
          </select>
          {view === 'month' && (
            <select value={month} onChange={(e) => setMonth(e.target.value)} className="px-3 py-2 text-xs font-bold bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-400">
              {months.map(m => <option key={m} value={m}>{monthLong(m)}</option>)}
            </select>
          )}
          <button type="button" onClick={exportExcel} disabled={!report} className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl disabled:opacity-50"><Download size={13} /> Excel</button>
        </div>
      </div>

      {loading && !report ? (
        <div className="py-24 flex justify-center"><Loader2 className="animate-spin text-slate-400" /></div>
      ) : (
        <>
          {view === 'month' && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {tiles.map(t => (
                <div key={t.label} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">{t.label}</p>
                    <p className="text-2xl font-black text-slate-900 mt-1 tabular-nums truncate">{t.value}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{t.sub}</p>
                  </div>
                  <span className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${t.tone}`}><t.icon size={17} /></span>
                </div>
              ))}
            </div>
          )}

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-black text-slate-800">{view === 'month' ? `${monthLong(month)} · all services` : `FY ${fy} · ${KINDS[metric].label} by month`}</p>
                <p className="text-[11px] text-slate-400">{view === 'month' ? 'Click any number to see the clients behind it.' : KINDS[metric].hint}</p>
              </div>
              <div className="flex items-center gap-3">
                {view === 'year' && (
                  <div className="flex bg-slate-100 p-1 rounded-xl">
                    {Object.entries(KINDS).map(([key, info]) => (
                      <button key={key} type="button" onClick={() => setMetric(key)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${metric === key ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{info.label}</button>
                    ))}
                  </div>
                )}
                <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 cursor-pointer select-none">
                  <input type="checkbox" checked={hideEmpty} onChange={(e) => setHideEmpty(e.target.checked)} className="accent-indigo-600" /> Hide empty rows
                </label>
              </div>
            </div>

            <div className="overflow-x-auto custom-scrollbar">
              {view === 'month' ? (
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-5 py-3 text-left">Service</th>
                      <th className="px-4 py-3 text-right" title={KINDS.added.hint}>New added</th>
                      <th className="px-4 py-3 text-right" title={KINDS.done.hint}>Work done</th>
                      <th className="px-4 py-3 text-right">Fee of work done</th>
                      <th className="px-4 py-3 text-right" title={KINDS.revenue.hint}>Revenue billed</th>
                      <th className="px-5 py-3 text-right" title={KINDS.pending.hint}>Pending</th>
                    </tr>
                  </thead>
                  {groups.map(group => {
                    const rows = lines.filter(l => l.group === group && visible(l));
                    if (!rows.length) return null;
                    return (
                      <tbody key={group}>
                        <tr><td colSpan={6} className={`px-5 py-2 text-[11px] font-black uppercase tracking-wider ${GROUP_TONE[group]}`}>{group}</td></tr>
                        {rows.map(l => {
                          const c = cell(l, month);
                          return (
                            <tr key={l.key} className="border-t border-slate-100 hover:bg-slate-50/70">
                              <td className="px-5 py-2.5 font-semibold text-slate-700">{l.label}</td>
                              <td className="px-4 py-2.5 text-right"><Count line={l} kind="added" value={c.added} forMonth={month} /></td>
                              <td className="px-4 py-2.5 text-right"><Count line={l} kind="done" value={c.done} forMonth={month} strong /></td>
                              <td className="px-4 py-2.5 text-right text-slate-600 tabular-nums">{c.doneFee ? money(c.doneFee) : <span className="text-slate-300">—</span>}</td>
                              <td className="px-4 py-2.5 text-right"><Count line={l} kind="revenue" value={c.revenue} forMonth={month} /></td>
                              <td className="px-5 py-2.5 text-right">
                                {c.pending
                                  ? <button type="button" onClick={() => openDetails(l, 'pending', month)} title="Click to see the list" className="inline-flex min-w-[28px] justify-center px-2 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-800 hover:bg-amber-200">{c.pending}</button>
                                  : <span className="text-slate-300">—</span>}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    );
                  })}
                  <tfoot>
                    <tr className="border-t-2 border-slate-200 bg-slate-50 font-black text-slate-900">
                      <td className="px-5 py-3">Total</td>
                      <td className="px-4 py-3 text-right tabular-nums">{monthTotals.added || '—'}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{monthTotals.done || '—'}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{money(lines.reduce((s, l) => s + cell(l, month).doneFee, 0))}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{money(monthTotals.revenue)}</td>
                      <td className="px-5 py-3 text-right tabular-nums">{monthTotals.pending || '—'}</td>
                    </tr>
                  </tfoot>
                </table>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-5 py-3 text-left sticky left-0 bg-slate-50 z-10 min-w-[190px]">Service</th>
                      {months.map(m => <th key={m} className="px-3 py-3 text-right whitespace-nowrap">{monthShort(m)}<span className="block text-[9px] font-semibold text-slate-400">{m.slice(0, 4)}</span></th>)}
                      <th className="px-5 py-3 text-right">Total</th>
                    </tr>
                  </thead>
                  {groups.map(group => {
                    const rows = lines.filter(l => l.group === group && visible(l));
                    if (!rows.length) return null;
                    return (
                      <tbody key={group}>
                        <tr><td colSpan={months.length + 2} className={`px-5 py-2 text-[11px] font-black uppercase tracking-wider sticky left-0 ${GROUP_TONE[group]}`}>{group}</td></tr>
                        {rows.map(l => (
                          <tr key={l.key} className="border-t border-slate-100">
                            <td className="px-5 py-2.5 font-semibold text-slate-700 sticky left-0 bg-white z-10 whitespace-nowrap">{l.label}</td>
                            {months.map(m => {
                              const v = cell(l, m)[metric] || 0;
                              return <td key={m} className={`px-3 py-2.5 text-right whitespace-nowrap ${heat(v)}`}><Count line={l} kind={metric} value={v} forMonth={m} /></td>;
                            })}
                            <td className="px-5 py-2.5 text-right whitespace-nowrap"><Count line={l} kind={metric} value={sumOf(l, metric)} strong /></td>
                          </tr>
                        ))}
                      </tbody>
                    );
                  })}
                  <tfoot>
                    <tr className="border-t-2 border-slate-200 bg-slate-50 font-black text-slate-900">
                      <td className="px-5 py-3 sticky left-0 bg-slate-50 z-10">Total</td>
                      {months.map(m => <td key={m} className="px-3 py-3 text-right tabular-nums whitespace-nowrap">{show(metric, lines.reduce((s, l) => s + (cell(l, m)[metric] || 0), 0))}</td>)}
                      <td className="px-5 py-3 text-right tabular-nums whitespace-nowrap">{show(metric, lines.reduce((s, l) => s + sumOf(l, metric), 0))}</td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-4 grid md:grid-cols-2 xl:grid-cols-4 gap-3 text-[11px] text-slate-500">
            {Object.entries(KINDS).map(([key, info]) => (
              <p key={key} className="flex items-start gap-2"><info.icon size={14} className={`${info.tone} shrink-0 mt-px`} /> <span><b className="text-slate-700">{info.label}:</b> {info.hint}.</span></p>
            ))}
          </div>
        </>
      )}

      {/* LIST (kisi number par click) */}
      {details && (
        <div className="fixed inset-0 z-[70] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-3" onClick={() => setDetails(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[88vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-black text-slate-800 truncate">{details.title}</p>
                <p className="text-[11px] text-slate-400">{details.loading ? 'Loading…' : `${details.items.length} ${details.items.length === 1 ? 'entry' : 'entries'}`}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button type="button" onClick={exportDetails} disabled={details.loading || !details.items.length} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg disabled:opacity-50"><Download size={13} /> Excel</button>
                <button type="button" onClick={() => setDetails(null)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={17} /></button>
              </div>
            </div>
            <div className="overflow-y-auto custom-scrollbar">
              {details.loading ? (
                <div className="py-14 flex justify-center"><Loader2 className="animate-spin text-slate-400" /></div>
              ) : details.items.length === 0 ? (
                <p className="py-14 text-center text-sm font-semibold text-slate-400">Nothing in this period.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500 sticky top-0">
                    <tr><th className="px-5 py-2.5 text-left">Date</th><th className="px-3 py-2.5 text-left">Client</th><th className="px-3 py-2.5 text-left">Work</th><th className="px-3 py-2.5 text-left">Status</th><th className="px-5 py-2.5 text-right">Amount</th></tr>
                  </thead>
                  <tbody>
                    {details.items.map((item, i) => (
                      <tr key={i} className="border-t border-slate-100 hover:bg-slate-50/70">
                        <td className="px-5 py-2.5 whitespace-nowrap text-slate-600">{formatIstDate(`${item.date}T12:00:00+05:30`, { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                        <td className="px-3 py-2.5 font-bold text-slate-800">{item.name}</td>
                        <td className="px-3 py-2.5 text-slate-600"><span className="inline-flex items-center gap-1"><ChevronRight size={12} className="text-slate-300" />{item.detail}</span></td>
                        <td className="px-3 py-2.5">{item.status ? <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full whitespace-nowrap">{item.status}</span> : <span className="text-slate-300">—</span>}</td>
                        <td className="px-5 py-2.5 text-right tabular-nums text-slate-700">{item.amount ? <>{money(item.amount)}{item.amountLabel && <span className="block text-[9px] text-slate-400">{item.amountLabel}</span>}</> : <span className="text-slate-300">—</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceReport;
