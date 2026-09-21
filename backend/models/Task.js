import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
  taskId: { type: String, unique: true }, 
  taskDate: { type: Date, default: Date.now, required: true },
  
  clientId: { type: String, required: true }, 
  clientName: { type: String, required: true }, 
  
  serviceCategory: { type: String, required: true }, 
  subService: { type: String, required: true }, 
  taskDescription: { type: String, required: true },
  
  assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  priority: { 
    type: String, 
    enum: ['Urgent', 'High', 'Medium', 'Low'], 
    default: 'Medium' 
  },
  
  // 🔴 NAYA FIELD: Task Complexity
  complexity: {
    type: String,
    enum: ['Simple', 'Medium', 'Complex', 'Critical'],
    default: 'Simple'
  },
  
  // 🔴 NAYE FIELDS: Start aur Completion tracking ke liye
  assignmentDate: { type: Date, default: Date.now },
  startDate: { type: Date },
  completionDate: { type: Date },
  
  dueDate: { type: Date, required: true },
  
  currentStatus: { 
    type: String, 
    enum: ['Not Started', 'In Progress', 'Pending Client', 'Pending Internal', 'Waiting for Documents', 'Under Review', 'Correction Required', 'Approved', 'Completed', 'Cancelled', 'On Hold'],
    default: 'Not Started' 
  },
  
  pendingReason: { type: String, default: '' },
  nextFollowUpDate: { type: Date },
  
  outputRequired: { type: String, enum: ['Yes', 'No'], default: 'No' },
  outputFileUrl: { type: String, default: '' }, 
  
  reviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewStatus: { type: String, enum: ['Pending', 'Approved', 'Correction Required'], default: 'Pending' },
  
  remarks: { type: String, default: '' }
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

// Virtual for Overdue check
taskSchema.virtual('isOverdue').get(function() {
  if (this.currentStatus === 'Completed' || this.currentStatus === 'Cancelled') return false;
  return this.dueDate && new Date() > new Date(this.dueDate);
});

export default mongoose.model('Task', taskSchema);