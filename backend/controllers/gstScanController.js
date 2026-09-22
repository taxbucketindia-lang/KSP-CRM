import GstScan from '../models/GstScan.js';
import Lead from '../models/Lead.js'; // 🔴 NAYA: Lead model import karein
import crypto from 'crypto';
import axios from 'axios';

// ... (aapke purane helper functions: MONTHS_YELLOW, gstinStatusHealth, etc. waise hi rahenge) ...

export const runGstHealthScan = async (req, res) => {
  try {
    const { gstin, mobile, email, businessName } = req.body;

    if (!gstin || !mobile || !email) {
      return res.status(400).json({ success: false, message: 'GSTIN, Mobile, and Email are mandatory.' });
    }

    // 🔴 STEP 1: CREATE A LEAD FIRST (As per PDF Section 2 & 8)
    const newLead = new Lead({
      name: businessName || `GST Lead - ${gstin}`,
      mobile: mobile,
      email: email,
      source: 'Website',
      queryService: ['GST Health Scan'],
      status: 'New',
      priority: 'Warm',
      remarks: `Lead generated automatically via Free GST Health Scan for GSTIN: ${gstin.toUpperCase()}.`,
      // createdBy ko system/admin ID assign kar sakte hain ya null chhod sakte hain agar public route hai
      // agar ye protected route hai toh req.user._id use karein. Main abhi fallback de raha hu.
      createdBy: req.user ? req.user._id : undefined 
    });
    const savedLead = await newLead.save();


    const reportId = 'TB-GST-' + crypto.randomBytes(3).toString('hex').toUpperCase();
    const gstLeadId = savedLead._id; // Lead ID map kar diya

    let apiData = {};
    let apiReachable = true;
    try {
      // API call (same as your code)
      const response = await axios.get(`https://gst-return-status.p.rapidapi.com/free/gstin/${gstin}`, {
        headers: {
          'content-type': 'application/json',
          'x-rapidapi-key': process.env.RAPIDAPI_KEY,
          'x-rapidapi-host': 'gst-return-status.p.rapidapi.com',
        },
      });
      apiData = response.data.data || {};
    } catch (apiErr) {
      apiReachable = false;
      console.error('RapidAPI fetch error:', apiErr.message);
    }

    // ... (Field mapping same as your code) ...
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

    // ... (Rule engine same as your code) ...
    const registrationHealth = apiReachable ? gstinStatusHealth(gstinStatus) : 'Red';
    const { health: filingHealth, gapMonths } = apiReachable
      ? returnFilingHealth(latestGstr3bPeriod, latestGstr1Period)
      : { health: 'Red', gapMonths: null };
    const dataAvailHealth = apiReachable ? dataAvailabilityHealth(apiData) : 'Red';
    const overallScanStatus = worstOf(registrationHealth, filingHealth, dataAvailHealth);
    const filingPattern = filingPatternFromGap(gapMonths);

    // ... (Observations same as your code) ...
    const observations = [
      { observation: `Registration: GSTIN status shows as "${gstinStatus}" based on publicly available information.` },
      { observation: filingHealth === 'Green' ? `Return Filing: Recent filing history appears regular (latest GSTR-3B period: ${latestGstr3bPeriod}).` : `Return Filing: ${filingHealth === 'Red' ? 'Significant apparent gap' : 'Late/gap indication'} in recent filings (latest GSTR-3B period: ${latestGstr3bPeriod}).` },
      { observation: gapMonths && gapMonths > MONTHS_YELLOW ? `Possible Filing Gap: Approximately ${gapMonths} month(s) since the latest available return period — one or more periods may require review.` : 'Possible Filing Gap: No significant gap detected in the periods captured.' },
      { observation: dataAvailHealth === 'Green' ? 'Data Availability: Public data available and sufficient for this preliminary scan.' : dataAvailHealth === 'Yellow' ? 'Data Availability: Public data only partially available; some fields could not be verified.' : 'Data Availability: Public data insufficient at the time of scan — a detailed review is recommended.' },
      { observation: 'Public data alone does not establish ITC mismatch, tax liability or complete GST compliance. Any item marked for review should be verified using authorised GST Portal information, books of account and relevant supporting documents.' }
    ];

    const newScan = new GstScan({
      reportId,
      gstLeadId, // 🔴 Ab yahan lead ki proper ID save hogi
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

    // 🔴 STEP 2: Update Lead with Report ID (Optional but recommended)
    // Humne Lead ko remarks mein update kar diya, toh yeh sufficient hai

    res.status(201).json({
      success: true,
      message: 'GST Health Scan generated and Lead captured successfully!',
      data: savedScan,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};