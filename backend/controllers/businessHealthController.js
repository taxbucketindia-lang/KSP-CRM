import mongoose from 'mongoose';
import { BusinessHealthMonthly, BusinessHealthSettings, ManagementAction } from '../models/BusinessHealth.js';
import ClientMaster from '../models/ClientMaster.js';
import {
  INPUT_FIELDS, INPUT_KEYS, KPI_DEFS, AREAS,
  calculateBusinessHealth, mergeSettings, pickInputs, previousMonth, isValidMonth
} from '../utils/businessHealthEngine.js';
import { isAdminOrAbove } from '../utils/roles.js';
import { can } from '../utils/permissions.js';

// 🔴 CLIENT BUSINESS HEALTH REPORT
// Client apni company lekar aata hai -> hum uske monthly numbers daalte hain -> system ratios, Green/Yellow/Red
// aur health score nikalta hai -> wahi report client ko di jati hai. Har cheez client + month ke hisaab se hai.

// ================= ROLE BASED ACCESS (API level) =================
// CEO / Admin: sab kuch (approve, delete, targets). Finance + Service Team: client ka data bharna aur report banana.
// EXECUTIVE permission: sirf dekhna.
const FINANCE_ROLES = ['Accounts', 'Accountant'];
// "Client Health Reports" tab ka right (BUSINESS_HEALTH) jiske paas hai wo report bana sakta hai
const canEdit = (user) => can(user, 'BUSINESS_HEALTH') || FINANCE_ROLES.includes(user?.role);
const canView = (user) => canEdit(user);

export const requireView = (req, res, next) => (canView(req.user) ? next() : res.status(403).json({ message: 'You do not have access to Business Health reports.' }));
export const requireEdit = (req, res, next) => (canEdit(req.user) ? next() : res.status(403).json({ message: 'You are not allowed to edit Business Health reports.' }));
export const requireAdmin = (req, res, next) => (isAdminOrAbove(req.user) ? next() : res.status(403).json({ message: 'Only CEO / Admin can do this.' }));

const accessOf = (user) => ({ canView: canView(user), canEdit: canEdit(user), canAdmin: isAdminOrAbove(user) });
const getSettingsDoc = async () => (await BusinessHealthSettings.findOne({ key: 'default' }).lean()) || null;
const isId = (id) => mongoose.isValidObjectId(id);

const CLIENT_FIELDS = 'clientId name tradeName pan gstin clientType mobile email';

// Pehle version me "month" akela unique tha; ab client + month unique hai. Purana index ek baar hata do.
let indexesSynced = false;
const ensureIndexes = async () => {
  if (indexesSynced) return;
  indexesSynced = true;
  await BusinessHealthMonthly.syncIndexes().catch(error => console.log('Business Health index sync:', error.message));
};

// Har request me client + month chahiye
const readScope = (req, res, { needMonth = true } = {}) => {
  const client = req.query.client || req.body?.client;
  const month = req.query.month || req.body?.month;
  if (!isId(client)) { res.status(400).json({ message: 'Please select a client company first.' }); return null; }
  if (needMonth && !isValidMonth(month)) { res.status(400).json({ message: 'Month must be in YYYY-MM format.' }); return null; }
  return { client, month };
};

// ================= CLIENTS =================
// @route GET /api/business-health/clients?search=
// "reports" = jin clients ki report pehle se bani hai; "results" = Client Master me search
export const getClients = async (req, res) => {
  try {
    await ensureIndexes();
    const search = String(req.query.search || '').trim();

    const grouped = await BusinessHealthMonthly.aggregate([
      { $sort: { month: -1 } },
      { $group: { _id: '$client', months: { $sum: 1 }, latestMonth: { $first: '$month' }, latestStatus: { $first: '$status' }, updatedAt: { $max: '$updatedAt' } } },
      { $sort: { updatedAt: -1 } },
      { $limit: 100 }
    ]);
    const reportClients = await ClientMaster.find({ _id: { $in: grouped.map(g => g._id) } }).select(CLIENT_FIELDS).lean();
    const clientById = new Map(reportClients.map(c => [String(c._id), c]));
    const reports = grouped.filter(g => clientById.has(String(g._id))).map(g => ({ ...clientById.get(String(g._id)), months: g.months, latestMonth: g.latestMonth, latestStatus: g.latestStatus }));

    let results = [];
    if (search.length >= 2) {
      const regex = { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
      results = await ClientMaster.find({ $or: [{ name: regex }, { tradeName: regex }, { pan: regex }, { gstin: regex }, { clientId: regex }] })
        .select(CLIENT_FIELDS).sort({ name: 1 }).limit(20).lean();
    }

    res.json({ reports, results, access: accessOf(req.user) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ================= MONTHLY INPUT =================
// @route GET /api/business-health/monthly?client=&month=YYYY-MM
export const getMonthly = async (req, res) => {
  try {
    const scope = readScope(req, res);
    if (!scope) return;

    const record = await BusinessHealthMonthly.findOne(scope)
      .populate('approvedBy', 'name').populate('updatedBy', 'name').populate('createdBy', 'name').lean();
    res.json({ data: record, fields: INPUT_FIELDS, access: accessOf(req.user) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route POST /api/business-health/monthly
export const createMonthly = async (req, res) => {
  try {
    await ensureIndexes();
    const scope = readScope(req, res);
    if (!scope) return;
    if (!(await ClientMaster.exists({ _id: scope.client }))) return res.status(404).json({ message: 'Client not found in Client Master.' });
    if (await BusinessHealthMonthly.exists(scope)) {
      return res.status(400).json({ message: `A record for ${scope.month} already exists for this client. Edit it instead.` });
    }

    const record = await BusinessHealthMonthly.create({
      ...scope, ...pickInputs(req.body), remarks: req.body.remarks || '',
      createdBy: req.user._id, updatedBy: req.user._id,
      auditLog: [{ action: 'Created', by: req.user._id, byName: req.user.name }]
    });
    res.status(201).json({ data: record, message: 'Monthly record created.' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @route PUT /api/business-health/monthly/:id
export const updateMonthly = async (req, res) => {
  try {
    const record = await BusinessHealthMonthly.findById(req.params.id);
    if (!record) return res.status(404).json({ message: 'Monthly record not found.' });
    if (record.status === 'Approved') {
      return res.status(403).json({ message: 'This report is final and locked. CEO / Admin must reopen it first.' });
    }

    const inputs = pickInputs(req.body);
    const changes = [];
    INPUT_KEYS.forEach(key => {
      if (!(key in req.body)) return; // jo field bheja hi nahi use mat chhedo
      const from = record[key] ?? null;
      const to = inputs[key];
      if (from !== to) { changes.push({ field: key, from, to }); record[key] = to; }
    });
    if (req.body.remarks !== undefined && req.body.remarks !== record.remarks) {
      changes.push({ field: 'remarks', from: record.remarks, to: req.body.remarks });
      record.remarks = req.body.remarks;
    }

    if (changes.length > 0) {
      record.updatedBy = req.user._id;
      record.auditLog.push({ action: 'Updated', by: req.user._id, byName: req.user.name, changes });
      await record.save();
    }
    res.json({ data: record, message: changes.length ? 'Monthly record updated.' : 'No changes.' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @route PUT /api/business-health/monthly/:id/approve  |  /reopen   (CEO / Admin)
export const setMonthlyStatus = (status) => async (req, res) => {
  try {
    const record = await BusinessHealthMonthly.findById(req.params.id);
    if (!record) return res.status(404).json({ message: 'Monthly record not found.' });
    if (record.status === status) return res.json({ data: record, message: `Already ${status}.` });

    record.status = status;
    record.approvedBy = status === 'Approved' ? req.user._id : undefined;
    record.approvedAt = status === 'Approved' ? new Date() : undefined;
    record.auditLog.push({ action: status === 'Approved' ? 'Approved' : 'Reopened', by: req.user._id, byName: req.user.name });
    await record.save();
    res.json({ data: record, message: status === 'Approved' ? 'Report finalized and locked.' : 'Report reopened for editing.' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @route DELETE /api/business-health/monthly/:id   (CEO / Admin, sirf Draft)
export const deleteMonthly = async (req, res) => {
  try {
    const record = await BusinessHealthMonthly.findById(req.params.id);
    if (!record) return res.status(404).json({ message: 'Monthly record not found.' });
    if (record.status === 'Approved') return res.status(403).json({ message: 'A final report cannot be deleted. Reopen it first.' });
    await ManagementAction.deleteMany({ client: record.client, month: record.month });
    await record.deleteOne();
    console.log(`🗑️ Business Health ${record.month} (client ${record.client}) deleted by ${req.user.name}`);
    res.json({ message: `Record for ${record.month} deleted.` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ================= KPIs / DASHBOARD / TRENDS =================
const buildMonthResult = async ({ client, month }, settingsDoc) => {
  const [record, previous] = await Promise.all([
    BusinessHealthMonthly.findOne({ client, month }).populate('approvedBy', 'name').populate('updatedBy', 'name').lean(),
    BusinessHealthMonthly.findOne({ client, month: previousMonth(month) }).lean()
  ]);
  if (!record) return { record: null, previousExists: !!previous, result: null };
  return { record, previousExists: !!previous, result: calculateBusinessHealth(record, previous, settingsDoc) };
};

// @route GET /api/business-health/kpis?client=&month=YYYY-MM
export const getKpis = async (req, res) => {
  try {
    const scope = readScope(req, res);
    if (!scope) return;
    const { record, result } = await buildMonthResult(scope, await getSettingsDoc());
    if (!record) return res.json({ ...scope, exists: false, kpis: [] });
    res.json({ ...scope, exists: true, status: record.status, kpis: result.kpis, areas: result.areas, overallScore: result.overallScore, overallStatus: result.overallStatus, calculatedAt: new Date() });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route GET /api/business-health/dashboard?client=&month=YYYY-MM
export const getDashboard = async (req, res) => {
  try {
    const scope = readScope(req, res);
    if (!scope) return;

    const settingsDoc = await getSettingsDoc();
    const [clientDoc, { record, previousExists, result }, actions, months] = await Promise.all([
      ClientMaster.findById(scope.client).select(CLIENT_FIELDS).lean(),
      buildMonthResult(scope, settingsDoc),
      ManagementAction.find(scope).populate('createdBy', 'name').sort({ createdAt: -1 }).lean(),
      BusinessHealthMonthly.find({ client: scope.client }).select('month status').sort({ month: -1 }).lean()
    ]);
    if (!clientDoc) return res.status(404).json({ message: 'Client not found in Client Master.' });

    const base = { ...scope, clientInfo: clientDoc, months, actions, access: accessOf(req.user) };
    if (!record) return res.json({ ...base, exists: false, settings: mergeSettings(settingsDoc) });

    // Risk panel: pehle RED, phir YELLOW
    const order = { RED: 0, YELLOW: 1 };
    const risks = result.kpis.filter(k => k.status in order).sort((a, b) => order[a.status] - order[b.status]);

    res.json({
      ...base, exists: true,
      record: {
        _id: record._id, month: record.month, status: record.status, remarks: record.remarks,
        approvedBy: record.approvedBy?.name || null, approvedAt: record.approvedAt || null,
        updatedBy: record.updatedBy?.name || null, updatedAt: record.updatedAt
      },
      previousMonth: previousMonth(scope.month), previousExists,
      inputs: result.inputs, previousInputs: result.previousInputs,
      kpis: result.kpis, areas: result.areas,
      overallScore: result.overallScore, overallStatus: result.overallStatus, coverage: result.coverage,
      risks,
      settings: result.settings,
      calculatedAt: new Date()
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route GET /api/business-health/trends?client=&months=12&upto=YYYY-MM
export const getTrends = async (req, res) => {
  try {
    const scope = readScope(req, res, { needMonth: false });
    if (!scope) return;
    const count = Math.min(36, Math.max(1, parseInt(req.query.months) || 12));
    const filter = { client: scope.client, ...(isValidMonth(req.query.upto) ? { month: { $lte: req.query.upto } } : {}) };
    const settingsDoc = await getSettingsDoc();

    const records = (await BusinessHealthMonthly.find(filter).sort({ month: -1 }).limit(count + 1).lean()).reverse();
    const byMonth = new Map(records.map(r => [r.month, r]));

    const trend = records.slice(-count).map(record => {
      const result = calculateBusinessHealth(record, byMonth.get(previousMonth(record.month)), settingsDoc);
      const kpi = (code) => result.kpis.find(k => k.code === code)?.actual ?? null;
      return {
        month: record.month, status: record.status,
        revenue: result.inputs.revenue, ebitda: result.inputs.ebitda, pat: result.inputs.pat,
        cash_bank: result.inputs.cash_bank, receivables: result.inputs.receivables, overdue_receivables: result.inputs.overdue_receivables,
        ebitda_margin: kpi('ebitda_margin'), net_profit_margin: kpi('net_profit_margin'), gross_profit_margin: kpi('gross_profit_margin'),
        dso: kpi('dso'), lead_conversion: kpi('lead_conversion'), revenue_growth: kpi('revenue_growth'),
        overallScore: result.overallScore, overallStatus: result.overallStatus
      };
    });
    res.json({ data: trend });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ================= SETTINGS (thresholds + weights) =================
// @route GET /api/business-health/settings
export const getSettings = async (req, res) => {
  try {
    const doc = await getSettingsDoc();
    res.json({
      settings: mergeSettings(doc),
      kpis: KPI_DEFS.map(k => ({ code: k.code, name: k.name, area: k.area, unit: k.unit, formula: k.formula, defaultGreen: k.green, defaultYellow: k.yellow, defaultDirection: k.direction })),
      areas: AREAS,
      updatedAt: doc?.updatedAt || null,
      access: accessOf(req.user)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route PUT /api/business-health/settings   (CEO / Admin)
export const updateSettings = async (req, res) => {
  try {
    const toNum = (v) => (v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));

    const thresholds = {};
    KPI_DEFS.forEach(k => {
      const t = req.body.thresholds?.[k.code];
      if (!t) return;
      thresholds[k.code] = { green: toNum(t.green), yellow: toNum(t.yellow), direction: ['higher', 'lower'].includes(t.direction) ? t.direction : k.direction };
    });

    const weights = {};
    AREAS.forEach(area => { const w = toNum(req.body.weights?.[area]); if (w !== null && w >= 0) weights[area] = w; });
    if (Object.keys(weights).length && Object.values(weights).reduce((s, w) => s + w, 0) <= 0) {
      return res.status(400).json({ message: 'At least one area must have a weight above zero.' });
    }

    const green = toNum(req.body.scoreBands?.green);
    const yellow = toNum(req.body.scoreBands?.yellow);
    if (green !== null && yellow !== null && yellow >= green) {
      return res.status(400).json({ message: 'Green score must be higher than Yellow score.' });
    }

    const update = { thresholds, weights, updatedBy: req.user._id };
    if (green !== null && yellow !== null) update.scoreBands = { green, yellow };

    const doc = await BusinessHealthSettings.findOneAndUpdate({ key: 'default' }, { $set: update }, { new: true, upsert: true, setDefaultsOnInsert: true }).lean();
    res.json({ settings: mergeSettings(doc), message: 'Settings saved. Status logic updated.' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// ================= RECOMMENDATIONS / ACTION PLAN =================
// @route GET /api/business-health/actions?client=&month=&status=
export const getActions = async (req, res) => {
  try {
    const scope = readScope(req, res, { needMonth: false });
    if (!scope) return;
    const filter = { client: scope.client };
    if (isValidMonth(req.query.month)) filter.month = req.query.month;
    if (req.query.status === 'open') filter.status = { $ne: 'Closed' };
    else if (req.query.status) filter.status = req.query.status;

    const actions = await ManagementAction.find(filter).populate('createdBy', 'name').sort({ status: 1, dueDate: 1, createdAt: -1 }).lean();
    res.json({ data: actions });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route POST /api/business-health/actions
export const createAction = async (req, res) => {
  try {
    const scope = readScope(req, res);
    if (!scope) return;
    const { kpiCode, kpiName, kpiStatus, issue, rootCause, action, ownerName, dueDate, remarks, status } = req.body;
    if (!issue?.trim() || !action?.trim()) return res.status(400).json({ message: 'Issue and recommended action are required.' });

    const created = await ManagementAction.create({
      ...scope, kpiCode: kpiCode || '', kpiName: kpiName || '', kpiStatus: kpiStatus || '',
      issue: issue.trim(), rootCause: rootCause || '', action: action.trim(),
      ownerName: ownerName || '', dueDate: dueDate || undefined, remarks: remarks || '',
      status: status || 'Open', createdBy: req.user._id
    });
    res.status(201).json({ data: created, message: 'Recommendation added.' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @route PUT /api/business-health/actions/:id
export const updateAction = async (req, res) => {
  try {
    const item = await ManagementAction.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Recommendation not found.' });

    ['status', 'remarks', 'rootCause', 'issue', 'action', 'ownerName'].forEach(field => {
      if (req.body[field] !== undefined) item[field] = req.body[field];
    });
    if (req.body.dueDate !== undefined) item.dueDate = req.body.dueDate || undefined;
    await item.save();
    res.json({ data: item, message: 'Recommendation updated.' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @route DELETE /api/business-health/actions/:id
export const deleteAction = async (req, res) => {
  try {
    const item = await ManagementAction.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ message: 'Recommendation not found.' });
    res.json({ message: 'Recommendation deleted.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
