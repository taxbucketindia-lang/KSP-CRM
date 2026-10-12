import Vendor, { VENDOR_CATEGORIES, VENDOR_WORK_STATUSES, VENDOR_PAYMENT_MODES } from '../models/Vendor.js';
import { getListStats, countIf } from '../utils/listStats.js';

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const text = (value, max = 200) => String(value ?? '').trim().slice(0, max);
const amount = (value) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.round(number * 100) / 100 : 0;
};
const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const fail = (message) => { const error = new Error(message); error.status = 400; throw error; };

// Form ka data jaanch kar saaf karna
const readVendor = (body) => {
  const partyName = text(body.partyName, 120);
  if (!partyName) fail('Party name is required');
  // Category: list wali, ya "Other" me khud likhi hui (khali ho toh "Other")
  const category = text(body.category, 40) || 'Other';

  const works = (Array.isArray(body.works) ? body.works : [])
    .map(work => ({
      ...(work._id ? { _id: work._id } : {}),
      date: DAY.test(String(work.date || '')) ? work.date : '',
      description: text(work.description, 300),
      clientName: text(work.clientName, 120),
      amount: amount(work.amount),
      status: VENDOR_WORK_STATUSES.includes(work.status) ? work.status : 'Pending'
    }))
    .filter(work => work.description || work.amount);
  works.forEach((work, index) => {
    if (!work.description) fail(`Work row ${index + 1}: please write what the work is`);
    if (!work.date) fail(`Work row ${index + 1}: please select a date`);
  });

  const payments = (Array.isArray(body.payments) ? body.payments : [])
    .map(payment => ({
      ...(payment._id ? { _id: payment._id } : {}),
      date: DAY.test(String(payment.date || '')) ? payment.date : '',
      amount: amount(payment.amount),
      mode: VENDOR_PAYMENT_MODES.includes(payment.mode) ? payment.mode : 'Bank',
      note: text(payment.note, 200)
    }))
    .filter(payment => payment.amount || payment.note);
  payments.forEach((payment, index) => {
    if (!payment.amount) fail(`Payment row ${index + 1}: amount must be more than zero`);
    if (!payment.date) fail(`Payment row ${index + 1}: please select a date`);
  });

  return {
    partyName,
    category,
    state: text(body.state, 60),
    reference: text(body.reference, 120),
    mobile: text(body.mobile, 20),
    email: text(body.email, 120),
    remarks: text(body.remarks, 1000),
    works,
    payments
  };
};

const send = (res, error) => res.status(error.status || 500).json({ message: error.message });

// @route   GET /api/vendors   (search + filter + pagination server par; upar ke cards filter ke hisaab se)
export const getVendors = async (req, res) => {
  try {
    const { search, category, state, dues, all } = req.query;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));

    const filter = {};
    if (category && String(category).trim()) filter.category = String(category).trim();
    if (state && state !== 'ALL') filter.state = state;
    if (dues === 'Pending') filter.balanceAmount = { $gt: 0 };
    if (dues === 'Cleared') filter.balanceAmount = { $lte: 0 };
    if (search && String(search).trim()) {
      const regex = new RegExp(escapeRegex(String(search).trim()), 'i');
      filter.$or = [{ partyName: regex }, { vendorId: regex }, { reference: regex }, { mobile: regex }, { 'works.description': regex }, { 'works.clientName': regex }];
    }

    let finder = Vendor.find(filter).populate('createdBy', 'name').sort({ createdAt: -1 });
    if (all !== 'true') finder = finder.skip((page - 1) * limit).limit(limit);

    const [vendors, totalCount, stats, states, usedCategories] = await Promise.all([
      finder.lean(),
      Vendor.countDocuments(filter),
      getListStats(Vendor, filter, {
        total: { $sum: 1 },
        totalAmount: { $sum: '$totalAmount' },
        paidAmount: { $sum: '$paidAmount' },
        balanceAmount: { $sum: '$balanceAmount' },
        withDues: countIf({ $gt: ['$balanceAmount', 0] })
      }),
      Vendor.distinct('state', { state: { $ne: '' } }),
      Vendor.distinct('category')
    ]);

    res.json({ data: vendors, totalCount, page, totalPages: Math.max(1, Math.ceil(totalCount / limit)), stats, states: states.sort(),
      // Filter ki list: taiyaar categories + jo khud likhi gayi hain
      categories: [...new Set([...VENDOR_CATEGORIES, ...usedCategories.filter(Boolean)])],
      usedCategories: usedCategories.filter(Boolean).sort()
    });
  } catch (error) {
    send(res, error);
  }
};

// @route   POST /api/vendors
export const createVendor = async (req, res) => {
  try {
    const data = readVendor(req.body);

    // Agla vendor number: V-1001, V-1002, ...
    const last = await Vendor.findOne({ vendorId: /^V-\d+$/ }).sort({ createdAt: -1 }).select('vendorId').lean();
    const nextNumber = last ? parseInt(last.vendorId.slice(2), 10) + 1 : 1001;

    const vendor = await Vendor.create({ ...data, vendorId: `V-${nextNumber}`, createdBy: req.user._id, updatedBy: req.user._id });
    res.status(201).json(vendor);
  } catch (error) {
    send(res, error);
  }
};

// @route   PUT /api/vendors/:id
export const updateVendor = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });

    Object.assign(vendor, readVendor(req.body), { updatedBy: req.user._id });
    await vendor.save(); // Total / Paid / Balance yahin dobara bante hain
    res.json(vendor);
  } catch (error) {
    send(res, error);
  }
};

// @route   POST /api/vendors/:id/remarks   (alag se remark jodna: naam aur time ke saath)
export const addVendorRemark = async (req, res) => {
  try {
    const remark = text(req.body.text, 1000);
    if (!remark) return res.status(400).json({ message: 'Please write a remark' });

    const vendor = await Vendor.findByIdAndUpdate(
      req.params.id,
      { $push: { remarkLog: { text: remark, byName: req.user.name, at: new Date() } } },
      { new: true }
    ).populate('createdBy', 'name');
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });
    res.json(vendor);
  } catch (error) {
    send(res, error);
  }
};

// @route   DELETE /api/vendors/:id/remarks/:remarkId   (sirf "Delete Records" right wale)
export const deleteVendorRemark = async (req, res) => {
  try {
    const vendor = await Vendor.findByIdAndUpdate(
      req.params.id,
      { $pull: { remarkLog: { _id: req.params.remarkId } } },
      { new: true }
    ).populate('createdBy', 'name');
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });
    res.json(vendor);
  } catch (error) {
    send(res, error);
  }
};

// @route   DELETE /api/vendors/:id   (sirf "Delete Records" right wale)
export const deleteVendor = async (req, res) => {
  try {
    const vendor = await Vendor.findByIdAndDelete(req.params.id);
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });
    res.json({ message: 'Vendor deleted' });
  } catch (error) {
    send(res, error);
  }
};
