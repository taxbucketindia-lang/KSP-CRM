// controllers/clientController.js
import Client from '../models/Client.js';
import Lead from '../models/Lead.js';

// @desc    Get all clients
// @route   GET /api/clients
export const getClients = async (req, res) => {
  try {
    const clients = await Client.find({})
      .populate('assignedTo', 'name')
      .populate('createdBy', 'name email empId');
    res.json(clients);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create new client manually or from form
// @route   POST /api/clients
export const createClient = async (req, res) => {
  try {
    const { pan, mobile } = req.body;

    const existingClient = await Client.findOne({ $or: [{ pan }, { mobile }] });
    if (existingClient) {
      return res.status(400).json({ message: 'Client with this PAN or Mobile already exists.' });
    }

    const newClient = new Client({
      ...req.body, 
      createdBy: req.user._id
    });
    
    const savedClient = await newClient.save();
    res.status(201).json(savedClient);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Convert Lead to Client
// @route   POST /api/clients/convert/:leadId
export const convertLeadToClient = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.leadId);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    const existingClient = await Client.findOne({ $or: [{ pan: req.body.pan }, { mobile: lead.mobile }] });
    if (existingClient) {
      return res.status(400).json({ message: 'Client with this PAN or Mobile already exists' });
    }

    const newClient = new Client({
      ...req.body,
      assesseeName: lead.name,
      mobile: lead.mobile,
      email: lead.email,
      assignedTo: lead.assignedTo,
      createdBy: req.user._id,
      leadSource: req.body.leadSource || lead.source || 'Manual Entry',
    });

    const savedClient = await newClient.save();

    lead.status = 'Converted';
    lead.remarks = `${lead.remarks || ''}\nConverted to Client ID: ${savedClient.clientId} on ${new Date().toLocaleDateString()}`;
    await lead.save();

    res.status(201).json({ 
      message: 'Lead successfully converted to Client', 
      client: savedClient 
    });

  } catch (error) {
    console.error("CONVERSION ERROR:", error);
    res.status(400).json({ message: error.message });
  }
};

// @desc    Update Client
// @route   PUT /api/clients/:id
export const updateClient = async (req, res) => {
  try {
    const updatedClient = await Client.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email empId'); 
    
    if (!updatedClient) return res.status(404).json({ message: 'Client not found' });
    
    updatedClient.balanceDue = (updatedClient.feeAmount || 0) - (updatedClient.amountReceived || 0);
    updatedClient.refund = (updatedClient.incomeTax || 0) - (updatedClient.tds || 0) - (updatedClient.tcs || 0) - (updatedClient.selfAdvTax || 0);
    await updatedClient.save(); 

    res.json(updatedClient);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete Client Permanently
// @route   DELETE /api/clients/:id
export const deleteClient = async (req, res) => {
  try {
    const deletedClient = await Client.findByIdAndDelete(req.params.id);
    if (!deletedClient) return res.status(404).json({ message: 'Client not found' });
    res.json({ message: 'Client deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Import Clients from Excel
// @route   POST /api/clients/import
export const importClients = async (req, res) => {
  try {
    const clients = req.body.clients;
    if (!clients || clients.length === 0) return res.status(400).json({ message: "No data found" });

    let importedCount = 0;
    for (const clientData of clients) {
      const exists = await Client.findOne({ 
        $or: [
          { pan: clientData.pan }, 
          { mobile: clientData.mobile }
        ] 
      });

      if (!exists) {
        await Client.create({
          ...clientData,
          assignedTo: req.user._id,
          createdBy: req.user._id 
        });
        importedCount++;
      }
    }

    res.status(201).json({ message: "Import successful", count: importedCount });
  } catch (error) {
    console.error("Import Error:", error);
    res.status(500).json({ message: error.message });
  }
};