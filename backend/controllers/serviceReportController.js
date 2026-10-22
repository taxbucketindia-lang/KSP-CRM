import ItrReturn from '../models/ItrReturn.js';
import GstReturn from '../models/GstReturn.js';
import RocWorkspace from '../models/RocWorkspace.js';
import TdsReturn from '../models/TdsReturn.js';
import TdsWorkspace from '../models/TdsWorkspace.js';
import AuditEngagement from '../models/AuditEngagement.js';
import AuditFiling from '../models/AuditFiling.js';
import FssaiWorkspace from '../models/FssaiWorkspace.js';
import Client from '../models/Client.js';
import ClientMaster from '../models/ClientMaster.js';
import Invoice from '../models/Invoice.js';

// 🔴 SERVICE REPORT (Executive): saari services ka mahine-war hisaab ek jagah.
// Har service ke liye: kitne naye aaye (added), kitna kaam hua / file hua (done), us kaam ki fee, invoice se revenue,
// aur abhi kitna pending hai. Kisi bhi khane par click = us mahine ki list (details).

const run = (handler) => async (req, res) => {
  try { await handler(req, res); } catch (error) { res.status(error.status || 500).json({ message: error.message }); }
};
const fail = (message, status = 400) => { const error = new Error(message); error.status = status; throw error; };
const num = (v) => (v && typeof v === 'object' && v.toString ? Number(v.toString()) : Number(v)) || 0; // Decimal128 bhi
const istKey = (date) => (date ? new Date(date).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) : '');
const monthOf = (date) => istKey(date).slice(0, 7);

// FY "2026-27" -> April 2026 se March 2027
const fyMonths = (fy) => {
  const start = Number(String(fy).slice(0, 4));
  return Array.from({ length: 12 }, (_, i) => {
    const m = (3 + i) % 12;
    return `${start + (i >= 9 ? 1 : 0)}-${String(m + 1).padStart(2, '0')}`;
  });
};
// Pehle mahine ki 1 tareekh (India) se aakhri mahine ke baad wale mahine ki 1 tareekh tak
const previousMonth = (month) => {
  const [y, m] = month.split('-').map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
};
const nextMonth = (month) => {
  const [y, m] = month.split('-').map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
};
const rangeOf = (months) => ({
  $gte: new Date(`${months[0]}-01T00:00:00+05:30`),
  $lt: new Date(`${nextMonth(months[months.length - 1])}-01T00:00:00+05:30`)
});

// Registration ki services (Registrations tab jaisi)
const REG_SERVICES = ['ITR Filing', 'GST Registration', 'Company Reg', 'Trademark Reg', 'Accounting & Audit', 'FSSAI Registration', 'Other Services'];
const regKey = (service) => `reg:${REG_SERVICES.includes(service) ? service : 'Other Services'}`;

// Report ki lines: [key, label, group, invoice service jiska revenue isme jata hai]
export const REPORT_LINES = [
  ['itr', 'ITR Returns', 'Returns & Audits', 'itr'],
  ['gst', 'GST Returns', 'Returns & Audits', 'gst'],
  ['roc', 'ROC Filings', 'Returns & Audits', 'roc'],
  ['tds', 'TDS Returns', 'Returns & Audits', 'tds'],
  ['audit', 'Audit', 'Returns & Audits', 'audit'],
  ['fssai', 'FSSAI Returns', 'Returns & Audits', null],
  ...REG_SERVICES.map(s => [`reg:${s}`, s, 'Registrations', null]),
  ['accounting', 'Accounting', 'Other Billing', 'accounting'],
  ['cfo', 'Virtual CFO', 'Other Billing', 'cfo'],
  ['registrationRevenue', 'Registration (billing)', 'Other Billing', 'registration'],
  ['otherRev', 'Other Services (billing)', 'Other Billing', 'otherRev']
];

// Invoice ki line kis service ki (pehle chuni hui Service, warna description se andaza)
const INVOICE_RULES = [
  ['cfo', /cfo/i], ['audit', /audit/i], ['itr', /\bitr\b|income\s*tax\s*return|income tax/i], ['tds', /\btds\b|\btcs\b/i],
  ['gst', /\bgst\b|gstr/i], ['roc', /\broc\b|\bmca\b|annual\s*filing|compliance|dir-?3|aoc|mgt/i],
  ['registration', /registration|incorporat|trademark|fssai|msme|udyam|iec|pan\s*card|tan|startup|company\s*form|llp/i],
  ['accounting', /account|bookkeep|book\s*keep|tally|ledger/i]
];
const INVOICE_KEYS = ['itr', 'gst', 'accounting', 'tds', 'roc', 'registration', 'audit', 'cfo', 'otherRev'];
const invoiceServiceOf = (item) => (INVOICE_KEYS.includes(item?.service) ? item.service
  : (INVOICE_RULES.find(([, rule]) => rule.test(String(item?.description || ''))) || ['otherRev'])[0]);

const ITR_DONE = ['Filed', 'E-Verified', 'Refund Issued'];
const TDS_DONE = ['Filed', 'Processed', 'Closed'];
const AUDIT_DONE = ['Filed', 'Closed'];

// Saari services ke "events" (ek kaam = ek event) ek period ke liye. Report aur details dono yahi use karte hain.
// event = { line, kind: 'done' | 'added' | 'pending' | 'revenue', month, date, name, detail, status, amount }
// pending = jis kaam ki due date us mahine me thi aur jo abhi tak nahi hua (ITR me due date nahi: jis mahine record bana)
const collectEvents = async (months) => {
  const range = rangeOf(months);
  const fromKey = months[0];
  const toKey = months[months.length - 1];
  const inPeriod = (m) => m >= fromKey && m <= toKey;
  const events = [];
  const push = (e) => { if (e.month && inPeriod(e.month)) events.push(e); };

  // ITR: file hone ki date = kaam; bana = naya
  const itrs = await ItrReturn.find({ $or: [{ filingDate: range }, { createdAt: range }] })
    .select('assesseeName pan itrStatus filingDate createdAt feeAmount formNo itrFiledUpToAY').lean();
  itrs.forEach(r => {
    const name = r.assesseeName || r.pan || 'ITR client';
    if (r.filingDate) push({ line: 'itr', kind: 'done', month: monthOf(r.filingDate), date: r.filingDate, name, detail: [r.formNo, r.itrFiledUpToAY && `AY ${r.itrFiledUpToAY}`].filter(Boolean).join(' · ') || 'ITR filed', status: r.itrStatus, amount: num(r.feeAmount) });
    push({ line: 'itr', kind: 'added', month: monthOf(r.createdAt), date: r.createdAt, name, detail: 'Added to ITR Returns', status: r.itrStatus, amount: num(r.feeAmount) });
    if (!ITR_DONE.includes(r.itrStatus)) push({ line: 'itr', kind: 'pending', month: monthOf(r.createdAt), date: r.createdAt, name, detail: 'ITR not filed yet', status: r.itrStatus || 'Documents Pending', amount: num(r.feeAmount) });
  });

  // GST: har return (GSTR-1 / 3B) jo us mahine file hua. Purane record (filingRecords nahi) me aakhri filing date
  const periodsDue = months.map(m => previousMonth(m)); // in mahino me due hone wale return ke period
  const gsts = await GstReturn.find({ $or: [{ 'filingRecords.filingDate': range }, { gstr1FilingDate: range }, { gstr3bFilingDate: range }, { createdAt: range }, { filingRecords: { $elemMatch: { period: { $in: periodsDue }, status: { $in: ['Pending', 'Not Filed'] } } } }] })
    .select('assesseeName tradeName gstin gstStatus filingRecords gstr1FilingDate gstr3bFilingDate createdAt feeAmount').lean();
  gsts.forEach(r => {
    const name = r.tradeName || r.assesseeName || r.gstin || 'GST client';
    const records = r.filingRecords || [];
    records.filter(x => ['Pending', 'Not Filed'].includes(x.status) && periodsDue.includes(x.period)).forEach(x => push({ line: 'gst', kind: 'pending', month: nextMonth(x.period), date: `${nextMonth(x.period)}-01`, name, detail: `${x.returnType === 'GSTR1' ? 'GSTR-1' : 'GSTR-3B'} · period ${x.period}${x.remark ? ` · ${x.remark}` : ''}`, status: x.status }));
    records.filter(x => x.filingDate && x.status !== 'Not Filed').forEach(x => push({ line: 'gst', kind: 'done', month: monthOf(x.filingDate), date: x.filingDate, name, detail: `${x.returnType === 'GSTR1' ? 'GSTR-1' : 'GSTR-3B'} · period ${x.period}`, status: x.status }));
    if (!records.length) {
      if (r.gstr1FilingDate) push({ line: 'gst', kind: 'done', month: monthOf(r.gstr1FilingDate), date: r.gstr1FilingDate, name, detail: 'GSTR-1', status: 'Filed' });
      if (r.gstr3bFilingDate) push({ line: 'gst', kind: 'done', month: monthOf(r.gstr3bFilingDate), date: r.gstr3bFilingDate, name, detail: 'GSTR-3B', status: 'Filed' });
    }
    push({ line: 'gst', kind: 'added', month: monthOf(r.createdAt), date: r.createdAt, name, detail: 'Added to GST Returns', status: r.gstStatus, amount: num(r.feeAmount) });
  });

  // ROC: har form jiski filing date us mahine
  const rocs = await RocWorkspace.find({ $or: [{ 'complianceFilings.filingDate': range }, { 'complianceFilings.dueDate': range }, { createdAt: range }] }).select('companyName complianceFilings createdAt status').lean();
  rocs.forEach(r => {
    (r.complianceFilings || []).filter(x => !x.filingDate && x.dueDate).forEach(x => push({ line: 'roc', kind: 'pending', month: monthOf(x.dueDate), date: x.dueDate, name: r.companyName, detail: `${x.formName || 'ROC form'} · due ${istKey(x.dueDate)}`, status: 'Not filed' }));
    (r.complianceFilings || []).filter(x => x.filingDate).forEach(x => push({ line: 'roc', kind: 'done', month: monthOf(x.filingDate), date: x.filingDate, name: r.companyName, detail: x.formName || 'ROC form', status: 'Filed', amount: num(x.normalFee) + num(x.additionalFee), amountLabel: 'Govt fee' }));
    push({ line: 'roc', kind: 'added', month: monthOf(r.createdAt), date: r.createdAt, name: r.companyName, detail: 'Added to ROC', status: r.status });
  });

  // TDS: har quarter return jo us mahine file hua
  const tdsReturns = await TdsReturn.find({ $or: [{ filedDate: range }, { createdAt: range }, { dueDate: range }] }).select('tdsWorkspaceId financialYear quarter formType returnType status filedDate dueDate createdAt lateFeePaid isActive').lean();
  const tdsNames = Object.fromEntries((await TdsWorkspace.find({ _id: { $in: tdsReturns.map(t => t.tdsWorkspaceId) } }).select('companyName').lean()).map(w => [String(w._id), w.companyName]));
  tdsReturns.forEach(t => {
    const name = tdsNames[String(t.tdsWorkspaceId)] || 'TDS client';
    const detail = `${t.formType || ''} ${t.quarter || ''} · FY ${t.financialYear || ''}${t.returnType === 'Correction' ? ' (correction)' : ''}`.trim();
    if (t.filedDate) push({ line: 'tds', kind: 'done', month: monthOf(t.filedDate), date: t.filedDate, name, detail, status: t.status });
    push({ line: 'tds', kind: 'added', month: monthOf(t.createdAt), date: t.createdAt, name, detail, status: t.status });
    // Due date nahi daali toh jis mahine bana wahi mahina
    if (t.isActive !== false && !TDS_DONE.includes(t.status)) push({ line: 'tds', kind: 'pending', month: monthOf(t.dueDate || t.createdAt), date: t.dueDate || t.createdAt, name, detail: `${detail}${t.dueDate ? ` · due ${istKey(t.dueDate)}` : ''}`, status: t.status });
  });

  // Audit (Audit list jaisa): ek audit = ek kaam. "Work done" = status Filed / Closed, ya koi filing form Filed.
  // Kaam ki date: filing form ki filed date -> warna report signing date -> warna audit ka aakhri update.
  // Delete kiye (inactive) audit nahi gine jaate.
  const allFilings = await AuditFiling.find({ is_active: { $ne: false } }).select('audit_id form_name filed_date filing_status').lean();
  const filedFormsOf = {};
  allFilings.filter(x => x.filing_status === 'Filed' || x.filed_date).forEach(x => { (filedFormsOf[String(x.audit_id)] = filedFormsOf[String(x.audit_id)] || []).push(x); });
  const engagements = await AuditEngagement.find({
    is_active: { $ne: false },
    $or: [{ engagement_status: { $in: AUDIT_DONE } }, { _id: { $in: Object.keys(filedFormsOf) } }, { createdAt: range }, { due_date: range }]
  }).select('auditId client_id audit_type financial_year engagement_status audit_fee due_date report_signing_date createdAt updatedAt').lean();
  const auditClientDocs = await ClientMaster.find({ _id: { $in: engagements.map(e => e.client_id) } }).select('name tradeName clientId').lean();
  const auditClients = Object.fromEntries(auditClientDocs.map(c => [String(c._id), c.tradeName || c.name]));
  const auditClientIds = Object.fromEntries(auditClientDocs.map(c => [String(c._id), c.clientId]));
  engagements.forEach(e => {
    const name = auditClients[String(e.client_id)] || 'Audit client';
    // Client Master wala ID (TB-...), audit ka apna AUD- number nahi
    const clientCode = auditClientIds[String(e.client_id)];
    const base = `${e.audit_type || 'Audit'}${e.financial_year ? ` · FY ${e.financial_year}` : ''}${clientCode ? ` · ${clientCode}` : ''}`;
    const forms = filedFormsOf[String(e._id)] || [];
    const filedForms = forms.filter(x => x.filing_status === 'Filed');
    const isDone = AUDIT_DONE.includes(e.engagement_status) || filedForms.length > 0;
    if (isDone) {
      const formDates = forms.map(x => x.filed_date).filter(Boolean).map(d => new Date(d)).sort((a, b) => b - a);
      const when = formDates[0] || e.report_signing_date || e.updatedAt;
      const dateFrom = formDates[0] ? 'filed date' : e.report_signing_date ? 'report signing date' : 'last updated';
      const formNames = forms.map(x => x.form_name).filter(Boolean);
      push({ line: 'audit', kind: 'done', month: monthOf(when), date: when, name, detail: `${formNames.length ? `${formNames.join(', ')} · ` : ''}${base} · date: ${dateFrom}`, status: e.engagement_status, amount: num(e.audit_fee) });
    } else {
      push({ line: 'audit', kind: 'pending', month: monthOf(e.due_date || e.createdAt), date: e.due_date || e.createdAt, name, detail: `${base}${e.due_date ? ` · due ${istKey(e.due_date)}` : ''}`, status: e.engagement_status, amount: num(e.audit_fee) });
    }
    push({ line: 'audit', kind: 'added', month: monthOf(e.createdAt), date: e.createdAt, name, detail: base, status: e.engagement_status, amount: num(e.audit_fee) });
  });

  // FSSAI
  const fssais = await FssaiWorkspace.find({ $or: [{ filingDate: range }, { createdAt: range }, { dueDate: range }] }).select('assesseeName fssaiLicenseNo returnType financialYear fssaiStatus filingDate dueDate createdAt feeAmount').lean();
  fssais.forEach(r => {
    const name = r.assesseeName || r.fssaiLicenseNo || 'FSSAI client';
    const detail = [r.returnType, r.financialYear && `FY ${r.financialYear}`].filter(Boolean).join(' · ') || 'FSSAI';
    if (r.filingDate) push({ line: 'fssai', kind: 'done', month: monthOf(r.filingDate), date: r.filingDate, name, detail, status: r.fssaiStatus, amount: num(r.feeAmount) });
    push({ line: 'fssai', kind: 'added', month: monthOf(r.createdAt), date: r.createdAt, name, detail: 'Added to FSSAI', status: r.fssaiStatus, amount: num(r.feeAmount) });
    if (r.fssaiStatus !== 'Filed' && !r.filingDate) push({ line: 'fssai', kind: 'pending', month: monthOf(r.dueDate || r.createdAt), date: r.dueDate || r.createdAt, name, detail: `${detail}${r.dueDate ? ` · due ${istKey(r.dueDate)}` : ''}`, status: r.fssaiStatus, amount: num(r.feeAmount) });
  });

  // Registrations: naya client = naya kaam (service ke hisaab se)
  const regs = await Client.find({ createdAt: range }).select('assesseeName businessName service createdAt feeAmount amountReceived feeStatus clientId').lean();
  regs.forEach(r => push({ line: regKey(r.service), kind: 'added', month: monthOf(r.createdAt), date: r.createdAt, name: r.businessName || r.assesseeName || 'Client', detail: [r.clientId, r.service].filter(Boolean).join(' · '), status: r.feeStatus, amount: num(r.feeAmount) }));

  // Revenue: invoice ki har line, service ke hisaab se (GST ke bina; proforma nahi)
  const invoices = await Invoice.find({ isProforma: { $ne: true }, invoiceDate: { $gte: `${fromKey}-01`, $lte: `${toKey}-31` } })
    .select('invoiceNo invoiceDate customer.name items taxableAmount').lean();
  invoices.forEach(inv => {
    const lines = (inv.items || []).map(item => ({ key: invoiceServiceOf(item), amount: (Number(item.qty) || 1) * (Number(item.rate) || 0), text: item.description }));
    const total = lines.reduce((s, l) => s + l.amount, 0);
    const taxable = Number(inv.taxableAmount) || 0;
    lines.forEach(l => {
      const amount = total > 0 ? (l.amount / total) * taxable : 0;
      const line = REPORT_LINES.find(([, , , inv2]) => inv2 === l.key)?.[0] || 'otherRev';
      push({ line, kind: 'revenue', month: String(inv.invoiceDate).slice(0, 7), date: inv.invoiceDate, name: inv.customer?.name || 'Client', detail: `${inv.invoiceNo} · ${l.text || ''}`.trim(), status: '', amount: Math.round(amount * 100) / 100 });
    });
  });

  return events;
};

const readFy = (value) => {
  const fy = String(value || '');
  if (!/^\d{4}-\d{2}$/.test(fy)) fail('Please choose a financial year');
  return fy;
};

// @route GET /api/service-report?fy=2026-27
export const getServiceReport = run(async (req, res) => {
  const fy = readFy(req.query.fy);
  const months = fyMonths(fy);
  const events = await collectEvents(months);

  // lines[key].months[month] = { added, done, doneFee, revenue }
  const lines = Object.fromEntries(REPORT_LINES.map(([key, label, group]) => [key, { key, label, group, months: {} }]));
  events.forEach(e => {
    const line = lines[e.line];
    if (!line) return;
    const cell = line.months[e.month] || (line.months[e.month] = { added: 0, done: 0, doneFee: 0, revenue: 0, pending: 0 });
    if (e.kind === 'added') cell.added += 1;
    if (e.kind === 'pending') cell.pending += 1;
    if (e.kind === 'done') { cell.done += 1; cell.doneFee += e.amountLabel ? 0 : (e.amount || 0); }
    if (e.kind === 'revenue') cell.revenue += e.amount || 0;
  });
  Object.values(lines).forEach(line => Object.values(line.months).forEach(c => { c.revenue = Math.round(c.revenue); c.doneFee = Math.round(c.doneFee); }));
  res.json({ fy, months, lines: Object.values(lines) });
});

// @route GET /api/service-report/details?fy=2026-27&line=itr&month=2026-10&kind=done
export const getServiceReportDetails = run(async (req, res) => {
  const fy = readFy(req.query.fy);
  const months = fyMonths(fy);
  const month = String(req.query.month || '');
  const wanted = month && months.includes(month) ? [month] : months;
  const line = String(req.query.line || '');
  const kind = String(req.query.kind || '');
  const events = (await collectEvents(wanted))
    .filter(e => (!line || e.line === line) && (!kind || e.kind === kind))
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 500)
    .map(e => ({ ...e, date: istKey(e.date) }));
  res.json({ items: events });
});
