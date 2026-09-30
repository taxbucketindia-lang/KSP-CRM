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
      req.body, // Updates constitution, cin_llpin, gstin, etc.
      { new: true }
    );
    res.status(200).json(updatedClient);
  } catch (error) { res.status(400).json({ message: error.message }); }
};


// ==========================================
// 🏢 AUDITOR MASTER (A2) CONTROLLERS
// ==========================================

// @desc    Get all Auditors
// @route   GET /api/audit/auditors
export const getAuditors = async (req, res) => {
  try {
    const auditors = await Auditor.find({ is_active: true }).sort({ createdAt: -1 });
    res.status(200).json(auditors);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add New Auditor
// @route   POST /api/audit/auditors
export const createAuditor = async (req, res) => {
  try {
    // 🔴 AUTO-GENERATE AUDITOR ID (AU-0001)
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

// @desc    Update Auditor
// @route   PUT /api/audit/auditors/:id
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

// @desc    Delete (Soft Delete) Auditor
// @route   DELETE /api/audit/auditors/:id
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
// 📄 AUDIT ENGAGEMENT (A1) CONTROLLERS
// ==========================================

export const getAllAudits = async (req, res) => {
  try {
    const audits = await AuditEngagement.find({ is_active: true })
      // 🔴 Client ki details populate karna zaroori hai table ke liye
      .populate('client_id', 'clientId name pan constitution cin_llpin gstin')
      .populate('assigned_executive_id', 'name role')
      .sort({ createdAt: -1 });
      
    res.status(200).json(audits);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all Audits for a specific client
// @route   GET /api/audit/engagements/client/:clientId
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

// @desc    Create new Audit Engagement
// @route   POST /api/audit/engagements
// @desc    Create new Audit Engagement
// @route   POST /api/audit/engagements
export const createAuditEngagement = async (req, res) => {
  try {
    const { pan, clientName, financial_year, audit_type } = req.body;
    let { client_id } = req.body;

    // =======================================================
    // 🔴 1. PAN-BASED CLIENT CREATION LOGIC (UPDATED)
    // =======================================================
    if (!client_id && pan) {
      const uppercasePan = pan.toUpperCase();
      let clientDoc = await ClientMaster.findOne({ pan: uppercasePan });
      
      // Agar client nahi mila, toh naya banao
      if (!clientDoc) {
        // 🔴 UPDATE 1: PAN ke aakhiri 5 characters uthao (slice -5)
        const panSuffix = uppercasePan.slice(-5); 
        
        // 🔴 UPDATE 2: Perfect Sequence Logic (+1 from the last created client)
        let nextSeq = 1;
        // Sabse aakhiri TB- wali ID uthao database se
        const lastClient = await ClientMaster.findOne({ clientId: { $regex: /^TB-/ } }).sort({ createdAt: -1 });
        
        if (lastClient && lastClient.clientId) {
          const parts = lastClient.clientId.split('-'); // e.g. ["TB", "1234F", "0005"]
          const lastSeqStr = parts[parts.length - 1]; // "0005"
          if (!isNaN(lastSeqStr)) {
             nextSeq = parseInt(lastSeqStr, 10) + 1; // 5 + 1 = 6
          } else {
             nextSeq = (await ClientMaster.countDocuments()) + 1;
          }
        } else {
           nextSeq = (await ClientMaster.countDocuments()) + 1;
        }

        const sequenceNum = String(nextSeq).padStart(4, '0'); // "0006"
        
        clientDoc = await ClientMaster.create({
          clientId: `TB-${panSuffix}-${sequenceNum}`, // Result: TB-1234F-0006
          pan: uppercasePan,
          name: clientName || 'New Audit Client',
          clientType: 'Private Limited' 
        });
      }
      client_id = clientDoc._id; 
    }

    if (!client_id) return res.status(400).json({ message: "Client mapping failed. PAN is required." });

    // =======================================================
    // 🔴 2. AUTO-GENERATE AUDIT ID
    // =======================================================
    let nextIdCounter = 1;
    const yearPrefix = financial_year.split('-')[0]; // Gets 2026 from "2026-27"
    
    const lastAudit = await AuditEngagement.findOne({ auditId: new RegExp(`^AUD-${yearPrefix}`) }).sort({ createdAt: -1 });
    
    if (lastAudit && lastAudit.auditId) {
      const parts = lastAudit.auditId.split('-');
      if (parts.length > 2 && !isNaN(parts[2])) {
        nextIdCounter = parseInt(parts[2]) + 1;
      }
    }
    const generatedAuditId = `AUD-${yearPrefix}-${String(nextIdCounter).padStart(4, '0')}`;

    // Calculate Assessment Year (FY + 1 year)
    const startYear = parseInt(yearPrefix);
    const endYear = startYear + 1;
    const derivedAssessmentYear = `${endYear}-${String(endYear + 1).slice(2)}`; // 2026-27 -> 2027-28

    // Sequence Logic
    const existingAuditsCount = await AuditEngagement.countDocuments({ 
      client_id, financial_year, audit_type, is_active: true 
    });
    const sequenceNo = existingAuditsCount + 1;

    // Clean payload for Decimal128
    const payload = { ...req.body };
    if (payload.turnover_gross_receipts === '') delete payload.turnover_gross_receipts;

    // Insert to DB
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

// @desc    Update Audit Engagement
// @route   PUT /api/audit/engagements/:id
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

// @desc    Delete (Soft Delete) Audit Engagement
// @route   DELETE /api/audit/engagements/:id
// @desc    Delete (Hard Delete) Audit Engagement
// @route   DELETE /api/audit/engagements/:id
export const deleteAuditEngagement = async (req, res) => {
  try {
    // 🔴 UPDATE: findByIdAndUpdate(is_active: false) ko hata kar findByIdAndDelete lagaya gaya hai
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

    // 🔴 Rule 8: If adding a NEW 'Signing' auditor, mark existing ones as is_current = false
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
    // Generate Custom ID: UD-0001
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