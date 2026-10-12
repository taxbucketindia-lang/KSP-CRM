import React from 'react';
import { Plus, Trash2, AlertCircle, CalendarClock } from 'lucide-react';

// 🔴 GST MONTHLY RETURN TRACKING: har mahine ki GSTR-3B aur GSTR-1/IFF filing ki list (GST portal jaisi).
// Pichhle mahine bhi khud daal sakte hain; pending ho toh remark me wajah likh sakte hain.

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const FILING_TABLES = [
  { type: 'GSTR3B', title: 'Filing details for GSTR3B', dueDay: 20 },
  { type: 'GSTR1', title: 'Filing details for GSTR-1/IFF', dueDay: 11 }
];
const STATUSES = ['Filed', 'Pending', 'Not Filed'];

const isPeriod = (value) => /^\d{4}-(0[1-9]|1[0-2])$/.test(String(value || ''));
export const monthName = (period) => (isPeriod(period) ? MONTHS[Number(period.slice(5, 7)) - 1] : '');
// Financial year: April se March
export const financialYear = (period) => {
  if (!isPeriod(period)) return '';
  const year = Number(period.slice(0, 4));
  const start = Number(period.slice(5, 7)) >= 4 ? year : year - 1;
  return `${start}-${start + 1}`;
};
const addMonths = (period, count) => {
  const [year, month] = period.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1 + count, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
};
const thisMonth = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }).slice(0, 7);
const dateInput = (value) => {
  if (!value) return '';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().split('T')[0];
};
const showDate = (value) => { const d = dateInput(value); return d ? d.split('-').reverse().join('/') : ''; };
const newKey = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// Record ki list form ke liye. Purane record me rows nahi hain toh purani "Filed On" date se ek row bana do
// (10 Oct ko file hua return September ka hota hai), taaki pehle ka data na khoye.
export const seedFilingRecords = (client) => {
  const saved = Array.isArray(client?.filingRecords) ? client.filingRecords : [];
  if (saved.length > 0) {
    return saved.map(r => ({ key: r._id || newKey(), returnType: r.returnType, period: r.period, filingDate: dateInput(r.filingDate), status: r.status || (r.filingDate ? 'Filed' : 'Pending'), remark: r.remark || '' }));
  }
  const rows = [];
  [['GSTR3B', client?.gstr3bFilingDate], ['GSTR1', client?.gstr1FilingDate]].forEach(([returnType, value]) => {
    const filed = dateInput(value);
    if (filed) rows.push({ key: newKey(), returnType, period: addMonths(filed.slice(0, 7), -1), filingDate: filed, status: 'Filed', remark: '' });
  });
  return rows;
};

// Save se pehle jaanch. Galti ho toh uska message, warna ''
export const validateFilingRecords = (records = []) => {
  const seen = new Set();
  for (const row of records) {
    const label = `${row.returnType === 'GSTR1' ? 'GSTR-1' : 'GSTR-3B'} ${monthName(row.period)} ${String(row.period || '').slice(0, 4)}`;
    if (!isPeriod(row.period)) return 'Please select the tax period (month) for every return row.';
    const key = `${row.returnType}|${row.period}`;
    if (seen.has(key)) return `${label} is added twice. Keep only one row for a month.`;
    seen.add(key);
    if (row.status === 'Filed' && !row.filingDate) return `${label}: enter the date of filing, or change the status to Pending.`;
  }
  return '';
};

// Backend ko bhejne layak (screen wali key hata kar)
export const toFilingPayload = (records = []) => records.map(({ returnType, period, filingDate, status, remark }) => ({ returnType, period, filingDate: filingDate || null, status, remark: remark || '' }));

const sorted = (records, type) => records.filter(r => r.returnType === type).sort((a, b) => String(b.period).localeCompare(String(a.period)));
const statusColor = (status) => (status === 'Filed' ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : status === 'Pending' ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-rose-700 bg-rose-50 border-rose-200');

// Agli due date (sirf dikhane ke liye): pending mahina ho toh uski, warna aakhri file hue ke agle mahine ki
const nextDue = (rows, dueDay) => {
  const pending = rows.filter(r => r.status !== 'Filed' && isPeriod(r.period)).sort((a, b) => a.period.localeCompare(b.period));
  const filed = rows.filter(r => r.status === 'Filed' && isPeriod(r.period)).sort((a, b) => b.period.localeCompare(a.period));
  const duePeriod = pending[0] ? addMonths(pending[0].period, 1) : filed[0] ? addMonths(filed[0].period, 2) : null;
  if (!duePeriod) return null;
  const forPeriod = addMonths(duePeriod, -1);
  return { date: `${String(dueDay).padStart(2, '0')}/${duePeriod.slice(5, 7)}/${duePeriod.slice(0, 4)}`, forMonth: `${monthName(forPeriod)} ${forPeriod.slice(0, 4)}`, overdue: `${duePeriod}-${String(dueDay).padStart(2, '0')}` < new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) };
};

const th = 'py-2 px-3 text-[11px] font-bold text-slate-700 text-center border border-slate-200 bg-slate-50 whitespace-nowrap';
const td = 'py-1.5 px-2 text-xs text-slate-700 text-center border border-slate-200';

// ============================================================
// FORM: rows add / edit / delete
// ============================================================
export const GstFilingEditor = ({ records = [], onChange }) => {
  const update = (key, changes) => onChange(records.map(row => (row.key === key ? { ...row, ...changes } : row)));
  const remove = (key) => onChange(records.filter(row => row.key !== key));

  // Naya mahina: "next" = aakhri mahine ke baad wala, "earlier" = sabse purane se pehle wala
  const add = (type, direction) => {
    const periods = sorted(records, type).map(r => r.period).filter(isPeriod);
    let period;
    if (periods.length === 0) period = addMonths(thisMonth(), -1); // pehli row: pichhla mahina
    else if (direction === 'next') period = addMonths(periods[0], 1);
    else period = addMonths(periods[periods.length - 1], -1);
    onChange([...records, { key: newKey(), returnType: type, period, filingDate: '', status: 'Pending', remark: '' }]);
  };

  const inputClass = 'w-full text-xs font-semibold text-slate-700 border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none';

  return (
    <div className="grid grid-cols-1 2xl:grid-cols-2 gap-5">
      {FILING_TABLES.map(table => {
        const rows = sorted(records, table.type);
        const due = nextDue(rows, table.dueDay);
        return (
          <div key={table.type} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div>
                <p className="text-sm font-bold text-indigo-800">{table.title}</p>
                <p className="text-[10px] font-semibold text-slate-400">Due on the {table.dueDay}th of the next month</p>
              </div>
              <div className="flex items-center gap-1.5">
                {rows.length > 0 && (
                  <button type="button" onClick={() => add(table.type, 'earlier')} className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg"><Plus size={12} /> Earlier Month</button>
                )}
                <button type="button" onClick={() => add(table.type, 'next')} className="inline-flex items-center gap-1 text-[11px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-2.5 py-1.5 rounded-lg"><Plus size={12} /> {rows.length ? 'Next Month' : 'Add Month'}</button>
              </div>
            </div>

            {rows.length === 0 ? (
              <p className="text-xs font-semibold text-slate-400 text-center py-6 border border-dashed border-slate-200 rounded-xl">No months added yet. Click "Add Month" to enter a return.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse min-w-[620px]">
                  <thead>
                    <tr>
                      <th className={th}>Financial Year</th>
                      <th className={th}>Tax Period</th>
                      <th className={th}>Date of filing</th>
                      <th className={th}>Status</th>
                      <th className={th}>Remark</th>
                      <th className={`${th} w-8`}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(row => (
                      <tr key={row.key} className={row.status === 'Filed' ? '' : 'bg-amber-50/40'}>
                        <td className={`${td} whitespace-nowrap font-semibold`}>{financialYear(row.period) || '—'}</td>
                        <td className={td}>
                          <input type="month" value={row.period} onChange={(e) => update(row.key, { period: e.target.value })} className={inputClass} title={monthName(row.period)} />
                        </td>
                        <td className={td}>
                          <input
                            type="date" value={row.filingDate}
                            // Date daalte hi Filed; date hatate hi Pending
                            onChange={(e) => update(row.key, { filingDate: e.target.value, status: e.target.value ? 'Filed' : (row.status === 'Filed' ? 'Pending' : row.status) })}
                            className={inputClass}
                          />
                        </td>
                        <td className={td}>
                          <select
                            value={row.status}
                            onChange={(e) => update(row.key, { status: e.target.value, filingDate: e.target.value === 'Filed' ? row.filingDate : '' })}
                            className={`${inputClass} font-bold ${statusColor(row.status)}`}
                          >
                            {STATUSES.map(status => <option key={status} value={status}>{status}</option>)}
                          </select>
                        </td>
                        <td className={td}>
                          <input
                            type="text" maxLength={300} value={row.remark} onChange={(e) => update(row.key, { remark: e.target.value })}
                            placeholder={row.status === 'Filed' ? 'Optional' : 'Why is it pending?'}
                            className={`${inputClass} font-medium text-left ${row.status !== 'Filed' && !row.remark ? 'border-amber-300 bg-amber-50' : ''}`}
                          />
                        </td>
                        <td className={td}>
                          <button type="button" onClick={() => remove(row.key)} className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50" title="Remove this month"><Trash2 size={13} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {due && (
              <p className={`text-[11px] font-bold mt-2.5 flex items-center gap-1.5 ${due.overdue ? 'text-rose-600' : 'text-slate-500'}`}>
                <CalendarClock size={12} /> Next due: {due.date} (for {due.forMonth}){due.overdue ? ' · overdue' : ''}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ============================================================
// SIRF DEKHNE KE LIYE (client ki history me)
// ============================================================
export const GstFilingView = ({ client }) => {
  const records = seedFilingRecords(client);
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
      {FILING_TABLES.map(table => {
        const rows = sorted(records, table.type);
        const due = nextDue(rows, table.dueDay);
        const pending = rows.filter(r => r.status !== 'Filed').length;
        return (
          <div key={table.type} className="min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <p className="text-sm font-bold text-indigo-900">{table.title}</p>
              {pending > 0 && <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1"><AlertCircle size={10} /> {pending} pending</span>}
            </div>
            {rows.length === 0 ? (
              <p className="text-xs font-semibold text-slate-400 text-center py-6 border border-dashed border-slate-200 rounded-xl">No filing details added yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse min-w-[460px]">
                  <thead>
                    <tr>
                      <th className={th}>Financial Year</th>
                      <th className={th}>Tax Period</th>
                      <th className={th}>Date of filing</th>
                      <th className={th}>Status</th>
                      <th className={th}>Remark</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(row => (
                      <tr key={row.key} className={row.status === 'Filed' ? '' : 'bg-amber-50/50'}>
                        <td className={`${td} py-2 whitespace-nowrap`}>{financialYear(row.period)}</td>
                        <td className={`${td} py-2`}>{monthName(row.period)}</td>
                        <td className={`${td} py-2 whitespace-nowrap`}>{showDate(row.filingDate) || '—'}</td>
                        <td className={`${td} py-2`}><span className={`px-2 py-0.5 rounded border text-[11px] font-bold whitespace-nowrap ${statusColor(row.status)}`}>{row.status}</span></td>
                        <td className={`${td} py-2 text-left max-w-[220px] break-words`}>{row.remark || <span className="text-slate-300">—</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {due && (
              <p className={`text-[11px] font-bold mt-2 flex items-center gap-1.5 ${due.overdue ? 'text-rose-600' : 'text-slate-500'}`}>
                <CalendarClock size={12} /> Next due: {due.date} (for {due.forMonth}){due.overdue ? ' · overdue' : ''}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
};
