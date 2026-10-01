import FssaiWorkspace from '../models/FssaiWorkspace.js';
import ClientMaster from '../models/ClientMaster.js';

// @desc    Get all FSSAI workspaces
export const getFssaiWorkspaces = async (req, res) => {
  try {
    const workspaces = await FssaiWorkspace.find()
      .populate('clientMasterId', 'clientId name pan')
      .populate('createdBy', 'name empId')
      .sort({ createdAt: -1 });
    res.status(200).json(workspaces);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create new FSSAI workspace
export const createFssaiWorkspace = async (req, res) => {
  try {
    const { pan, fssaiLicenseNo } = req.body;
    if (!pan) return res.status(400).json({ message: "PAN Number is required to link Master Profile." });
    if (!fssaiLicenseNo) return res.status(400).json({ message: "FSSAI License No is required." });

    const uppercasePan = pan.toUpperCase();
    const uppercaseLicense = fssaiLicenseNo.toUpperCase();

    // Check Duplicate License
    const existing = await FssaiWorkspace.findOne({ fssaiLicenseNo: uppercaseLicense });
    if (existing) return res.status(400).json({ message: 'This FSSAI License is already in the workspace.' });

    // Link or Create Client Master
    let clientDoc = await ClientMaster.findOne({ pan: uppercasePan });
    if (!clientDoc) {
      // Auto-generate client if not exists
      const panSuffix = uppercasePan.slice(-5);
      const sequenceNum = String(await ClientMaster.countDocuments() + 1).padStart(4, '0');
      clientDoc = await ClientMaster.create({
        clientId: `TB-${panSuffix}-${sequenceNum}`,
        pan: uppercasePan,
        name: req.body.assesseeName,
        mobile: req.body.mobile,
        email: req.body.email,
        state: req.body.state,
        clientType: 'Individual' // Default for auto-create
      });
    }

    // Save FSSAI Data
    const newWorkspace = await FssaiWorkspace.create({
      ...req.body,
      pan: uppercasePan,
      fssaiLicenseNo: uppercaseLicense,
      clientMasterId: clientDoc._id,
      createdBy: req.user._id
    });

    // 🔴 IMPORTANT: Tell ClientMaster that FSSAI is active (for 360 view)
    await ClientMaster.findByIdAndUpdate(clientDoc._id, { $set: { 'services.fssai': true } });

    res.status(201).json(newWorkspace);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Update FSSAI workspace
export const updateFssaiWorkspace = async (req, res) => {
  try {
    const updatedWorkspace = await FssaiWorkspace.findByIdAndUpdate(
      req.params.id, req.body, { new: true }
    );
    if (!updatedWorkspace) return res.status(404).json({ message: 'Workspace not found' });
    res.status(200).json(updatedWorkspace);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete FSSAI workspace
export const deleteFssaiWorkspace = async (req, res) => {
  try {
    const workspace = await FssaiWorkspace.findByIdAndDelete(req.params.id);
    if (!workspace) return res.status(404).json({ message: 'Workspace not found' });
    res.status(200).json({ message: 'FSSAI Workspace deleted permanently' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Import FSSAI Records from Excel
export const importFssaiWorkspaces = async (req, res) => {
  try {
    const records = req.body.records;
    if (!records || records.length === 0) return res.status(400).json({ message: "No data found" });

    let importedCount = 0;
    let updatedCount = 0;

    // Client Master sequence auto-generate logic
    const lastClient = await ClientMaster.findOne({ clientId: { $regex: /^TB-/ } }).sort({ createdAt: -1 });
    let currentSequence = 1;
    if (lastClient && lastClient.clientId) {
      const lastSeqStr = lastClient.clientId.split('-').pop();
      const lastSeqNum = parseInt(lastSeqStr, 10);
      if (!isNaN(lastSeqNum)) currentSequence = lastSeqNum + 1;
    } else {
      currentSequence = await ClientMaster.countDocuments() + 1;
    }

    for (let record of records) {
      const uppercasePan = record.pan.toUpperCase();
      const uppercaseLicense = record.fssaiLicenseNo.toUpperCase();

      // 1. Check or Create Client in Master
      let clientDoc = await ClientMaster.findOne({ pan: uppercasePan });
      
      if (!clientDoc) {
        const panSuffix = uppercasePan.slice(-5); 
        const sequenceNumStr = String(currentSequence).padStart(4, '0');
        const customClientId = `TB-${panSuffix}-${sequenceNumStr}`;
        currentSequence++;

        clientDoc = await ClientMaster.create({
          clientId: customClientId,
          pan: uppercasePan,
          name: record.assesseeName,
          mobile: record.mobile,
          email: record.email,
          state: record.state,
          clientType: 'Individual' // Fallback
        });
      }

      // Mark client services FSSAI as active
      await ClientMaster.findByIdAndUpdate(clientDoc._id, { $set: { 'services.fssai': true } });

      const fssaiPayload = {
        ...record,
        pan: uppercasePan,
        fssaiLicenseNo: uppercaseLicense,
        clientMasterId: clientDoc._id 
      };

      // 2. Check if FSSAI License already exists
      let existing = await FssaiWorkspace.findOne({ fssaiLicenseNo: uppercaseLicense });
      
      if (existing) {
        await FssaiWorkspace.findByIdAndUpdate(existing._id, fssaiPayload);
        updatedCount++;
      } else {
        await FssaiWorkspace.create({ ...fssaiPayload, createdBy: req.user._id });
        importedCount++;
      }
    }
    
    res.status(201).json({ message: `Success! Added: ${importedCount}, Updated: ${updatedCount}`, count: importedCount + updatedCount });
  } catch (error) { 
    res.status(500).json({ message: error.message }); 
  }
};

// @desc    Bulk Delete FSSAI Workspaces
export const bulkDeleteFssaiWorkspaces = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) return res.status(400).json({ message: 'No IDs provided.' });
    
    await FssaiWorkspace.deleteMany({ _id: { $in: ids } });
    res.json({ message: `${ids.length} records deleted successfully.` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};