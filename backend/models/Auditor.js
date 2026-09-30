import mongoose from 'mongoose';

const auditorSchema = new mongoose.Schema({
  auditorId: { type: String, unique: true }, // Auto-generate (e.g. AU-0001)
  
  firm_name: { type: String, required: true, maxlength: 150 },
  firm_frn: { type: String, required: true, maxlength: 10 },
  signing_person_name: { type: String, required: true, maxlength: 100 },
  
  designation: { type: String, required: true, enum: ['Partner', 'Proprietor'] },
  membership_no: { type: String, required: true, maxlength: 6 }, // Used for UDIN
  auditor_pan: { type: String, required: true, maxlength: 10, uppercase: true }, // [A-Z]{5}[0-9]{4}[A-Z]
  
  address: { type: String, required: true, maxlength: 250 },
  city: { type: String, required: true },
  state: { type: String, required: true },
  pincode: { type: String, required: true, maxlength: 6 },
  
  email: { type: String, required: true, maxlength: 100, lowercase: true }, // Admin/Manager only
  mobile: { type: String, required: true, maxlength: 10 }, // Admin/Manager only
  alternate_contact: { type: String, maxlength: 15 },
  
  peer_review_no: { type: String, maxlength: 20 },
  peer_review_valid_till: { type: Date }, // Alert 30 days before expiry
  
  is_internal: { type: Boolean, required: true, default: false }, // TRUE if TaxBucket's own CA
  notes: { type: String, maxlength: 500 },
  
  is_active: { type: Boolean, required: true, default: true }, // Soft delete flag
  
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

export default mongoose.model('Auditor', auditorSchema);