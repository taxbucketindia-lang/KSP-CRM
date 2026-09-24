import mongoose from 'mongoose';

const gstScanSchema = new mongoose.Schema(
  {
    // --- Core identifiers ---
    reportId: { type: String, required: true, unique: true },
    gstLeadId: { type: String, required: true },
    reportVersion: { type: String, default: 'v1.0' },

    // --- Lead / contact ---
    gstin: { type: String, required: true, uppercase: true },
    businessName: { type: String, required: true },
    tradeName: { type: String },
    mobile: { type: String, required: true },
    email: { type: String, required: true },

    // --- GST / Business Profile ---
    constitution: { type: String },
    registrationDate: { type: String },
    registrationStatus: { type: String },
    cancellationDate: { type: String, default: null },
    taxpayerType: { type: String },
    address: { type: String },
    pincode: { type: String },
    stateJurisdiction: { type: String },
    centralJurisdiction: { type: String },
    additionalPlaces: { type: String, default: 'Not available from current data source' },
    pan: { type: String },

    // 🔴 NAYE FIELDS ADD KIYE GAYE HAIN
    natureOfBusiness: { type: [String], default: [] },
    filingFrequency: { type: String, default: 'Monthly/Regular' },

    // --- Return Filing Snapshot ---
    filingReturns: { type: Array, default: [] },
    latestGstr1Period: { type: String, default: 'N/A' },
    latestGstr3bPeriod: { type: String, default: 'N/A' },
    recentFilingGapMonths: { type: Number, default: null },
    filingPattern: { type: String, enum: ['Regular', 'Review Required', 'Unknown'], default: 'Unknown' },

    // --- Rule Engine ---
    registrationHealth: { type: String, enum: ['Green', 'Yellow', 'Red'], default: 'Yellow' },
    returnFilingHealth: { type: String, enum: ['Green', 'Yellow', 'Red'], default: 'Yellow' },
    dataAvailabilityHealth: { type: String, enum: ['Green', 'Yellow', 'Red'], default: 'Yellow' },
    overallScanStatus: { type: String, enum: ['Green', 'Yellow', 'Red'], default: 'Yellow' },
    apiCompCategory: { type: String, default: null },

    // --- Observations ---
    dataObservations: [{ observation: String }],

    // --- Meta / CRM ---
    scanDateTime: { type: Date, default: Date.now },
    dataSourceCategory: { type: String, default: 'Public GST information' },
    pdfUrl: { type: String, default: null },
    proCtaStatus: { type: String, default: 'Shown', enum: ['Shown', 'Interested', 'Converted'] },
    assignedExecutive: { type: String, default: null },
  },
  { timestamps: true }
);

export default mongoose.model('GstScan', gstScanSchema);