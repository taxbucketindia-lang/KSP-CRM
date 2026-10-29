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

// 🔴 GST Insights (RapidAPI) ko call karna: jawab na aaye / limit lage toh thoda ruk kar ek baar aur koshish
const fetchGstInsights = async (path, gstin) => {
  let lastError;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await axios.get(`https://gst-insights-api.p.rapidapi.com/${path}/${gstin}`, {
        headers: { 'x-rapidapi-key': process.env.RAPIDAPI_KEY, 'x-rapidapi-host': 'gst-insights-api.p.rapidapi.com' },
        timeout: 20000
      });
      return response.data;
    } catch (error) {
      lastError = error;
      const status = error.response?.status;
      // Key galat ho ya mahine ka quota khatam: dobara koshish bekaar hai
      if (status === 401 || status === 403) break;
      if (attempt === 0) await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }
  throw lastError;
};

// API ki galti ko aam bhasha me (report me dikhane ke liye)
const insightsErrorNote = (error) => {
  const status = error?.response?.status;
  const detail = String(error?.response?.data?.message || error?.message || '').slice(0, 140);
  if (status === 429) return 'The GST data provider limit is reached (the RapidAPI plan allows a fixed number of requests per month). Please try again later or upgrade the plan.';
  if (status === 401 || status === 403) return `The GST data provider rejected the API key (${detail || status}). Check RAPIDAPI_KEY on the server.`;
  if (error?.code === 'ECONNABORTED') return 'The GST data provider did not reply in time. Please run the scan again.';
  return `Filing history could not be fetched from the GST data provider (${status ? `error ${status}` : detail || 'no reply'}). Please run the scan again.`;
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
    const { action, reportData, gstin, mobile, email, businessName, createdVia } = req.body;
    // Sirf jaani-pehchani websites ka naam lead par lagta hai
    const WEBSITE_SOURCES = ['taxbucket.in'];

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
          createdBy: req.user ? req.user._id : undefined,
          createdVia: WEBSITE_SOURCES.includes(createdVia) ? createdVia : null
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
      console.error('[SANDBOX API ERROR]', sbErr.response?.data?.message || sbErr.message);
    }

    // 🟢 B. FETCH RETURNS FROM GST INSIGHTS API
    let filingReturns = [];
    let apiReachable = true;
    let filingDataNote = ''; // filing history na mile toh uski wajah (report me dikhti hai)
    let filingDataAsOf = null; // live data na mile aur purani save hui history dikhayi ho toh uski date
    let insightsProfile = {}; // GST Insights ke return-filing jawab me aayi basic detail

    try {
      let respData = await fetchGstInsights('getGSTReturnFilingStatus', gstin.toUpperCase());
      let rawReturns = [];

      // Jawab { success, data: { ...profile, fillingData } } ki shakal me aata hai. fillingData khali ho tab bhi andar jao.
      if (respData && respData.data && !Array.isArray(respData.data) && typeof respData.data === 'object') respData = respData.data;
      // Isi jawab me legal name, status, registration date wagairah bhi aate hain
      if (respData && !Array.isArray(respData) && (respData.legalName || respData.status)) insightsProfile = respData;

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
      } else if (respData && (respData.gstNumber || respData.legalName || respData.status)) {
        // API ne jawab diya par filing ki ek bhi row nahi. Iska matlab yeh NAHI ki taxpayer ne return file nahi kiya:
        // data provider kabhi-kabhi saal ke khane bhejta hai par andar kuch nahi (uski taraf ki kami). Isliye daava nahi karte.
        filingDataNote = 'The GST data provider returned an empty filing history for this GSTIN right now. This does not mean returns were not filed. Please verify on the GST portal or try again later.';
      } else {
        apiReachable = false;
        filingDataNote = `The GST data provider did not return filing data for this GSTIN${respData?.message ? ` (${String(respData.message).slice(0, 120)})` : ''}.`;
      }
    } catch (apiErr) {
      apiReachable = false;
      filingDataNote = insightsErrorNote(apiErr);
      console.error('[GST INSIGHTS API ERROR]', apiErr.response?.status || '', apiErr.response?.data?.message || apiErr.message);
    }

    // 🔴 BACKUP: live filing data khali aaye toh isi GSTIN ka pichhla save hua scan dekho (CRM me pehle se pada data)
    if (filingReturns.length === 0) {
      try {
        // filingDataAsOf: null = wahi scan jo us waqt live data se bana tha (purani history se bana scan dobara source nahi banta)
        const previous = await GstScan.findOne({ gstin: gstin.toUpperCase(), 'filingReturns.0': { $exists: true }, filingDataAsOf: null })
          .sort({ createdAt: -1 }).select('filingReturns createdAt').lean();
        if (previous) {
          filingReturns = previous.filingReturns.map(r => ({ rtntype: r.rtntype, taxp: r.taxp, status: r.status, dof: r.dof }));
          filingDataAsOf = previous.createdAt;
          apiReachable = true;
          const savedOn = new Date(previous.createdAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' });
          filingDataNote = `Live filing data is not available from the GST data provider right now. The filing history below is the one last saved in the CRM on ${savedOn}; newer returns may be missing.`;
        }
      } catch (backupErr) {
        console.error('[GST SCAN] saved history lookup failed:', backupErr.message);
      }
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

    // 🟢 C. BASIC DETAILS KA BACKUP: Sandbox se profile na mile (subscription khatam / API band) toh
    // GST Insights ke details API se lo. Sandbox chal raha ho toh yeh extra call nahi jata.
    let details = {};
    if (!isSandboxSuccess) {
      try {
        const detailData = await fetchGstInsights('getGSTDetailsUsingGST', gstin.toUpperCase());
        const body = detailData?.data;
        details = (Array.isArray(body) ? body[0] : body) || {};
      } catch (detailErr) {
        console.error('[GST INSIGHTS DETAILS API ERROR]', detailErr.response?.data?.message || detailErr.message);
      }
    }

    // Pata: alag-alag hisse jod kar ek line
    const joinAddress = (a) => (a ? [a.floorNumber, a.buildingNumber, a.buildingName, a.street, a.locality, a.location, a.district, a.stateCode, a.pincode]
      .map(part => String(part || '').trim()).filter(Boolean).join(', ') : '');
    const insightsAddress = details.principalAddress?.address;

    // MAP PROFILE FIELDS (pehle Sandbox, na ho toh GST Insights)
    const profileFound = isSandboxSuccess || !!(details.legalName || insightsProfile.legalName);
    const legalName = sandboxData.lgnm || details.legalName || insightsProfile.legalName || businessName || 'Valued Taxpayer';
    const tradeName = sandboxData.tradeNam || sandboxData.tradeName || details.tradeName || insightsProfile.tradeName || legalName;
    const gstinStatus = sandboxData.sts || details.status || insightsProfile.status || (isSandboxSuccess ? 'Active' : 'N/A');
    const cancellationDate = sandboxData.cxdt || details.cancelledDate || null;
    const constitution = sandboxData.ctb || details.constitutionOfBusiness || 'N/A';
    const registrationDate = sandboxData.rgdt || details.registrationDate || insightsProfile.registrationDate || 'N/A';
    const taxpayerType = sandboxData.dty || details.taxType || 'N/A';

    let address = 'N/A';
    if (sandboxData.pradr && sandboxData.pradr.addr) {
      const addr = sandboxData.pradr.addr;
      address = `${addr.bno || ''} ${addr.st || ''} ${addr.loc || ''}`.trim();
    } else if (sandboxData.adr) {
      address = sandboxData.adr;
    } else if (joinAddress(insightsAddress)) {
      address = joinAddress(insightsAddress);
    }

    const pincode = sandboxData.pradr?.addr?.pncd || sandboxData.pincode || insightsAddress?.pincode || 'N/A';
    const stateJurisdiction = sandboxData.stj || details.stateJurisdiction || insightsProfile.stateJurisdictionCode || 'N/A';
    const centralJurisdiction = sandboxData.ctj || details.centerJurisdiction || insightsProfile.centerJurisdiction || 'N/A';
    // PAN GSTIN ke andar hi hota hai (3rd se 12th akshar)
    const pan = sandboxData.pan || (/^[0-9]{2}[A-Z0-9]{10}/i.test(gstin) ? gstin.toUpperCase().slice(2, 12) : null);
    const additionalList = Array.isArray(details.additionalAddress) ? details.additionalAddress.map(item => joinAddress(item?.address)).filter(Boolean) : [];
    const additionalPlaces = additionalList.length ? additionalList.join(' | ') : (details.legalName ? 'None' : 'Not available from current data source');
    if (natureOfBusiness.length === 0 && Array.isArray(details.natureOfBusinessActivity)) natureOfBusiness = details.natureOfBusinessActivity;
    const filingFrequency = estimateFilingFrequency(filingReturns);

    // RULE ENGINE
    const registrationHealth = profileFound ? gstinStatusHealth(gstinStatus) : 'Red';
    // Purani save hui history par aaj ka gap / late nikalna galat hoga: tab sirf 'Yellow' (jaanch zaroori), koi daava nahi
    const { health: filingHealth, gapMonths } = filingDataAsOf
      ? { health: 'Yellow', gapMonths: null }
      : apiReachable ? returnFilingHealth(filingReturns) : { health: 'Red', gapMonths: null };
    const dataAvailHealth = profileFound ? dataAvailabilityHealth(legalName) : 'Red';
    const overallScanStatus = worstOf(registrationHealth, filingHealth, dataAvailHealth);
    const filingPattern = filingPatternFromGap(gapMonths);

    const latestGstr1 = filingReturns.find(r => r.rtntype === 'GSTR1');
    const latestGstr3b = filingReturns.find(r => r.rtntype === 'GSTR3B');
    const latestGstr1Period = latestGstr1 ? latestGstr1.taxp : 'N/A';
    const latestGstr3bPeriod = latestGstr3b ? latestGstr3b.taxp : 'N/A';

    const observations = [
      { observation: `Registration: GSTIN status shows as "${gstinStatus}" based on public registry verification.` },
      { observation: filingDataAsOf
          ? 'Return Filing: Cannot be judged today because only the earlier saved history is available.'
          : filingReturns.length === 0
          ? `Return Filing: ${filingDataNote || 'Filing history is not available.'}`
          : filingHealth === 'Green' ? `Return Filing: Recent filing history appears regular.` : `Return Filing: Late/gap indication in recent filings.` },
      { observation: filingReturns.length === 0 || filingDataAsOf
          ? 'Possible Filing Gap: Cannot be checked because live filing history is not available.'
          : gapMonths && gapMonths > MONTHS_YELLOW ? `Possible Filing Gap: Approximately ${gapMonths} month(s) since the latest available return period.` : 'Possible Filing Gap: No significant gap detected.' },
      { observation: 'Public data alone does not establish ITC mismatch, tax liability or complete GST compliance.' }
    ];
    if (filingDataAsOf) observations.splice(1, 0, { observation: `Note: ${filingDataNote}` });

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
      additionalPlaces,
      pan,
      natureOfBusiness, // Array of strings
      filingFrequency, // Derived string
      filingReturns: filingReturns.slice(0, 20),
      filingDataNote, // filing history khali ho toh uski wajah
      filingDataAsOf, // purani save hui history dikhayi ho toh uski date
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