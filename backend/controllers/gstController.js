// import GstReturn from '../models/GstReturn.js';

// export const getGstReturns = async (req, res) => {
//   try {
//     const gstRecords = await GstReturn.find({}).populate('createdBy', 'name empId').sort({ createdAt: -1 });
//     res.json(gstRecords);
//   } catch (error) { res.status(500).json({ message: error.message }); }
// };

// export const createGstReturn = async (req, res) => {
//   try {
//     const existing = await GstReturn.findOne({ gstin: req.body.gstin });
//     if (existing) return res.status(400).json({ message: 'GSTIN already exists in workspace.' });

//     // 🔴 AUTO-GENERATE CLIENT ID LOGIC
//     let finalClientId = req.body.clientId;
//     if (!finalClientId || finalClientId.trim() === '') {
//       let nextIdCounter = 1001;
//       const lastClient = await GstReturn.findOne({ clientId: { $exists: true, $ne: null,$ne: "" } }).sort({ createdAt: -1 });
//       if (lastClient && lastClient.clientId) {
//         const parts = lastClient.clientId.split('-');
//         if (parts.length > 1 && !isNaN(parts[1])) {
//           nextIdCounter = parseInt(parts[1]) + 1;
//         }
//       }
//       finalClientId = `GST-${nextIdCounter}`;
//     }

//     const newGst = new GstReturn({ ...req.body, clientId: finalClientId, createdBy: req.user._id });
//     const savedGst = await newGst.save();
//     res.status(201).json(savedGst);
//   } catch (error) { 
//     res.status(400).json({ message: error.message }); 
//   }
// };

// export const updateGstReturn = async (req, res) => {
//   try {
//     const updatedGst = await GstReturn.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
//     if (!updatedGst) return res.status(404).json({ message: 'Record not found' });
//     res.json(updatedGst);
//   } catch (error) { res.status(400).json({ message: error.message }); }
// };

// export const deleteGstReturn = async (req, res) => {
//   try {
//     const deletedGst = await GstReturn.findByIdAndDelete(req.params.id);
//     if (!deletedGst) return res.status(404).json({ message: 'Record not found' });
//     res.json({ message: 'GST Record removed from workspace.' });
//   } catch (error) { res.status(500).json({ message: error.message }); }
// };

// export const importGstReturns = async (req, res) => {
//   try {
//     const records = req.body.records;
//     if (!records || records.length === 0) return res.status(400).json({ message: "No data found" });

//     let importedCount = 0;
//     let updatedCount = 0;

//     // 🔴 AUTO-GENERATE ID COUNTER SETUP
//     let nextIdCounter = 1001;
//     const lastClient = await GstReturn.findOne({ clientId: { $exists: true, $ne: null,$ne: "" } }).sort({ createdAt: -1 });
//     if (lastClient && lastClient.clientId) {
//       const parts = lastClient.clientId.split('-');
//       if (parts.length > 1 && !isNaN(parts[1])) {
//         nextIdCounter = parseInt(parts[1]) + 1;
//       }
//     }

//     for (let record of records) {
//       // 🔴 FIX: Agar excel se empty string aayi hai, toh delete kar do taaki crash na ho
//       if (!record.clientId || record.clientId.trim() === '') {
//         delete record.clientId;
//       }

//       let existing = null;
//       if (record.clientId) {
//          existing = await GstReturn.findOne({ clientId: record.clientId });
//       } 
//       if (!existing && record.gstin) {
//          existing = await GstReturn.findOne({ gstin: record.gstin.toUpperCase() });
//       }
      
//       if (existing) {
//         let updateData = { ...record };
        
//         // 🔴 FIX: Agar purana client hai aur uski ID gayab hai, usko bhi ID de do!
//         if (!existing.clientId || existing.clientId.trim() === '') {
//            updateData.clientId = `GST-${nextIdCounter++}`;
//         }

//         await GstReturn.findByIdAndUpdate(existing._id, updateData);
//         updatedCount++;
//       } else {
//         // Naye client ke liye auto ID
//         const newClientId = record.clientId || `GST-${nextIdCounter++}`;
//         await GstReturn.create({ ...record, clientId: newClientId, createdBy: req.user._id });
//         importedCount++;
//       }
//     }
    
//     res.status(201).json({ message: `Success! Added: ${importedCount}, Updated: ${updatedCount}`, count: importedCount + updatedCount });
//   } catch (error) { 
//     console.error("Import Error:", error);
//     res.status(500).json({ message: error.message }); 
//   }
// };

// // @desc    Bulk Delete GST Records
// // @route   POST /api/gst/bulk-delete
// export const bulkDeleteGstReturns = async (req, res) => {
//   try {
//     const { ids } = req.body;
//     if (!ids || !Array.isArray(ids) || ids.length === 0) {
//       return res.status(400).json({ message: 'No IDs provided for deletion.' });
//     }
//     await GstReturn.deleteMany({ _id: { $in: ids } });
//     res.json({ message: `${ids.length} records deleted successfully.` });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };







// import GstReturn from '../models/GstReturn.js';
// import ClientMaster from '../models/ClientMaster.js'; // 🔴 IMPORT CLIENT MASTER

// // @desc    Get all GST records
// // @route   GET /api/gst
// export const getGstReturns = async (req, res) => {
//   try {
//     const gstRecords = await GstReturn.find({})
//       .populate('createdBy', 'name empId')
//       .populate('clientMasterId', 'pan clientType') // Populate linked client data
//       .sort({ createdAt: -1 });
//     res.json(gstRecords);
//   } catch (error) { 
//     res.status(500).json({ message: error.message }); 
//   }
// };

// // @desc    Create new GST Record (Manual)
// // @route   POST /api/gst
// export const createGstReturn = async (req, res) => {
//   try {
//     // Check for duplicate GSTIN
//     const existing = await GstReturn.findOne({ gstin: req.body.gstin?.toUpperCase() });
//     if (existing) return res.status(400).json({ message: 'GSTIN already exists in workspace.' });

//     // 🔴 1. SMART UPSERT FOR CLIENT MASTER (Single Source of Truth)
//     // PAN se check karenge, agar PAN nahi aaya toh GSTIN ke beech ke 10 characters utha lenge (as fallback)
//     const rawPan = req.body.pan || (req.body.gstin ? req.body.gstin.substring(2, 12) : null);
//     if (!rawPan) return res.status(400).json({ message: 'PAN Number is required to create a Master Record.' });
    
//     const uppercasePan = rawPan.toUpperCase();

//     const clientDoc = await ClientMaster.findOneAndUpdate(
//       { pan: uppercasePan },
//       { 
//           $setOnInsert: { 
//               name: req.body.assesseeName, 
//               pan: uppercasePan,
//               mobile: req.body.mobile,
//               email: req.body.email,
//               state: req.body.state,
//               pinCode: req.body.pinCode,
//               clientType: req.body.taxpayerType === 'Regular' ? 'Private Limited' : 'Individual' // Basic Assumption
//           } 
//       },
//       { new: true, upsert: true }
//     );

//     // 🔴 2. Save GST Return & Link ClientMaster ID (NO MORE GST-1001)
//     const newGst = new GstReturn({ 
//       ...req.body, 
//       pan: uppercasePan, // Optional: saving PAN in GST record too
//       gstin: req.body.gstin?.toUpperCase(),
//       clientMasterId: clientDoc._id, // LINKED!
//       createdBy: req.user._id 
//     });
    
//     const savedGst = await newGst.save();
//     res.status(201).json(savedGst);
//   } catch (error) { 
//     res.status(400).json({ message: error.message }); 
//   }
// };

// // @desc    Update GST Record
// // @route   PUT /api/gst/:id
// export const updateGstReturn = async (req, res) => {
//   try {
//     if (req.body.gstin) req.body.gstin = req.body.gstin.toUpperCase();
//     if (req.body.pan) req.body.pan = req.body.pan.toUpperCase();

//     const updatedGst = await GstReturn.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
//     if (!updatedGst) return res.status(404).json({ message: 'Record not found' });
//     res.json(updatedGst);
//   } catch (error) { res.status(400).json({ message: error.message }); }
// };

// // @desc    Delete GST Record
// // @route   DELETE /api/gst/:id
// export const deleteGstReturn = async (req, res) => {
//   try {
//     const deletedGst = await GstReturn.findByIdAndDelete(req.params.id);
//     if (!deletedGst) return res.status(404).json({ message: 'Record not found' });
//     res.json({ message: 'GST Record removed from workspace.' });
//   } catch (error) { res.status(500).json({ message: error.message }); }
// };

// // @desc    Import GST Records from Excel (Add New & Update Existing)
// // @route   POST /api/gst/import
// export const importGstReturns = async (req, res) => {
//   try {
//     const records = req.body.records;
//     if (!records || records.length === 0) return res.status(400).json({ message: "No data found" });

//     let importedCount = 0;
//     let updatedCount = 0;

//     for (let record of records) {
//       if (!record.gstin) continue; // Skip without GSTIN
      
//       const uppercaseGstin = record.gstin.toUpperCase();
//       // Extract PAN from GSTIN (Characters 3 to 12) if PAN isn't explicitly in excel
//       const extractedPan = record.pan ? record.pan.toUpperCase() : uppercaseGstin.substring(2, 12);

//       // 🔴 1. UPSERT CLIENT MASTER FOR EXCEL ROWS
//       const clientDoc = await ClientMaster.findOneAndUpdate(
//         { pan: extractedPan },
//         { 
//             $setOnInsert: { 
//                 name: record.assesseeName, 
//                 pan: extractedPan,
//                 mobile: record.mobile,
//                 email: record.email,
//                 state: record.state,
//                 pinCode: record.pinCode,
//                 clientType: 'Private Limited'
//             } 
//         },
//         { new: true, upsert: true }
//       );

//       // 2. Setup GST Payload with Linked ID
//       const gstPayload = {
//         ...record,
//         pan: extractedPan,
//         gstin: uppercaseGstin,
//         clientMasterId: clientDoc._id // LINKED!
//       };

//       // 3. Find if this specific GSTIN already exists
//       let existing = await GstReturn.findOne({ gstin: uppercaseGstin });
      
//       if (existing) {
//         // UPDATE OLD GST RECORD
//         await GstReturn.findByIdAndUpdate(existing._id, gstPayload);
//         updatedCount++;
//       } else {
//         // CREATE NEW GST RECORD (No more custom IDs)
//         await GstReturn.create({ ...gstPayload, createdBy: req.user._id });
//         importedCount++;
//       }
//     }
    
//     res.status(201).json({ message: `Success! Added: ${importedCount}, Updated: ${updatedCount}`, count: importedCount + updatedCount });
//   } catch (error) { 
//     console.error("Import Error:", error);
//     res.status(500).json({ message: error.message }); 
//   }
// };

// // @desc    Bulk Delete GST Records
// // @route   POST /api/gst/bulk-delete
// export const bulkDeleteGstReturns = async (req, res) => {
//   try {
//     const { ids } = req.body;
//     if (!ids || !Array.isArray(ids) || ids.length === 0) {
//       return res.status(400).json({ message: 'No IDs provided for deletion.' });
//     }
//     await GstReturn.deleteMany({ _id: { $in: ids } });
//     res.json({ message: `${ids.length} records deleted successfully.` });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };










import GstReturn from '../models/GstReturn.js';
import ClientMaster from '../models/ClientMaster.js'; // 🔴 IMPORT CLIENT MASTER

// @desc    Get all GST records
// @route   GET /api/gst
export const getGstReturns = async (req, res) => {
  try {
    const gstRecords = await GstReturn.find({})
      .populate('createdBy', 'name empId')
      .populate('clientMasterId', 'clientId pan clientType gstin') // Populate linked client data
      .sort({ createdAt: -1 });
    res.json(gstRecords);
  } catch (error) { 
    res.status(500).json({ message: error.message }); 
  }
};

// @desc    Create new GST Record (Manual)
// @route   POST /api/gst
export const createGstReturn = async (req, res) => {
  try {
    // Check for duplicate GSTIN
    const existing = await GstReturn.findOne({ gstin: req.body.gstin?.toUpperCase() });
    if (existing) return res.status(400).json({ message: 'GSTIN already exists in workspace.' });

    // PAN se check karenge, agar PAN nahi aaya toh GSTIN ke beech ke 10 characters utha lenge (as fallback)
    const rawPan = req.body.pan || (req.body.gstin ? req.body.gstin.substring(2, 12) : null);
    if (!rawPan) return res.status(400).json({ message: 'PAN Number is required to create a Master Record.' });
    
    const uppercasePan = rawPan.toUpperCase();

    // 🔴 DYNAMIC SMART UPDATE FOR CLIENT MASTER
    let masterUpdates = {};
    if (req.body.assesseeName) masterUpdates.name = req.body.assesseeName;
    if (req.body.mobile) masterUpdates.mobile = req.body.mobile;
    if (req.body.email) masterUpdates.email = req.body.email;
    if (req.body.state) masterUpdates.state = req.body.state;
    if (req.body.pinCode) masterUpdates.pinCode = req.body.pinCode;
    if (req.body.gstin) masterUpdates.gstin = req.body.gstin.toUpperCase();
    
    if (req.body.taxpayerType && req.body.taxpayerType === 'Regular') {
        masterUpdates.clientType = 'Private Limited';
    } else if (req.body.taxpayerType) {
        masterUpdates.clientType = 'Individual';
    }

    const clientDoc = await ClientMaster.findOneAndUpdate(
      { pan: uppercasePan },
      { 
          $set: masterUpdates,$setOnInsert: { pan: uppercasePan } 
      },
      { new: true, upsert: true }
    );

    // Save GST Return & Link ClientMaster ID
    const newGst = new GstReturn({ 
      ...req.body, 
      pan: uppercasePan,
      gstin: req.body.gstin?.toUpperCase(),
      clientMasterId: clientDoc._id, // LINKED!
      createdBy: req.user._id 
    });
    
    const savedGst = await newGst.save();
    res.status(201).json(savedGst);
  } catch (error) { 
    res.status(400).json({ message: error.message }); 
  }
};

// @desc    Update GST Record
// @route   PUT /api/gst/:id
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
// @route   DELETE /api/gst/:id
export const deleteGstReturn = async (req, res) => {
  try {
    const deletedGst = await GstReturn.findByIdAndDelete(req.params.id);
    if (!deletedGst) return res.status(404).json({ message: 'Record not found' });
    res.json({ message: 'GST Record removed from workspace.' });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

// @desc    Import GST Records from Excel (Add New & Update Existing)
// @route   POST /api/gst/import
export const importGstReturns = async (req, res) => {
  try {
    const records = req.body.records;
    if (!records || records.length === 0) return res.status(400).json({ message: "No data found" });

    let importedCount = 0;
    let updatedCount = 0;

    for (let record of records) {
      if (!record.gstin) continue; // Skip without GSTIN
      
      const uppercaseGstin = record.gstin.toUpperCase();
      const extractedPan = record.pan ? record.pan.toUpperCase() : uppercaseGstin.substring(2, 12);

      // 🔴 DYNAMIC SMART UPDATE FOR EXCEL IMPORT
      let masterUpdates = {};
      if (record.assesseeName) masterUpdates.name = record.assesseeName;
      if (record.mobile) masterUpdates.mobile = record.mobile;
      if (record.email) masterUpdates.email = record.email;
      if (record.state) masterUpdates.state = record.state;
      if (record.pinCode) masterUpdates.pinCode = record.pinCode;
      if (uppercaseGstin) masterUpdates.gstin = uppercaseGstin;

      const clientDoc = await ClientMaster.findOneAndUpdate(
        { pan: extractedPan },
        { 
            $set: masterUpdates,$setOnInsert: { 
                pan: extractedPan,
                clientType: 'Private Limited'
            } 
        },
        { new: true, upsert: true }
      );

      const gstPayload = {
        ...record,
        pan: extractedPan,
        gstin: uppercaseGstin,
        clientMasterId: clientDoc._id // LINKED!
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