import mongoose from 'mongoose';

const birthdayTemplateSchema = new mongoose.Schema({
  name: { type: String, required: true }, // e.g., "Standard WhatsApp Wish"
  channel: { type: String, enum: ['WhatsApp', 'Email'], required: true },
  messageBody: { type: String, required: true }, // Isme [Client Name] jaisa variable hoga
  isActive: { type: Boolean, default: true },
  version: { type: Number, default: 1 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

export default mongoose.model('BirthdayTemplate', birthdayTemplateSchema);