// import mongoose from 'mongoose';

// const baSchema = new mongoose.Schema({
//   baId: { type: String, unique: true },
//   name: { type: String, required: true },
//   contactPerson: { type: String },
//   mobile: { type: Number, required: true, unique: true },
//   email: { type: String },
//   city: { type: String },
//   district: { type: String },
//   state: { type: String },
//   businessType: { type: String },
//   baLevel: { type: String, default: 'Level 1 - Referral Associate' }, 
//   joiningDate: { type: Date, default: Date.now },
//   status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
//   assignedRM: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
//   remarks: { type: String }
// }, { timestamps: true });

// // Auto-generate BA ID (e.g., BA-1001)
// baSchema.pre('save', async function() {
//   if (!this.baId) {
//     const count = await mongoose.model('BA').countDocuments();
//     this.baId = `BA-${1000 + count + 1}`;
//   }
//   // next(); <-- Isko hta dena hai kyunki async function automatically resolve ho jata hai
// });

// export default mongoose.model('BA', baSchema);











import mongoose from 'mongoose';

const baSchema = new mongoose.Schema({
  baId: { type: String, unique: true },
  name: { type: String, required: true },
  contactPerson: { type: String },
  mobile: { type: Number, required: true, unique: true },
  email: { type: String },
  city: { type: String },
  district: { type: String },
  state: { type: String },
  businessType: { type: String },
  baLevel: { type: String, default: 'Level 1 - Referral Associate' }, 
  joiningDate: { type: Date, default: Date.now },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  assignedRM: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  remarks: { type: String },
  
  // NAYE ARRAYS: Ye dono arrays Lead aur Client schema se automatically update honge
  referredLeads: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Lead' 
  }],
  convertedClients: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Client' 
  }]
}, { timestamps: true });

// Auto-generate BA ID (e.g., BA-1001)
baSchema.pre('save', async function() {
  if (!this.baId) {
    const count = await mongoose.model('BA').countDocuments();
    this.baId = `BA-${1000 + count + 1}`;
  }
});

export default mongoose.model('BA', baSchema);