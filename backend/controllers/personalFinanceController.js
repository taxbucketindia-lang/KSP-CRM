import mongoose from 'mongoose';
import { PfAccount, PfCategory, PfTransaction, ACCOUNT_TYPES, TRANSACTION_TYPES, CATEGORY_TYPES } from '../models/PersonalFinance.js';
import {
  DEFAULT_CATEGORIES, isCard, collectMoves, accountBalance, balanceTotals,
  summarize, monthlySummary, dailyClosing, accountLedger
} from '../utils/personalFinanceEngine.js';

// 🔴 PERSONAL CASH FLOW: har record owner (login kiye hue CEO) ka apna hai.
// Har query me owner lagta hai, isliye koi doosra user yeh data kabhi nahi dekh sakta.

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const rupees = (paise) => Math.round(paise || 0) / 100;
const istToday = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

const fail = (message, status = 400) => { const error = new Error(message); error.status = status; throw error; };
const run = (handler) => async (req, res) => {
  try {
    await handler(req, res);
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
};

const validId = (value) => mongoose.Types.ObjectId.isValid(String(value || ''));
const validDay = (value) => DAY.test(String(value || '')) && !Number.isNaN(new Date(`${value}T00:00:00Z`).getTime());

// Rupaye (2 decimal tak) -> paise
const toPaise = (value, label, { allowZero = false, allowNegative = false } = {}) => {
  const number = Number(value);
  if (value === '' || value === null || value === undefined || !Number.isFinite(number)) fail(`${label} must be a number`);
  if (Math.abs(number * 100 - Math.round(number * 100)) > 1e-6) fail(`${label} can have at most 2 decimal places`);
  if (!allowNegative && number < 0) fail(`${label} cannot be negative`);
  if (!allowZero && number === 0) fail(`${label} must be more than zero`);
  return Math.round(number * 100);
};

// Pehli baar kholne par default categories bana do
const ensureCategories = async (owner) => {
  if (await PfCategory.exists({ owner })) return;
  const docs = CATEGORY_TYPES.flatMap(type => DEFAULT_CATEGORIES[type].map(name => ({ owner, type, name })));
  await PfCategory.insertMany(docs, { ordered: false }).catch(() => {});
};

const liveMatch = (owner, extra = {}) => ({ owner, deletedAt: null, ...extra });

// Har account ka in / out (database me hi jod kar): balance nikalne ke liye
const loadMoves = async (owner) => {
  const group = (field) => PfTransaction.aggregate([
    { $match: liveMatch(owner, { [field]: { $ne: null } }) },
    { $group: { _id: `$${field}`, total: { $sum: '$amountPaise' } } }
  ]);
  const [outs, ins] = await Promise.all([group('fromAccount'), group('toAccount')]);
  const moves = {};
  outs.forEach(row => { (moves[String(row._id)] = moves[String(row._id)] || { in: 0, out: 0 }).out = row.total; });
  ins.forEach(row => { (moves[String(row._id)] = moves[String(row._id)] || { in: 0, out: 0 }).in = row.total; });
  return moves;
};

const accountView = (account, moves) => ({
  _id: account._id,
  name: account.name,
  type: account.type,
  institution: account.institution,
  openingBalance: rupees(account.openingPaise),
  openingDate: account.openingDate,
  isActive: account.isActive,
  balance: rupees(accountBalance(account, moves[String(account._id)]))
});

const txnView = (txn, accountsById) => {
  const from = txn.fromAccount ? accountsById[String(txn.fromAccount)] : null;
  const to = txn.toAccount ? accountsById[String(txn.toAccount)] : null;
  return {
    _id: txn._id,
    date: txn.date,
    particulars: txn.particulars,
    type: txn.type,
    category: txn.category,
    categoryName: txn.categoryName,
    mode: txn.mode,
    fromAccount: txn.fromAccount,
    fromAccountName: from?.name || '',
    toAccount: txn.toAccount,
    toAccountName: to?.name || '',
    amount: rupees(txn.amountPaise),
    linkedTransaction: txn.linkedTransaction,
    notes: txn.notes,
    createdByName: txn.createdByName,
    updatedByName: txn.updatedByName,
    createdAt: txn.createdAt,
    updatedAt: txn.updatedAt,
    deletedAt: txn.deletedAt,
    deletedByName: txn.deletedByName
  };
};

const summaryView = (summary) => ({
  income: rupees(summary.income),
  expense: rupees(summary.expense),
  refunds: rupees(summary.refunds),
  transfers: rupees(summary.transfers),
  settlements: rupees(summary.settlements),
  net: rupees(summary.net),
  categoryWise: summary.categoryWise.map(c => ({ name: c.name, amount: rupees(c.amount) })),
  modeWise: summary.modeWise.map(m => ({ mode: m.mode, income: rupees(m.income), expense: rupees(m.expense), other: rupees(m.other) }))
});

const totalsView = (totals) => ({
  cash: rupees(totals.cash), bank: rupees(totals.bank), other: rupees(totals.other),
  available: rupees(totals.available), cardOutstanding: rupees(totals.card)
});

const byId = (list) => Object.fromEntries(list.map(item => [String(item._id), item]));

// ============================================================
// OVERVIEW (dashboard): balances + chune hue mahine ka income / expense
// ============================================================
export const getOverview = run(async (req, res) => {
  const owner = req.user._id;
  await ensureCategories(owner);

  const month = /^\d{4}-\d{2}$/.test(req.query.month || '') ? req.query.month : istToday().slice(0, 7);
  const [accounts, categories, moves, monthTxns, recent] = await Promise.all([
    PfAccount.find({ owner }).sort({ type: 1, name: 1 }).lean(),
    PfCategory.find({ owner }).sort({ type: 1, name: 1 }).lean(),
    loadMoves(owner),
    PfTransaction.find(liveMatch(owner, { date: { $gte: `${month}-01`, $lte: `${month}-31` } })).select('type amountPaise categoryName mode date').lean(),
    PfTransaction.find(liveMatch(owner)).sort({ date: -1, createdAt: -1 }).limit(6).lean()
  ]);

  const accountsById = byId(accounts);
  res.json({
    month,
    accounts: accounts.map(a => accountView(a, moves)),
    categories,
    totals: totalsView(balanceTotals(accounts, moves)),
    monthSummary: summaryView(summarize(monthTxns)),
    monthCount: monthTxns.length,
    recent: recent.map(t => txnView(t, accountsById))
  });
});

// ============================================================
// ACCOUNTS
// ============================================================
const readAccount = (body) => {
  const name = String(body.name || '').trim();
  if (!name) fail('Account name is required');
  if (name.length > 80) fail('Account name is too long');
  if (!ACCOUNT_TYPES.includes(body.type)) fail('Please select a valid account type');
  if (!validDay(body.openingDate)) fail('Opening balance date is required');
  if (body.openingDate > istToday()) fail('Opening balance date cannot be in the future');
  return {
    name,
    type: body.type,
    institution: String(body.institution || '').trim().slice(0, 80),
    // Bank overdraft ho sakta hai isliye bank / cash me minus bhi chalega; card ka bakaya minus nahi hota
    openingPaise: toPaise(body.openingBalance ?? 0, 'Opening balance', { allowZero: true, allowNegative: body.type !== 'CREDIT_CARD' }),
    openingDate: body.openingDate,
    isActive: body.isActive !== false
  };
};

const accountResponse = async (owner, account) => accountView(account, await loadMoves(owner));

export const createAccount = run(async (req, res) => {
  const owner = req.user._id;
  const data = readAccount(req.body);
  if (await PfAccount.exists({ owner, name: new RegExp(`^${data.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') })) {
    fail('An account with this name already exists');
  }
  const account = await PfAccount.create({ ...data, owner });
  res.status(201).json(await accountResponse(owner, account));
});

export const updateAccount = run(async (req, res) => {
  const owner = req.user._id;
  if (!validId(req.params.id)) fail('Account not found', 404);
  const account = await PfAccount.findOne({ _id: req.params.id, owner });
  if (!account) fail('Account not found', 404);

  const data = readAccount(req.body);
  const used = await PfTransaction.findOne({ owner, $or: [{ fromAccount: account._id }, { toAccount: account._id }] }).sort({ date: 1 }).select('date');
  // Jis account me entries ho chuki hain uska type nahi badal sakte (cash ko card bana dene se poora hisaab ulat jayega)
  if (used && data.type !== account.type) fail('Account type cannot be changed after transactions are recorded in it');
  if (used && data.openingDate > used.date) fail(`Opening balance date cannot be after the first transaction of this account (${used.date})`);

  Object.assign(account, data);
  await account.save();
  res.json(await accountResponse(owner, account));
});

export const deleteAccount = run(async (req, res) => {
  const owner = req.user._id;
  if (!validId(req.params.id)) fail('Account not found', 404);
  const account = await PfAccount.findOne({ _id: req.params.id, owner });
  if (!account) fail('Account not found', 404);
  if (await PfTransaction.exists({ owner, $or: [{ fromAccount: account._id }, { toAccount: account._id }] })) {
    fail('This account has transactions, so it cannot be deleted. Mark it Inactive instead.');
  }
  await account.deleteOne();
  res.json({ message: 'Account deleted' });
});

// ============================================================
// CATEGORIES
// ============================================================
export const createCategory = run(async (req, res) => {
  const owner = req.user._id;
  const name = String(req.body.name || '').trim();
  if (!name) fail('Category name is required');
  if (name.length > 60) fail('Category name is too long');
  if (!CATEGORY_TYPES.includes(req.body.type)) fail('Please select Income or Expense');
  try {
    res.status(201).json(await PfCategory.create({ owner, name, type: req.body.type }));
  } catch (error) {
    if (error.code === 11000) fail('This category already exists');
    throw error;
  }
});

export const updateCategory = run(async (req, res) => {
  const owner = req.user._id;
  if (!validId(req.params.id)) fail('Category not found', 404);
  const category = await PfCategory.findOne({ _id: req.params.id, owner });
  if (!category) fail('Category not found', 404);

  if (req.body.name !== undefined) {
    const name = String(req.body.name || '').trim();
    if (!name) fail('Category name is required');
    if (name.length > 60) fail('Category name is too long');
    category.name = name;
  }
  if (req.body.isActive !== undefined) category.isActive = !!req.body.isActive;
  try {
    await category.save();
  } catch (error) {
    if (error.code === 11000) fail('This category already exists');
    throw error;
  }
  // Purani entries me bhi naya naam dikhe
  await PfTransaction.updateMany({ owner, category: category._id }, { $set: { categoryName: category.name } });
  res.json(category);
});

export const deleteCategory = run(async (req, res) => {
  const owner = req.user._id;
  if (!validId(req.params.id)) fail('Category not found', 404);
  const category = await PfCategory.findOne({ _id: req.params.id, owner });
  if (!category) fail('Category not found', 404);
  if (await PfTransaction.exists({ owner, category: category._id })) {
    fail('This category is used in transactions, so it cannot be deleted. Turn it off instead.');
  }
  await category.deleteOne();
  res.json({ message: 'Category deleted' });
});

// ============================================================
// TRANSACTIONS
// ============================================================

// Form ka data jaanch kar save karne layak banana (posting rules yahin lagte hain)
const readTransaction = async (owner, body) => {
  const type = body.type;
  if (!TRANSACTION_TYPES.includes(type)) fail('Please select a valid transaction type');
  if (!validDay(body.date)) fail('Transaction date is required');
  if (body.date > istToday()) fail('Transaction date cannot be in the future');

  const particulars = String(body.particulars || '').trim();
  if (!particulars) fail('Particulars is required');
  if (particulars.length > 200) fail('Particulars can be at most 200 characters');
  const notes = String(body.notes || '').trim();
  if (notes.length > 500) fail('Notes can be at most 500 characters');
  const amountPaise = toPaise(body.amount, 'Amount');

  const loadAccount = async (value, label) => {
    if (!value) fail(`${label} is required`);
    if (!validId(value)) fail(`${label} is not valid`);
    const account = await PfAccount.findOne({ _id: value, owner }).lean();
    if (!account) fail(`${label} is not valid`);
    if (!account.isActive) fail(`${account.name} is inactive. Activate it first.`);
    if (body.date < account.openingDate) fail(`Date cannot be before the opening balance date of ${account.name} (${account.openingDate})`);
    return account;
  };
  const mustBeAsset = (account, label) => { if (isCard(account)) fail(`${label} must be a Cash / Bank account, not a credit card`); };
  const mustBeCard = (account, label) => { if (!isCard(account)) fail(`${label} must be a credit card account`); };

  let from = null, to = null, funding = null, categoryType = null, categoryRequired = false;

  if (type === 'Income') {
    to = await loadAccount(body.toAccount, 'Received In account'); mustBeAsset(to, 'Received In account');
    funding = to; categoryType = 'INCOME'; categoryRequired = true;
  } else if (type === 'Expense') {
    from = await loadAccount(body.fromAccount, 'Paid From account');
    if (isCard(from)) fail('For a credit card spend, choose the type "Card Purchase"');
    funding = from; categoryType = 'EXPENSE'; categoryRequired = true;
  } else if (type === 'Transfer') {
    from = await loadAccount(body.fromAccount, 'From account'); mustBeAsset(from, 'From account');
    to = await loadAccount(body.toAccount, 'To account'); mustBeAsset(to, 'To account');
    if (String(from._id) === String(to._id)) fail('From and To account cannot be the same');
    funding = from;
  } else if (type === 'Card Purchase') {
    from = await loadAccount(body.fromAccount, 'Credit card'); mustBeCard(from, 'Credit card');
    funding = from; categoryType = 'EXPENSE'; categoryRequired = true;
  } else if (type === 'Card Settlement') {
    from = await loadAccount(body.fromAccount, 'Paid From account'); mustBeAsset(from, 'Paid From account');
    to = await loadAccount(body.toAccount, 'Credit card'); mustBeCard(to, 'Credit card');
    funding = from;
  } else {
    // Refund: paisa wapas cash / bank me aaya, ya card ka bakaya kam hua
    to = await loadAccount(body.toAccount, 'Refund Received In account');
    funding = to; categoryType = 'EXPENSE';
  }

  let category = null;
  if (categoryType && body.category) {
    if (!validId(body.category)) fail('Category is not valid');
    category = await PfCategory.findOne({ _id: body.category, owner, type: categoryType }).lean();
    if (!category) fail('Category is not valid for this transaction type');
  }
  if (categoryRequired && !category) fail('Category is required');

  // Payment mode account ke hisaab se: UPI koi alag balance nahi, wo bank account se hi jata hai
  let mode = body.mode;
  if (isCard(funding)) mode = 'Credit Card';
  else if (funding.type === 'CASH') mode = 'Cash';
  else if (mode !== 'UPI') mode = 'Bank';

  let linkedTransaction = null;
  if (type === 'Refund' && body.linkedTransaction && validId(body.linkedTransaction)) {
    const original = await PfTransaction.findOne({ _id: body.linkedTransaction, owner }).select('_id').lean();
    if (original) linkedTransaction = original._id;
  }

  return {
    doc: {
      date: body.date, particulars, type, mode, amountPaise, notes, linkedTransaction,
      category: category?._id || null,
      categoryName: category?.name || (type === 'Transfer' ? 'Own Account Transfer' : type === 'Card Settlement' ? 'Card Settlement' : ''),
      fromAccount: from?._id || null,
      toAccount: to?._id || null
    },
    names: { from: from?.name || '', to: to?.name || '' }
  };
};

// Audit ke liye padhne layak shakal
const auditShape = (doc, names) => ({
  Date: doc.date,
  Particulars: doc.particulars,
  Type: doc.type,
  Category: doc.categoryName || '',
  'Payment Mode': doc.mode,
  'From Account': names.from,
  'To Account': names.to,
  Amount: rupees(doc.amountPaise),
  Notes: doc.notes || ''
});

const accountNames = async (owner, txn) => {
  const accounts = byId(await PfAccount.find({ owner, _id: { $in: [txn.fromAccount, txn.toAccount].filter(Boolean) } }).select('name').lean());
  return {
    from: accounts[String(txn.fromAccount)]?.name || '',
    to: accounts[String(txn.toAccount)]?.name || ''
  };
};

const sendTransaction = async (owner, txn, res, status = 200) => {
  const accounts = byId(await PfAccount.find({ owner }).lean());
  res.status(status).json(txnView(txn.toObject ? txn.toObject() : txn, accounts));
};

export const getTransactions = run(async (req, res) => {
  const owner = req.user._id;
  const { from, to, account, category, type, mode, search, deleted, all } = req.query;
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 15));

  const query = { owner, deletedAt: deleted === 'true' ? { $ne: null } : null };
  if (validDay(from) || validDay(to)) {
    query.date = {};
    if (validDay(from)) query.date.$gte = from;
    if (validDay(to)) query.date.$lte = to;
  }
  if (account && validId(account)) query.$or = [{ fromAccount: account }, { toAccount: account }];
  if (category && validId(category)) query.category = category;
  if (TRANSACTION_TYPES.includes(type)) query.type = type;
  if (['Cash', 'Bank', 'Credit Card', 'UPI'].includes(mode)) query.mode = mode;
  if (search && String(search).trim()) {
    const safe = String(search).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    query.$and = [{ $or: [{ particulars: new RegExp(safe, 'i') }, { notes: new RegExp(safe, 'i') }, { categoryName: new RegExp(safe, 'i') }] }];
  }

  let finder = PfTransaction.find(query).sort({ date: -1, createdAt: -1 }).select('-history');
  if (all !== 'true') finder = finder.skip((page - 1) * limit).limit(limit);

  const [rows, totalCount, forTotals, accounts] = await Promise.all([
    finder.lean(),
    PfTransaction.countDocuments(query),
    // Filter ke hisaab se totals (poore filter par, sirf current page par nahi)
    PfTransaction.find(query).select('type amountPaise categoryName mode').lean(),
    PfAccount.find({ owner }).lean()
  ]);

  const accountsById = byId(accounts);
  res.json({
    data: rows.map(t => txnView(t, accountsById)),
    totalCount,
    page,
    totalPages: Math.max(1, Math.ceil(totalCount / limit)),
    summary: summaryView(summarize(forTotals))
  });
});

export const getTransactionHistory = run(async (req, res) => {
  const owner = req.user._id;
  if (!validId(req.params.id)) fail('Transaction not found', 404);
  const txn = await PfTransaction.findOne({ _id: req.params.id, owner }).select('history particulars').lean();
  if (!txn) fail('Transaction not found', 404);
  res.json({ particulars: txn.particulars, history: txn.history || [] });
});

export const createTransaction = run(async (req, res) => {
  const owner = req.user._id;
  const requestId = typeof req.body.requestId === 'string' && req.body.requestId.length <= 80 ? req.body.requestId : undefined;

  // Wahi form dobara submit hua (double click / network retry): nayi entry nahi, purani hi lauta do
  if (requestId) {
    const existing = await PfTransaction.findOne({ owner, requestId });
    if (existing) return sendTransaction(owner, existing, res);
  }

  const { doc, names } = await readTransaction(owner, req.body);
  try {
    const txn = await PfTransaction.create({
      ...doc, owner, requestId,
      createdByName: req.user.name, updatedByName: req.user.name,
      history: [{ byName: req.user.name, action: 'Created', changes: auditShape(doc, names) }]
    });
    await sendTransaction(owner, txn, res, 201);
  } catch (error) {
    if (error.code === 11000 && requestId) {
      const existing = await PfTransaction.findOne({ owner, requestId });
      if (existing) return sendTransaction(owner, existing, res);
    }
    throw error;
  }
});

export const updateTransaction = run(async (req, res) => {
  const owner = req.user._id;
  if (!validId(req.params.id)) fail('Transaction not found', 404);
  const txn = await PfTransaction.findOne({ _id: req.params.id, owner, deletedAt: null });
  if (!txn) fail('Transaction not found', 404);

  const before = auditShape(txn, await accountNames(owner, txn));
  const { doc, names } = await readTransaction(owner, req.body);
  const after = auditShape(doc, names);

  const changes = {};
  Object.keys(after).forEach(field => {
    if (String(before[field]) !== String(after[field])) changes[field] = { old: before[field], new: after[field] };
  });
  if (Object.keys(changes).length === 0) return sendTransaction(owner, txn, res);

  // Balance save nahi hota, isliye purani entry ka asar apne aap hat kar naya lag jata hai (double posting nahi)
  Object.assign(txn, doc);
  txn.updatedByName = req.user.name;
  txn.history.push({ byName: req.user.name, action: 'Edited', changes });
  await txn.save();
  await sendTransaction(owner, txn, res);
});

export const deleteTransaction = run(async (req, res) => {
  const owner = req.user._id;
  if (!validId(req.params.id)) fail('Transaction not found', 404);
  const txn = await PfTransaction.findOne({ _id: req.params.id, owner, deletedAt: null });
  if (!txn) fail('Transaction not found', 404);

  // Record mitate nahi: hisaab se bahar kar dete hain, audit me rehta hai
  txn.deletedAt = new Date();
  txn.deletedByName = req.user.name;
  txn.history.push({ byName: req.user.name, action: 'Deleted', changes: { Reason: String(req.body?.reason || '').slice(0, 200) } });
  await txn.save();
  res.json({ message: 'Transaction removed' });
});

// ============================================================
// REPORTS
// ============================================================
const readRange = (query) => {
  const to = validDay(query.to) ? query.to : istToday();
  const from = validDay(query.from) ? query.from : `${to.slice(0, 7)}-01`;
  if (from > to) fail('From date cannot be after To date');
  return { from, to };
};

const ledgerFields = 'date particulars type categoryName mode fromAccount toAccount amountPaise notes createdAt';

export const getReports = run(async (req, res) => {
  const owner = req.user._id;
  const { from, to } = readRange(req.query);

  const [accounts, prior, inRange] = await Promise.all([
    PfAccount.find({ owner }).lean(),
    PfTransaction.find(liveMatch(owner, { date: { $lt: from } })).select('fromAccount toAccount amountPaise').lean(),
    PfTransaction.find(liveMatch(owner, { date: { $gte: from, $lte: to } })).select(ledgerFields).sort({ date: 1, createdAt: 1 }).lean()
  ]);

  res.json({
    from, to,
    summary: summaryView(summarize(inRange)),
    monthly: monthlySummary(inRange).map(m => ({ month: m.month, count: m.count, income: rupees(m.income), expense: rupees(m.expense), net: rupees(m.net) })),
    daily: dailyClosing(accounts, prior, inRange).map(d => ({ date: d.date, ...totalsView(d) }))
  });
});

export const getAccountLedger = run(async (req, res) => {
  const owner = req.user._id;
  const { from, to } = readRange(req.query);
  if (!validId(req.query.account)) fail('Please select an account');
  const account = await PfAccount.findOne({ _id: req.query.account, owner }).lean();
  if (!account) fail('Account not found', 404);

  const touches = { $or: [{ fromAccount: account._id }, { toAccount: account._id }] };
  const [accounts, prior, inRange] = await Promise.all([
    PfAccount.find({ owner }).lean(),
    PfTransaction.find(liveMatch(owner, { ...touches, date: { $lt: from } })).select('fromAccount toAccount amountPaise').lean(),
    PfTransaction.find(liveMatch(owner, { ...touches, date: { $gte: from, $lte: to } })).select(ledgerFields).sort({ date: 1, createdAt: 1 }).lean()
  ]);

  const accountsById = byId(accounts);
  const ledger = accountLedger(account, prior, inRange);
  res.json({
    from, to,
    account: { _id: account._id, name: account.name, type: account.type, institution: account.institution },
    opening: rupees(ledger.opening),
    closing: rupees(ledger.closing),
    totalIn: rupees(ledger.rows.reduce((sum, r) => sum + r.in, 0)),
    totalOut: rupees(ledger.rows.reduce((sum, r) => sum + r.out, 0)),
    rows: ledger.rows.map(r => ({ ...txnView(r.txn, accountsById), in: rupees(r.in), out: rupees(r.out), balance: rupees(r.balance) }))
  });
});
