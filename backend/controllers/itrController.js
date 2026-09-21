import ItrReturn from '../models/ItrReturn.js';

// @desc    Get all ITR records
// @route   GET /api/itr
export const getItrReturns = async (req, res) => {
  try {
    const itrRecords = await ItrReturn.find({}).populate('createdBy', 'name empId').sort({ createdAt: -1 });
    res.json(itrRecords);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create new ITR Record (Manual or Imported)
// @route   POST /api/itr
export const createItrReturn = async (req, res) => {
  try {
    // Check for existing record
    const existing = await ItrReturn.findOne({ 
      pan: req.body.pan.toUpperCase(), 
      itrFiledUpToAY: req.body.itrFiledUpToAY,
      returnType: req.body.returnType || 'Original' 
    });
    
    if (existing) {
      return res.status(400).json({ message: `ITR for PAN ${req.body.pan} in ${req.body.itrFiledUpToAY} (${req.body.returnType || 'Original'}) already exists.` });
    }

    // 🔴 AUTO-GENERATE CLIENT ID LOGIC
    let finalClientId = req.body.clientId;
    if (!finalClientId || finalClientId === '') {
      let nextIdCounter = 1001;
      // Get the last created record to fetch its ID
      const lastClient = await ItrReturn.findOne({ clientId: { $exists: true,$ne: null } }).sort({ createdAt: -1 });
      
      if (lastClient && lastClient.clientId) {
        const parts = lastClient.clientId.split('-');
        if (parts.length > 1 && !isNaN(parts[1])) {
          nextIdCounter = parseInt(parts[1]) + 1;
        }
      }
      finalClientId = `ITR-${nextIdCounter}`;
    }

    const newItr = new ItrReturn({ ...req.body, clientId: finalClientId, createdBy: req.user._id });
    const savedItr = await newItr.save();
    res.status(201).json(savedItr);
  } catch (error) { 
    res.status(400).json({ message: error.message }); 
  }
};

// @desc    Update ITR Record
// @route   PUT /api/itr/:id
export const updateItrReturn = async (req, res) => {
  try {
    const updatedItr = await ItrReturn.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true, runValidators: true }
    );
    if (!updatedItr) return res.status(404).json({ message: 'Record not found' });
    res.json(updatedItr);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete ITR Record
// @route   DELETE /api/itr/:id
export const deleteItrReturn = async (req, res) => {
  try {
    const deletedItr = await ItrReturn.findByIdAndDelete(req.params.id);
    if (!deletedItr) return res.status(404).json({ message: 'Record not found' });
    res.json({ message: 'ITR Record removed from workspace.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Import ITR Records from Excel
// @route   POST /api/itr/import
// @desc    Import ITR Records from Excel (Add New & Update Existing)
// @route   POST /api/itr/import
export const importItrReturns = async (req, res) => {
  try {
    const records = req.body.itrRecords;
    if (!records || records.length === 0) return res.status(400).json({ message: "No data found in Excel" });

    let importedCount = 0;
    let updatedCount = 0;

    // 🔴 AUTO-GENERATE CLIENT ID LOGIC
    let nextIdCounter = 1001;
    const lastClient = await ItrReturn.findOne({ clientId: { $exists: true,$ne: null } }).sort({ createdAt: -1 });
    
    if (lastClient && lastClient.clientId) {
      const parts = lastClient.clientId.split('-');
      if (parts.length > 1 && !isNaN(parts[1])) {
        nextIdCounter = parseInt(parts[1]) + 1;
      }
    }

    for (const record of records) {
      let existing = null;

      // 1. Agar Excel me Client ID hai, toh usey dhoondho
      if (record.clientId) {
         existing = await ItrReturn.findOne({ clientId: record.clientId });
      } 
      
      // 2. Agar Client ID nahi mili, toh PAN + AY se dhoondho (Safety check)
      if (!existing && record.pan) {
         existing = await ItrReturn.findOne({ 
          pan: record.pan.toUpperCase(),
          itrFiledUpToAY: record.itrFiledUpToAY || 'AY 2025-26',
          returnType: record.returnType || 'Original'
        });
      }
      
      if (existing) {
        // 🟢 PURANA RECORD UPDATE HOGA
        await ItrReturn.findByIdAndUpdate(existing._id, { ...record });
        updatedCount++;
      } else {
        // 🟢 NAYA RECORD CREATE HOGA WITH NEW ID
        const newClientId = record.clientId || `ITR-${nextIdCounter++}`;
        await ItrReturn.create({ ...record, clientId: newClientId, createdBy: req.user._id });
        importedCount++;
      }
    }

    res.status(201).json({ 
      message: `Success! Added: ${importedCount}, Updated: ${updatedCount}`, 
      count: importedCount + updatedCount 
    });
  } catch (error) { 
    res.status(500).json({ message: error.message }); 
  }
};

// @desc    Bulk Delete ITR Records
// @route   POST /api/itr/bulk-delete
export const bulkDeleteItrReturns = async (req, res) => {
  try {
    const { ids } = req.body; 
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'No IDs provided for deletion.' });
    }

    await ItrReturn.deleteMany({ _id: { $in: ids } });
    
    res.json({ message: `${ids.length} records deleted successfully.` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};