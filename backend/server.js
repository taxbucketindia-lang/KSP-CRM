import mongoose from 'mongoose';
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cron from 'node-cron'; // <-- Naya package import kiya
import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import leadRoutes from './routes/leadRoutes.js';
import clientRoutes from './routes/clientRoutes.js';
import activityRoutes from './routes/activityRoutes.js';
import baRoutes from './routes/baRoutes.js';
import Lead from './models/Lead.js'; // <-- Lead model import kiya DB check karne ke liye
import userRoutes from './routes/userRoutes.js';
import itrRoutes from './routes/itrRoutes.js';
import gstRoutes from './routes/gstRoutes.js';
import taskRoutes from './routes/taskRoutes.js';
import invoiceRoutes from './routes/invoiceRoutes.js';
import hrRoutes from './routes/hrRoutes.js';

dotenv.config();
connectDB();

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' })); 
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use(cors({
  origin: '*', // Ya aap apna specific frontend URL bhi de sakte hain
  credentials: true
}));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/bas', baRoutes);
app.use('/api/users', userRoutes);
app.use('/api/itr', itrRoutes);
app.use('/api/gst', gstRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/hr', hrRoutes);


// ==========================================
// CRON JOB FOR DAILY FOLLOW-UP REMINDERS
// Runs everyday automatically at 9:00 AM
// ==========================================
cron.schedule('0 9 * * *', async () => {
  try {
    console.log('Running daily check for follow-up reminders...');
    
    // Aaj ki start aur end timing set karni padegi DB search ke liye
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today (12:00 AM)

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1); // Start of tomorrow

    // Database me un leads ko dhundho jinka status Follow-up hai aur date aaj ki hai
    const pendingCalls = await Lead.find({
      status: 'Follow-up',
      nextFollowUpDate: { $gte: today, $lt: tomorrow }
    });

    if (pendingCalls.length > 0) {
      console.log(`🔔 REMINDER: You have ${pendingCalls.length} follow-up calls scheduled for today!`);
      // Future upgrade: Yahan aap Nodemailer ka code likh sakte ho jo Admin ko Email bhej dega
    } else {
      console.log('No follow-up calls for today.');
    }
  } catch (error) {
    console.error("Error in follow-up cron job:", error);
  }
});

mongoose.connection.once('open', async () => {
  try {
    await mongoose.connection.collection('users').dropIndex('username_1');
    console.log('✅ Old Username Lock Cleared!');
  } catch (error) {
    // Agar index pehle hi delete ho gaya hoga toh koi error nahi aayega
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));