import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  empId: { type: String }, // unique: true hata diya gaya hai
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  
  // 🔴 NAYA FIX: Isko Array banaya gaya hai taaki multiple module access store ho sakein
  permissions: [{ type: String }], 
  
  role: {
    type: String,
    enum: ['Admin', 'Manager', 'Sales/Executive', 'Accounts', 'Developer'],
    default: 'Sales/Executive'
  },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' } 
}, { timestamps: true });

// Clean Async Hook for Password Hashing (No next() needed)
userSchema.pre('save', async function () {
  if (this.isModified('password')) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model('User', userSchema);