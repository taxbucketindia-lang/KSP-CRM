import ClientMaster from '../models/ClientMaster.js';
import ItrReturn from '../models/ItrReturn.js'; 
import GstReturn from '../models/GstReturn.js'; 
import RocWorkspace from '../models/RocWorkspace.js';
import TdsWorkspace from '../models/TdsWorkspace.js';
import AuditEngagement from '../models/AuditEngagement.js'; 
import FssaiWorkspace from '../models/FssaiWorkspace.js';
import Invoice from '../models/Invoice.js';

// ==========================================
// 1. Get All Clients (WITH SERVER-SIDE PAGINATION)
// ==========================================
export const getClients = async (req, res) => {
  try {
    // 🔴 NAYA: page, limit, month, year, aur fetchAll frontend se aayega
    const { search, type, status, page = 1, limit = 10, month, year, dues, fetchAll } = req.query;
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

    // 🔴 DUES FILTER + CARDS KA TOTAL (server par, poore filtered data par)
    // Pehle Dues filter sirf us page ke 10 clients par lagta tha, isliye kisi page par 3 aur kisi par 0 record aate the.
    // Yahan sirf halke fields load hote hain; poora record sirf current page ke clients ka aata hai.
    const [lightClients, invoices] = await Promise.all([
      ClientMaster.find(filter).select('name pan gstin openingBalance').sort({ createdAt: -1 }).lean(),
      Invoice.find({}).select('customer.name customer.pan customer.gstin totalAmountAfterTax amountReceived paymentStatus').lean()
    ]);

    // Invoice ko client se jodne ke liye index (PAN / GSTIN / naam se, jaisa frontend karta hai)
    const byPan = new Map(), byGstin = new Map(), byName = new Map();
    const addTo = (map, key, inv) => { if (!key) return; if (!map.has(key)) map.set(key, []); map.get(key).push(inv); };
    invoices.forEach(inv => {
      addTo(byPan, inv.customer?.pan?.toUpperCase(), inv);
      addTo(byGstin, inv.customer?.gstin?.toUpperCase(), inv);
      addTo(byName, inv.customer?.name?.toLowerCase(), inv);
    });

    const getFinance = (client) => {
      const matched = new Map();
      [byPan.get(client.pan?.toUpperCase()), byGstin.get(client.gstin?.toUpperCase()), byName.get(client.name?.toLowerCase())]
        .forEach(list => (list || []).forEach(inv => matched.set(String(inv._id), inv)));

      const openingBalance = Number(client.openingBalance || 0);
      let invoiceBilled = 0, received = 0;
      matched.forEach(inv => {
        const total = Number(inv.totalAmountAfterTax || 0);
        let got = Number(inv.amountReceived || 0);
        if (inv.paymentStatus === 'Paid' && got === 0) got = total;
        invoiceBilled += total;
        received += got;
      });

      const invoiceDue = invoiceBilled - received;
      const due = Math.max(0, (invoiceDue > 0 ? invoiceDue : 0) + openingBalance);
      return { billed: invoiceBilled + openingBalance, received, due };
    };

    let matchedClients = lightClients.map(client => ({ _id: client._id, finance: getFinance(client) }));

    if (dues && dues !== 'All') {
      matchedClients = matchedClients.filter(({ finance }) => {
        if (dues === 'Has Dues') return finance.due > 0;
        if (dues === 'Clear') return finance.billed > 0 && finance.due <= 0;
        if (dues === 'No Invoice') return finance.billed === 0;
        return true;
      });
    }

    const stats = matchedClients.reduce((sum, { finance }) => ({
      billed: sum.billed + finance.billed,
      received: sum.received + finance.received,
      due: sum.due + finance.due
    }), { billed: 0, received: 0, due: 0 });

    const totalCount = matchedClients.length;
    let totalPages = 1;
    let pageIds = matchedClients.map(c => c._id);

    // 🔴 Excel Export (fetchAll) me saara data, warna sirf current page ke records
    if (fetchAll !== 'true') {
      const skip = (parseInt(page) - 1) * parseInt(limit);
      totalPages = Math.ceil(totalCount / parseInt(limit));
      pageIds = pageIds.slice(skip, skip + parseInt(limit));
    }

    const pageDocs = await ClientMaster.find({ _id: { $in: pageIds } }).lean();
    const docById = new Map(pageDocs.map(doc => [String(doc._id), doc]));
    const clients = pageIds.map(id => docById.get(String(id))).filter(Boolean); // wahi order (naya pehle)


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
      totalCount,
      stats
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