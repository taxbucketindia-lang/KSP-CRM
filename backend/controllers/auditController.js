import ClientMaster from '../models/ClientMaster.js';
import AuditEngagement from '../models/AuditEngagement.js';
import Auditor from '../models/Auditor.js';
import AuditAuditor from '../models/AuditAuditor.js';
import AuditUdin from '../models/AuditUdin.js';
import AuditFiling from '../models/AuditFiling.js';
import AuditChecklist from '../models/AuditChecklist.js';
import AuditDueDate from '../models/AuditDueDate.js';

export const updateAuditClient = async (req, res) => {
  try {
    const updatedClient = await ClientMaster.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true }
    );
    res.status(200).json(updatedClient);
  } catch (error) { res.status(400).json({ message: error.message }); }
};

// ==========================================
// 🏢 AUDITOR MASTER (A2) CONTROLLERS
// ==========================================

export const getAuditors = async (req, res) => {
  try {
    const auditors = await Auditor.find({ is_active: true }).sort({ createdAt: -1 });
    res.status(200).json(auditors);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createAuditor = async (req, res) => {
  try {
    let nextIdCounter = 1;
    const lastAuditor = await Auditor.findOne({ auditorId: { $exists: true } }).sort({ createdAt: -1 });
    
    if (lastAuditor && lastAuditor.auditorId) {
      const parts = lastAuditor.auditorId.split('-');
      if (parts.length > 1 && !isNaN(parts[1])) {
        nextIdCounter = parseInt(parts[1]) + 1;
      }
    }
    const generatedAuditorId = `AU-${String(nextIdCounter).padStart(4, '0')}`;

    const newAuditor = await Auditor.create({
      ...req.body,
      auditorId: generatedAuditorId,
      createdBy: req.user._id
    });

    res.status(201).json(newAuditor);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const updateAuditor = async (req, res) => {
  try {
    const updatedAuditor = await Auditor.findByIdAndUpdate(
      req.params.id, 
      { ...req.body, updatedBy: req.user._id },
      { new: true, runValidators: true }
    );
    if (!updatedAuditor) return res.status(404).json({ message: "Auditor not found" });
    
    res.status(200).json(updatedAuditor);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteAuditor = async (req, res) => {
  try {
    const auditor = await Auditor.findByIdAndUpdate(req.params.id, { is_active: false, updatedBy: req.user._id });
    if (!auditor) return res.status(404).json({ message: "Auditor not found" });
    
    res.status(200).json({ message: "Auditor deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==========================================
// 📄 AUDIT ENGAGEMENT (A1) CONTROLLERS WITH PAGINATION
// ==========================================
export const getAllAudits = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search, 
      status, 
      fetchAll 
    } = req.query;

    let filter = { is_active: true };

    // Search Feature Logic based on populated client
    // Since search runs on populated fields easily using MongoDB aggregation/lookup or we prefetch.
    // A simpler text match if needed for direct fields:
    if (status && status !== 'ALL') {
      filter.engagement_status = status;
    }

    let audits = [];
    let totalCount = 0;
    let totalPages = 1;

    // Excel Export ke liye ya Full Fetch ke liye
    if (fetchAll === 'true') {
      audits = await AuditEngagement.find(filter)
        .populate({
          path: 'client_id',
          match: search ? {
            $or: [
              { name: { $regex: search, $options: 'i' } },
              { clientId: { $regex: search, $options: 'i' } },
              { pan: { $regex: search, $options: 'i' } }
            ]
          } : {},
          select: 'clientId name pan constitution cin_llpin gstin date_of_incorporation nature_of_business registered_office_address books_kept_at accounting_method'
        }) 
        .populate('assigned_executive_id', 'name role')
        .sort({ createdAt: -1 })
        .lean();
        
      // Filter out null clients if search was applied
      audits = audits.filter(a => a.client_id != null);
      totalCount = audits.length;
    } else {
      // Find all matching clients first if searching
      if (search) {
        const matchingClients = await ClientMaster.find({
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { clientId: { $regex: search, $options: 'i' } },
            { pan: { $regex: search, $options: 'i' } }
          ]
        }).select('_id');
        const clientIds = matchingClients.map(c => c._id);
        filter.client_id = { $in: clientIds };
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);
      totalCount = await AuditEngagement.countDocuments(filter);
      totalPages = Math.ceil(totalCount / parseInt(limit));

      audits = await AuditEngagement.find(filter)
        .populate('client_id', 'clientId name pan constitution cin_llpin gstin date_of_incorporation nature_of_business registered_office_address books_kept_at accounting_method')
        .populate('assigned_executive_id', 'name role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean();
    }
      
    res.status(200).json({
      data: audits,
      currentPage: parseInt(page),
      totalPages,
      totalCount
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getClientAudits = async (req, res) => {
  try {
    const audits = await AuditEngagement.find({ client_id: req.params.clientId, is_active: true })
      .populate('assigned_executive_id', 'name role')
      .populate('previous_year_audit_id', 'auditId financial_year')
      .sort({ financial_year: -1, createdAt: -1 });
      
    res.status(200).json(audits);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createAuditEngagement = async (req, res) => {
  try {
    const { pan, clientName, financial_year, audit_type } = req.body;
    let { client_id } = req.body;

    if (!client_id && pan) {
      const uppercasePan = pan.toUpperCase();
      let clientDoc = await ClientMaster.findOne({ pan: uppercasePan });
      
      if (!clientDoc) {
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
        
        clientDoc = await ClientMaster.create({
          clientId: `TB-${panSuffix}-${sequenceNum}`, 
          pan: uppercasePan,
          name: clientName || 'New Audit Client',
          clientType: 'Private Limited' 
        });
      }
      client_id = clientDoc._id; 
    }

    if (!client_id) return res.status(400).json({ message: "Client mapping failed. PAN is required." });

    let nextIdCounter = 1;
    const yearPrefix = financial_year.split('-')[0]; 
    
    const lastAudit = await AuditEngagement.findOne({ auditId: new RegExp(`^AUD-${yearPrefix}`) }).sort({ createdAt: -1 });
    
    if (lastAudit && lastAudit.auditId) {
      const parts = lastAudit.auditId.split('-');
      if (parts.length > 2 && !isNaN(parts[2])) {
        nextIdCounter = parseInt(parts[2]) + 1;
      }
    }
    const generatedAuditId = `AUD-${yearPrefix}-${String(nextIdCounter).padStart(4, '0')}`;

    const startYear = parseInt(yearPrefix);
    const endYear = startYear + 1;
    const derivedAssessmentYear = `${endYear}-${String(endYear + 1).slice(2)}`; 

    const existingAuditsCount = await AuditEngagement.countDocuments({ 
      client_id, financial_year, audit_type, is_active: true 
    });
    const sequenceNo = existingAuditsCount + 1;

    const payload = { ...req.body };
    if (payload.turnover_gross_receipts === '') delete payload.turnover_gross_receipts;

    const newEngagement = await AuditEngagement.create({
      ...payload,
      client_id, 
      auditId: generatedAuditId,
      assessment_year: derivedAssessmentYear,
      sequence_no: sequenceNo,
      createdBy: req.user._id
    });

    await ClientMaster.findByIdAndUpdate(client_id, {
      $set: { 'services.audit': true }
    });

    res.status(201).json(newEngagement);
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ message: "An audit with these exact details already exists." });
    res.status(400).json({ message: error.message });
  }
};

export const updateAuditEngagement = async (req, res) => {
  try {
    const updatedEngagement = await AuditEngagement.findByIdAndUpdate(
      req.params.id, 
      { ...req.body, updatedBy: req.user._id },
      { new: true, runValidators: true }
    );
    if (!updatedEngagement) return res.status(404).json({ message: "Audit Engagement not found" });
    
    res.status(200).json(updatedEngagement);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteAuditEngagement = async (req, res) => {
  try {
    const engagement = await AuditEngagement.findByIdAndDelete(req.params.id);
    if (!engagement) return res.status(404).json({ message: "Audit Engagement not found" });
    res.status(200).json({ message: "Audit deleted permanently from database" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==========================================
// 🤝 A3: AUDIT-AUDITOR LINK CONTROLLERS
// ==========================================

export const getAuditAuditors = async (req, res) => {
  try {
    const links = await AuditAuditor.find({ audit_id: req.params.auditId, is_active: true })
      .populate('auditor_id', 'firm_name signing_person_name designation membership_no')
      .sort({ appointment_date: -1 });
    res.status(200).json(links);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const assignAuditor = async (req, res) => {
  try {
    const { audit_id, role } = req.body;

    if (role === 'Signing') {
      await AuditAuditor.updateMany(
        { audit_id, role: 'Signing', is_active: true },
        { is_current: false, updatedBy: req.user._id }
      );
    }

    const newLink = await AuditAuditor.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json(newLink);
  } catch (error) { res.status(400).json({ message: error.message }); }
};

export const updateAuditAuditor = async (req, res) => {
  try {
    const updated = await AuditAuditor.findByIdAndUpdate(req.params.id, { ...req.body, updatedBy: req.user._id }, { new: true });
    res.status(200).json(updated);
  } catch (error) { res.status(400).json({ message: error.message }); }
};

export const removeAuditorLink = async (req, res) => {
  try {
    await AuditAuditor.findByIdAndUpdate(req.params.id, { is_active: false, updatedBy: req.user._id });
    res.status(200).json({ message: "Auditor removed from audit successfully" });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

// ==========================================
// 🛡️ A4: UDIN CONTROLLERS
// ==========================================

export const getAuditUdins = async (req, res) => {
  try {
    const udins = await AuditUdin.find({ audit_id: req.params.auditId, is_active: true })
      .populate('auditor_id', 'signing_person_name')
      .sort({ udin_generated_date: -1 });
    res.status(200).json(udins);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const createUdin = async (req, res) => {
  try {
    const count = await AuditUdin.countDocuments();
    const udinId = `UD-${String(count + 1).padStart(4, '0')}`;

    const newUdin = await AuditUdin.create({ ...req.body, udinId, createdBy: req.user._id });
    res.status(201).json(newUdin);
  } catch (error) { 
    if (error.code === 11000) return res.status(400).json({ message: "This UDIN Number already exists in the system." });
    res.status(400).json({ message: error.message }); 
  }
};

export const updateUdin = async (req, res) => {
  try {
    const updated = await AuditUdin.findByIdAndUpdate(req.params.id, { ...req.body, updatedBy: req.user._id }, { new: true });
    res.status(200).json(updated);
  } catch (error) { res.status(400).json({ message: error.message }); }
};

export const deleteUdin = async (req, res) => {
  try {
    await AuditUdin.findByIdAndUpdate(req.params.id, { is_active: false, updatedBy: req.user._id });
    res.status(200).json({ message: "UDIN deleted successfully" });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

// ==========================================
// 📂 A5: FILING TRACKER CONTROLLERS
// ==========================================

export const getAuditFilings = async (req, res) => {
  try {
    const filings = await AuditFiling.find({ audit_id: req.params.auditId, is_active: true }).sort({ createdAt: 1 });
    res.status(200).json(filings);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const createFiling = async (req, res) => {
  try {
    const count = await AuditFiling.countDocuments();
    const filingId = `FL-${String(count + 1).padStart(4, '0')}`;

    const newFiling = await AuditFiling.create({ ...req.body, filingId, createdBy: req.user._id });
    res.status(201).json(newFiling);
  } catch (error) { res.status(400).json({ message: error.message }); }
};

export const updateFiling = async (req, res) => {
  try {
    const updated = await AuditFiling.findByIdAndUpdate(req.params.id, { ...req.body, updatedBy: req.user._id }, { new: true });
    res.status(200).json(updated);
  } catch (error) { res.status(400).json({ message: error.message }); }
};

export const deleteFiling = async (req, res) => {
  try {
    await AuditFiling.findByIdAndUpdate(req.params.id, { is_active: false, updatedBy: req.user._id });
    res.status(200).json({ message: "Filing deleted successfully" });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

// ==========================================
// ☑️ A6: CHECKLIST CONTROLLERS
// ==========================================

export const getChecklist = async (req, res) => {
  try {
    const items = await AuditChecklist.find({ audit_id: req.params.auditId, is_active: true }).sort({ createdAt: 1 });
    res.status(200).json(items);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const addChecklistItem = async (req, res) => {
  try {
    const newItem = await AuditChecklist.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json(newItem);
  } catch (error) { res.status(400).json({ message: error.message }); }
};

export const updateChecklistItem = async (req, res) => {
  try {
    const updated = await AuditChecklist.findByIdAndUpdate(req.params.id, { ...req.body, updatedBy: req.user._id }, { new: true });
    res.status(200).json(updated);
  } catch (error) { res.status(400).json({ message: error.message }); }
};

export const deleteChecklistItem = async (req, res) => {
  try {
    await AuditChecklist.findByIdAndUpdate(req.params.id, { is_active: false, updatedBy: req.user._id });
    res.status(200).json({ message: "Checklist item deleted successfully" });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

// ==========================================
// 📅 A7: DUE DATE MASTER CONTROLLERS (ADMIN)
// ==========================================

export const getDueDates = async (req, res) => {
  try {
    const dates = await AuditDueDate.find({ is_active: true }).sort({ financial_year: -1, due_date: 1 });
    res.status(200).json(dates);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const setDueDate = async (req, res) => {
  try {
    const newDate = await AuditDueDate.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json(newDate);
  } catch (error) { res.status(400).json({ message: error.message }); }
};