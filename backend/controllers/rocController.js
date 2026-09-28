// import RocWorkspace from '../models/RocWorkspace.js';
// import ClientMaster from '../models/ClientMaster.js';
// import Director from '../models/Director.js';
// import RocCompliance from '../models/RocCompliance.js';

// // ==========================================
// // 1. ROC WORKSPACE MANAGEMENT
// // ==========================================

// // @desc    Get all ROC Workspaces (with Client Details)
// // @route   GET /api/roc/workspaces
// export const getRocWorkspaces = async (req, res) => {
//   try {
//     const workspaces = await RocWorkspace.find({})
//       .populate('clientMasterId', 'clientId name pan mobile email clientType')
//       .populate('relationshipManager', 'name')
//       .sort({ createdAt: -1 });
      
//     res.status(200).json(workspaces);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// // @desc    Create new ROC Workspace
// // @route   POST /api/roc/workspaces
// export const createRocWorkspace = async (req, res) => {
//   try {
//     const { pan, name, clientType, ...rocDetails } = req.body;
//     const uppercasePan = pan.toUpperCase();

//     // 1. Check/Create Client in ClientMaster (Single Source of Truth)
//     const clientDoc = await ClientMaster.findOneAndUpdate(
//       { pan: uppercasePan },
//       { 
//         $setOnInsert: { 
//           name, 
//           pan: uppercasePan,
//           clientType: clientType || 'Private Limited'
//         } 
//       },
//       { new: true, upsert: true }
//     );

//     // 2. Check if ROC Workspace already exists for this client
//     const existingWorkspace = await RocWorkspace.findOne({ clientMasterId: clientDoc._id });
//     if (existingWorkspace) {
//       return res.status(400).json({ message: `ROC Workspace for ${clientDoc.name} already exists.` });
//     }

//     // 3. Create ROC Workspace
//     const newWorkspace = await RocWorkspace.create({
//       ...rocDetails,
//       clientMasterId: clientDoc._id
//     });

//     res.status(201).json({ message: "ROC Workspace Created", data: newWorkspace });
//   } catch (error) {
//     res.status(400).json({ message: error.message });
//   }
// };

// // ==========================================
// // 2. DIRECTOR & DSC MANAGEMENT
// // ==========================================

// // @desc    Add a Director to an ROC Workspace
// // @route   POST /api/roc/directors
// export const addDirector = async (req, res) => {
//   try {
//     const { rocWorkspaceId, fullName, dinOrDpin, pan, aadhaarLast4, designation, dscDetails } = req.body;

//     // Check if director exists (by DIN or PAN)
//     let director = await Director.findOne({
//       $or: [{ dinOrDpin }, { pan: pan?.toUpperCase() }]
//     });

//     if (!director) {
//       // Create new Director
//       director = await Director.create({
//         fullName,
//         dinOrDpin,
//         pan: pan?.toUpperCase(),
//         aadhaarLast4,
//         dscDetails
//       });
//     }

//     // Link Director to the Specific Company
//     const isAlreadyLinked = director.associatedCompanies.some(
//       (c) => c.rocWorkspaceId.toString() === rocWorkspaceId
//     );

//     if (isAlreadyLinked) {
//       return res.status(400).json({ message: "Director is already linked to this company." });
//     }

//     director.associatedCompanies.push({
//       rocWorkspaceId,
//       designation,
//       appointmentDate: new Date()
//     });

//     await director.save();
//     res.status(201).json({ message: "Director added successfully", data: director });
//   } catch (error) {
//     res.status(400).json({ message: error.message });
//   }
// };

// // @desc    Get all Directors for a specific company
// // @route   GET /api/roc/directors/:workspaceId
// export const getCompanyDirectors = async (req, res) => {
//   try {
//     const directors = await Director.find({
//       "associatedCompanies.rocWorkspaceId": req.params.workspaceId
//     });
//     res.status(200).json(directors);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };


// // ==========================================
// // 3. COMPLIANCE & FILING MANAGEMENT
// // ==========================================

// // @desc    Add new Compliance Task (e.g. AOC-4, MGT-7)
// // @route   POST /api/roc/compliance
// export const addComplianceTask = async (req, res) => {
//   try {
//     const newCompliance = await RocCompliance.create({
//       ...req.body,
//       assignedTo: req.user._id // Logged in user creates the task
//     });
//     res.status(201).json({ message: "Compliance Task Added", data: newCompliance });
//   } catch (error) {
//     res.status(400).json({ message: error.message });
//   }
// };

// // @desc    Get all Compliance Tasks for a company
// // @route   GET /api/roc/compliance/:workspaceId
// export const getComplianceTasks = async (req, res) => {
//   try {
//     const tasks = await RocCompliance.find({ rocWorkspaceId: req.params.workspaceId })
//       .sort({ dueDate: 1 }); // Sort by closest due date
//     res.status(200).json(tasks);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };


// // @desc    Update ROC Workspace
// // @route   PUT /api/roc/workspaces/:id
// export const updateRocWorkspace = async (req, res) => {
//   try {
//     const { pan, name, clientType, ...rocDetails } = req.body;

//     // Optional: Agar client ka naam ya type badalna ho toh ClientMaster bhi update kar sakte hain
//     if (pan) {
//       await ClientMaster.findOneAndUpdate(
//         { pan: pan.toUpperCase() },
//         { name, clientType },
//         { new: true }
//       );
//     }

//     // Workspace ki details update karein
//     const updatedWorkspace = await RocWorkspace.findByIdAndUpdate(
//       req.params.id,
//       rocDetails,
//       { new: true }
//     );

//     if (!updatedWorkspace) {
//       return res.status(404).json({ message: "ROC Workspace not found." });
//     }

//     res.status(200).json({ message: "ROC Workspace updated", data: updatedWorkspace });
//   } catch (error) {
//     res.status(400).json({ message: error.message });
//   }
// };

// // @desc    Delete ROC Workspace
// // @route   DELETE /api/roc/workspaces/:id
// export const deleteRocWorkspace = async (req, res) => {
//   try {
//     // 1. Delete Workspace
//     const deletedWorkspace = await RocWorkspace.findByIdAndDelete(req.params.id);
    
//     if (!deletedWorkspace) {
//       return res.status(404).json({ message: "ROC Workspace not found." });
//     }

//     // (Optional) Agar is company se jude Directors/Compliance bhi delete karne hain, 
//     // toh aap aage chalkar yahan logic laga sakte hain. Abhi ke liye sirf Workspace delete hoga.

//     res.status(200).json({ message: "ROC Workspace deleted successfully." });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };











// import RocWorkspace from '../models/RocWorkspace.js';
// import ClientMaster from '../models/ClientMaster.js';
// import Director from '../models/Director.js';
// import RocCompliance from '../models/RocCompliance.js';

// // ==========================================
// // 1. ROC WORKSPACE MANAGEMENT
// // ==========================================

// export const getRocWorkspaces = async (req, res) => {
//   try {
//     const workspaces = await RocWorkspace.find({})
//       .populate('clientMasterId', 'clientId name pan mobile email clientType')
//       .populate('relationshipManager', 'name')
//       .sort({ createdAt: -1 });
      
//     res.status(200).json(workspaces);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// export const createRocWorkspace = async (req, res) => {
//   try {
//     const { pan, name, clientType, ...rocDetails } = req.body;
//     const uppercasePan = pan.toUpperCase();

//     const clientDoc = await ClientMaster.findOneAndUpdate(
//       { pan: uppercasePan },
//       { 
//         $setOnInsert: { 
//           name, 
//           pan: uppercasePan,
//           clientType: clientType || 'Private Limited'
//         } 
//       },
//       { new: true, upsert: true }
//     );

//     const existingWorkspace = await RocWorkspace.findOne({ clientMasterId: clientDoc._id });
//     if (existingWorkspace) {
//       return res.status(400).json({ message: `ROC Workspace for ${clientDoc.name} already exists.` });
//     }

//     const newWorkspace = await RocWorkspace.create({
//       ...rocDetails,
//       clientMasterId: clientDoc._id
//     });

//     res.status(201).json({ message: "ROC Workspace Created", data: newWorkspace });
//   } catch (error) {
//     res.status(400).json({ message: error.message });
//   }
// };

// export const updateRocWorkspace = async (req, res) => {
//   try {
//     const { pan, name, clientType, ...rocDetails } = req.body;

//     if (pan) {
//       await ClientMaster.findOneAndUpdate(
//         { pan: pan.toUpperCase() },
//         { name, clientType },
//         { new: true }
//       );
//     }

//     const updatedWorkspace = await RocWorkspace.findByIdAndUpdate(
//       req.params.id,
//       rocDetails,
//       { new: true, runValidators: true } // runValidators ensures Enum checks pass
//     );

//     if (!updatedWorkspace) {
//       return res.status(404).json({ message: "ROC Workspace not found." });
//     }

//     res.status(200).json({ message: "ROC Workspace updated", data: updatedWorkspace });
//   } catch (error) {
//     res.status(400).json({ message: error.message });
//   }
// };

// export const deleteRocWorkspace = async (req, res) => {
//   try {
//     const deletedWorkspace = await RocWorkspace.findByIdAndDelete(req.params.id);
//     if (!deletedWorkspace) return res.status(404).json({ message: "ROC Workspace not found." });
    
//     // (Optional) Remove related directors/compliance links if needed later
//     res.status(200).json({ message: "ROC Workspace deleted successfully." });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// // ==========================================
// // 2. DIRECTOR & DSC MANAGEMENT
// // ==========================================

// export const addDirector = async (req, res) => {
//   try {
//     const { rocWorkspaceId, fullName, dinOrDpin, pan, aadhaarLast4, designation, dscDetails } = req.body;

//     let director = await Director.findOne({
//       $or: [{ dinOrDpin }, { pan: pan?.toUpperCase() }]
//     });

//     if (!director) {
//       director = await Director.create({
//         fullName, dinOrDpin, pan: pan?.toUpperCase(), aadhaarLast4, dscDetails
//       });
//     }

//     const isAlreadyLinked = director.associatedCompanies.some(
//       (c) => c.rocWorkspaceId.toString() === rocWorkspaceId
//     );

//     if (isAlreadyLinked) {
//       return res.status(400).json({ message: "Director is already linked to this company." });
//     }

//     director.associatedCompanies.push({
//       rocWorkspaceId, designation, appointmentDate: new Date()
//     });

//     await director.save();
//     res.status(201).json({ message: "Director added successfully", data: director });
//   } catch (error) {
//     res.status(400).json({ message: error.message });
//   }
// };

// export const getCompanyDirectors = async (req, res) => {
//   try {
//     const directors = await Director.find({
//       "associatedCompanies.rocWorkspaceId": req.params.workspaceId
//     });
//     res.status(200).json(directors);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// // ==========================================
// // 3. COMPLIANCE & FILING MANAGEMENT
// // ==========================================

// export const addComplianceTask = async (req, res) => {
//   try {
//     const newCompliance = await RocCompliance.create({
//       ...req.body,
//       assignedTo: req.user._id 
//     });
//     res.status(201).json({ message: "Compliance Task Added", data: newCompliance });
//   } catch (error) {
//     res.status(400).json({ message: error.message });
//   }
// };

// export const getComplianceTasks = async (req, res) => {
//   try {
//     const tasks = await RocCompliance.find({ rocWorkspaceId: req.params.workspaceId })
//       .sort({ dueDate: 1 }); 
//     res.status(200).json(tasks);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };














import RocWorkspace from '../models/RocWorkspace.js';
import ClientMaster from '../models/ClientMaster.js';
import Director from '../models/Director.js';
import RocCompliance from '../models/RocCompliance.js';

// ==========================================
// 1. ROC WORKSPACE MANAGEMENT
// ==========================================

export const getRocWorkspaces = async (req, res) => {
  try {
    const workspaces = await RocWorkspace.find({})
      .populate('clientMasterId', 'clientId name pan mobile email clientType')
      .populate('relationshipManager', 'name')
      .sort({ createdAt: -1 });
      
    res.status(200).json(workspaces);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createRocWorkspace = async (req, res) => {
  try {
    const { pan, name, clientType, ...rocDetails } = req.body;
    const uppercasePan = pan.toUpperCase();

    // 🔴 1. CHECK IF CLIENT EXISTS IN MASTER
    let clientDoc = await ClientMaster.findOne({ pan: uppercasePan });

    if (clientDoc) {
      // Agar Client pehle se hai, toh sirf name aur type update kar do
      clientDoc = await ClientMaster.findByIdAndUpdate(
        clientDoc._id,
        { $set: { name, clientType: clientType || 'Private Limited' } },
        { new: true }
      );
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

      // Naya client manually create karein ID ke sath
      clientDoc = await ClientMaster.create({
        clientId: customClientId,
        pan: uppercasePan,
        name: name,
        clientType: clientType || 'Private Limited'
      });
    }

    // 3. Check if ROC Workspace already exists for this client
    const existingWorkspace = await RocWorkspace.findOne({ clientMasterId: clientDoc._id });
    if (existingWorkspace) {
      return res.status(400).json({ message: `ROC Workspace for ${clientDoc.name} already exists.` });
    }

    // 4. Create ROC Workspace
    const newWorkspace = await RocWorkspace.create({
      ...rocDetails,
      companyName: name, // 🔴 DATA SNAPSHOT (Agar Client Master delete ho jaye toh ye bacha rahega)
      pan: uppercasePan, // 🔴 DATA SNAPSHOT
      clientType: clientType || 'Private Limited', // 🔴 DATA SNAPSHOT
      clientMasterId: clientDoc._id
    });

    res.status(201).json({ message: "ROC Workspace Created", data: newWorkspace });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const updateRocWorkspace = async (req, res) => {
  try {
    const { pan, name, clientType, ...rocDetails } = req.body;

    if (pan) {
      await ClientMaster.findOneAndUpdate(
        { pan: pan.toUpperCase() },
        { name, clientType },
        { new: true }
      );
    }

    const updatedWorkspace = await RocWorkspace.findByIdAndUpdate(
      req.params.id,
      {
         ...rocDetails,
         companyName: name, // 🔴 UPDATE SNAPSHOT
         pan: pan ? pan.toUpperCase() : undefined, // 🔴 UPDATE SNAPSHOT
         clientType // 🔴 UPDATE SNAPSHOT
      },
      { new: true, runValidators: true } // runValidators ensures Enum checks pass
    );

    if (!updatedWorkspace) {
      return res.status(404).json({ message: "ROC Workspace not found." });
    }

    res.status(200).json({ message: "ROC Workspace updated", data: updatedWorkspace });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteRocWorkspace = async (req, res) => {
  try {
    const deletedWorkspace = await RocWorkspace.findByIdAndDelete(req.params.id);
    if (!deletedWorkspace) return res.status(404).json({ message: "ROC Workspace not found." });
    
    // (Optional) Remove related directors/compliance links if needed later
    res.status(200).json({ message: "ROC Workspace deleted successfully." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==========================================
// 2. DIRECTOR & DSC MANAGEMENT
// ==========================================

export const addDirector = async (req, res) => {
  try {
    const { rocWorkspaceId, fullName, dinOrDpin, pan, aadhaarLast4, designation, dscDetails } = req.body;

    let director = await Director.findOne({
      $or: [{ dinOrDpin }, { pan: pan?.toUpperCase() }]
    });

    if (!director) {
      director = await Director.create({
        fullName, dinOrDpin, pan: pan?.toUpperCase(), aadhaarLast4, dscDetails
      });
    }

    const isAlreadyLinked = director.associatedCompanies.some(
      (c) => c.rocWorkspaceId.toString() === rocWorkspaceId
    );

    if (isAlreadyLinked) {
      return res.status(400).json({ message: "Director is already linked to this company." });
    }

    director.associatedCompanies.push({
      rocWorkspaceId, designation, appointmentDate: new Date()
    });

    await director.save();
    res.status(201).json({ message: "Director added successfully", data: director });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getCompanyDirectors = async (req, res) => {
  try {
    const directors = await Director.find({
      "associatedCompanies.rocWorkspaceId": req.params.workspaceId
    });
    res.status(200).json(directors);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==========================================
// 3. COMPLIANCE & FILING MANAGEMENT
// ==========================================

export const addComplianceTask = async (req, res) => {
  try {
    const newCompliance = await RocCompliance.create({
      ...req.body,
      assignedTo: req.user._id 
    });
    res.status(201).json({ message: "Compliance Task Added", data: newCompliance });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getComplianceTasks = async (req, res) => {
  try {
    const tasks = await RocCompliance.find({ rocWorkspaceId: req.params.workspaceId })
      .sort({ dueDate: 1 }); 
    res.status(200).json(tasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const importRocWorkspaces = async (req, res) => {
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
      if (!record.pan) continue; // PAN is mandatory
      
      const uppercasePan = record.pan.toUpperCase();

      // 🔴 1. CHECK IF CLIENT EXISTS IN MASTER
      let clientDoc = await ClientMaster.findOne({ pan: uppercasePan });

      if (clientDoc) {
        // Agar Client hai, toh basic details update karo
        let masterUpdates = {};
        if (record.name) masterUpdates.name = record.name;
        if (record.clientType) masterUpdates.clientType = record.clientType;
        await ClientMaster.findByIdAndUpdate(clientDoc._id, { $set: masterUpdates });
      } else {
        // 🔴 2. NAYA CLIENT (EXCEL SE): AUTO-GENERATE ID
        const panSuffix = uppercasePan.slice(-5); 
        const sequenceNumStr = String(currentSequence).padStart(4, '0');
        const customClientId = `TB-${panSuffix}-${sequenceNumStr}`;
        currentSequence++; // Next loop ke liye ID increment karo

        clientDoc = await ClientMaster.create({
          clientId: customClientId,
          pan: uppercasePan,
          name: record.name,
          clientType: record.clientType || 'Private Limited'
        });
      }

      // 🔴 IMPORT MEIN BHI SNAPSHOT FIELDS SAVE HONGI
      const rocPayload = {
        ...record,
        companyName: record.name, // 🔴 DATA SNAPSHOT
        pan: uppercasePan, // 🔴 DATA SNAPSHOT
        clientType: record.clientType || 'Private Limited', // 🔴 DATA SNAPSHOT
        clientMasterId: clientDoc._id 
      };

      // 🔴 3. UPSERT ROC WORKSPACE
      let existingWorkspace = null;
      if (record.cinOrLlpIn) {
         existingWorkspace = await RocWorkspace.findOne({ cinOrLlpIn: record.cinOrLlpIn.toUpperCase() });
      }
      if (!existingWorkspace) {
         existingWorkspace = await RocWorkspace.findOne({ clientMasterId: clientDoc._id });
      }
      
      if (existingWorkspace) {
        await RocWorkspace.findByIdAndUpdate(existingWorkspace._id, rocPayload);
        updatedCount++;
      } else {
        await RocWorkspace.create({ ...rocPayload, relationshipManager: req.user._id });
        importedCount++;
      }
    }
    
    res.status(201).json({ message: `Success! Added: ${importedCount}, Updated: ${updatedCount}`, count: importedCount + updatedCount });
  } catch (error) { 
    console.error("Import Error:", error);
    res.status(500).json({ message: error.message }); 
  }
};

// @desc    Bulk Delete ROC Records
// @route   POST /api/roc/workspaces/bulk-delete
export const bulkDeleteRocWorkspaces = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'No IDs provided for deletion.' });
    }
    await RocWorkspace.deleteMany({ _id: { $in: ids } });
    res.json({ message: `${ids.length} records deleted successfully.` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};