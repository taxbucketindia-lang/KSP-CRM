import ItrReturn from '../models/ItrReturn.js';
import ClientMaster from '../models/ClientMaster.js';

// 🔴 HELPER FUNCTION: Smart Find, Create OR UPDATE Client
const findOrCreateClient = async (clientData) => {
  const uppercasePan = clientData.pan.toUpperCase();
  let clientDoc = await ClientMaster.findOne({ pan: uppercasePan });

  if (!clientDoc) {
    // 1. Agar Client NAHI hai toh Naya Banao
    const panSuffix = uppercasePan.slice(-5);
    const lastClient = await ClientMaster.findOne().sort({ createdAt: -1 });
    let nextSequenceNum = 1;

    if (lastClient && lastClient.clientId) {
      const lastSeqStr = lastClient.clientId.split('-').pop();
      const lastSeqNum = parseInt(lastSeqStr, 10);
      if (!isNaN(lastSeqNum)) {
        nextSequenceNum = lastSeqNum + 1;
      } else {
        const count = await ClientMaster.countDocuments();
        nextSequenceNum = count + 1;
      }
    } else {
      const count = await ClientMaster.countDocuments();
      nextSequenceNum = count + 1;
    }

    const sequenceNum = String(nextSequenceNum).padStart(4, '0');
    const customClientId = `TB-${panSuffix}-${sequenceNum}`;

    clientDoc = new ClientMaster({
      ...clientData,
      clientId: customClientId,
      pan: uppercasePan,
      clientType: clientData.clientType || 'Individual',
    });

    await clientDoc.save();
  } else {
    // 🔴 2. AUTO-UPDATE LOGIC: Agar client pehle se hai toh naye ITR Data se usko update karo
    const updates = {};
    if (clientData.name) updates.name = clientData.name;
    if (clientData.mobile) updates.mobile = clientData.mobile;
    if (clientData.email) updates.email = clientData.email;
    if (clientData.dob) updates.dob = clientData.dob; // 👈 DOB Update
    if (clientData.fatherName) updates.fatherName = clientData.fatherName; // 👈 Father Name Update
    if (clientData.address) updates.address = clientData.address;
    if (clientData.state) updates.state = clientData.state;
    if (clientData.pinCode) updates.pinCode = clientData.pinCode;

    // Agar koi nayi field aayi hai toh Master DB mein overwrite kar do
    if (Object.keys(updates).length > 0) {
      clientDoc = await ClientMaster.findByIdAndUpdate(clientDoc._id, { $set: updates }, { new: true });
    }
  }
  
  return clientDoc;
};

// @desc    Get all ITR records
// @route   GET /api/itr
export const getItrReturns = async (req, res) => {
  try {
    await ItrReturn.collection.dropIndex("clientId_1").catch(e => console.log("Index already dropped"));
    
    // 🔴 NAYA: Extract query parameters for pagination and filtering
    const { 
      search, 
      status, 
      verification, 
      processed, 
      returnType, 
      feeStatus, 
      page = 1, 
      limit = 10, 
      fetchAll 
    } = req.query;

    let filter = {};

    // Search Filtering (Assuming you want to search by assesseeName or PAN)
    if (search) {
      filter.$or = [
        { assesseeName: { $regex: search, $options: 'i' } },
        { pan: { $regex: search, $options: 'i' } }
      ];
    }

    // Other Filters
    if (status && status !== 'ALL') {
      if (status === 'Documents Pending') {
         filter.$or = [{ itrStatus: status }, { itrStatus: { $exists: false } }];
      } else {
         filter.itrStatus = status;
      }
    }
    
    if (verification && verification !== 'ALL') {
      if (verification === 'Pending') {
         filter.$or = [{ verificationMethod: verification }, { verificationMethod: { $exists: false } }];
      } else {
         filter.verificationMethod = verification;
      }
    }

    if (processed && processed !== 'ALL') {
       if (processed === 'Pending') {
          filter.$or = [{ itrProcessedStatus: processed }, { itrProcessedStatus: { $exists: false } }];
       } else {
          filter.itrProcessedStatus = processed;
       }
    }

    if (returnType && returnType !== 'ALL') {
       if (returnType === 'Original') {
           filter.$or = [{ returnType: returnType }, { returnType: { $exists: false } }];
       } else {
           filter.returnType = returnType;
       }
    }

    if (feeStatus && feeStatus !== 'ALL') {
       if (feeStatus === 'Dues') {
           filter.$or = [{ feeStatus: feeStatus }, { feeStatus: { $exists: false } }];
       } else {
           filter.feeStatus = feeStatus;
       }
    }

    let itrRecords = [];
    let totalPages = 1;
    let totalCount = 0;

    // 🔴 Agar Excel Export ke liye call kiya hai, toh saara data bhejenge bina limit ke
    if (fetchAll === 'true') {
      itrRecords = await ItrReturn.find(filter)
        .populate('createdBy', 'name empId')
        .populate('clientMasterId', 'pan clientType clientId')
        .sort({ filingDate: -1, createdAt: -1 }) // Sort by filing date descending
        .lean();
      totalCount = itrRecords.length;
    } else {
      // 🔴 SERVER SIDE PAGINATION LOGIC
      const skip = (parseInt(page) - 1) * parseInt(limit);
      totalCount = await ItrReturn.countDocuments(filter);
      totalPages = Math.ceil(totalCount / parseInt(limit));
      
      itrRecords = await ItrReturn.find(filter)
        .populate('createdBy', 'name empId')
        .populate('clientMasterId', 'pan clientType clientId')
        .sort({ filingDate: -1, createdAt: -1 }) // Sort by filing date descending
        .skip(skip)
        .limit(parseInt(limit))
        .lean();
    }

    res.status(200).json({
      data: itrRecords,
      currentPage: parseInt(page),
      totalPages,
      totalCount
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create new ITR Record (Manual)
// @route   POST /api/itr
export const createItrReturn = async (req, res) => {
  try {
    const uppercasePan = req.body.pan.toUpperCase();

    // 1. Duplicate check based on PAN & AY
    const existing = await ItrReturn.findOne({ 
      pan: uppercasePan, 
      itrFiledUpToAY: req.body.itrFiledUpToAY,
      returnType: req.body.returnType || 'Original' 
    });
    
    if (existing) {
      return res.status(400).json({ message: `ITR for PAN ${req.body.pan} in ${req.body.itrFiledUpToAY} (${req.body.returnType || 'Original'}) already exists.` });
    }

    // 🔴 2. SMART AUTO-SYNC (Ab DOB aur Father Name bhi bhej rahe hain)
    const clientDoc = await findOrCreateClient({
      name: req.body.assesseeName,
      pan: uppercasePan,
      mobile: req.body.mobile,
      email: req.body.email,
      address: req.body.address || req.body.district,
      state: req.body.state,
      pinCode: req.body.pinCode,
      dob: req.body.dob,              // 👈 Mising Fields Fixed
      fatherName: req.body.fatherName,// 👈 Mising Fields Fixed
      clientType: 'Individual' 
    });

    // 3. Save ITR Return & Link ClientMaster ID
    const newItr = new ItrReturn({ 
      ...req.body, 
      pan: uppercasePan,
      clientMasterId: clientDoc._id, // LINKED!
      createdBy: req.user._id 
    });
    
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
    if (req.body.pan) req.body.pan = req.body.pan.toUpperCase();

    const updatedItr = await ItrReturn.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true, runValidators: true }
    );
    
    if (!updatedItr) return res.status(404).json({ message: 'Record not found' });

    // 🔴 AUTO-SYNC ON UPDATE: Jab bhi ITR update ho toh Client Master bhi update ho jaye
    if (req.body.pan) {
      await findOrCreateClient({
        name: req.body.assesseeName,
        pan: req.body.pan,
        mobile: req.body.mobile,
        email: req.body.email,
        address: req.body.address || req.body.district,
        state: req.body.state,
        pinCode: req.body.pinCode,
        dob: req.body.dob,
        fatherName: req.body.fatherName
      });
    }

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
export const importItrReturns = async (req, res) => {
  try {
    const records = req.body.itrRecords;
    if (!records || records.length === 0) return res.status(400).json({ message: "No data found in Excel" });

    let importedCount = 0;
    let updatedCount = 0;

    for (const record of records) {
      if (!record.pan) continue; // Skip if no PAN
      const uppercasePan = record.pan.toUpperCase();

      // 🔴 1. SMART AUTO-SYNC FOR EXCEL IMPORT
      const clientDoc = await findOrCreateClient({
        name: record.assesseeName,
        pan: uppercasePan,
        mobile: record.mobile,
        email: record.email,
        address: record.district || record.address,
        state: record.state,
        pinCode: record.pinCode,
        dob: record.dob,
        fatherName: record.fatherName,
        clientType: 'Individual' 
      });

      // 2. Setup ITR Payload
      const itrPayload = {
        ...record,
        pan: uppercasePan,
        clientMasterId: clientDoc._id 
      };

      // 3. Find if this specific ITR already exists
      let existing = await ItrReturn.findOne({ 
          pan: uppercasePan,
          itrFiledUpToAY: record.itrFiledUpToAY || 'AY 2025-26',
          returnType: record.returnType || 'Original'
      });
      
      if (existing) {
        await ItrReturn.findByIdAndUpdate(existing._id, itrPayload);
        updatedCount++;
      } else {
        await ItrReturn.create({ ...itrPayload, createdBy: req.user._id });
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