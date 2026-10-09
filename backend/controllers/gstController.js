import GstReturn from '../models/GstReturn.js';
import ClientMaster from '../models/ClientMaster.js'; 
import { getListStats, num, countIf, statusIn } from '../utils/listStats.js';

// @desc    Get all GST records (WITH PAGINATION & FILTERS)
export const getGstReturns = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search, 
      status, 
      taxpayerType, 
      state, 
      paymentPlan, 
      bankLinked, 
      aadhaarKyc, 
      gstr1, 
      gstr3b,
      fetchAll 
    } = req.query;

    let filter = {};

    // Search filter
    if (search) {
      filter.$or = [
        { assesseeName: { $regex: search, $options: 'i' } },
        { tradeName: { $regex: search, $options: 'i' } },
        { gstin: { $regex: search, $options: 'i' } },
        { pan: { $regex: search, $options: 'i' } }
      ];
    }

    // Other filters
    if (status && status !== 'ALL') {
      filter.gstStatus = status === 'Documents Pending' ? { $in: [status, null, ''] } : status;
    }
    if (taxpayerType && taxpayerType !== 'ALL') {
      filter.taxpayerType = taxpayerType === 'Regular' ? { $in: [taxpayerType, null, ''] } : taxpayerType;
    }
    if (state && state !== 'ALL') {
      filter.state = state;
    }
    if (paymentPlan && paymentPlan !== 'ALL') {
      filter.feeStatus = paymentPlan === 'Yearly' ? { $in: [paymentPlan, null, ''] } : paymentPlan;
    }
    if (bankLinked && bankLinked !== 'ALL') {
      filter.bankLinkedStatus = bankLinked === 'Not Updated' ? { $in: [bankLinked, null, ''] } : bankLinked;
    }
    if (aadhaarKyc && aadhaarKyc !== 'ALL') {
      filter.aadhaarKycStatus = aadhaarKyc === 'No' ? { $in: [aadhaarKyc, null, ''] } : aadhaarKyc;
    }
    if (gstr1 && gstr1 !== 'ALL') {
      filter.gstr1FilingDate = gstr1 === 'Filed' ? { $exists: true, $ne: null } : { $eq: null };
    }
    if (gstr3b && gstr3b !== 'ALL') {
      filter.gstr3bFilingDate = gstr3b === 'Filed' ? { $exists: true, $ne: null } : { $eq: null };
    }

    // 🔴 Cards ke liye poore filtered data ka total (sirf current page ka nahi)
    const stats = await getListStats(GstReturn, filter, {
      pending: countIf(statusIn('gstStatus', ['Documents Pending', ''], 'Documents Pending')),
      processing: countIf(statusIn('gstStatus', ['Processing'])),
      completed: countIf(statusIn('gstStatus', ['Filed'])),
      totalFeeAmount: { $sum: num('feeAmount') },
      totalReceivedAmount: { $sum: num('amountReceived') }
    });

    // State dropdown ke liye saare states (pehle sirf current page ke 10 records se bante the)
    const states = (await GstReturn.distinct('state')).filter(Boolean).sort();

    let gstRecords = [];
    let totalCount = 0;
    let totalPages = 1;

    // Excel Export ke time pe `fetchAll` true hoga toh bina limit ke list bhejni hai
    if (fetchAll === 'true') {
      gstRecords = await GstReturn.find(filter)
        .populate('createdBy', 'name empId')
        .populate('clientMasterId', 'clientId pan clientType gstin')
        .sort({ createdAt: -1 })
        .lean();
      totalCount = gstRecords.length;
    } else {
      // Pagination Logic
      const skip = (parseInt(page) - 1) * parseInt(limit);
      totalCount = await GstReturn.countDocuments(filter);
      totalPages = Math.ceil(totalCount / parseInt(limit));

      gstRecords = await GstReturn.find(filter)
        .populate('createdBy', 'name empId')
        .populate('clientMasterId', 'clientId pan clientType gstin')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean();
    }

    res.status(200).json({
      data: gstRecords,
      currentPage: parseInt(page),
      totalPages,
      totalCount,
      stats,
      states
    });

  } catch (error) { 
    res.status(500).json({ message: error.message }); 
  }
};

// @desc    Create new GST Record (Manual)
export const createGstReturn = async (req, res) => {
  try {
    const existing = await GstReturn.findOne({ gstin: req.body.gstin?.toUpperCase() });
    if (existing) return res.status(400).json({ message: 'GSTIN already exists in workspace.' });

    const rawPan = req.body.pan || (req.body.gstin ? req.body.gstin.substring(2, 12) : null);
    if (!rawPan) return res.status(400).json({ message: 'PAN Number is required to create a Master Record.' });
    
    const uppercasePan = rawPan.toUpperCase();

    // 🔴 1. CHECK IF CLIENT EXISTS
    let clientDoc = await ClientMaster.findOne({ pan: uppercasePan });

    if (clientDoc) {
      // Client exist karta hai, sirf nayi field update karein
      let masterUpdates = {};
      if (req.body.assesseeName) masterUpdates.name = req.body.assesseeName;
      if (req.body.mobile) masterUpdates.mobile = req.body.mobile;
      if (req.body.email) masterUpdates.email = req.body.email;
      if (req.body.state) masterUpdates.state = req.body.state;
      if (req.body.pinCode) masterUpdates.pinCode = req.body.pinCode;
      if (req.body.gstin) masterUpdates.gstin = req.body.gstin.toUpperCase();
      
      clientDoc = await ClientMaster.findByIdAndUpdate(clientDoc._id, { $set: masterUpdates }, { new: true });
    } else {
      // 🔴 2. NAYA CLIENT: AUTO-GENERATE CUSTOM ID (TB-XXXXX-0001)
      const panSuffix = uppercasePan.slice(-5); 
      const lastClient = await ClientMaster.findOne({ clientId: { $exists: true,$ne: null } }).sort({ createdAt: -1 });
      let nextSequenceNum = 1;

      if (lastClient && lastClient.clientId) {
        const lastSeqStr = lastClient.clientId.split('-').pop();
        const lastSeqNum = parseInt(lastSeqStr, 10);
        if (!isNaN(lastSeqNum)) {
          nextSequenceNum = lastSeqNum + 1;
        } else {
          nextSequenceNum = await ClientMaster.countDocuments() + 1;
        }
      } else {
        nextSequenceNum = await ClientMaster.countDocuments() + 1;
      }

      const sequenceNum = String(nextSequenceNum).padStart(4, '0');
      const customClientId = `TB-${panSuffix}-${sequenceNum}`;

      clientDoc = await ClientMaster.create({
        clientId: customClientId,
        pan: uppercasePan,
        name: req.body.assesseeName,
        mobile: req.body.mobile,
        email: req.body.email,
        state: req.body.state,
        pinCode: req.body.pinCode,
        gstin: req.body.gstin?.toUpperCase(),
        clientType: req.body.taxpayerType === 'Regular' ? 'Private Limited' : 'Individual'
      });
    }

    // 3. Save GST Return & Link ClientMaster ID
    const newGst = new GstReturn({ 
      ...req.body, 
      pan: uppercasePan,
      gstin: req.body.gstin?.toUpperCase(),
      clientMasterId: clientDoc._id, 
      createdBy: req.user._id 
    });
    
    const savedGst = await newGst.save();
    res.status(201).json(savedGst);
  } catch (error) { 
    res.status(400).json({ message: error.message }); 
  }
};

// @desc    Update GST Record
export const updateGstReturn = async (req, res) => {
  try {
    if (req.body.gstin) req.body.gstin = req.body.gstin.toUpperCase();
    if (req.body.pan) req.body.pan = req.body.pan.toUpperCase();

    const updatedGst = await GstReturn.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!updatedGst) return res.status(404).json({ message: 'Record not found' });
    res.json(updatedGst);
  } catch (error) { res.status(400).json({ message: error.message }); }
};

// @desc    Delete GST Record
export const deleteGstReturn = async (req, res) => {
  try {
    const deletedGst = await GstReturn.findByIdAndDelete(req.params.id);
    if (!deletedGst) return res.status(404).json({ message: 'Record not found' });
    res.json({ message: 'GST Record removed from workspace.' });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

// @desc    Import GST Records from Excel
export const importGstReturns = async (req, res) => {
  try {
    const records = req.body.records;
    if (!records || records.length === 0) return res.status(400).json({ message: "No data found" });

    let importedCount = 0;
    let updatedCount = 0;

    // Excel import ke liye sequence number pehle hi nikal lo
    const lastClient = await ClientMaster.findOne({ clientId: { $exists: true,$ne: null } }).sort({ createdAt: -1 });
    let currentSequence = 1;
    if (lastClient && lastClient.clientId) {
      const lastSeqStr = lastClient.clientId.split('-').pop();
      const lastSeqNum = parseInt(lastSeqStr, 10);
      if (!isNaN(lastSeqNum)) currentSequence = lastSeqNum + 1;
    } else {
      currentSequence = await ClientMaster.countDocuments() + 1;
    }

    for (let record of records) {
      if (!record.gstin) continue; 
      
      const uppercaseGstin = record.gstin.toUpperCase();
      const extractedPan = record.pan ? record.pan.toUpperCase() : uppercaseGstin.substring(2, 12);

      // 🔴 1. CHECK IF CLIENT EXISTS
      let clientDoc = await ClientMaster.findOne({ pan: extractedPan });

      if (clientDoc) {
        let masterUpdates = {};
        if (record.assesseeName) masterUpdates.name = record.assesseeName;
        if (record.mobile) masterUpdates.mobile = record.mobile;
        if (record.email) masterUpdates.email = record.email;
        if (record.state) masterUpdates.state = record.state;
        if (record.pinCode) masterUpdates.pinCode = record.pinCode;
        if (uppercaseGstin) masterUpdates.gstin = uppercaseGstin;

        await ClientMaster.findByIdAndUpdate(clientDoc._id, { $set: masterUpdates });
      } else {
        // 🔴 2. NAYA CLIENT (EXCEL SE): AUTO-GENERATE ID
        const panSuffix = extractedPan.slice(-5); 
        const sequenceNumStr = String(currentSequence).padStart(4, '0');
        const customClientId = `TB-${panSuffix}-${sequenceNumStr}`;
        currentSequence++; // Next loop ke liye ID increment karo

        clientDoc = await ClientMaster.create({
          clientId: customClientId,
          pan: extractedPan,
          name: record.assesseeName,
          mobile: record.mobile,
          email: record.email,
          state: record.state,
          pinCode: record.pinCode,
          gstin: uppercaseGstin,
          clientType: 'Private Limited'
        });
      }

      const gstPayload = {
        ...record,
        pan: extractedPan,
        gstin: uppercaseGstin,
        clientMasterId: clientDoc._id 
      };

      let existing = await GstReturn.findOne({ gstin: uppercaseGstin });
      
      if (existing) {
        await GstReturn.findByIdAndUpdate(existing._id, gstPayload);
        updatedCount++;
      } else {
        await GstReturn.create({ ...gstPayload, createdBy: req.user._id });
        importedCount++;
      }
    }
    
    res.status(201).json({ message: `Success! Added: ${importedCount}, Updated: ${updatedCount}`, count: importedCount + updatedCount });
  } catch (error) { 
    console.error("Import Error:", error);
    res.status(500).json({ message: error.message }); 
  }
};

export const bulkDeleteGstReturns = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'No IDs provided for deletion.' });
    }
    await GstReturn.deleteMany({ _id: { $in: ids } });
    res.json({ message: `${ids.length} records deleted successfully.` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};