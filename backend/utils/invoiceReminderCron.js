import cron from 'node-cron';
import Invoice from '../models/Invoice.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';

export const startInvoiceReminderCron = () => {
  console.log("💰 Invoice Payment Reminder Cron Job Initialized.");

  // Har din subah 9:30 baje chalega
  cron.schedule('30 9 * * *', async () => {
    console.log("⏳ Running Daily Invoice Payment Reminders...");

    try {
      // 1. Un invoices ko dhundo jinka alert ON hai aur payment 'Paid' NAHI hai
      const pendingInvoices = await Invoice.find({ 
        dailyAlert: true, 
        paymentStatus: { $ne: 'Paid' } 
      }).populate('customer');

      if (pendingInvoices.length === 0) return;

      // 2. Sirf un Users ko dhundo jo Admin hain YA jinke paas Finance/Invoice ka access hai
      const targetUsers = await User.find({
        $or: [
          { role: { $in: ['Admin', 'CEO'] } },
          { permissions: { $in: ['FINANCE', 'INVOICE', 'INVOICES'] } }
        ]
      });

      if (targetUsers.length === 0) return;

      let notificationsCreated = 0;

      // 3. Har pending invoice ke liye notification bhejo
      for (const invoice of pendingInvoices) {
        const total = Number(invoice.totalAmountAfterTax || 0);
        const received = Number(invoice.amountReceived || 0);
        const due = total - received;

        // Double check: Agar galti se pura paisa aa gaya ho toh alert OFF kar do
        if (due <= 0) {
            await Invoice.findByIdAndUpdate(invoice._id, { dailyAlert: false, paymentStatus: 'Paid' });
            continue;
        }

        const clientName = invoice.customer?.name || invoice.clientName || 'Client';

        // Har Target User (Admin + Finance) ko notification push karo
        for (const user of targetUsers) {
          await Notification.deleteMany({ recipient: user._id, kind: 'invoice-reminder', refId: String(invoice._id) });
          await Notification.create({
            recipient: user._id,
            kind: 'invoice-reminder',
            refId: String(invoice._id),
            title: `💰 Payment Pending: ${clientName}`,
            message: `Invoice ${invoice.invoiceNo} has a pending balance of ₹${due.toLocaleString('en-IN')}. Please follow up.`,
            link: '/invoice-generator' // Click karne par Invoice page khulega
          });
          notificationsCreated++;
        }
      }

      console.log(`✅ Invoice Reminder Cron Finished. Sent ${notificationsCreated} alerts to Finance Team.`);
    } catch (error) {
      console.error("❌ Error in Invoice Reminder Cron:", error.message);
    }
  }, { timezone: 'Asia/Kolkata' });
};