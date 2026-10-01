import ClientMaster from '../models/ClientMaster.js';
import ItrReturn from '../models/ItrReturn.js'; 
import GstReturn from '../models/GstReturn.js'; 
import RocWorkspace from '../models/RocWorkspace.js';
import TdsWorkspace from '../models/TdsWorkspace.js';
import AuditEngagement from '../models/AuditEngagement.js'; // 🔴 NAYA: Audit Model
import FssaiWorkspace from '../models/FssaiWorkspace.js';
// import TdsReturn from '../models/TdsReturn.js'; // 🔴 TDS Model (Aapka jo bhi TDS model ka naam ho wo yahan likh lena)

// ==========================================
// 1. Get All Clients (with dynamic service checks)
// ==========================================
export const getClients = async (req, res) => {
  try {
    const { search, type, status } = req.query;
    let filter = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search,$options: 'i' } },
        { tradeName: { $regex: search,$options: 'i' } },
        { pan: { $regex: search,$options: 'i' } },
        { gstin: { $regex: search,$options: 'i' } },
        { clientId: { $regex: search,$options: 'i' } } // 🔴 ID se search
      ];
    }
    if (type && type !== 'All') filter.clientType = type;
    if (status && status !== 'All') filter.status = status;

    // lean() makes the query faster and returns a plain JS object
    const clients = await ClientMaster.find(filter).lean().sort({ createdAt: -1 });

    // 🔴 THE MAGIC: Fetch Live Workspace Links dynamically for each client
    const enrichedClients = await Promise.all(clients.map(async (client) => {
      // Alag-alag tables me check karo ki client ka data hai ya nahi
      const hasItr = await ItrReturn.exists({ clientMasterId: client._id });
      const hasGst = await GstReturn.exists({ clientMasterId: client._id });
      const hasRoc = await RocWorkspace.exists({ clientMasterId: client._id });
      
      // 🔴 NAYA: Audit ka check (Audit model me foreign key 'client_id' hoti hai)
      const hasAudit = await AuditEngagement.exists({ client_id: client._id, is_active: true });
      
      // 🔴 NAYA: TDS ka check (Maan lijiye aapke TDS model me foreign key clientMasterId hai)
      // const hasTds = await TdsReturn.exists({ clientMasterId: client._id });
     const hasTds = await TdsWorkspace.exists({ pan: client.pan }); // Jab TDS import kar lein tab upar wali line uncomment kar dena

     const hasFssai = await FssaiWorkspace.exists({ clientMasterId: client._id });

      return {
        ...client,
        services: {
          itr: !!hasItr,
          gst: !!hasGst,
          roc: !!hasRoc,
          audit: !!hasAudit, // 🔴 Ab Audit automatically ACTIVE ho jayega!
          tds: !!hasTds,  // 🔴 TDS bhi automatically active ho jayega!
          fssai: !!hasFssai,
        }
      };
    }));

    res.status(200).json(enrichedClients);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==========================================
// 2. Create a New Client Manually (With TB- ID Auto Gen)
// ==========================================
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

    // 🔴 THE MAGIC: Auto-Generate Client ID (TB-Last5-0001)
    const panSuffix = uppercasePan.slice(-5); // Last 5 digits/chars
    let nextSeq = 1;
    const lastClient = await ClientMaster.findOne({ clientId: { $regex: /^TB-/ } }).sort({ createdAt: -1 });
    
    if (lastClient && lastClient.clientId) {
      const parts = lastClient.clientId.split('-');
      const lastSeqStr = parts[parts.length - 1];
      if (!isNaN(lastSeqStr)) {
         nextSeq = parseInt(lastSeqStr, 10) + 1;
      } else {
         nextSeq = (await ClientMaster.countDocuments()) + 1;
      }
    } else {
       nextSeq = (await ClientMaster.countDocuments()) + 1;
    }

    const sequenceNum = String(nextSeq).padStart(4, '0');
    const generatedClientId = `TB-${panSuffix}-${sequenceNum}`;

    const newClient = new ClientMaster({
      clientId: generatedClientId, // 🔴 ID assign kar di
      pan: uppercasePan,
      ...otherData
    });

    await newClient.save();
    res.status(201).json({ message: "Client created successfully", data: newClient });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// ==========================================
// 3. Update Client Details
// ==========================================
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

// ==========================================
// 4. Delete Client
// ==========================================
export const deleteClient = async (req, res) => {
  try {
    const client = await ClientMaster.findByIdAndDelete(req.params.id);
    if (!client) return res.status(404).json({ message: "Client not found." });
    
    res.status(200).json({ message: "Client deleted permanently." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

