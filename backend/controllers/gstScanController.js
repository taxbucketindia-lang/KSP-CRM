import GstScan from '../models/GstScan.js';
import Lead from '../models/Lead.js'; 
import crypto from 'crypto';
import axios from 'axios';

// --- Helper Functions ---
const MONTHS_YELLOW = 2; 
const MONTHS_RED = 4; 

const gstinStatusHealth = (status) => {
  if (!status) return 'Yellow';
  const s = String(status).toLowerCase();
  if (s === 'active') return 'Green';
  if (s.includes('cancel') || s.includes('suspend') || s.includes('inactive')) return 'Red';
  return 'Yellow';
};

const parsePeriodToDate = (period) => {
  if (!period || period === 'N/A') return null;
  const p = String(period).trim();
  let m = p.match(/^(\d{2})-?(\d{4})$/); 
  if (m) return new Date(Number(m[2]), Number(m[1]) - 1, 1);
  m = p.match(/^(\d{4})-(\d{2})$/); 
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, 1);
  const parsed = new Date(p); 
  return isNaN(parsed.getTime()) ? null : parsed;
};

const monthsBetween = (date) => {
  const now = new Date();
  return (now.getFullYear() - date.getFullYear()) * 12 + (now.getMonth() - date.getMonth());
};

const returnFilingHealth = (latestGstr3b, latestGstr1) => {
  const date = parsePeriodToDate(latestGstr3b) || parsePeriodToDate(latestGstr1);
  if (!date) return { health: 'Yellow', gapMonths: null }; 
  const gap = monthsBetween(date);
  if (gap <= MONTHS_YELLOW) return { health: 'Green', gapMonths: gap };
  if (gap <= MONTHS_RED) return { health: 'Yellow', gapMonths: gap };
  return { health: 'Red', gapMonths: gap };
};

const dataAvailabilityHealth = (apiData) => {
  const coreFields = ['lgnm', 'sts', 'rgdt', 'ctb', 'adr', 'stj', 'ctj'];
  const present = coreFields.filter((f) => apiData[f] && apiData[f] !== '').length;
  const ratio = present / coreFields.length;
  if (ratio >= 0.8) return 'Green';
  if (ratio >= 0.5) return 'Yellow';
  return 'Red';
};

const worstOf = (...statuses) => {
  if (statuses.includes('Red')) return 'Red';
  if (statuses.includes('Yellow')) return 'Yellow';
  return 'Green';
};

const filingPatternFromGap = (gapMonths) => {
  if (gapMonths === null || gapMonths === undefined) return 'Unknown';
  return gapMonths <= 1 ? 'Regular' : 'Review Required';
};

// --- Main Controller ---
export const runGstHealthScan = async (req, res) => {
  try {
    const { gstin, mobile, email, businessName } = req.body;

    if (!gstin || !mobile || !email) {
      return res.status(400).json({ success: false, message: 'GSTIN, Mobile, and Email are mandatory.' });
    }

    console.log(`[GST SCAN] Starting scan for GSTIN: ${gstin}`);

    // 🔴 1. RAPID API CALL PEHLE KARENGE
    let apiData = {};
    let apiReachable = true;
    try {
      if (!process.env.RAPIDAPI_KEY) {
        console.warn("[GST SCAN WARNING] RAPIDAPI_KEY is not set in .env file!");
      }
      
      console.log("[GST SCAN] Fetching Live Data from RapidAPI...");
      const response = await axios.get(`https://gst-return-status.p.rapidapi.com/free/gstin/${gstin}`, {
        headers: {
          'content-type': 'application/json',
          'x-rapidapi-key': process.env.RAPIDAPI_KEY,
          'x-rapidapi-host': 'gst-return-status.p.rapidapi.com',
        },
      });
      
      console.log("[GST SCAN] Raw Response:", JSON.stringify(response.data, null, 2));

      // Checking if 'data' object actually exists inside the response
      if (response.data && response.data.data && Object.keys(response.data.data).length > 0) {
        apiData = response.data.data;
        console.log("[GST SCAN] Data successfully extracted.");
      } else {
        console.warn("[GST SCAN] API returned empty data. Rate limit or invalid GSTIN.");
        apiReachable = false;
      }
    } catch (apiErr) {
      apiReachable = false;
      console.error('[GST SCAN ERROR] RapidAPI call failed:', apiErr.response?.status, apiErr.message);
    }

    // 🔴 2. MAP ALL FIELDS FIRST
    const legalName = apiData.lgnm || businessName || 'Valued Taxpayer';
    const tradeName = apiData.tradeName || legalName;
    const gstinStatus = apiData.sts || (apiReachable ? 'N/A' : 'Data not available');
    const cancellationDate = apiData.cxdt || null;
    const constitution = apiData.ctb || 'N/A';
    const registrationDate = apiData.rgdt || 'N/A';
    const taxpayerType = apiData.dty || 'N/A';
    const address = apiData.adr || 'N/A';
    const pincode = apiData.pincode || 'N/A';
    const stateJurisdiction = apiData.stj || 'N/A';
    const centralJurisdiction = apiData.ctj || 'N/A';
    const pan = apiData.pan || null;
    const apiCompCategory = apiData.compCategory || null;

    const filingReturns = apiData.returns || [];
    const latestGstr1Period = apiData.meta?.latestgstr1 || 'N/A';
    const latestGstr3bPeriod = apiData.meta?.latestgstr3b || 'N/A';

    const registrationHealth = apiReachable ? gstinStatusHealth(gstinStatus) : 'Red';
    const { health: filingHealth, gapMonths } = apiReachable
      ? returnFilingHealth(latestGstr3bPeriod, latestGstr1Period)
      : { health: 'Red', gapMonths: null };
    const dataAvailHealth = apiReachable ? dataAvailabilityHealth(apiData) : 'Red';
    const overallScanStatus = worstOf(registrationHealth, filingHealth, dataAvailHealth);
    const filingPattern = filingPatternFromGap(gapMonths);

    const observations = [
      { observation: `Registration: GSTIN status shows as "${gstinStatus}" based on publicly available information.` },
      { observation: filingHealth === 'Green' ? `Return Filing: Recent filing history appears regular (latest GSTR-3B period: ${latestGstr3bPeriod}).` : `Return Filing: ${filingHealth === 'Red' ? 'Significant apparent gap' : 'Late/gap indication'} in recent filings (latest GSTR-3B period: ${latestGstr3bPeriod}).` },
      { observation: gapMonths && gapMonths > MONTHS_YELLOW ? `Possible Filing Gap: Approximately ${gapMonths} month(s) since the latest available return period — one or more periods may require review.` : 'Possible Filing Gap: No significant gap detected in the periods captured.' },
      { observation: dataAvailHealth === 'Green' ? 'Data Availability: Public data available and sufficient for this preliminary scan.' : dataAvailHealth === 'Yellow' ? 'Data Availability: Public data only partially available; some fields could not be verified.' : 'Data Availability: Public data insufficient at the time of scan — a detailed review is recommended.' },
      { observation: 'Public data alone does not establish ITC mismatch, tax liability or complete GST compliance.' }
    ];

    // 🔴 3. NOW CREATE THE LEAD (Since we now have the API Data)
    let gstLeadId = 'GUEST-LEAD-' + Date.now();
    try {
      const detailedRemarks = `
Lead generated automatically via Free GST Health Scan.
-----------------------------------------
🏢 GSTIN: ${gstin.toUpperCase()}
🟢 Registration Status: ${gstinStatus}
📅 Registration Date: ${registrationDate}
⚖️ Constitution: ${constitution}
🧑‍💼 Taxpayer Type: ${taxpayerType}
📍 State Jurisdiction: ${stateJurisdiction}

📊 HEALTH SCAN PREVIEW:
- Return Filing Pattern: ${filingPattern}
- Last GSTR-3B: ${latestGstr3bPeriod}
- Overall Scan Status: ${overallScanStatus}
-----------------------------------------
      `.trim();

      const newLead = new Lead({
        name: legalName, // Best to use the actual business name fetched from API
        mobile: mobile,
        email: email,
        source: 'Website', 
        queryService: ['GST Health Scan'],
        status: 'New', 
        priority: 'Warm',
        remarks: detailedRemarks, 
        createdBy: req.user ? req.user._id : undefined
      });
      
      const savedLead = await newLead.save();
      gstLeadId = savedLead._id;
      console.log(`[GST SCAN] Lead created successfully: ${gstLeadId}`);
    } catch (leadErr) {
      console.error('[GST SCAN ERROR] Lead creation failed. Error:', leadErr.message);
    }

    const reportId = 'TB-GST-' + crypto.randomBytes(3).toString('hex').toUpperCase();

    console.log("[GST SCAN] Saving Report to Database...");
    
    // 🔴 4. SAVE THE REPORT
    try {
      const newScan = new GstScan({
        reportId,
        gstLeadId,
        gstin: gstin.toUpperCase(),
        businessName: legalName,
        tradeName,
        mobile,
        email,
        constitution,
        registrationDate,
        registrationStatus: gstinStatus,
        cancellationDate,
        taxpayerType,
        address,
        pincode,
        stateJurisdiction,
        centralJurisdiction,
        pan,
        filingReturns: filingReturns.slice(0, 10),
        latestGstr1Period,
        latestGstr3bPeriod,
        recentFilingGapMonths: gapMonths,
        filingPattern,
        registrationHealth,
        returnFilingHealth: filingHealth,
        dataAvailabilityHealth: dataAvailHealth,
        overallScanStatus,
        apiCompCategory,
        dataObservations: observations,
        dataSourceCategory: 'Public GST information'
      });

      const savedScan = await newScan.save();
      console.log("[GST SCAN] Report saved successfully!");

      res.status(201).json({
        success: true,
        message: 'GST Health Scan generated successfully!',
        data: savedScan,
      });

    } catch (scanErr) {
      console.error('[GST SCAN ERROR] Report save failed:', scanErr.message);
      res.status(500).json({ success: false, message: `Database Save Error: ${scanErr.message}` });
    }

  } catch (error) {
    console.error('[GST SCAN FATAL ERROR]:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};