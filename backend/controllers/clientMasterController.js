import ClientMaster from '../models/ClientMaster.js';
import ItrReturn from '../models/ItrReturn.js'; 
import GstReturn from '../models/GstReturn.js'; 
import RocWorkspace from '../models/RocWorkspace.js';
import TdsWorkspace from '../models/TdsWorkspace.js';
import AuditEngagement from '../models/AuditEngagement.js'; 
import FssaiWorkspace from '../models/FssaiWorkspace.js';

// ==========================================
// 1. Get All Clients (WITH SERVER-SIDE PAGINATION)
// ==========================================
export const getClients = async (req, res) => {
  try {
    // 🔴 NAYA: page, limit, month, year, aur fetchAll frontend se aayega
    const { search, type, status, page = 1, limit = 10, month, year, fetchAll } = req.query;
    let filter = {};

    // Search Filtering
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { tradeName: { $regex: search, $options: 'i' } },
        { pan: { $regex: search, $options: 'i' } },
        { gstin: { $regex: search, $options: 'i' } },
        { clientId: { $regex: search, $options: 'i' } }
      ];
    }
    if (type && type !== 'All') filter.clientType = type;
    if (status && status !== 'All') filter.status = status;

    // Date Filtering (Month & Year)
    if (year && year !== 'All') {
      const startDate = new Date(`${year}-01-01T00:00:00.000Z`);
      const endDate = new Date(`${year}-12-31T23:59:59.999Z`);
      
      if (month && month !== 'All') {
        const mIndex = parseInt(month) - 1;
        startDate.setMonth(mIndex);
        endDate.setMonth(mIndex);
        endDate.setDate(new Date(year, mIndex + 1, 0).getDate()); // Last day of month
      }
      filter.createdAt = { $gte: startDate, $lte: endDate };
    }

    let clients = [];
    let totalPages = 1;
    let totalCount = 0;

    // 🔴 Agar Excel Export ke liye call kiya hai, toh saara data bhejenge bina limit ke
    if (fetchAll === 'true') {
      clients = await ClientMaster.find(filter).lean().sort({ createdAt: -1 });
      totalCount = clients.length;
    } else {
      // 🔴 SERVER SIDE PAGINATION LOGIC
      const skip = (parseInt(page) - 1) * parseInt(limit);
      totalCount = await ClientMaster.countDocuments(filter);
      totalPages = Math.ceil(totalCount / parseInt(limit));
      
      clients = await ClientMaster.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean();
    }

    // Fetch Live Workspace Links dynamically for each client
    const enrichedClients = await Promise.all(clients.map(async (client) => {
      const hasItr = await ItrReturn.exists({ clientMasterId: client._id });
      const hasGst = await GstReturn.exists({ clientMasterId: client._id });
      const hasRoc = await RocWorkspace.exists({ clientMasterId: client._id });
      const hasAudit = await AuditEngagement.exists({ client_id: client._id, is_active: true });
      const hasTds = await TdsWorkspace.exists({ pan: client.pan }); 
      const hasFssai = await FssaiWorkspace.exists({ clientMasterId: client._id });

      return {
        ...client,
        services: {
          itr: !!hasItr,
          gst: !!hasGst,
          roc: !!hasRoc,
          audit: !!hasAudit, 
          tds: !!hasTds,  
          fssai: !!hasFssai,
        }
      };
    }));

    // Response mein current page aur total pages bhi bhej rahe hain
    res.status(200).json({
      clients: enrichedClients,
      currentPage: parseInt(page),
      totalPages,
      totalCount
    });
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

    // Auto-Generate Client ID (TB-Last5-0001)
    const panSuffix = uppercasePan.slice(-5);
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
      clientId: generatedClientId, 
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

    const updatedClient = await ClientMaster.findByIdAndUpdate(req.params.id, updateData, { new: true });
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