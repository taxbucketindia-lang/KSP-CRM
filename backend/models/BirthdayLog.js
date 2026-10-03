import mongoose from 'mongoose';

const birthdayLogSchema = new mongoose.Schema({
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'ClientMaster', required: true },
  birthdayYear: { type: Number, required: true }, // Duplicate bhejne se rokne ke liye
  channel: { type: String, enum: ['WhatsApp', 'Email', 'Manual', 'None'], required: true },
  
  templateUsed: { type: mongoose.Schema.Types.ObjectId, ref: 'BirthdayTemplate' },
  templateVersion: { type: Number },
  
  triggeredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Employee ne bheja ya Automation ne
  status: { type: String, enum: ['Pending', 'Sent', 'Delivered', 'Failed'], default: 'Pending' },
  
  apiResponse: { type: String }, // WhatsApp API ka response
  failureReason: { type: String }, // Agar error aaya toh reason
  remarks: { type: String }, // Optional user note
  
  sentAt: { type: Date }
}, { timestamps: true });

export default mongoose.model('BirthdayLog', birthdayLogSchema);