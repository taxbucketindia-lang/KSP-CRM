import cron from 'node-cron';
import ClientMaster from '../models/ClientMaster.js';
import BirthdayLog from '../models/BirthdayLog.js';

export const startBirthdayCron = () => {
  console.log("🎂 Birthday Automation Engine Initialized.");

  // Har din subah 8:00 AM chalega: '0 8 * * *'
  cron.schedule('0 8 * * *', async () => {
     console.log("⏳ Running Daily Birthday Check...");
     const today = new Date();
     const currentMonth = today.getMonth();
     const currentDate = today.getDate();
     const currentYear = today.getFullYear();

     try {
         // Sirf Active clients jinki consent Yes hai
         const clients = await ClientMaster.find({ status: 'Active', birthdayWishConsent: true });
         
         let sentCount = 0;

         for (let client of clients) {
             if (!client.dob) continue; // DOB nahi hai toh skip

             const dob = new Date(client.dob);
             
             // Agar aaj birthday hai
             if (dob.getMonth() === currentMonth && dob.getDate() === currentDate) {
                 
                 // Check karo kahin is saal message jaa toh nahi chuka (No Duplicates)
                 const existingLog = await BirthdayLog.findOne({ client: client._id, birthdayYear: currentYear });
                 
                 if (!existingLog) {
                     // 🔴 YAHAN ACTUAL WHATSAPP API CALL HOGI
                     // Example: await axios.post('WHATSAPP_API_URL', { phone: client.mobile, msg: "Happy Birthday!" });
                     
                     // Message bhejne ke baad log save karo
                     await BirthdayLog.create({
                         client: client._id,
                         birthdayYear: currentYear,
                         channel: client.mobile ? 'WhatsApp' : 'Email',
                         status: 'Sent', 
                         sentAt: new Date()
                     });
                     sentCount++;
                 }
             }
         }
         console.log(`✅ Birthday Cron Finished. Sent automated wishes to ${sentCount} clients today.`);
     } catch (error) {
         console.error("❌ Birthday Cron Error:", error.message);
     }
  });
};