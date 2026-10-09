// 🔴 BUSINESS HEALTH KPI ENGINE
// Saari calculation yahin (server par) hoti hai, taaki koi Excel / manual value KPI ka logic na badal sake.
//  - Ratio tabhi banta hai jab denominator zero na ho, warna value null (screen par "N/A").
//  - Green / Yellow / Red thresholds aur area weights Settings se aate hain (yahan sirf starting defaults hain).

// Monthly Input Master ke saare fields (label + unit). Form, validation aur export isi list se chalte hain.
export const INPUT_FIELDS = [
  { key: 'revenue', label: 'Total Revenue', unit: 'inr', group: 'Profit & Loss' },
  { key: 'direct_cost', label: 'Direct Cost', unit: 'inr', group: 'Profit & Loss' },
  { key: 'operating_expenses', label: 'Operating Expenses', unit: 'inr', group: 'Profit & Loss' },
  { key: 'ebitda', label: 'EBITDA', unit: 'inr', group: 'Profit & Loss' },
  { key: 'ebit', label: 'EBIT', unit: 'inr', group: 'Profit & Loss' },
  { key: 'pat', label: 'Profit After Tax (PAT)', unit: 'inr', group: 'Profit & Loss' },

  { key: 'current_assets', label: 'Current Assets', unit: 'inr', group: 'Balance Sheet & Cash' },
  { key: 'current_liabilities', label: 'Current Liabilities', unit: 'inr', group: 'Balance Sheet & Cash' },
  { key: 'quick_assets', label: 'Quick Assets', unit: 'inr', group: 'Balance Sheet & Cash' },
  { key: 'capital_employed', label: 'Capital Employed', unit: 'inr', group: 'Balance Sheet & Cash' },
  { key: 'cash_bank', label: 'Cash + Bank', unit: 'inr', group: 'Balance Sheet & Cash' },
  { key: 'available_cash', label: 'Available Cash', unit: 'inr', group: 'Balance Sheet & Cash' },
  { key: 'operating_cash_flow', label: 'Operating Cash Flow', unit: 'inr', group: 'Balance Sheet & Cash' },
  { key: 'average_monthly_cash_burn', label: 'Average Monthly Cash Burn', unit: 'inr', group: 'Balance Sheet & Cash' },

  { key: 'receivables', label: 'Receivables (Closing)', unit: 'inr', group: 'Collection' },
  { key: 'overdue_receivables', label: 'Overdue Receivables (30+ days)', unit: 'inr', group: 'Collection' },
  { key: 'average_receivables', label: 'Average Receivables', unit: 'inr', group: 'Collection' },
  { key: 'credit_revenue', label: 'Credit / Receivable Revenue', unit: 'inr', group: 'Collection' },

  { key: 'qualified_leads', label: 'Qualified Leads', unit: 'nos', group: 'Sales & Clients' },
  { key: 'converted_leads', label: 'Converted Leads', unit: 'nos', group: 'Sales & Clients' },
  { key: 'new_clients', label: 'New Clients', unit: 'nos', group: 'Sales & Clients' },
  { key: 'paying_clients', label: 'Paying Clients', unit: 'nos', group: 'Sales & Clients' },
  { key: 'opening_active_clients', label: 'Opening Active Clients', unit: 'nos', group: 'Sales & Clients' },
  { key: 'retained_clients', label: 'Retained / Renewed Clients', unit: 'nos', group: 'Sales & Clients' },

  { key: 'average_employees', label: 'Average Active Employees', unit: 'nos', group: 'Employees' },
  { key: 'employee_cost', label: 'Employee Cost', unit: 'inr', group: 'Employees' },

  { key: 'budget_revenue', label: 'Budget Revenue', unit: 'inr', group: 'Budget' },
  { key: 'budget_expense', label: 'Budget Expense', unit: 'inr', group: 'Budget' },
  { key: 'budget_profit', label: 'Budget Profit', unit: 'inr', group: 'Budget' }
];

export const INPUT_KEYS = INPUT_FIELDS.map(f => f.key);

export const AREAS = ['Profitability', 'Liquidity & Cash', 'Sales & Growth', 'Collection', 'Productivity', 'Budget Control'];

export const DEFAULT_WEIGHTS = {
  'Profitability': 25, 'Liquidity & Cash': 20, 'Sales & Growth': 20,
  'Collection': 15, 'Productivity': 10, 'Budget Control': 10
};

export const DEFAULT_SCORE_BANDS = { green: 80, yellow: 60 };

// Ek status ka score (area / overall score isi se banta hai)
const STATUS_SCORE = { GREEN: 100, YELLOW: 60, RED: 20 };

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
// Denominator zero / khali ho toh ratio nahi banta
const ratio = (a, b, multiplier = 1) => (isNum(a) && isNum(b) && b !== 0 ? (a / b) * multiplier : null);
const growth = (current, previous) => (isNum(current) && isNum(previous) && previous !== 0 ? ((current - previous) / Math.abs(previous)) * 100 : null);
const grossProfit = (m) => (isNum(m.revenue) && isNum(m.direct_cost) ? m.revenue - m.direct_cost : null);
// Budget ke saamne "actual expense" = direct cost + operating expenses
const actualExpense = (m) => (isNum(m.direct_cost) || isNum(m.operating_expenses) ? (m.direct_cost || 0) + (m.operating_expenses || 0) : null);

// direction: 'higher' = zyada accha, 'lower' = kam accha.
// green / yellow = starting guide (PDF ke hisaab se). null = company apna target Settings me set karegi.
export const KPI_DEFS = [
  { code: 'gross_profit_margin', name: 'Gross Profit Margin', area: 'Profitability', unit: 'pct', direction: 'higher', green: 40, yellow: 25, formula: 'gross_profit / revenue × 100', calc: (m) => ratio(grossProfit(m), m.revenue, 100) },
  { code: 'ebitda_margin', name: 'EBITDA Margin', area: 'Profitability', unit: 'pct', direction: 'higher', green: 20, yellow: 10, formula: 'ebitda / revenue × 100', calc: (m) => ratio(m.ebitda, m.revenue, 100) },
  { code: 'net_profit_margin', name: 'Net Profit Margin', area: 'Profitability', unit: 'pct', direction: 'higher', green: 10, yellow: 5, formula: 'pat / revenue × 100', calc: (m) => ratio(m.pat, m.revenue, 100) },
  { code: 'roce', name: 'ROCE', area: 'Profitability', unit: 'pct', direction: 'higher', green: null, yellow: null, formula: 'ebit / capital_employed × 100', calc: (m) => ratio(m.ebit, m.capital_employed, 100) },
  { code: 'expense_to_revenue', name: 'Expense-to-Revenue', area: 'Profitability', unit: 'pct', direction: 'lower', green: 70, yellow: 85, formula: 'operating_expenses / revenue × 100', calc: (m) => ratio(m.operating_expenses, m.revenue, 100) },

  { code: 'current_ratio', name: 'Current Ratio', area: 'Liquidity & Cash', unit: 'x', direction: 'higher', green: 1.5, yellow: 1, formula: 'current_assets / current_liabilities', calc: (m) => ratio(m.current_assets, m.current_liabilities) },
  { code: 'quick_ratio', name: 'Quick Ratio', area: 'Liquidity & Cash', unit: 'x', direction: 'higher', green: 1, yellow: 0.8, formula: 'quick_assets / current_liabilities', calc: (m) => ratio(m.quick_assets, m.current_liabilities) },
  { code: 'ocf_margin', name: 'Operating Cash Flow Margin', area: 'Liquidity & Cash', unit: 'pct', direction: 'higher', green: 10, yellow: 5, formula: 'operating_cash_flow / revenue × 100', calc: (m) => ratio(m.operating_cash_flow, m.revenue, 100) },
  { code: 'cash_runway', name: 'Cash Runway', area: 'Liquidity & Cash', unit: 'months', direction: 'higher', green: 3, yellow: 1.5, formula: 'available_cash / average_monthly_cash_burn', calc: (m) => ratio(m.available_cash, m.average_monthly_cash_burn) },

  { code: 'revenue_growth', name: 'Revenue Growth', area: 'Sales & Growth', unit: 'pct', direction: 'higher', green: 5, yellow: 0, formula: '(current revenue − previous revenue) / previous revenue × 100', calc: (m, p) => growth(m.revenue, p?.revenue) },
  { code: 'profit_growth', name: 'Profit Growth', area: 'Sales & Growth', unit: 'pct', direction: 'higher', green: 5, yellow: 0, formula: '(current PAT − previous PAT) / previous PAT × 100', calc: (m, p) => growth(m.pat, p?.pat) },
  { code: 'lead_conversion', name: 'Lead Conversion', area: 'Sales & Growth', unit: 'pct', direction: 'higher', green: 20, yellow: 10, formula: 'converted_leads / qualified_leads × 100', calc: (m) => ratio(m.converted_leads, m.qualified_leads, 100) },
  { code: 'average_billing', name: 'Average Billing', area: 'Sales & Growth', unit: 'inr', direction: 'higher', green: null, yellow: null, formula: 'revenue / paying_clients', calc: (m) => ratio(m.revenue, m.paying_clients) },
  { code: 'client_retention', name: 'Client Retention', area: 'Sales & Growth', unit: 'pct', direction: 'higher', green: 85, yellow: 70, formula: 'retained_clients / opening_active_clients × 100', calc: (m) => ratio(m.retained_clients, m.opening_active_clients, 100) },

  { code: 'dso', name: 'DSO (Days Sales Outstanding)', area: 'Collection', unit: 'days', direction: 'lower', green: 30, yellow: 45, formula: 'average_receivables / credit_revenue × 30', calc: (m) => ratio(m.average_receivables, m.credit_revenue, 30) },

  { code: 'revenue_per_employee', name: 'Revenue / Employee', area: 'Productivity', unit: 'inr', direction: 'higher', green: null, yellow: null, formula: 'revenue / average_employees', calc: (m) => ratio(m.revenue, m.average_employees) },
  { code: 'revenue_per_employee_cost', name: 'Revenue / Employee Cost', area: 'Productivity', unit: 'x', direction: 'higher', green: 3, yellow: 2, formula: 'revenue / employee_cost', calc: (m) => ratio(m.revenue, m.employee_cost) },

  { code: 'revenue_budget_achievement', name: 'Revenue Budget Achievement', area: 'Budget Control', unit: 'pct', direction: 'higher', green: 100, yellow: 90, formula: 'actual revenue / budget revenue × 100', calc: (m) => ratio(m.revenue, m.budget_revenue, 100) },
  { code: 'expense_variance', name: 'Expense Variance', area: 'Budget Control', unit: 'pct', direction: 'lower', green: 0, yellow: 10, formula: '(actual expense − budget expense) / budget expense × 100', calc: (m) => { const actual = actualExpense(m); return isNum(actual) && isNum(m.budget_expense) && m.budget_expense !== 0 ? ((actual - m.budget_expense) / m.budget_expense) * 100 : null; } },
  { code: 'profit_budget_achievement', name: 'Profit Budget Achievement', area: 'Budget Control', unit: 'pct', direction: 'higher', green: 100, yellow: 90, formula: 'actual profit (PAT) / budget profit × 100', calc: (m) => ratio(m.pat, m.budget_profit, 100) }
];

export const getDefaultThresholds = () => {
  const thresholds = {};
  KPI_DEFS.forEach(k => { thresholds[k.code] = { green: k.green, yellow: k.yellow, direction: k.direction }; });
  return thresholds;
};

// Settings (DB) + defaults ko milana, taaki naya KPI judne par bhi sab chale
export const mergeSettings = (saved) => {
  const defaults = getDefaultThresholds();
  const thresholds = {};
  Object.keys(defaults).forEach(code => {
    const s = saved?.thresholds?.[code] || {};
    thresholds[code] = {
      green: s.green === undefined ? defaults[code].green : s.green,
      yellow: s.yellow === undefined ? defaults[code].yellow : s.yellow,
      direction: ['higher', 'lower'].includes(s.direction) ? s.direction : defaults[code].direction
    };
  });

  const weights = {};
  AREAS.forEach(area => { weights[area] = isNum(saved?.weights?.[area]) ? saved.weights[area] : DEFAULT_WEIGHTS[area]; });

  return {
    thresholds,
    weights,
    scoreBands: {
      green: isNum(saved?.scoreBands?.green) ? saved.scoreBands.green : DEFAULT_SCORE_BANDS.green,
      yellow: isNum(saved?.scoreBands?.yellow) ? saved.scoreBands.yellow : DEFAULT_SCORE_BANDS.yellow
    }
  };
};

// GREEN / YELLOW / RED / GREY (GREY = data nahi ya target set nahi)
export const getStatus = (value, threshold) => {
  if (!isNum(value) || !threshold || !isNum(threshold.green)) return 'GREY';
  const yellow = isNum(threshold.yellow) ? threshold.yellow : threshold.green;

  if (threshold.direction === 'lower') {
    if (value <= threshold.green) return 'GREEN';
    return value <= yellow ? 'YELLOW' : 'RED';
  }
  if (value >= threshold.green) return 'GREEN';
  return value >= yellow ? 'YELLOW' : 'RED';
};

const round2 = (v) => (isNum(v) ? Math.round(v * 100) / 100 : null);

// Record ke inputs saaf karna (sirf numbers; khali = null)
export const pickInputs = (record) => {
  const inputs = {};
  INPUT_KEYS.forEach(key => {
    const v = record?.[key];
    inputs[key] = v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) ? null : Number(v);
  });
  return inputs;
};

// Ek month ka poora result: KPIs, area scores, overall score
export const calculateBusinessHealth = (record, previousRecord, savedSettings) => {
  const settings = mergeSettings(savedSettings);
  const m = pickInputs(record);
  const p = previousRecord ? pickInputs(previousRecord) : null;

  const kpis = KPI_DEFS.map(def => {
    const actual = round2(def.calc(m, p));
    const previous = p ? round2(def.calc(p, null)) : null;
    const threshold = settings.thresholds[def.code];
    const status = getStatus(actual, threshold);
    const target = isNum(threshold.green) ? threshold.green : null;

    return {
      code: def.code, name: def.name, area: def.area, unit: def.unit, formula: def.formula,
      direction: threshold.direction,
      actual, previous, target,
      yellowLimit: isNum(threshold.yellow) ? threshold.yellow : null,
      variance: isNum(actual) && isNum(target) ? round2(actual - target) : null,
      status,
      score: STATUS_SCORE[status] ?? null,
      note: !isNum(actual) ? 'N/A (data missing or denominator is zero)' : !isNum(target) ? 'No target set yet' : ''
    };
  });

  // Area score = us area ke scored KPIs ka average. Jis area me data nahi wo overall score se bahar.
  const areas = AREAS.map(area => {
    const scored = kpis.filter(k => k.area === area && k.score !== null);
    const score = scored.length ? Math.round(scored.reduce((sum, k) => sum + k.score, 0) / scored.length) : null;
    return { area, weight: settings.weights[area], score, kpiCount: kpis.filter(k => k.area === area).length, scoredCount: scored.length };
  });

  const usable = areas.filter(a => a.score !== null && a.weight > 0);
  const weightSum = usable.reduce((sum, a) => sum + a.weight, 0);
  const overallScore = weightSum > 0 ? Math.round(usable.reduce((sum, a) => sum + a.score * a.weight, 0) / weightSum) : null;
  const overallStatus = overallScore === null ? 'GREY'
    : overallScore >= settings.scoreBands.green ? 'GREEN'
    : overallScore >= settings.scoreBands.yellow ? 'YELLOW' : 'RED';

  return {
    inputs: { ...m, gross_profit: grossProfit(m), actual_expense: actualExpense(m) },
    previousInputs: p ? { ...p, gross_profit: grossProfit(p), actual_expense: actualExpense(p) } : null,
    kpis, areas, overallScore, overallStatus,
    coverage: { scoredWeight: weightSum, totalWeight: areas.reduce((sum, a) => sum + a.weight, 0) },
    settings
  };
};

export const previousMonth = (month) => {
  const [y, mo] = month.split('-').map(Number);
  return new Date(Date.UTC(y, mo - 2, 1)).toISOString().slice(0, 7);
};

export const isValidMonth = (month) => /^\d{4}-(0[1-9]|1[0-2])$/.test(month || '');
