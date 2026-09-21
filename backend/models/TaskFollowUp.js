import mongoose from 'mongoose';

const taskFollowUpSchema = new mongoose.Schema({
  task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
  clientId: { type: String, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  followUpDate: { type: Date, default: Date.now },
  mode: { type: String, enum: ['Call', 'WhatsApp', 'Email'], required: true },
  
  personContacted: { type: String, default: '' },
  purpose: { type: String, default: '' },
  response: { type: String, default: '' },
  
  nextFollowUpDate: { type: Date },
  status: { type: String, enum: ['Pending', 'Received', 'Closed'], default: 'Pending' },
  remarks: { type: String, default: '' }
}, { timestamps: true });

export default mongoose.model('TaskFollowUp', taskFollowUpSchema);