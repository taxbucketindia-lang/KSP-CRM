import mongoose from 'mongoose';

export const DEV_STATUSES = ['Backlog', 'Start', 'In Progress', 'Testing / Review', 'Completed'];
export const DEV_TYPES = ['Bug Fix', 'New Feature', 'UI Improvement', 'Database Optimization', 'Other'];
export const DEV_PRIORITIES = ['Urgent', 'High', 'Medium', 'Low'];
export const DEV_ENVIRONMENTS = ['', 'Local', 'Staging', 'Production'];

// Remarks ke liye sub-schema (Employee Name, ID, Date, Msg)
const remarkSchema = new mongoose.Schema({
  employeeName: { type: String, required: true },
  employeeId: { type: String, required: true },
  message: { type: String, required: true },
  status: { type: String, default: '' }, // Is update ke waqt task ka status (CEO activity feed ke liye)
  hours: { type: Number, default: 0 },   // Is update me kitne ghante kaam hua
  date: { type: Date, default: Date.now }
});

// Checklist: task ke chhote-chhote steps / acceptance points
const checklistSchema = new mongoose.Schema({
  text: { type: String, required: true, trim: true },
  done: { type: Boolean, default: false }
});

const devTaskSchema = new mongoose.Schema({
  // Chhota number (DEV-12) taaki commit / branch / baat-cheet me task ka naam lena aasan ho
  taskNo: { type: Number, index: true },
  title: { type: String, required: true },
  taskType: { type: String, enum: DEV_TYPES, default: 'New Feature' },
  priority: { type: String, enum: DEV_PRIORITIES, default: 'Medium' },
  module: { type: String, required: true }, // e.g., ITR, GST, Invoice, HR
  description: { type: String, required: true },
  attachmentUrl: { type: String, default: '' }, // Screenshot/Image URL
  assignedTo: { type: String, required: true },
  // 🔴 Kisne assign kiya (CEO Dashboard ke leaderboard / activity feed ke liye)
  assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assignedByName: { type: String, default: '' },
  startDate: { type: Date },
  dueDate: { type: Date },
  estimatedHours: { type: Number, default: 0 },
  status: { type: String, enum: DEV_STATUSES, default: 'Backlog' },

  // 🔴 DEVELOPER KE KAAM KI CHEEZEIN
  environment: { type: String, enum: DEV_ENVIRONMENTS, default: '' }, // Kahan dikkat hai / kahan deploy hona hai
  pageUrl: { type: String, default: '' },      // Kis page / screen / API par kaam hai
  branchName: { type: String, default: '' },   // Git branch
  prLink: { type: String, default: '' },       // Pull request / commit ka link
  checklist: [checklistSchema],
  hoursSpent: { type: Number, default: 0 },    // Ab tak kitne ghante lage (har update se judta hai)
  isBlocked: { type: Boolean, default: false },
  blockedReason: { type: String, default: '' },
  startedAt: { type: Date },                   // Pehli baar kaam kab shuru hua
  completedAt: { type: Date },

  remarks: [remarkSchema]
}, { timestamps: true });

const DevTask = mongoose.model('DevTask', devTaskSchema);
export default DevTask;
