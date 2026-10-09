import React from 'react';
import { FileText, Calculator, Building2, Hash, FileKey, Store, HeartPulse, X, ArrowUpRight, RefreshCw, MessageSquare, Receipt } from 'lucide-react';
import RemarkTimeline, { parseRemarkEntries } from './RemarkTimeline';
import { formatIstDate } from '../utils/time';

// 🔴 CONNECTED WORKSPACES: Client Master ke 360° profile ke boxes aur unka detail popup.
// key = backend ke `services` / `workspaces` ka naam; path = us workspace ka page.
export const WORKSPACES = [
  { key: 'itr', label: 'Income Tax (ITR)', title: 'Income Tax (ITR) Details', icon: FileText, path: '/itr-returns', box: 'bg-blue-50/50 border-blue-300', chip: 'bg-blue-100 text-blue-600', short: 'ITR' },
  { key: 'gst', label: 'GST Returns', title: 'GST Return Details', icon: Calculator, path: '/gst-returns', box: 'bg-indigo-50/50 border-indigo-300', chip: 'bg-indigo-100 text-indigo-600', short: 'GST' },
  { key: 'roc', label: 'ROC / MCA', title: 'ROC / MCA Details', icon: Building2, path: '/roc-returns', box: 'bg-purple-50/50 border-purple-300', chip: 'bg-purple-100 text-purple-600', short: 'ROC' },
  { key: 'tds', label: 'TDS Return', title: 'TDS Return Details', icon: Hash, path: '/tds-returns', box: 'bg-orange-50/50 border-orange-300', chip: 'bg-orange-100 text-orange-600', short: 'TDS' },
  { key: 'audit', label: 'Audit Master', title: 'Audit Engagement Details', icon: FileKey, path: '/audit', box: 'bg-amber-50/50 border-amber-300', chip: 'bg-amber-100 text-amber-600', short: 'AUDIT' },
  { key: 'fssai', label: 'FSSAI / FoSCoS', title: 'FSSAI / FoSCoS Details', icon: Store, path: '/fssai-returns', box: 'bg-emerald-50/50 border-emerald-300', chip: 'bg-emerald-100 text-emerald-600', short: 'FSSAI' },
  { key: 'cfo', label: 'CFO / Business Health', title: 'CFO / Business Health Reports', icon: HeartPulse, path: '/business-health', box: 'bg-rose-50/50 border-rose-300', chip: 'bg-rose-100 text-rose-600', short: 'CFO' }
];

const date = (v) => (v ? formatIstDate(v, { day: '2-digit', month: 'short', year: 'numeric' }) : '');
const money = (v) => (v === null || v === undefined || v === '' ? '' : `₹${Number(v).toLocaleString('en-IN')}`);
const yesNo = (v) => (v ? 'Yes' : 'No');
const monthLabel = (m) => new Date(`${m}-01T00:00:00Z`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' });

// Har workspace ke record me kaunse fields dikhane hain: [label, value]
const FIELDS = {
  itr: (r) => ({
    heading: `ITR · Filed up to AY ${r.itrFiledUpToAY || '-'}`, status: r.itrStatus || 'Documents Pending',
    fields: [
      ['Return Type', r.returnType], ['Form No.', r.formNo], ['Tax Regime', r.regime], ['Filing Date', date(r.filingDate)],
      ['Acknowledgement No.', r.acknowledgementNo], ['Verification', r.verificationMethod], ['Processed Status', r.itrProcessedStatus], ['Filed By', r.itrFiledBy],
      ['Total Income', money(r.totalIncome)], ['Income Tax', money(r.incomeTax)], ['TDS', money(r.tds)], ['Refund', money(r.refund)],
      ['Next Reminder', date(r.nextReminderDate)], ['Fee Plan', r.feeStatus], ['Fee Amount', money(r.feeAmount)], ['Fee Received', money(r.amountReceived)],
      ['Fee Balance', money(Number(r.feeAmount || 0) - Number(r.amountReceived || 0))], ['Added By', r.createdBy?.name]
    ],
    remarks: r.remarks
  }),
  gst: (r) => ({
    heading: `${r.tradeName || r.assesseeName || 'GST'} · ${r.gstin || 'No GSTIN'}`, status: r.gstStatus || 'Documents Pending',
    fields: [
      ['Taxpayer Type', r.taxpayerType], ['State', r.state], ['Aadhaar KYC', r.aadhaarKycStatus === 'Yes' ? 'Verified' : 'Pending'], ['Bank Linked', r.bankLinkedStatus],
      ['GSTR-1 Filed On', date(r.gstr1FilingDate)], ['GSTR-1 Next Due', date(r.gstr1NextDueDate)], ['GSTR-3B Filed On', date(r.gstr3bFilingDate)], ['GSTR-3B Next Due', date(r.gstr3bNextDueDate)],
      ['Payment Plan', r.feeStatus], ['Fee Amount', money(r.feeAmount)], ['Fee Received', money(r.amountReceived)], ['Fee Balance', money(Number(r.feeAmount || 0) - Number(r.amountReceived || 0))],
      ['Last Payment', date(r.paymentDate)], ['Added By', r.createdBy?.name]
    ],
    remarks: r.remarks
  }),
  roc: (r) => ({
    heading: r.companyName || 'Company', status: r.status,
    fields: [
      ['Company Type', r.clientType], ['CIN / LLPIN', r.cinOrLlpIn], ['TAN', r.tan], ['Incorporation Date', date(r.dateOfIncorporation)],
      ['Authorized Capital', money(r.authorizedCapital)], ['Paid-up Capital', money(r.paidUpCapital)], ['Directors', r.directors?.length ?? 0], ['Shareholders', r.shareholders?.length ?? 0],
      ['Auditor', r.auditorName], ['Auditor Tenure Ends', date(r.auditorTenureEndDate)], ['Startup India', yesNo(r.startupIndia?.isRegistered)], ['Udyam No.', r.udyamNumber],
      ['Relationship Manager', r.relationshipManager?.name]
    ],
    list: {
      title: 'Compliance Filings',
      rows: (r.complianceFilings || []).map(f => [f.formName, `Due ${date(f.dueDate) || '-'}`, f.filingDate ? `Filed ${date(f.filingDate)}` : 'Not filed'])
    }
  }),
  tds: (r) => ({
    heading: `${r.companyName || 'Deductor'} · TAN ${r.tan || '-'}`, status: r.isActive ? 'Active' : 'Inactive',
    fields: [
      ['Deductor Category', r.deductorCategory], ['Responsible Person', r.responsiblePerson], ['Mobile', r.mobile], ['Email', r.email],
      ['Service Fee', money(r.serviceFee)], ['Billing Cycle', r.billingCycle], ['City', r.city], ['State', r.state]
    ]
  }),
  audit: (r) => ({
    heading: `${r.audit_type || 'Audit'} · FY ${r.financial_year || '-'}`, status: r.engagement_status,
    fields: [
      ['Audit ID', r.auditId], ['Assessment Year', r.assessment_year], ['Applicable Section', r.applicable_section], ['Turnover / Gross Receipts', money(r.turnover_gross_receipts)],
      ['Books Period', r.books_period_from ? `${date(r.books_period_from)} to ${date(r.books_period_to)}` : ''], ['Data Received', date(r.data_received_date)], ['Audit Started', date(r.audit_start_date)], ['Draft Report', date(r.draft_report_date)],
      ['Report Signed', date(r.report_signing_date)], ['Due Date', date(r.due_date)], ['Audit Fee', money(r.audit_fee)], ['Fee Status', r.fee_status],
      ['Assigned To', r.assigned_executive_id?.name]
    ],
    remarks: r.remarks
  }),
  fssai: (r) => ({
    heading: `License ${r.fssaiLicenseNo || '-'}`, status: r.fssaiStatus,
    fields: [
      ['License Type', r.licenseType], ['Kind of Business', r.kindOfBusiness], ['Issue Date', date(r.issueDate)], ['Expiry Date', date(r.expiryDate)],
      ['Financial Year', r.financialYear], ['Return Type', r.returnType], ['Due Date', date(r.dueDate)], ['Filing Date', date(r.filingDate)],
      ['Acknowledgement No.', r.acknowledgementNo], ['Fee Plan', r.feeStatus], ['Fee Amount', money(r.feeAmount)], ['Fee Received', money(r.amountReceived)],
      ['Fee Balance', money(Number(r.feeAmount || 0) - Number(r.amountReceived || 0))], ['Added By', r.createdBy?.name]
    ],
    remarks: r.remarks
  })
};

const statusChip = (status) => {
  const s = String(status || '').toLowerCase();
  if (/(filed|verified|active|refund|closed|signed|approved|paid)/.test(s) && !/not/.test(s)) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (/(error|mismatch|defective|expired|strike|inactive|rejected)/.test(s)) return 'bg-rose-50 text-rose-700 border-rose-200';
  if (/(processing|progress|challan|draft|queries|received)/.test(s)) return 'bg-blue-50 text-blue-700 border-blue-200';
  return 'bg-amber-50 text-amber-700 border-amber-200';
};

const SCORE_STYLE = { GREEN: 'text-emerald-600 border-emerald-300', YELLOW: 'text-amber-600 border-amber-300', RED: 'text-rose-600 border-rose-300', GREY: 'text-slate-400 border-slate-200' };

// workspace = WORKSPACES ka ek item; records = us client ke us workspace ke records
const ClientWorkspaceDetail = ({ workspace, records, loading, client, invoices = [], onClose, onOpenWorkspace, onOpenCfoReport }) => {
  const Icon = workspace.icon;
  const build = FIELDS[workspace.key];

  // Is service se jude invoices (description ke shabdon se)
  const keywords = { itr: ['itr', 'income tax'], gst: ['gst'], roc: ['roc', 'mca', 'company'], tds: ['tds'], audit: ['audit'], fssai: ['fssai', 'food'], cfo: ['cfo', 'business health'] }[workspace.key] || [];
  const relatedInvoices = invoices.filter(inv => (inv.items || []).some(item => keywords.some(k => String(item.description || '').toLowerCase().includes(k))));

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
      <div className="bg-slate-50 rounded-3xl w-full max-w-4xl shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-slate-200 bg-white flex justify-between items-center gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${workspace.chip}`}><Icon size={20}/></div>
            <div className="min-w-0">
              <h3 className="text-lg font-black text-slate-800 truncate">{workspace.title}</h3>
              <p className="text-[11px] font-semibold text-slate-500 truncate">{client?.name}{client?.clientId ? ` · ${client.clientId}` : ''}{client?.pan ? ` · PAN ${client.pan}` : ''}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {workspace.key !== 'cfo' && (
              <button onClick={() => onOpenWorkspace(workspace)} className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 px-3 py-2 rounded-xl">
                Open {workspace.short} Workspace <ArrowUpRight size={14}/>
              </button>
            )}
            <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"><X size={18}/></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-5">
          {loading ? (
            <div className="text-center py-16 text-slate-400"><RefreshCw className="animate-spin inline-block mr-2" size={18}/> Loading details...</div>
          ) : records.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200 text-slate-400">
              <Icon size={36} className="mx-auto mb-2 opacity-40"/>
              <p className="text-sm font-bold text-slate-500">No {workspace.short} record linked to this client.</p>
            </div>
          ) : workspace.key === 'cfo' ? (
            // CFO: har month ki report, click karke seedha report par
            <div className="space-y-3">
              {records.map(r => (
                <button key={r._id} onClick={() => onOpenCfoReport(r.month)} className="w-full text-left bg-white hover:bg-rose-50/40 border border-slate-200 hover:border-rose-300 rounded-2xl p-4 flex items-center gap-4 transition-all">
                  <div className={`h-14 w-14 rounded-full border-4 flex flex-col items-center justify-center shrink-0 ${SCORE_STYLE[r.overallStatus] || SCORE_STYLE.GREY}`}>
                    <span className="text-lg font-black leading-none">{r.overallScore ?? '--'}</span>
                    <span className="text-[8px] font-bold text-slate-400">/100</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-slate-800">{monthLabel(r.month)} <span className={`ml-2 text-[9px] font-black uppercase px-1.5 py-0.5 rounded border ${r.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>{r.status === 'Approved' ? 'Final' : 'Draft'}</span></p>
                    <p className="text-[11px] font-semibold text-slate-500 mt-0.5">Revenue {money(r.revenue) || 'N/A'} · PAT {money(r.pat) || 'N/A'} · <span className="text-rose-600">{r.redCount} Red</span> · <span className="text-amber-600">{r.yellowCount} Yellow</span></p>
                  </div>
                  <span className="text-xs font-bold text-rose-600 flex items-center gap-1 shrink-0">Open Report <ArrowUpRight size={14}/></span>
                </button>
              ))}
            </div>
          ) : (
            records.map(record => {
              const view = build(record);
              const shown = view.fields.filter(([, value]) => value !== undefined && value !== null && value !== '');
              const remarkEntries = parseRemarkEntries(view.remarks);
              return (
                <div key={record._id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-5 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-sm font-black text-slate-800">{view.heading}</h4>
                    {view.status && <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border ${statusChip(view.status)}`}>{view.status}</span>}
                  </div>

                  <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-4">
                    {shown.map(([label, value]) => (
                      <div key={label} className="min-w-0">
                        <p className="text-[10px] font-bold uppercase text-slate-400 mb-0.5">{label}</p>
                        <p className="text-sm font-semibold text-slate-800 break-words">{String(value)}</p>
                      </div>
                    ))}
                  </div>

                  {view.list?.rows?.length > 0 && (
                    <div className="px-5 pb-5">
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2">{view.list.title}</p>
                      <div className="space-y-1.5">
                        {view.list.rows.map((row, idx) => (
                          <div key={idx} className="flex flex-wrap items-center justify-between gap-2 text-xs bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                            <span className="font-bold text-slate-700">{row[0]}</span>
                            <span className="font-semibold text-slate-500">{row[1]} · {row[2]}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {remarkEntries.length > 0 && (
                    <div className="px-5 pb-5">
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5"><MessageSquare size={12}/> Work Updates & Remarks</p>
                      <div className="bg-slate-50 rounded-xl border border-slate-100 p-4 max-h-56 overflow-y-auto custom-scrollbar">
                        <RemarkTimeline entries={remarkEntries} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Is service ke invoices */}
          {!loading && workspace.key !== 'cfo' && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5"><Receipt size={12}/> Invoices for {workspace.short}</p>
              {relatedInvoices.length === 0 ? (
                <p className="text-xs text-slate-400 italic bg-white border border-dashed border-slate-200 rounded-xl p-4 text-center">No invoice found for this service.</p>
              ) : (
                <div className="space-y-2">
                  {relatedInvoices.map(inv => (
                    <div key={inv._id} className="flex justify-between items-center gap-3 bg-white p-3 border border-slate-200 rounded-xl">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-800">{inv.invoiceNo}</p>
                        <p className="text-[10px] font-semibold text-slate-500 truncate">{inv.items?.[0]?.description || 'Service'} · {date(inv.invoiceDate || inv.createdAt)}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-black text-slate-700">{money(inv.totalAmountAfterTax)}</p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${inv.paymentStatus === 'Paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : inv.paymentStatus === 'Partially Paid' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>{inv.paymentStatus || 'Pending'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClientWorkspaceDetail;
