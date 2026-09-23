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

const parseDateString = (dateStr) => {
  if (!dateStr || dateStr === 'N/A') return null;
  const str = String(dateStr).trim();

  const parts = str.split(/[\/\-]/);
  if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      let year = parseInt(parts[2], 10);
      if (year < 100) year += 2000; 
      
      const parsedDate = new Date(year, month, day);
      if (!isNaN(parsedDate.getTime())) return parsedDate;
  }

  let m = str.match(/^(\d{2})-?(\d{4})$/); 
  if (m) return new Date(Number(m[2]), Number(m[1]) - 1, 1);
  m = str.match(/^(\d{4})-(\d{2})$/); 
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, 1);
  const parsed = new Date(str); 
  return isNaN(parsed.getTime()) ? null : parsed;
};

const monthsBetween = (date) => {
  if (!date) return null;
  const now = new Date();
  return (now.getFullYear() - date.getFullYear()) * 12 + (now.getMonth() - date.getMonth());
};

const returnFilingHealth = (latestGstr3b, latestGstr1, sortedReturnsArray) => {
  let date = parseDateString(latestGstr3b) || parseDateString(latestGstr1);
  
  if (!date && sortedReturnsArray && sortedReturnsArray.length > 0) {
     const latestFilingDateStr = sortedReturnsArray[0].dof;
     date = parseDateString(latestFilingDateStr);
  }

  if (!date) return { health: 'Yellow', gapMonths: null }; 
  const gap = monthsBetween(date);
  const safeGap = gap < 0 ? 0 : gap; 
  if (safeGap <= MONTHS_YELLOW) return { health: 'Green', gapMonths: safeGap };
  if (safeGap <= MONTHS_RED) return { health: 'Yellow', gapMonths: safeGap };
  return { health: 'Red', gapMonths: safeGap };
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
  return gapMonths <= 3 ? 'Regular' : 'Review Required';
};

// --- Main Controller ---
export const runGstHealthScan = async (req, res) => {
  try {
    const { action, reportData, gstin, mobile, email, businessName } = req.body;

    // 🔴 1. ACTION: SAVE TO DB (Jab User button click karega)
    if (action === 'save' && reportData) {
      let gstLeadId = 'GUEST-LEAD-' + Date.now();
      
      try {
        const detailedRemarks = `
Lead generated manually via Free GST Health Scan.
-----------------------------------------
🏢 GSTIN: ${reportData.gstin}
🟢 Registration Status: ${reportData.registrationStatus}
📅 Registration Date: ${reportData.registrationDate}
⚖️ Constitution: ${reportData.constitution}
🧑‍💼 Taxpayer Type: ${reportData.taxpayerType}

📊 HEALTH SCAN PREVIEW:
- Return Filing Pattern: ${reportData.filingPattern}
- Overall Scan Status: ${reportData.overallScanStatus}
-----------------------------------------
        `.trim();

        const newLead = new Lead({
          name: reportData.businessName, 
          mobile: reportData.mobile,
          email: reportData.email,
          source: 'Website', 
          queryService: ['GST Health Scan'],
          status: 'New', 
          priority: 'Warm',
          remarks: detailedRemarks, 
          createdBy: req.user ? req.user._id : undefined
        });
        const savedLead = await newLead.save();
        gstLeadId = savedLead._id;
      } catch (leadErr) {
        console.error('[GST SCAN ERROR] Lead save failed.', leadErr.message);
      }

      try {
        const newScan = new GstScan({
          ...reportData, // Destructure all data directly
          gstLeadId,
          dataSourceCategory: 'Public GST information'
        });
        await newScan.save();
        return res.status(201).json({ success: true, message: 'Saved to Leads & CRM successfully!' });
      } catch (scanErr) {
        return res.status(500).json({ success: false, message: `Database Save Error: ${scanErr.message}` });
      }
    }

    // 🔴 2. ACTION: PREVIEW (Default - Jab scan form submit hoga)
    if (!gstin || !mobile || !email) {
      return res.status(400).json({ success: false, message: 'GSTIN, Mobile, and Email are mandatory.' });
    }

    let apiData = {};
    let apiReachable = true;
    try {
      const response = await axios.get(`https://gst-return-status.p.rapidapi.com/free/gstin/${gstin}`, {
        headers: {
          'content-type': 'application/json',
          'x-rapidapi-key': process.env.RAPIDAPI_KEY,
          'x-rapidapi-host': 'gst-return-status.p.rapidapi.com',
        },
      });
      if (response.data && response.data.data && Object.keys(response.data.data).length > 0) {
        apiData = response.data.data;
      } else {
        apiReachable = false;
      }
    } catch (apiErr) {
      apiReachable = false;
      console.error('[GST SCAN ERROR]', apiErr.message);
    }

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

    const latestGstr1Period = apiData.meta?.latestgstr1 || 'N/A';
    const latestGstr3bPeriod = apiData.meta?.latestgstr3b || 'N/A';

    let filingReturns = apiData.returns || [];
    if (filingReturns.length > 0) {
        filingReturns.sort((a, b) => {
            const dateA = parseDateString(a.dof);
            const dateB = parseDateString(b.dof);
            if (dateA && dateB) return dateB.getTime() - dateA.getTime();
            if (dateA) return -1;
            if (dateB) return 1;
            return 0;
        });
    }

    const registrationHealth = apiReachable ? gstinStatusHealth(gstinStatus) : 'Red';
    const { health: filingHealth, gapMonths } = apiReachable
      ? returnFilingHealth(latestGstr3bPeriod, latestGstr1Period, filingReturns)
      : { health: 'Red', gapMonths: null };
    
    const dataAvailHealth = apiReachable ? dataAvailabilityHealth(apiData) : 'Red';
    const overallScanStatus = worstOf(registrationHealth, filingHealth, dataAvailHealth);
    const filingPattern = filingPatternFromGap(gapMonths);

    const observations = [
      { observation: `Registration: GSTIN status shows as "${gstinStatus}" based on publicly available information.` },
      { observation: filingHealth === 'Green' ? `Return Filing: Recent filing history appears regular (latest period identified).` : `Return Filing: ${filingHealth === 'Red' ? 'Significant gap' : 'Late/gap indication'} in recent filings.` },
      { observation: gapMonths && gapMonths > MONTHS_YELLOW ? `Possible Filing Gap: Approximately ${gapMonths} month(s) since the latest available return period — one or more periods may require review.` : 'Possible Filing Gap: No significant gap detected in the periods captured.' },
      { observation: dataAvailHealth === 'Green' ? 'Data Availability: Public data available and sufficient for this preliminary scan.' : dataAvailHealth === 'Yellow' ? 'Data Availability: Public data only partially available; some fields could not be verified.' : 'Data Availability: Public data insufficient at the time of scan — a detailed review is recommended.' },
      { observation: 'Public data alone does not establish ITC mismatch, tax liability or complete GST compliance.' }
    ];

    // 🔴 3. RETURN DATA WITHOUT SAVING
    const scanResult = {
      reportId: 'TB-GST-' + crypto.randomBytes(3).toString('hex').toUpperCase(),
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
      filingReturns: filingReturns.slice(0, 20),
      latestGstr1Period,
      latestGstr3bPeriod,
      recentFilingGapMonths: gapMonths,
      filingPattern,
      registrationHealth,
      returnFilingHealth: filingHealth,
      dataAvailabilityHealth: dataAvailHealth,
      overallScanStatus,
      apiCompCategory,
      dataObservations: observations
    };

    res.status(200).json({ success: true, message: 'Scan generated successfully for preview!', data: scanResult });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};