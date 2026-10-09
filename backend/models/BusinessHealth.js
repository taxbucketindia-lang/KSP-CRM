import mongoose from 'mongoose';
import { INPUT_KEYS } from '../utils/businessHealthEngine.js';

// 🔴 Yeh module CLIENT ki company ke liye hai: client apni company lekar aata hai, hum uska data daal kar
// uski Business Health report banate hain. Isliye har record ek client + ek month ka hota hai.

// ================= 1. MONTHLY INPUT MASTER (ek client ke ek month ka ek hi record) =================
const inputFields = {};
// Khali field = null (zero aur "data nahi" alag cheezein hain: null par ratio "N/A" dikhta hai)
INPUT_KEYS.forEach(key => { inputFields[key] = { type: Number, default: null }; });

const auditSchema = new mongoose.Schema({
  action: { type: String, required: true }, // Created / Updated / Approved / Reopened
  by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  byName: String,
  at: { type: Date, default: Date.now },
  changes: [{ field: String, from: mongoose.Schema.Types.Mixed, to: mongoose.Schema.Types.Mixed }]
}, { _id: false });

const monthlySchema = new mongoose.Schema({
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'ClientMaster', required: true }, // Jis company ki report hai
  month: { type: String, required: true, match: /^\d{4}-(0[1-9]|1[0-2])$/ }, // "YYYY-MM"
  ...inputFields,
  remarks: { type: String, default: '' },

  // Approved (final) report read-only ho jati hai; sirf CEO / Admin dobara khol sakta hai
  status: { type: String, enum: ['Draft', 'Approved'], default: 'Draft' },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: { type: Date },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  auditLog: [auditSchema]
}, { timestamps: true });

// Ek client ke ek month ka dobara record na bane
monthlySchema.index({ client: 1, month: 1 }, { unique: true });

export const BusinessHealthMonthly = mongoose.model('BusinessHealthMonthly', monthlySchema);

// ================= 2. SETTINGS (thresholds + weights; code badle bina Admin badal sake) =================
const settingsSchema = new mongoose.Schema({
  key: { type: String, default: 'default', unique: true },
  thresholds: { type: mongoose.Schema.Types.Mixed, default: {} }, // { kpi_code: { green, yellow, direction } }
  weights: { type: mongoose.Schema.Types.Mixed, default: {} },    // { area: weight% }
  scoreBands: { green: { type: Number, default: 80 }, yellow: { type: Number, default: 60 } },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true, minimize: false });

export const BusinessHealthSettings = mongoose.model('BusinessHealthSettings', settingsSchema);

// ================= 3. RECOMMENDATIONS / ACTION PLAN (Red / Yellow KPI par client ke liye sujhav) =================
const actionSchema = new mongoose.Schema({
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'ClientMaster', required: true },
  month: { type: String, required: true },
  kpiCode: { type: String, default: '' },
  kpiName: { type: String, default: '' },
  kpiStatus: { type: String, default: '' },
  issue: { type: String, required: true },
  rootCause: { type: String, default: '' },
  action: { type: String, required: true },
  ownerName: { type: String, default: '' }, // Client ki company me zimmedar vyakti / department
  dueDate: { type: Date },
  status: { type: String, enum: ['Open', 'In Progress', 'Closed'], default: 'Open' },
  remarks: { type: String, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

export const ManagementAction = mongoose.model('ManagementAction', actionSchema);
