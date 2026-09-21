import mongoose from 'mongoose';

const followUpSchema = new mongoose.Schema({
  referenceId: { 
    type: mongoose.Schema.Types.ObjectId, 
    required: true, 
    refPath: 'referenceModel' // Dynamic referencing (Client ya Lead)
  },
  referenceModel: { 
    type: String, 
    required: true, 
    enum: ['Lead', 'Client'] 
  },
  followUpDateTime: { type: Date, default: Date.now },
  mode: { 
    type: String, 
    enum: ['Call', 'WhatsApp', 'Email', 'Meeting'], 
    required: true 
  },
  discussion: { type: String, required: true },
  nextAction: { type: String },
  nextFollowUpDate: { type: Date },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

export default mongoose.model('FollowUp', followUpSchema);