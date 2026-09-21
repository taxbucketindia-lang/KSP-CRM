import mongoose from 'mongoose';

const dailyWorkReportSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reportDate: { type: Date, default: Date.now },
  
  // Auto-calculated from tasks
  totalAssigned: { type: Number, default: 0 },
  totalCompleted: { type: Number, default: 0 },
  inProgress: { type: Number, default: 0 },
  pendingClient: { type: Number, default: 0 },
  underReview: { type: Number, default: 0 },
  overdue: { type: Number, default: 0 },
  
  // Manual Inputs
  followUpsDone: { type: Number, default: 0 },
  documentsCollected: { type: Number, default: 0 },
  majorAchievement: { type: String, default: '' },
  majorChallenge: { type: String, default: '' },
  supportRequired: { type: String, default: '' },
  tomorrowPriority: { type: String, default: '' },
  
  managerReview: { type: String, enum: ['Pending', 'Reviewed'], default: 'Pending' }
}, { timestamps: true });

export default mongoose.model('DailyWorkReport', dailyWorkReportSchema);