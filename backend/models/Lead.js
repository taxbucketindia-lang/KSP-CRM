// import mongoose from 'mongoose';

// const leadSchema = new mongoose.Schema({
//   leadId: { type: String, unique: true },
//   date: { type: Date, default: Date.now },
//   source: { 
//     type: String, 
//     enum: ['FB', 'Insta', 'Google', 'Walk-in', 'Reference', 'BA', 'Website', 'WhatsApp', 'Other'] 
//   },
//   // Nayi field BA link karne ke liye
//   referredByBA: { 
//     type: mongoose.Schema.Types.ObjectId, 
//     ref: 'BA', 
//     default: null 
//   },
//   name: { type: String, required: true },
//   mobile: { type: Number, required: true },
//   email: { type: String },
//   queryService: [{ type: String }],
//   status: { 
//     type: String, 
//     enum: ['New', 'Contacted', 'Interested', 'Follow-up', 'Proposal', 'Negotiation', 'Converted', 'Lost', 'Not Interested'],
//     default: 'New'
//   },
//   referenceName: { type: String, default: '' },
//   otherSourceName: { type: String, default: '' },
//   priority: { type: String, enum: ['Hot', 'Warm', 'Cold'], default: 'Warm' },
//   nextFollowUpDate: { type: Date }, 
//   remarks: { type: String },
//   assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
// }, { timestamps: true });


// // Auto-generate Lead ID
// leadSchema.pre('save', async function() {
//   if (!this.leadId) {
//     const count = await this.constructor.countDocuments();
//     this.leadId = `L-${1000 + count + 1}`;
//   }
// });

// // AUTOMATIC BA UPDATE MAGIC: Jaise hi lead save hogi, BA me ID push ho jayegi
// leadSchema.post('save', async function(doc) {
//   if (doc.source === 'BA' && doc.referredByBA) {
//     await mongoose.model('BA').findByIdAndUpdate(
//       doc.referredByBA,
//       { $addToSet: { referredLeads: doc._id } } // $addToSet duplicate entry hone se rokta hai
//     );
//   }
// });

// export default mongoose.model('Lead', leadSchema);








import mongoose from 'mongoose';

const leadSchema = new mongoose.Schema({
  leadId: { type: String, unique: true },
  date: { type: Date, default: Date.now },
  source: { 
    type: String, 
    enum: ['FB', 'Insta', 'Google', 'Walk-in', 'Reference', 'BA', 'Website', 'WhatsApp', 'Other'] 
  },
  referredByBA: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'BA', 
    default: null 
  },
  name: { type: String, required: true },
  mobile: { type: Number, required: true },
  email: { type: String },
  queryService: [{ type: String }],
  status: { 
    type: String, 
    enum: ['New', 'Contacted', 'Interested', 'Follow-up', 'Proposal', 'Negotiation', 'Converted', 'Lost', 'Not Interested'],
    default: 'New'
  },
  referenceName: { type: String, default: '' },
  otherSourceName: { type: String, default: '' },
  priority: { type: String, enum: ['Hot', 'Warm', 'Cold'], default: 'Warm' },
  nextFollowUpDate: { type: Date }, 
  remarks: { type: String },
  
  // 🔴 NAYA FIELD: Lead create karne wale ka record
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

leadSchema.pre('save', async function() {
  if (!this.leadId) {
    const count = await this.constructor.countDocuments();
    this.leadId = `L-${1000 + count + 1}`;
  }
});

leadSchema.post('save', async function(doc) {
  if (doc.source === 'BA' && doc.referredByBA) {
    await mongoose.model('BA').findByIdAndUpdate(
      doc.referredByBA,
      { $addToSet: { referredLeads: doc._id } } 
    );
  }
});

export default mongoose.model('Lead', leadSchema);