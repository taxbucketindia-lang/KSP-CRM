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

    const clientDoc = await ClientMaster.findOneAndUpdate(
      { pan: uppercasePan },
      { 
        $setOnInsert: { 
          name, 
          pan: uppercasePan,
          clientType: clientType || 'Private Limited'
        } 
      },
      { new: true, upsert: true }
    );

    const existingWorkspace = await RocWorkspace.findOne({ clientMasterId: clientDoc._id });
    if (existingWorkspace) {
      return res.status(400).json({ message: `ROC Workspace for ${clientDoc.name} already exists.` });
    }

    const newWorkspace = await RocWorkspace.create({
      ...rocDetails,
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
      rocDetails,
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