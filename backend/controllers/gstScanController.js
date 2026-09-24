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
      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
          return new Date(year, month, day);
      }
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

const returnFilingHealth = (sortedReturnsArray) => {
  let date = null;
  if (sortedReturnsArray && sortedReturnsArray.length > 0) {
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

const dataAvailabilityHealth = (legalName) => {
  if (legalName && legalName !== 'Valued Taxpayer' && legalName !== 'N/A') return 'Green';
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

// 🔴 NAYA FUNCTION: Estimate Filing Frequency
// 🔴 NAYA SUPER BULLETPROOF FUNCTION: Estimate Filing Frequency
const estimateFilingFrequency = (returnsArray) => {
  if (!returnsArray || returnsArray.length === 0) return 'Unknown';

  // 1. Sirf GSTR1 aur GSTR3B returns lo, jinme taxp 6 character ka ho (MMYYYY)
  const validReturns = returnsArray.filter(r => 
      (r.rtntype === 'GSTR1' || r.rtntype === 'GSTR3B') && 
      r.taxp && r.taxp.length === 6
  );

  if (validReturns.length === 0) return 'Unknown';

  // 2. Sirf unique "MMYYYY" periods nikal lo
  const uniquePeriodsSet = new Set(validReturns.map(r => r.taxp));
  const uniquePeriodsArray = Array.from(uniquePeriodsSet);

  if (uniquePeriodsArray.length < 2) return 'Monthly (Assumed)';

  // 3. String (MMYYYY) ko Date format me convert karke sort karo (Latest first)
  const sortedDates = uniquePeriodsArray.map(p => {
      const month = parseInt(p.substring(0, 2), 10);
      const year = parseInt(p.substring(2), 10);
      return new Date(year, month - 1, 1); // JS months are 0-indexed
  }).sort((a, b) => b - a);

  // 4. Sabse latest aur uske pichle period ke beech ka gap check karo
  // Difference in months = (YearDiff * 12) + MonthDiff
  const diffMonths = (sortedDates[0].getFullYear() - sortedDates[1].getFullYear()) * 12 
                   + (sortedDates[0].getMonth() - sortedDates[1].getMonth());

  const gap = Math.abs(diffMonths);

  // Agar gap 3 ya usse zyaada mahine ka hai (e.g. June-March = 3, Sept-June = 3), toh Quarterly
  if (gap >= 3) {
      return 'Quarterly';
  } 
  
  // Agar gap exactly 1 mahine ka hai, toh pakka Monthly
  if (gap === 1) {
      return 'Monthly';
  }

  // Agar 2 mahine ka gap aata hai (jo generally late filing mein hota hai), 
  // toh safe side rehne ke liye usko pattern check ke liye bhej do, but usually Regular taxpayers monthly hote hain
  return 'Monthly'; 
};

const getSandboxToken = async () => {
  try {
    const response = await axios.post('https://api.sandbox.co.in/authenticate', {}, {
      headers: {
        'accept': 'application/json',
        'x-api-key': process.env.SANDBOX_API_KEY,
        'x-api-secret': process.env.SANDBOX_API_SECRET,
        'x-api-version': '1.0.0'
      }
    });
    return response.data.access_token;
  } catch (error) {
    console.error("Sandbox Auth Failed:", error.response?.data || error.message);
    throw new Error("Failed to authenticate with Sandbox.");
  }
};

export const runGstHealthScan = async (req, res) => {
  try {
    const { action, reportData, gstin, mobile, email, businessName } = req.body;

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
📊 Nature of Business: ${reportData.natureOfBusiness.join(', ')}
🔄 Filing Frequency: ${reportData.filingFrequency}

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
          ...reportData, 
          gstLeadId,
          dataSourceCategory: 'Hybrid (Sandbox + GST Insights)'
        });
        await newScan.save();
        return res.status(201).json({ success: true, message: 'Saved to Leads & CRM successfully!' });
      } catch (scanErr) {
        return res.status(500).json({ success: false, message: `Database Save Error: ${scanErr.message}` });
      }
    }

    if (!gstin || !mobile || !email) {
      return res.status(400).json({ success: false, message: 'GSTIN, Mobile, and Email are mandatory.' });
    }

    // 🟢 A. FETCH PROFILE FROM SANDBOX API
    let sandboxData = {};
    let isSandboxSuccess = false;
    let natureOfBusiness = [];

    try {
      const accessToken = await getSandboxToken();
      const sbResponse = await axios.post('https://api.sandbox.co.in/gst/compliance/public/gstin/search', 
        { gstin: gstin.toUpperCase() },
        { headers: { 'accept': 'application/json', 'content-type': 'application/json', 'authorization': accessToken, 'x-api-key': process.env.SANDBOX_API_KEY, 'x-api-version': '1.0.0' } }
      );
      
      if (sbResponse.data && sbResponse.data.data) {
        sandboxData = sbResponse.data.data.data || sbResponse.data.data;
        isSandboxSuccess = true;
      }
    } catch (sbErr) {
      console.error('[SANDBOX API ERROR]', sbErr.message);
    }

    // 🟢 B. FETCH RETURNS FROM GST INSIGHTS API
    let filingReturns = [];
    let apiReachable = true;

    try {
      const response = await axios.get(`https://gst-insights-api.p.rapidapi.com/getGSTReturnFilingStatus/${gstin}`, {
        headers: { 'x-rapidapi-key': process.env.RAPIDAPI_KEY, 'x-rapidapi-host': 'gst-insights-api.p.rapidapi.com' },
      });

      let respData = response.data;
      let rawReturns = [];
      
      if (respData.data && respData.data.fillingData) respData = respData.data;

      // 🔴 Extract Nature of Business from Insights API
      if (respData.natureOfBusinessActivity && Array.isArray(respData.natureOfBusinessActivity)) {
         natureOfBusiness = respData.natureOfBusinessActivity;
      } else if (sandboxData.nba) {
         natureOfBusiness = sandboxData.nba; // Fallback to sandbox if available
      }

      if (respData && respData.fillingData && typeof respData.fillingData === 'object') {
          rawReturns = Object.values(respData.fillingData).flat();
      } else if (Array.isArray(respData)) {
          rawReturns = respData;
      } else if (respData && Array.isArray(respData.data)) {
          rawReturns = respData.data;
      }

      if (rawReturns.length > 0) {
        filingReturns = rawReturns.map(r => ({
          rtntype: r.returnType || r.rtntype || 'N/A',
          taxp: r.returnPeriod || r.taxp || 'N/A',
          status: (r.isValid === 'Y' || r.status === 'Filed') ? 'Filed' : (r.status || 'N/A'),
          dof: r.dateOfFiling || r.dof || 'N/A'
        }));
      } else {
        apiReachable = false;
      }
    } catch (apiErr) {
      apiReachable = false;
      console.error('[GST INSIGHTS API ERROR]', apiErr.message);
    }

    // SORT RETURNS
    if (filingReturns.length > 0) {
        filingReturns.sort((a, b) => {
            const dateA = parseDateString(a.dof);
            const dateB = parseDateString(b.dof);
            if (dateA && dateB) return dateB.getTime() - dateA.getTime();
            if (!dateA && dateB) return 1;
            if (dateA && !dateB) return -1;
            return 0;
        });
    }

    // MAP PROFILE FIELDS
    const legalName = sandboxData.lgnm || businessName || 'Valued Taxpayer';
    const tradeName = sandboxData.tradeNam || sandboxData.tradeName || legalName;
    const gstinStatus = sandboxData.sts || (isSandboxSuccess ? 'Active' : 'N/A');
    const cancellationDate = sandboxData.cxdt || null;
    const constitution = sandboxData.ctb || 'N/A';
    const registrationDate = sandboxData.rgdt || 'N/A';
    const taxpayerType = sandboxData.dty || 'N/A';
    
    let address = 'N/A';
    if (sandboxData.pradr && sandboxData.pradr.addr) {
      const addr = sandboxData.pradr.addr;
      address = `${addr.bno || ''} ${addr.st || ''} ${addr.loc || ''}`.trim();
    } else if (sandboxData.adr) {
      address = sandboxData.adr;
    }

    const pincode = sandboxData.pradr?.addr?.pncd || sandboxData.pincode || 'N/A';
    const stateJurisdiction = sandboxData.stj || 'N/A';
    const centralJurisdiction = sandboxData.ctj || 'N/A';
    const pan = sandboxData.pan || null;
    const filingFrequency = estimateFilingFrequency(filingReturns);

    // RULE ENGINE
    const registrationHealth = isSandboxSuccess ? gstinStatusHealth(gstinStatus) : 'Red';
    const { health: filingHealth, gapMonths } = apiReachable ? returnFilingHealth(filingReturns) : { health: 'Red', gapMonths: null };
    const dataAvailHealth = isSandboxSuccess ? dataAvailabilityHealth(legalName) : 'Red';
    const overallScanStatus = worstOf(registrationHealth, filingHealth, dataAvailHealth);
    const filingPattern = filingPatternFromGap(gapMonths);

    const latestGstr1 = filingReturns.find(r => r.rtntype === 'GSTR1');
    const latestGstr3b = filingReturns.find(r => r.rtntype === 'GSTR3B');
    const latestGstr1Period = latestGstr1 ? latestGstr1.taxp : 'N/A';
    const latestGstr3bPeriod = latestGstr3b ? latestGstr3b.taxp : 'N/A';

    const observations = [
      { observation: `Registration: GSTIN status shows as "${gstinStatus}" based on public registry verification.` },
      { observation: filingHealth === 'Green' ? `Return Filing: Recent filing history appears regular.` : `Return Filing: Late/gap indication in recent filings.` },
      { observation: gapMonths && gapMonths > MONTHS_YELLOW ? `Possible Filing Gap: Approximately ${gapMonths} month(s) since the latest available return period.` : 'Possible Filing Gap: No significant gap detected.' },
      { observation: 'Public data alone does not establish ITC mismatch, tax liability or complete GST compliance.' }
    ];

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
      natureOfBusiness, // Array of strings
      filingFrequency, // Derived string
      filingReturns: filingReturns.slice(0, 20),
      latestGstr1Period,
      latestGstr3bPeriod,
      recentFilingGapMonths: gapMonths,
      filingPattern,
      registrationHealth,
      returnFilingHealth: filingHealth,
      dataAvailabilityHealth: dataAvailHealth,
      overallScanStatus,
      apiCompCategory: null,
      dataObservations: observations
    };

    res.status(200).json({ success: true, message: 'Scan generated successfully!', data: scanResult });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};