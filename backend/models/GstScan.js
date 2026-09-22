import mongoose from 'mongoose';

const gstScanSchema = new mongoose.Schema(
  {
    // --- Core identifiers (PDF Section 8) ---
    reportId: { type: String, required: true, unique: true },
    gstLeadId: { type: String, required: true },
    reportVersion: { type: String, default: 'v1.0' }, // PDF Section 9: every PDF must carry a report version

    // --- Lead / contact ---
    gstin: { type: String, required: true, uppercase: true },
    businessName: { type: String, required: true },
    tradeName: { type: String },
    mobile: { type: String, required: true },
    email: { type: String, required: true },

    // --- GST / Business Profile (PDF Section 3.A) ---
    constitution: { type: String },
    registrationDate: { type: String },
    registrationStatus: { type: String },
    cancellationDate: { type: String, default: null },
    taxpayerType: { type: String },
    address: { type: String },
    pincode: { type: String },
    stateJurisdiction: { type: String },
    centralJurisdiction: { type: String },
    // API (per screenshot) does not expose "additional places" — kept for when/if a source is added
    additionalPlaces: { type: String, default: 'Not available from current data source' },
    pan: { type: String }, // captured for internal traceability only, not required on the free PDF

    // --- Return Filing Snapshot (PDF Section 3.B) ---
    filingReturns: { type: Array, default: [] }, // raw slice of latest returns from API
    latestGstr1Period: { type: String, default: 'N/A' },
    latestGstr3bPeriod: { type: String, default: 'N/A' },
    recentFilingGapMonths: { type: Number, default: null }, // derived
    filingPattern: { type: String, enum: ['Regular', 'Review Required', 'Unknown'], default: 'Unknown' }, // derived

    // --- Rule Engine (PDF Section 4) ---
    registrationHealth: { type: String, enum: ['Green', 'Yellow', 'Red'], default: 'Yellow' },
    returnFilingHealth: { type: String, enum: ['Green', 'Yellow', 'Red'], default: 'Yellow' },
    dataAvailabilityHealth: { type: String, enum: ['Green', 'Yellow', 'Red'], default: 'Yellow' },
    overallScanStatus: { type: String, enum: ['Green', 'Yellow', 'Red'], default: 'Yellow' },

    // Kept for backward compatibility / reference to the third-party API's own beta category
    apiCompCategory: { type: String, default: null },

    // --- Observations ---
    dataObservations: [{ observation: String }],

    // --- Meta / CRM (PDF Section 8) ---
    scanDateTime: { type: Date, default: Date.now },
    dataSourceCategory: { type: String, default: 'Public GST information' },
    pdfUrl: { type: String, default: null }, // TODO: populate once PDF is uploaded to storage (see controller note)
    proCtaStatus: { type: String, default: 'Shown', enum: ['Shown', 'Interested', 'Converted'] },
    assignedExecutive: { type: String, default: null },
  },
  { timestamps: true }
);

export default mongoose.model('GstScan', gstScanSchema);