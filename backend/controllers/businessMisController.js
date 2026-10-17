import BusinessMis from '../models/BusinessMis.js';
import Invoice from '../models/Invoice.js';
import Expense from '../models/Expense.js';
import Salary from '../models/Salary.js';
import Vendor from '../models/Vendor.js';

// 🔴 BUSINESS MIS: mahine ka hisaab. Budget aur jo cheez CRM me nahi hai woh CEO bharta hai;
// "actual" ke liye jo CRM me pehle se hai (invoice, payment, office expense, salary, vendor payment) woh yahan se jaata hai.

const run = (handler) => async (req, res) => {
  try { await handler(req, res); } catch (error) { res.status(error.status || 500).json({ message: error.message }); }
};
const fail = (message, status = 400) => { const error = new Error(message); error.status = status; throw error; };
const round = (value) => Math.round((Number(value) || 0) * 100) / 100;
const istKey = (date) => (date ? new Date(date).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) : '');
const validMonth = (month) => /^\d{4}-(0[1-9]|1[0-2])$/.test(String(month || ''));
const previousMonth = (month) => {
  const [y, m] = month.split('-').map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
};
const lastDay = (month) => { const [y, m] = month.split('-').map(Number); return new Date(Date.UTC(y, m, 0)).getUTCDate(); };
// Hafta: 1-7 = Week 1, 8-14 = Week 2, 15-21 = Week 3, 22-28 = Week 4, 29 se aakhir tak = Week 5
const weekOf = (dateKey) => Math.min(5, Math.ceil(Number(dateKey.slice(8, 10)) / 7));
const blankWeeks = () => [0, 0, 0, 0, 0];

// Office Expense ki "Nature" se Expense Budget ki line (shabd dekh kar). Jo match na ho = Miscellaneous
const EXPENSE_RULES = [
  ['pfesi', /\b(pf|esi|epf|provident)\b/i],
  ['salesIncentive', /sales\s*incentive/i],
  ['incentives', /incentive|bonus/i],
  ['salaries', /salary|salaries|wage|stipend/i],
  ['rent', /\brent\b/i],
  ['electricity', /electric|light\s*bill|power\s*bill/i],
  ['internet', /internet|wifi|wi-fi|broadband|telephone|phone|mobile|recharge|jio|airtel/i],
  ['software', /software|crm|subscription|domain|hosting|server|saas|license|licence|zoho|tally/i],
  ['ads', /google\s*ads|meta|facebook|instagram|adwords|\bads?\b/i],
  ['marketing', /marketing|promotion|banner|pamphlet|branding|advertis/i],
  ['commission', /commission/i],
  ['legal', /\bca\b|legal|lawyer|advocate|compliance|roc\s*fee|audit\s*fee|filing\s*fee/i],
  ['professional', /professional|consult/i],
  ['supplies', /stationery|stationary|supplies|printing|xerox|courier|postage/i],
  ['travel', /travel|conveyance|petrol|diesel|fuel|cab|uber|ola|rapido|auto|taxi|metro|toll|parking/i],
  ['welfare', /tea|coffee|snack|refreshment|pantry|water|staff|welfare|party|celebration|cake/i],
  ['hospitality', /client|meeting|hospitality|lunch|dinner|hotel/i],
  ['repairs', /repair|maintenance|service charge|plumb|electrician|ac service/i],
  ['bank', /bank\s*charge|gateway|razorpay|paytm|charges/i],
  ['training', /training|course|seminar|workshop/i],
  ['recruitment', /recruit|hiring|naukri|job\s*portal|indeed/i],
  ['depreciation', /depreciation/i],
  ['finance', /interest|loan|emi|finance\s*cost/i]
];
export const expenseHeadFor = (nature) => (EXPENSE_RULES.find(([, rule]) => rule.test(String(nature || ''))) || ['misc'])[0];

// Expense line -> Cash Flow ki kharche wali line (depreciation cash nahi hai, isliye nahi)
const CASH_ROW_FOR_HEAD = {
  salaries: 'salaries', incentives: 'salaries', pfesi: 'salaries', salesIncentive: 'salaries',
  rent: 'rent', ads: 'marketing', marketing: 'marketing', commission: 'commission',
  professional: 'professional', legal: 'professional', software: 'software',
  electricity: 'utilities', internet: 'utilities', travel: 'travel',
  supplies: 'admin', hospitality: 'admin', welfare: 'admin', repairs: 'admin', bank: 'admin', training: 'admin', recruitment: 'admin',
  finance: 'other', misc: 'other'
};

// Invoice ki line -> P&L ki revenue line
const REVENUE_RULES = [
  ['cfo', /cfo/i],
  ['audit', /audit/i],
  ['itr', /\bitr\b|income\s*tax\s*return|income tax/i],
  ['tds', /\btds\b|\btcs\b/i],
  ['gst', /\bgst\b|gstr/i],
  ['roc', /\broc\b|\bmca\b|annual\s*filing|compliance|dir-?3|aoc|mgt/i],
  ['registration', /registration|incorporat|trademark|fssai|msme|udyam|iec|pan\s*card|tan|startup|company\s*form|llp/i],
  ['accounting', /account|bookkeep|book\s*keep|tally|ledger/i]
];
const REVENUE_KEYS = ['itr', 'gst', 'accounting', 'tds', 'roc', 'registration', 'audit', 'cfo', 'otherRev'];
// Pehle invoice me chuni hui Service; purani line (service nahi chuni) ho toh description ke shabd se andaza
const revenueLineFor = (item) => (REVENUE_KEYS.includes(item?.service) ? item.service
  : (REVENUE_RULES.find(([, rule]) => rule.test(String(item?.description || ''))) || ['otherRev'])[0]);

// CRM se is mahine ka actual
const crmFigures = async (month) => {
  const from = `${month}-01`;
  const to = `${month}-${String(lastDay(month)).padStart(2, '0')}`;
  const inMonth = (key) => key >= from && key <= to;

  const billing = { current: 0, revenueExGst: 0, collection: 0, tds: 0, discount: 0, opening: 0, closing: 0, invoiceCount: 0 };
  const revenue = {};
  const weeks = { collections: blankWeeks(), receivables: blankWeeks() };

  // Proforma bill asli bikri nahi hai
  const invoices = await Invoice.find({ isProforma: { $ne: true }, invoiceDate: { $lte: to } })
    .select('invoiceDate totalAmountAfterTax taxableAmount items paymentHistory').lean();
  invoices.forEach(inv => {
    const total = Number(inv.totalAmountAfterTax) || 0;
    const settledBy = (limit) => (inv.paymentHistory || [])
      .filter(p => istKey(p.date) && istKey(p.date) <= limit)
      .reduce((sum, p) => sum + (Number(p.amount) || 0) + (Number(p.discount) || 0) + (Number(p.tds) || 0), 0);
    // Mahine ki shuruaat me kitna baaki tha (pichhle mahino ke bill) aur mahine ke aakhir me
    if (inv.invoiceDate < from) billing.opening += Math.max(0, total - settledBy(previousDayKey(from)));
    billing.closing += Math.max(0, total - settledBy(to));

    if (inMonth(inv.invoiceDate)) {
      billing.current += total;
      billing.revenueExGst += Number(inv.taxableAmount) || 0;
      billing.invoiceCount += 1;
      // Revenue line-wise: har line ki rakam, bill ke taxable ke hisaab se (discount ho toh barabar baant kar)
      const lines = (inv.items || []).map(item => ({ key: revenueLineFor(item), amount: (Number(item.qty) || 1) * (Number(item.rate) || 0) }));
      const linesTotal = lines.reduce((sum, l) => sum + l.amount, 0);
      const taxable = Number(inv.taxableAmount) || 0;
      if (linesTotal > 0) lines.forEach(l => { revenue[l.key] = (revenue[l.key] || 0) + (l.amount / linesTotal) * taxable; });
      else revenue.otherRev = (revenue.otherRev || 0) + taxable;
    }

    (inv.paymentHistory || []).forEach(p => {
      const key = istKey(p.date);
      if (!key || !inMonth(key)) return;
      const amount = Number(p.amount) || 0;
      billing.collection += amount;
      billing.tds += Number(p.tds) || 0;
      billing.discount += Number(p.discount) || 0;
      // Is mahine ke bill ka paisa = Client Collections; purane bill ka = Existing Client Receivables
      if (inMonth(inv.invoiceDate)) weeks.collections[weekOf(key) - 1] += amount;
      else weeks.receivables[weekOf(key) - 1] += amount;
    });
  });

  // Office Expense: nature ke hisaab se line, aur hafte ke hisaab se cash
  const expenses = {};
  const cashOut = {};
  const startDate = new Date(`${from}T00:00:00+05:30`);
  const endDate = new Date(`${to}T23:59:59.999+05:30`);
  const officeExpenses = await Expense.find({ date: { $gte: startDate, $lte: endDate } }).select('date nature amount').lean();
  officeExpenses.forEach(e => {
    const head = expenseHeadFor(e.nature);
    const amount = Number(e.amount) || 0;
    expenses[head] = (expenses[head] || 0) + amount;
    const row = CASH_ROW_FOR_HEAD[head];
    if (row) { cashOut[row] = cashOut[row] || blankWeeks(); cashOut[row][weekOf(istKey(e.date)) - 1] += amount; }
  });

  // Salary module: is mahine ki bani hui (final / paid) salary
  const salaries = await Salary.find({ monthYear: month, status: { $in: ['Finalized', 'Paid'] } }).select('netPayable').lean();
  const salaryTotal = salaries.reduce((sum, s) => sum + (Number(s.netPayable) || 0), 0);
  if (salaryTotal) expenses.salaries = (expenses.salaries || 0) + salaryTotal;

  // Vendors (CA / CS / Advocate ko diya outsourced kaam): P&L me direct cost, cash flow me professional fees
  let vendorPaid = 0;
  const vendors = await Vendor.find({ 'payments.date': { $gte: from, $lte: to } }).select('payments').lean();
  vendors.forEach(v => (v.payments || []).forEach(p => {
    if (!inMonth(String(p.date || ''))) return;
    const amount = Number(p.amount) || 0;
    vendorPaid += amount;
    cashOut.professional = cashOut.professional || blankWeeks();
    cashOut.professional[weekOf(p.date) - 1] += amount;
  }));

  const roundAll = (obj) => Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, Array.isArray(v) ? v.map(round) : round(v)]));
  return {
    billing: roundAll(billing),
    revenue: roundAll(revenue),
    expenses: roundAll(expenses),
    salaryTotal: round(salaryTotal),
    salaryCount: salaries.length,
    officeExpenseCount: officeExpenses.length,
    vendorPaid: round(vendorPaid),
    weeks: { collections: weeks.collections.map(round), receivables: weeks.receivables.map(round), out: roundAll(cashOut) }
  };
};
const previousDayKey = (dateKey) => {
  const d = new Date(`${dateKey}T12:00:00+05:30`);
  d.setDate(d.getDate() - 1);
  return istKey(d);
};

// @route GET /api/business-mis?month=YYYY-MM
export const getMis = run(async (req, res) => {
  const month = String(req.query.month || '');
  if (!validMonth(month)) fail('Please choose a valid month');
  const [record, previous, crm] = await Promise.all([
    BusinessMis.findOne({ month }).lean(),
    BusinessMis.findOne({ month: previousMonth(month) }).lean(),
    crmFigures(month)
  ]);
  res.json({
    month,
    data: record?.data || {},
    savedAt: record?.updatedAt || null,
    savedBy: record?.updatedByName || '',
    previous: previous ? { month: previous.month, data: previous.data || {}, closingCash: previous.closingCash } : null,
    crm
  });
});

// Sirf number ya null (khali); galat cheez = null
const num = (value) => (value === '' || value === null || value === undefined || !Number.isFinite(Number(value)) ? null : round(value));
const text = (value, max = 500) => String(value ?? '').slice(0, max);
const cleanMap = (obj, fields) => Object.fromEntries(Object.entries(obj && typeof obj === 'object' ? obj : {})
  .filter(([key]) => /^[\w-]{1,40}$/.test(key))
  .slice(0, 80)
  .map(([key, value]) => [key, Object.fromEntries(fields.map(f => [f, num(value?.[f])]))]));

// @route PUT /api/business-mis/:month  { data, closingCash }
export const saveMis = run(async (req, res) => {
  const { month } = req.params;
  if (!validMonth(month)) fail('Please choose a valid month');
  const input = req.body.data || {};
  const cash = input.cashflow || {};
  const data = {
    cashflow: {
      opening: num(cash.opening),
      cells: cleanMap(cash.cells, ['w1', 'w2', 'w3', 'w4', 'w5']),
      remarks: Object.fromEntries(Object.entries(cash.remarks || {}).filter(([k]) => /^[\w-]{1,40}$/.test(k)).slice(0, 80).map(([k, v]) => [k, text(v)]))
    },
    pl: cleanMap(input.pl, ['budget', 'actual']),
    expenses: (Array.isArray(input.expenses) ? input.expenses : []).slice(0, 80).map(row => ({
      key: text(row.key, 40) || `custom-${Date.now()}`,
      head: text(row.head, 80),
      category: text(row.category, 40),
      custom: !!row.custom,
      budget: num(row.budget),
      actual: num(row.actual),
      reason: text(row.reason),
      action: text(row.action)
    })),
    billing: cleanMap(input.billing, ['target', 'actual'])
  };
  const record = await BusinessMis.findOneAndUpdate(
    { month },
    { $set: { data, closingCash: num(req.body.closingCash), updatedBy: req.user._id, updatedByName: req.user.name || '' } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  res.json({ savedAt: record.updatedAt, savedBy: record.updatedByName });
});
