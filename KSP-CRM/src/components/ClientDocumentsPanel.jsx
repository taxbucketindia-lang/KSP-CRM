import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { FileText, Plus, Trash2, CheckCircle2, Clock, XCircle, Loader2, Save, ListPlus } from 'lucide-react';
import { formatIstDateTime } from '../utils/time';

// 🔴 CLIENT KE DOCUMENTS (Client Master ke profile me): kaun sa document mila, kaun sa pending hai, kaun sa nahi mila,
// aur har ek ke saath remark (kyu pending hai / kab aayega).

export const DOCUMENT_STATUSES = ['Received', 'Pending', 'Not Received'];
const STATUS_STYLE = {
  Received: { icon: CheckCircle2, on: 'bg-emerald-600 text-white border-emerald-600', chip: 'bg-emerald-50 text-emerald-700 border-emerald-200', row: '' },
  Pending: { icon: Clock, on: 'bg-amber-500 text-white border-amber-500', chip: 'bg-amber-50 text-amber-700 border-amber-200', row: 'bg-amber-50/40' },
  'Not Received': { icon: XCircle, on: 'bg-rose-600 text-white border-rose-600', chip: 'bg-rose-50 text-rose-700 border-rose-200', row: 'bg-rose-50/40' }
};
// Aam taur par maange jaane wale documents (sujhav ke liye; koi bhi naam likh sakte hain)
const COMMON_DOCUMENTS = [
  'PAN Card', 'Aadhaar Card', 'Photo', 'Address Proof', 'Bank Statement', 'Cancelled Cheque', 'Form 16', 'Salary Slips',
  'GST Certificate', 'Sale Invoices', 'Purchase Invoices', 'Balance Sheet', 'Profit & Loss Account', 'Incorporation Certificate',
  'MOA / AOA', 'Partnership Deed', 'Rent Agreement', 'Electricity Bill', 'Digital Signature (DSC)', 'Investment Proofs'
];
// "Add common" dabane par itne jud jaate hain
const STARTER_DOCUMENTS = ['PAN Card', 'Aadhaar Card', 'Bank Statement', 'Address Proof', 'Photo'];

const rowKey = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const toRows = (documents) => (documents || []).map(doc => ({ key: doc._id || rowKey(), _id: doc._id, name: doc.name || '', status: doc.status || 'Pending', remark: doc.remark || '', updatedAt: doc.updatedAt, updatedByName: doc.updatedByName }));

// List me dikhane ke liye ginti
export const documentCounts = (documents) => {
  const list = documents || [];
  return {
    total: list.length,
    received: list.filter(d => d.status === 'Received').length,
    pending: list.filter(d => d.status === 'Pending').length,
    notReceived: list.filter(d => d.status === 'Not Received').length
  };
};

const ClientDocumentsPanel = ({ client, token, onSaved }) => {
  const [rows, setRows] = useState(() => toRows(client.documents));
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('All');

  // Doosra client khule toh uski list
  useEffect(() => { setRows(toRows(client.documents)); setDirty(false); setFilter('All'); }, [client._id]); // eslint-disable-line react-hooks/exhaustive-deps

  const counts = useMemo(() => documentCounts(rows), [rows]);
  const shown = filter === 'All' ? rows : rows.filter(row => row.status === filter);

  const change = (key, changes) => { setRows(prev => prev.map(row => (row.key === key ? { ...row, ...changes } : row))); setDirty(true); };
  const remove = (key) => { setRows(prev => prev.filter(row => row.key !== key)); setDirty(true); };
  const add = (name = '') => { setRows(prev => [...prev, { key: rowKey(), name, status: 'Pending', remark: '' }]); setDirty(true); setFilter('All'); };
  const addStarter = () => {
    const have = new Set(rows.map(row => row.name.trim().toLowerCase()));
    const missing = STARTER_DOCUMENTS.filter(name => !have.has(name.toLowerCase()));
    if (missing.length === 0) return toast('The common documents are already in the list');
    setRows(prev => [...prev, ...missing.map(name => ({ key: rowKey(), name, status: 'Pending', remark: '' }))]);
    setDirty(true); setFilter('All');
  };

  const save = async () => {
    if (saving) return;
    if (rows.some(row => !row.name.trim())) return toast.error('Every row needs a document name. Remove the empty rows.');
    const names = rows.map(row => row.name.trim().toLowerCase());
    if (new Set(names).size !== names.length) return toast.error('The same document is added twice. Keep only one row for it.');

    setSaving(true);
    try {
      const res = await axios.put(`${import.meta.env.VITE_API_URL}/client-master/${client._id}/documents`,
        { documents: rows.map(({ _id, name, status, remark }) => ({ _id, name: name.trim(), status, remark: remark.trim() })) },
        { headers: { Authorization: `Bearer ${token}` } });
      setRows(toRows(res.data.documents));
      setDirty(false);
      toast.success('Documents saved');
      if (onSaved) onSaved(res.data.documents);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not save the documents');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = 'w-full text-xs font-semibold text-slate-700 border border-slate-200 rounded-lg px-2.5 py-2 bg-white outline-none focus:ring-2 focus:ring-blue-500/20';

  return (
    <div className="space-y-5 animate-in fade-in">
      {/* GINTI (click = filter) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[['All', 'Total Documents', counts.total, 'text-slate-800', 'border-slate-200 bg-white'], ['Received', 'Received', counts.received, 'text-emerald-700', 'border-emerald-100 bg-emerald-50'], ['Pending', 'Pending', counts.pending, 'text-amber-700', 'border-amber-100 bg-amber-50'], ['Not Received', 'Not Received', counts.notReceived, 'text-rose-700', 'border-rose-100 bg-rose-50']].map(([value, label, count, color, box]) => (
          <button key={value} onClick={() => setFilter(value)} className={`text-left p-4 rounded-2xl border shadow-sm transition-all ${box} ${filter === value ? 'ring-2 ring-blue-500' : 'hover:shadow-md'}`}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
            <p className={`text-2xl font-black mt-1 ${color}`}>{count}</p>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-slate-800 flex items-center gap-2"><FileText size={17} className="text-blue-600" /> Document Checklist</h3>
            <p className="text-[11px] font-medium text-slate-500 mt-0.5">Mark each document as Received, Pending or Not Received and write a remark (why it is pending, when it will come).</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={addStarter} className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 px-3 py-2 rounded-xl"><ListPlus size={14} /> Add Common</button>
            <button onClick={() => add()} className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded-xl shadow-sm"><Plus size={14} /> Add Document</button>
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="py-12 text-center">
            <FileText size={34} className="mx-auto text-slate-200 mb-2" />
            <p className="text-sm font-bold text-slate-500">No documents listed for this client yet.</p>
            <p className="text-xs text-slate-400 mt-1">Use "Add Common" for the usual ones, or "Add Document" to type your own.</p>
          </div>
        ) : shown.length === 0 ? (
          <p className="py-10 text-center text-xs font-semibold text-slate-400">No document is marked "{filter}".</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[760px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-500">
                  <th className="py-3 px-4 w-[26%]">Document</th>
                  <th className="py-3 px-3 w-[300px]">Status</th>
                  <th className="py-3 px-3">Remark</th>
                  <th className="py-3 px-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {shown.map(row => (
                  <tr key={row.key} className={STATUS_STYLE[row.status]?.row}>
                    <td className="py-2.5 px-4 align-top">
                      <input type="text" list="client-document-names" maxLength={80} value={row.name} onChange={(e) => change(row.key, { name: e.target.value })} placeholder="Document name" className={`${inputClass} font-bold`} />
                    </td>
                    <td className="py-2.5 px-3 align-top">
                      <div className="flex gap-1">
                        {DOCUMENT_STATUSES.map(status => {
                          const Icon = STATUS_STYLE[status].icon;
                          const active = row.status === status;
                          return (
                            <button key={status} type="button" onClick={() => change(row.key, { status })} className={`flex-1 inline-flex items-center justify-center gap-1 text-[11px] font-bold px-2 py-2 rounded-lg border whitespace-nowrap transition-colors ${active ? STATUS_STYLE[status].on : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>
                              <Icon size={12} /> {status}
                            </button>
                          );
                        })}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 align-top">
                      <input type="text" maxLength={300} value={row.remark} onChange={(e) => change(row.key, { remark: e.target.value })}
                        placeholder={row.status === 'Received' ? 'Optional' : 'Why is it pending? When will it come?'}
                        className={`${inputClass} font-medium ${row.status !== 'Received' && !row.remark ? 'border-amber-300' : ''}`} />
                      {row.updatedAt && <p className="text-[10px] font-medium text-slate-400 mt-1">Last updated {formatIstDateTime(row.updatedAt)}{row.updatedByName ? ` by ${row.updatedByName}` : ''}</p>}
                    </td>
                    <td className="py-2.5 px-3 align-top">
                      <button type="button" onClick={() => remove(row.key)} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50" title="Remove this document"><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <datalist id="client-document-names">
              {COMMON_DOCUMENTS.map(name => <option key={name} value={name} />)}
            </datalist>
          </div>
        )}

        <div className="p-4 border-t border-slate-100 bg-slate-50/60 flex flex-wrap items-center justify-between gap-3">
          <p className={`text-xs font-semibold ${dirty ? 'text-amber-600' : 'text-slate-400'}`}>{dirty ? 'You have unsaved changes. Press Save.' : 'All changes are saved.'}</p>
          <button onClick={save} disabled={!dirty || saving} className={`inline-flex items-center gap-2 text-sm font-bold px-5 py-2.5 rounded-xl shadow-sm transition-all ${dirty ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save Documents
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClientDocumentsPanel;
