import crypto from 'crypto';
import TdsWorkspace from '../models/TdsWorkspace.js';
import TdsReturn from '../models/TdsReturn.js';
import TdsDeductee from '../models/TdsDeductee.js';
import TdsChallan from '../models/TdsChallan.js';
import TdsDeductionEntry from '../models/TdsDeductionEntry.js';
import { TdsSection, TdsDueDate } from '../models/TdsMasterData.js';
import ClientMaster from '../models/ClientMaster.js';

// ==========================================
// 🔴 SECURITY: AES-256 Encryption Setup
// ==========================================
// Make sure to add ENCRYPTION_KEY (exactly 32 chars) in your .env file
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'TaxBucketSuperSecretKey123456789'; 
const IV_LENGTH = 16;

const encrypt = (text) => {
  if (!text) return text;
  try {
    let iv = crypto.randomBytes(IV_LENGTH);
    let cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  } catch (err) { return text; }
};

const decrypt = (text) => {
  if (!text) return text;
  try {
    let textParts = text.split(':');
    if (textParts.length !== 2) return text; 
    let iv = Buffer.from(textParts.shift(), 'hex');
    let encryptedText = Buffer.from(textParts.join(':'), 'hex');
    let decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (err) { return text; }
};


// ==========================================
// 🏢 M1: TDS WORKSPACE (DEDUCTOR MASTER) WITH PAGINATION
// ==========================================

export const getTdsWorkspaces = async (req, res) => {
  try {
    // 🔴 Extract query parameters for pagination and filtering
    const { 
      page = 1, 
      limit = 10, 
      search, 
      status, 
      fetchAll 
    } = req.query;

    let filter = { isActive: true };

    // Search filter
    if (search) {
      filter.$or = [
        { companyName: { $regex: search, $options: 'i' } },
        { pan: { $regex: search, $options: 'i' } },
        { tan: { $regex: search, $options: 'i' } }
      ];
    }

    if (status && status !== 'ALL') {
       // Since the existing model only has isActive, we infer status from it
       if (status === 'Active') {
          filter.isActive = true;
       } else if (status === 'Inactive') {
          filter.isActive = false;
       }
    }

    let workspaces = [];
    let totalCount = 0;
    let totalPages = 1;

    // Excel Export ke time pe `fetchAll` true hoga toh bina limit ke list bhejni hai
    if (fetchAll === 'true') {
      workspaces = await TdsWorkspace.find(filter)
        .populate('clientMasterId', 'clientId name pan mobile email')
        .sort({ createdAt: -1 })
        .lean();
      totalCount = workspaces.length;
    } else {
      // Pagination Logic
      const skip = (parseInt(page) - 1) * parseInt(limit);
      totalCount = await TdsWorkspace.countDocuments(filter);
      totalPages = Math.ceil(totalCount / parseInt(limit));

      workspaces = await TdsWorkspace.find(filter)
        .populate('clientMasterId', 'clientId name pan mobile email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean();
    }

    // Decrypt passwords before sending to frontend
    workspaces = workspaces.map(ws => {
      if (ws.tracesLogin?.password) ws.tracesLogin.password = decrypt(ws.tracesLogin.password);
      if (ws.efilingLogin?.password) ws.efilingLogin.password = decrypt(ws.efilingLogin.password);
      return ws;
    });

    res.status(200).json({
      data: workspaces,
      currentPage: parseInt(page),
      totalPages,
      totalCount
    });

  } catch (error) { 
    res.status(500).json({ message: error.message }); 
  }
};

export const createTdsWorkspace = async (req, res) => {
  try {
    const { pan, companyName, tracesLogin, efilingLogin, ...otherData } = req.body;
    const uppercasePan = pan.toUpperCase();

    // 1. Client Master Logic (Auto ID Gen)
    let clientDoc = await ClientMaster.findOne({ pan: uppercasePan });
    if (!clientDoc) {
      const panSuffix = uppercasePan.slice(-5);
      const sequenceNum = String(await ClientMaster.countDocuments() + 1).padStart(4, '0');
      clientDoc = await ClientMaster.create({
        clientId: `TB-${panSuffix}-${sequenceNum}`,
        pan: uppercasePan,
        name: companyName,
        clientType: 'Company'
      });
    }

    // 2. Encrypt Passwords
    let secureTraces = { ...tracesLogin };
    let secureEfiling = { ...efilingLogin };
    if (secureTraces.password) secureTraces.password = encrypt(secureTraces.password);
    if (secureEfiling.password) secureEfiling.password = encrypt(secureEfiling.password);

    // 3. Create Workspace Snapshot
    const newWorkspace = await TdsWorkspace.create({
      clientMasterId: clientDoc._id,
      pan: uppercasePan,
      companyName,
      tracesLogin: secureTraces,
      efilingLogin: secureEfiling,
      createdBy: req.user._id,
      ...otherData
    });

    res.status(201).json({ message: "TDS Workspace Created", data: newWorkspace });
  } catch (error) { res.status(400).json({ message: error.message }); }
};



export const updateTdsWorkspace = async (req, res) => {
  try {
    const { pan, companyName, tracesLogin, efilingLogin, ...otherData } = req.body;
    
    // 1. Prepare Payload
    let updatePayload = { companyName, pan: pan?.toUpperCase(), ...otherData };

    // 2. Safely Update Encrypted Passwords
    if (tracesLogin) {
      updatePayload.tracesLogin = { ...tracesLogin };
      // Agar password naya likha gaya hai (usme ':' nahi hai), toh hi encrypt karo
      if (tracesLogin.password && !tracesLogin.password.includes(':')) {
        updatePayload.tracesLogin.password = encrypt(tracesLogin.password);
      }
    }
    
    if (efilingLogin) {
      updatePayload.efilingLogin = { ...efilingLogin };
      if (efilingLogin.password && !efilingLogin.password.includes(':')) {
        updatePayload.efilingLogin.password = encrypt(efilingLogin.password);
      }
    }

    // 3. Database mein update karein
    const updatedWorkspace = await TdsWorkspace.findByIdAndUpdate(
      req.params.id,
      updatePayload,
      { new: true, runValidators: true }
    );

    if (!updatedWorkspace) return res.status(404).json({ message: "Workspace not found" });
    res.status(200).json({ message: "Workspace updated successfully", data: updatedWorkspace });
  } catch (error) { 
    res.status(400).json({ message: error.message }); 
  }
};


// ==========================================
// 📄 M2: TDS RETURNS (QUARTERLY TRACKING)
// ==========================================

export const getTdsReturns = async (req, res) => {
  try {
    const returns = await TdsReturn.find({ tdsWorkspaceId: req.params.workspaceId, isActive: true })
      .sort({ financialYear: -1, quarter: 1 });
    res.status(200).json(returns);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const createTdsReturn = async (req, res) => {
  try {
    const { tdsWorkspaceId, financialYear, formType, generateAllQuarters } = req.body;

    // 🔴 1. Ensure M6 Due Dates exist in DB (Auto-Seeding as per PDF Section 8B)
    const existingDueDatesCount = await TdsDueDate.countDocuments({ financialYear });
    if (existingDueDatesCount === 0) {
      await TdsDueDate.insertMany([
        { financialYear, quarter: 'Q1', quarterPeriod: 'Apr-Jun', returnDueDate: new Date(`${financialYear.split('-')[0]}-07-31`), formType: 'All' },
        { financialYear, quarter: 'Q2', quarterPeriod: 'Jul-Sep', returnDueDate: new Date(`${financialYear.split('-')[0]}-10-31`), formType: 'All' },
        { financialYear, quarter: 'Q3', quarterPeriod: 'Oct-Dec', returnDueDate: new Date(`${parseInt(financialYear.split('-')[0]) + 1}-01-31`), formType: 'All' },
        { financialYear, quarter: 'Q4', quarterPeriod: 'Jan-Mar', returnDueDate: new Date(`${parseInt(financialYear.split('-')[0]) + 1}-05-31`), formType: 'All' }
      ]);
    }

    // Workflow Rule 1: Auto-create 4 quarters if requested
    if (generateAllQuarters) {
      const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
      const returnsToCreate = [];

      for (let q of quarters) {
        const exists = await TdsReturn.findOne({ tdsWorkspaceId, financialYear, quarter: q, formType, returnType: 'Original' });
        if (!exists) {
          // 🔴 Fetch Due Date from M6 Due_Date_Master
          const dueDateMaster = await TdsDueDate.findOne({ financialYear, quarter: q });

          returnsToCreate.push({
            tdsWorkspaceId,
            financialYear,
            quarter: q,
            formType,
            returnType: 'Original',
            status: 'Data pending',
            dueDate: dueDateMaster ? dueDateMaster.returnDueDate : null, // M6 Due Date mapped successfully!
            createdBy: req.user._id
          });
        }
      }
      if (returnsToCreate.length > 0) await TdsReturn.insertMany(returnsToCreate);
      return res.status(201).json({ message: `Successfully initialized quarters for FY ${financialYear}` });
    }

    // Manual Creation (Correction or Single)
    const newReturn = await TdsReturn.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json(newReturn);
  } catch (error) { res.status(400).json({ message: error.message }); }
};

export const deleteTdsReturn = async (req, res) => {
  try {
    await TdsReturn.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Return deleted successfully" });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const updateTdsReturnStatus = async (req, res) => {
  try {
    const { status, filedDate, tokenNoRrr } = req.body;
    
    // Workflow validation: Token No is mandatory to mark as "Filed"
    if (status === 'Filed' && !tokenNoRrr) {
      return res.status(400).json({ message: 'Token / RRR Number is mandatory to mark return as Filed.' });
    }

    const updated = await TdsReturn.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.status(200).json(updated);
  } catch (error) { res.status(400).json({ message: error.message }); }
};


export const deleteTdsWorkspace = async (req, res) => {
  try {
    await TdsWorkspace.findByIdAndUpdate(req.params.id, { isActive: false });
    res.status(200).json({ message: "TDS Workspace deleted successfully" });
  } catch (error) { 
    res.status(500).json({ message: error.message }); 
  }
};

// ==========================================
// 👥 M3: DEDUCTEE MASTER
// ==========================================

export const getDeductees = async (req, res) => {
  try {
    const deductees = await TdsDeductee.find({ tdsWorkspaceId: req.params.workspaceId, isActive: true });
    res.status(200).json(deductees);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const addDeductee = async (req, res) => {
  try {
    const { pan, ...data } = req.body;
    const existing = await TdsDeductee.findOne({ tdsWorkspaceId: data.tdsWorkspaceId, pan: pan.toUpperCase() });
    
    if (existing && !['PANNOTAVBL', 'PANAPPLIED', 'PANINVALID'].includes(pan.toUpperCase())) {
      return res.status(400).json({ message: 'Deductee with this PAN already exists in this workspace.' });
    }

    const newDeductee = await TdsDeductee.create({ ...data, pan: pan.toUpperCase(), createdBy: req.user._id });
    res.status(201).json(newDeductee);
  } catch (error) { res.status(400).json({ message: error.message }); }
};


// ==========================================
// 🏦 M4: CHALLAN MASTER
// ==========================================

export const getChallans = async (req, res) => {
  try {
    const challans = await TdsChallan.find({ tdsWorkspaceId: req.params.workspaceId, isActive: true });
    res.status(200).json(challans);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const addChallan = async (req, res) => {
  try {
    const newChallan = await TdsChallan.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json(newChallan);
  } catch (error) { res.status(400).json({ message: error.message }); }
};


// ==========================================
// 💰 M5: DEDUCTION ENTRIES (TRANSACTIONS)
// ==========================================

export const getDeductionEntries = async (req, res) => {
  try {
    const entries = await TdsDeductionEntry.find({ tdsReturnId: req.params.returnId, isActive: true })
      .populate('tdsDeducteeId', 'deducteeName pan deducteeType')
      .populate('tdsChallanId', 'challanSerialNo bsrCode tdsAmount');
    res.status(200).json(entries);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const addDeductionEntry = async (req, res) => {
  try {
    // 1. Create Entry
    const newEntry = await TdsDeductionEntry.create({ ...req.body, createdBy: req.user._id });

    // 2. Tally Rule Validation (As per PDF Analysis)
    // Check if total deposited in entries exceeds actual challan amount
    const challan = await TdsChallan.findById(req.body.tdsChallanId);
    if (challan) {
      const allEntriesForChallan = await TdsDeductionEntry.aggregate([
        { $match: { tdsChallanId: challan._id, isActive: true } },
        { $group: { _id: null, totalDeposited: { $sum: "$tdsDeposited" } } }
      ]);
      
      const totalDeposited = allEntriesForChallan[0]?.totalDeposited || 0;
      
      if (totalDeposited > challan.tdsAmount) {
        // Soft Warning, but we allow save for correction later
        console.warn(`WARNING: Entries mapped to Challan ${challan.challanSerialNo} exceed the actual TDS Amount.`);
      }
    }

    res.status(201).json(newEntry);
  } catch (error) { res.status(400).json({ message: error.message }); }
};


// ==========================================
// 📚 M6: REFERENCE MASTERS
// ==========================================

export const getTdsSections = async (req, res) => {
  try {
    // Usually these are pre-populated by Admin from Income Tax Act rules
    const sections = await TdsSection.find({});
    res.status(200).json(sections);
  } catch (error) { res.status(500).json({ message: error.message }); }
};