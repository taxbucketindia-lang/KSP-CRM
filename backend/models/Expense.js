import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema({
  date: { 
    type: Date, 
    required: true,
    default: Date.now 
  },
  nature: { 
    type: String, 
    required: [true, 'Nature of expense is required'], 
    trim: true 
  },
  paidBy: { 
    type: String, 
    required: [true, 'Paid By name is required'], 
    trim: true 
  },
  amount: { 
    type: Number, 
    required: [true, 'Amount is required'], 
    min: [1, 'Amount must be at least 1'] 
  },
  remarks: { 
    type: String, 
    trim: true,
    default: '' 
  },
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' // Track karega ki entry kis employee/admin ne ki hai
  }
}, { timestamps: true });

export default mongoose.model('Expense', expenseSchema);