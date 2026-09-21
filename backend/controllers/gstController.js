import GstReturn from '../models/GstReturn.js';

export const getGstReturns = async (req, res) => {
  try {
    const gstRecords = await GstReturn.find({}).populate('createdBy', 'name empId').sort({ createdAt: -1 });
    res.json(gstRecords);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const createGstReturn = async (req, res) => {
  try {
    const existing = await GstReturn.findOne({ gstin: req.body.gstin });
    if (existing) return res.status(400).json({ message: 'GSTIN already exists in workspace.' });

    // 🔴 AUTO-GENERATE CLIENT ID LOGIC
    let finalClientId = req.body.clientId;
    if (!finalClientId || finalClientId.trim() === '') {
      let nextIdCounter = 1001;
      const lastClient = await GstReturn.findOne({ clientId: { $exists: true, $ne: null,$ne: "" } }).sort({ createdAt: -1 });
      if (lastClient && lastClient.clientId) {
        const parts = lastClient.clientId.split('-');
        if (parts.length > 1 && !isNaN(parts[1])) {
          nextIdCounter = parseInt(parts[1]) + 1;
        }
      }
      finalClientId = `GST-${nextIdCounter}`;
    }

    const newGst = new GstReturn({ ...req.body, clientId: finalClientId, createdBy: req.user._id });
    const savedGst = await newGst.save();
    res.status(201).json(savedGst);
  } catch (error) { 
    res.status(400).json({ message: error.message }); 
  }
};

export const updateGstReturn = async (req, res) => {
  try {
    const updatedGst = await GstReturn.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!updatedGst) return res.status(404).json({ message: 'Record not found' });
    res.json(updatedGst);
  } catch (error) { res.status(400).json({ message: error.message }); }
};

export const deleteGstReturn = async (req, res) => {
  try {
    const deletedGst = await GstReturn.findByIdAndDelete(req.params.id);
    if (!deletedGst) return res.status(404).json({ message: 'Record not found' });
    res.json({ message: 'GST Record removed from workspace.' });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const importGstReturns = async (req, res) => {
  try {
    const records = req.body.records;
    if (!records || records.length === 0) return res.status(400).json({ message: "No data found" });

    let importedCount = 0;
    let updatedCount = 0;

    // 🔴 AUTO-GENERATE ID COUNTER SETUP
    let nextIdCounter = 1001;
    const lastClient = await GstReturn.findOne({ clientId: { $exists: true, $ne: null,$ne: "" } }).sort({ createdAt: -1 });
    if (lastClient && lastClient.clientId) {
      const parts = lastClient.clientId.split('-');
      if (parts.length > 1 && !isNaN(parts[1])) {
        nextIdCounter = parseInt(parts[1]) + 1;
      }
    }

    for (let record of records) {
      // 🔴 FIX: Agar excel se empty string aayi hai, toh delete kar do taaki crash na ho
      if (!record.clientId || record.clientId.trim() === '') {
        delete record.clientId;
      }

      let existing = null;
      if (record.clientId) {
         existing = await GstReturn.findOne({ clientId: record.clientId });
      } 
      if (!existing && record.gstin) {
         existing = await GstReturn.findOne({ gstin: record.gstin.toUpperCase() });
      }
      
      if (existing) {
        let updateData = { ...record };
        
        // 🔴 FIX: Agar purana client hai aur uski ID gayab hai, usko bhi ID de do!
        if (!existing.clientId || existing.clientId.trim() === '') {
           updateData.clientId = `GST-${nextIdCounter++}`;
        }

        await GstReturn.findByIdAndUpdate(existing._id, updateData);
        updatedCount++;
      } else {
        // Naye client ke liye auto ID
        const newClientId = record.clientId || `GST-${nextIdCounter++}`;
        await GstReturn.create({ ...record, clientId: newClientId, createdBy: req.user._id });
        importedCount++;
      }
    }
    
    res.status(201).json({ message: `Success! Added: ${importedCount}, Updated: ${updatedCount}`, count: importedCount + updatedCount });
  } catch (error) { 
    console.error("Import Error:", error);
    res.status(500).json({ message: error.message }); 
  }
};

// @desc    Bulk Delete GST Records
// @route   POST /api/gst/bulk-delete
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