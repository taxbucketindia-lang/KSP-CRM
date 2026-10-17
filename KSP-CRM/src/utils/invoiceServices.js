// 🔴 Invoice ki har line kis service ki hai: Business MIS (P&L) me revenue isi se ITR / GST / ... me jaata hai.
// key wahi hain jo backend (businessMisController) aur P&L ki revenue lines me hain.
export const INVOICE_SERVICES = [
  ['itr', 'ITR'],
  ['gst', 'GST'],
  ['accounting', 'Accounting'],
  ['tds', 'TDS'],
  ['roc', 'ROC / Compliance'],
  ['registration', 'Registration'],
  ['audit', 'Audit / Tax Audit'],
  ['cfo', 'Virtual CFO'],
  ['otherRev', 'Other']
];

// Purani line (jisme service nahi chuni thi): description ke shabd se andaza (edit karte waqt pehle se bhar jata hai)
const RULES = [
  ['cfo', /cfo/i],
  ['audit', /audit/i],
  ['itr', /\bitr\b|income\s*tax\s*return|income tax/i],
  ['tds', /\btds\b|\btcs\b/i],
  ['gst', /\bgst\b|gstr/i],
  ['roc', /\broc\b|\bmca\b|annual\s*filing|compliance|dir-?3|aoc|mgt/i],
  ['registration', /registration|incorporat|trademark|fssai|msme|udyam|iec|pan\s*card|tan|startup|company\s*form|llp/i],
  ['accounting', /account|bookkeep|book\s*keep|tally|ledger/i]
];
export const guessService = (description) => (RULES.find(([, rule]) => rule.test(String(description || ''))) || [''])[0];
