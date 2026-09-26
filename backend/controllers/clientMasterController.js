// import ClientMaster from '../models/ClientMaster.js';
// import ItrReturn from '../models/ItrReturn.js'; // 🔴 IMPORTED
// import GstReturn from '../models/GstReturn.js'; // 🔴 IMPORTED
// import RocWorkspace from '../models/RocWorkspace.js';

// // 1. Get All Clients (with search & filter)
// export const getClients = async (req, res) => {
//   try {
//     const { search, type, status } = req.query;
//     let filter = {};

//     if (search) {
//       filter.$or = [
//         { name: { $regex: search, $options: 'i' } },
//         { pan: { $regex: search, $options: 'i' } },
//         { gstin: { $regex: search, $options: 'i' } }
//       ];
//     }
//     if (type && type !== 'All') filter.clientType = type;
//     if (status && status !== 'All') filter.status = status;

//     // lean() makes the query faster and returns a plain JS object
//     const clients = await ClientMaster.find(filter).lean().sort({ createdAt: -1 });

//     // 🔴 THE MAGIC: Fetch Live Workspace Links for each client
//     const enrichedClients = await Promise.all(clients.map(async (client) => {
//       // Check if client _id exists in these workspaces
//       const hasItr = await ItrReturn.exists({ clientMasterId: client._id });
//       const hasGst = await GstReturn.exists({ clientMasterId: client._id });
//       const hasRoc = await RocWorkspace.exists({ clientMasterId: client._id });
      
//       return {
//         ...client,
//         services: {
//           itr: !!hasItr, // returns true or false
//           gst: !!hasGst,
//           roc: !!hasRoc
//         }
//       };
//     }));

//     res.status(200).json(enrichedClients);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// // 2. Create a New Client Manually
// export const createClient = async (req, res) => {
//   try {
//     const { pan, ...otherData } = req.body;
    
//     if (!pan) return res.status(400).json({ message: "PAN Number is strictly required." });

//     // Check if PAN already exists
//     const existingClient = await ClientMaster.findOne({ pan: pan.toUpperCase() });
//     if (existingClient) {
//       return res.status(400).json({ message: `Client already exists with this PAN: ${existingClient.name}` });
//     }

//     const newClient = new ClientMaster({
//       pan: pan.toUpperCase(),
//       ...otherData
//     });

//     await newClient.save();
//     res.status(201).json({ message: "Client created successfully", data: newClient });
//   } catch (error) {
//     res.status(400).json({ message: error.message });
//   }
// };

// // 3. Update Client Details
// export const updateClient = async (req, res) => {
//   try {
//     const { pan, ...updateData } = req.body;
    
//     // PAN should ideally not be changed, but if provided, format it
//     if (pan) updateData.pan = pan.toUpperCase();

//     const updatedClient = await ClientMaster.findByIdAndUpdate(
//       req.params.id,
//       updateData,
//       { new: true }
//     );

//     if (!updatedClient) return res.status(404).json({ message: "Client not found." });

//     res.status(200).json({ message: "Client details updated", data: updatedClient });
//   } catch (error) {
//     res.status(400).json({ message: error.message });
//   }
// };

// // 4. Delete Client
// export const deleteClient = async (req, res) => {
//   try {
//     const client = await ClientMaster.findByIdAndDelete(req.params.id);
//     if (!client) return res.status(404).json({ message: "Client not found." });
    
//     res.status(200).json({ message: "Client deleted permanently." });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };








import ClientMaster from '../models/ClientMaster.js';
import ItrReturn from '../models/ItrReturn.js'; 
import GstReturn from '../models/GstReturn.js'; 
import RocWorkspace from '../models/RocWorkspace.js';

// 1. Get All Clients (with Robust Dual-Fallback Linkage Tracking)
export const getClients = async (req, res) => {
  try {
    const { search, type, status } = req.query;
    let filter = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search,$options: 'i' } },
        { pan: { $regex: search,$options: 'i' } },
        { gstin: { $regex: search,$options: 'i' } },
        { clientId: { $regex: search,$options: 'i' } }
      ];
    }
    if (type && type !== 'All') filter.clientType = type;
    if (status && status !== 'All') filter.status = status;

    const clients = await ClientMaster.find(filter).lean().sort({ createdAt: -1 });

    // 🔴 DUAL FALLBACK CHECK: clientMasterId ya PAN match hone par bhi active dikhayega
    const enrichedClients = await Promise.all(clients.map(async (client) => {
      const hasItr = await ItrReturn.exists({ 
        $or: [{ clientMasterId: client._id }, { pan: client.pan }] 
      });
      const hasGst = await GstReturn.exists({ 
        $or: [{ clientMasterId: client._id }, { pan: client.pan }] 
      });
      const hasRoc = await RocWorkspace.exists({ 
        $or: [{ clientMasterId: client._id }] 
      });
      
      return {
        ...client,
        services: {
          itr: !!hasItr,
          gst: !!hasGst,
          roc: !!hasRoc
        }
      };
    }));

    res.status(200).json(enrichedClients);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 2. Create a New Client Manually with Auto-Generated Custom ID
// 2. Create a New Client Manually with Auto-Generated Custom ID
export const createClient = async (req, res) => {
  try {
    const { pan, ...otherData } = req.body;
    
    if (!pan) return res.status(400).json({ message: "PAN Number is strictly required." });
    const uppercasePan = pan.toUpperCase();

    // Check if PAN already exists
    const existingClient = await ClientMaster.findOne({ pan: uppercasePan });
    if (existingClient) {
      return res.status(400).json({ message: `Client already exists with this PAN: ${existingClient.name}` });
    }

    // 🔴 AUTO-GENERATE CUSTOM ID (Safely handling deletions)
    const panSuffix = uppercasePan.slice(-5); 
    
    // Find the latest client created to get the highest sequence number
    const lastClient = await ClientMaster.findOne().sort({ createdAt: -1 });
    let nextSequenceNum = 1;

    if (lastClient && lastClient.clientId) {
      // Extract the last part of the ID (e.g., "0005" from "TB-1234F-0005")
      const lastSeqStr = lastClient.clientId.split('-').pop();
      const lastSeqNum = parseInt(lastSeqStr, 10);
      
      if (!isNaN(lastSeqNum)) {
        nextSequenceNum = lastSeqNum + 1;
      } else {
        // Fallback just in case older data doesn't match the format
        const count = await ClientMaster.countDocuments();
        nextSequenceNum = count + 1;
      }
    }

    const sequenceNum = String(nextSequenceNum).padStart(4, '0');
    const customClientId = `TB-${panSuffix}-${sequenceNum}`;

    const newClient = new ClientMaster({
      clientId: customClientId,
      pan: uppercasePan,
      ...otherData
    });

    await newClient.save();
    res.status(201).json({ message: "Client created successfully", data: newClient });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// 3. Update Client Details
export const updateClient = async (req, res) => {
  try {
    const { pan, ...updateData } = req.body;
    if (pan) updateData.pan = pan.toUpperCase();

    const updatedClient = await ClientMaster.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!updatedClient) return res.status(404).json({ message: "Client not found." });

    res.status(200).json({ message: "Client details updated", data: updatedClient });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// 4. Delete Client
export const deleteClient = async (req, res) => {
  try {
    const client = await ClientMaster.findByIdAndDelete(req.params.id);
    if (!client) return res.status(404).json({ message: "Client not found." });
    
    res.status(200).json({ message: "Client deleted permanently." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};