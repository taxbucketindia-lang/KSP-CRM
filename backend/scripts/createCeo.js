// CEO account banane / kisi existing user ko CEO banane ke liye one-time script
// Usage (backend folder se):
//   npm run create-ceo -- "CEO Name" ceo@example.com StrongPassword
// Agar us email ka user pehle se hai, toh uska role CEO kar diya jayega
// (password tabhi badlega jab aap naya password doge).
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';

dotenv.config();

const [name, email, password] = process.argv.slice(2);

if (!name || !email) {
  console.error('Usage: npm run create-ceo -- "CEO Name" ceo@example.com StrongPassword');
  process.exit(1);
}

try {
  await mongoose.connect(process.env.MONGO_URI);

  let user = await User.findOne({ email });

  if (user) {
    user.role = 'CEO';
    user.status = 'Active';
    if (password) user.password = password; // pre-save hook hash kar dega
    await user.save();
    console.log(`✅ Existing user "${user.name}" (${email}) is now CEO.`);
  } else {
    if (!password || password.length < 6) {
      console.error('❌ New CEO account ke liye kam se kam 6 characters ka password dena zaroori hai.');
      process.exit(1);
    }
    user = await User.create({ empId: 'CEO001', name, email, password, role: 'CEO', permissions: [] });
    console.log(`✅ CEO account created: ${user.name} (${email})`);
  }
} catch (error) {
  console.error('❌ Failed to create CEO:', error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
