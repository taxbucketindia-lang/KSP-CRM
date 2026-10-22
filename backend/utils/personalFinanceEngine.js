// 🔴 PERSONAL CASH FLOW ka hisaab (posting rules). Sab kuch paise (integer) me.
// Balance kahin save nahi hota: har baar opening + transactions se nikalta hai,
// isliye edit / delete ke baad hisaab apne aap sahi rehta hai aur double posting nahi ho sakti.

export const DEFAULT_CATEGORIES = {
  INCOME: ['Salary', 'Personal Withdrawal from Business', 'Interest', 'Rent Received', 'Other Income'],
  EXPENSE: ['Household', 'Grocery', 'Rent', 'Utilities', 'Travel/Fuel', 'Shopping', 'Medical', 'Education', 'EMI/Loan Interest', 'Entertainment', 'Personal Care', 'Fees/Subscriptions', 'Other Expense']
};

export const isCard = (account) => account?.type === 'CREDIT_CARD';
export const isInvestment = (account) => account?.type === 'INVESTMENT';
// Account se kitna nikla: Redemption me investment se sirf "lagaya hua" hissa nikalta hai (munafa bahar se aaya)
export const outAmount = (t) => (t.type === 'Redemption' && Number.isFinite(t.costPaise) ? t.costPaise : t.amountPaise);
export const redemptionProfit = (t) => (t.type === 'Redemption' && Number.isFinite(t.costPaise) ? t.amountPaise - t.costPaise : 0);
const id = (value) => (value ? String(value._id || value) : '');

// Har account me kitna aaya (in) aur kitna gaya (out)
export const collectMoves = (txns) => {
  const moves = {};
  const slot = (key) => (moves[key] = moves[key] || { in: 0, out: 0 });
  txns.forEach(t => {
    if (t.fromAccount) slot(id(t.fromAccount)).out += outAmount(t);
    if (t.toAccount) slot(id(t.toAccount)).in += t.amountPaise;
  });
  return moves;
};

// Cash / Bank: opening + aaya - gaya.  Credit card (bakaya): opening + kharcha - payment / refund.
export const accountBalance = (account, move = { in: 0, out: 0 }) =>
  isCard(account)
    ? account.openingPaise + move.out - move.in
    : account.openingPaise + move.in - move.out;

// Dashboard ke totals: sirf active accounts. Total Available = Cash + Bank (card ki limit / bakaya nahi).
export const balanceTotals = (accounts, moves) => {
  const totals = { cash: 0, bank: 0, other: 0, card: 0, investment: 0 };
  accounts.filter(a => a.isActive).forEach(a => {
    const balance = accountBalance(a, moves[id(a)]);
    if (a.type === 'CASH') totals.cash += balance;
    else if (a.type === 'BANK') totals.bank += balance;
    else if (a.type === 'CREDIT_CARD') totals.card += balance;
    else if (a.type === 'INVESTMENT') totals.investment += balance; // alag: Total Available me nahi
    else totals.other += balance;
  });
  return { ...totals, available: totals.cash + totals.bank };
};

export const NATURES = ['Personal', 'Office'];
export const EXPENSE_LIKE = ['Expense', 'Card Purchase', 'Refund'];

// Kharche ke hisse: split ho toh uske hisse, warna poori raqam ek hissa (purani entry me nature na ho toh Personal)
export const expenseParts = (t) => (t.splits && t.splits.length
  ? t.splits
  : [{ nature: NATURES.includes(t.nature) ? t.nature : 'Personal', categoryName: t.categoryName, amountPaise: t.amountPaise }]);

// Income / Expense ka jod. Transfer aur card settlement ginte nahi (double count na ho).
// Card purchase kharche me usi din ginta hai; refund kharcha ghatata hai.
// Category-wise aur Personal / Office ke total kharche ke hisson (splits) se bante hain.
// options.nature ('Personal' / 'Office') dene par sirf usi nature ke hisse gine jate hain (income / transfer nahi).
export const summarize = (txns, { nature = '' } = {}) => {
  let income = 0, expense = 0, refunds = 0, transfers = 0, settlements = 0, invested = 0, redeemed = 0, investmentProfit = 0;
  const categories = {};
  const natures = Object.fromEntries(NATURES.map(n => [n, 0]));
  const modes = {};
  txns.forEach(t => {
    const amount = t.amountPaise;
    const mode = (modes[t.mode] = modes[t.mode] || { mode: t.mode, income: 0, expense: 0, other: 0 });
    if (EXPENSE_LIKE.includes(t.type)) {
      const sign = t.type === 'Refund' ? -1 : 1;
      expenseParts(t).forEach(part => {
        if (nature && part.nature !== nature) return;
        const value = part.amountPaise;
        if (sign > 0) expense += value; else refunds += value;
        mode.expense += sign * value;
        const name = part.categoryName || 'Uncategorised';
        categories[name] = (categories[name] || 0) + sign * value;
        natures[part.nature] = (natures[part.nature] || 0) + sign * value;
      });
    } else if (nature) {
      // Nature ka filter ho toh income / transfer gine nahi jate
    } else if (t.type === 'Investment') {
      // Paisa investment me gaya: kharcha nahi
      invested += amount; mode.other += amount;
    } else if (t.type === 'Redemption') {
      // Wapas aaya: lagaya hua hissa = paisa wapas, upar ka = income (munafa); kam aaya toh nuksaan = kharcha
      const profit = redemptionProfit(t);
      redeemed += outAmount(t); investmentProfit += profit;
      if (profit > 0) { income += profit; mode.income += profit; }
      else if (profit < 0) {
        expense += -profit; mode.expense += -profit;
        categories['Investment Loss'] = (categories['Investment Loss'] || 0) - profit;
        natures.Personal = (natures.Personal || 0) - profit;
      }
      mode.other += outAmount(t);
    } else if (t.type === 'Income') { income += amount; mode.income += amount; }
    else {
      if (t.type === 'Transfer') transfers += amount; else settlements += amount;
      mode.other += amount;
    }
  });
  const netExpense = expense - refunds;
  return {
    income, expense: netExpense, grossExpense: expense, refunds, transfers, settlements, invested, redeemed, investmentProfit,
    net: income - netExpense,
    categoryWise: Object.entries(categories).map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount),
    natureWise: NATURES.map(n => ({ nature: n, amount: natures[n] })),
    modeWise: Object.values(modes).filter(m => m.income || m.expense || m.other)
  };
};

// Month-wise income / expense / net
export const monthlySummary = (txns) => {
  const byMonth = {};
  txns.forEach(t => { (byMonth[t.date.slice(0, 7)] = byMonth[t.date.slice(0, 7)] || []).push(t); });
  return Object.keys(byMonth).sort().map(month => {
    const s = summarize(byMonth[month]);
    return { month, income: s.income, expense: s.expense, net: s.net, count: byMonth[month].length };
  });
};

// Har din ke ant me Cash / Bank / Total Available / Card bakaya.
// priorTxns = range se pehle ke transactions, rangeTxns = range ke andar ke.
export const dailyClosing = (accounts, priorTxns, rangeTxns) => {
  const moves = collectMoves(priorTxns);
  const days = [...new Set(rangeTxns.map(t => t.date))].sort();
  return days.map(date => {
    rangeTxns.filter(t => t.date === date).forEach(t => {
      if (t.fromAccount) (moves[id(t.fromAccount)] = moves[id(t.fromAccount)] || { in: 0, out: 0 }).out += outAmount(t);
      if (t.toAccount) (moves[id(t.toAccount)] = moves[id(t.toAccount)] || { in: 0, out: 0 }).in += t.amountPaise;
    });
    return { date, ...balanceTotals(accounts, moves) };
  });
};

// Ek account ka ledger: har entry ke baad ka balance (bank statement jaisa)
export const accountLedger = (account, priorTxns, rangeTxns) => {
  const accountId = id(account);
  let balance = accountBalance(account, collectMoves(priorTxns)[accountId]);
  const opening = balance;
  const rows = rangeTxns.map(t => {
    const moneyIn = id(t.toAccount) === accountId ? t.amountPaise : 0;
    const moneyOut = id(t.fromAccount) === accountId ? outAmount(t) : 0;
    // Card me "out" bakaya badhata hai, "in" ghatata hai
    balance += isCard(account) ? moneyOut - moneyIn : moneyIn - moneyOut;
    return { txn: t, in: moneyIn, out: moneyOut, balance };
  });
  return { opening, closing: balance, rows };
};
