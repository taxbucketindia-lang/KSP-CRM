import cron from 'node-cron';
import Todo from '../models/Todo.js';
import Notification from '../models/Notification.js';

export const startCronJobs = () => {
  console.log("⏰ Task Reminder Cron Job Initialized.");

  // Har 2 ghante mein chalega: '0 */2 * * *'
  cron.schedule('0 */2 * * *', async () => {
    try {
      const now = new Date();
      
      // 1. Sirf 'Pending' tasks uthao
      const pendingTodos = await Todo.find({ status: 'Pending' });

      if (pendingTodos.length === 0) return;

      let remindersSent = 0;

      // 2. Har pending task check karo
      for (const todo of pendingTodos) {
        // Task ki aakhri date nikalo
        const taskEndDate = new Date(todo.endDate || todo.dueDate);
        taskEndDate.setHours(23, 59, 59, 999); // Din ka aakhri time

        // 🔴 CONDITION: Jab tak "Task End Date" nahi aati (Yaani task future me hai) 
        // tab tak har 2 ghante mein bhejega. Date nikalne ke baad band kar dega.
        if (now <= taskEndDate) {
          await Notification.create({
            recipient: todo.userId, // Sirf task assign hone wale employee ko jayega
            title: '⏰ To-Do Action Required',
            message: `Reminder: Your task "${todo.title}" is pending. Please complete it before ${taskEndDate.toLocaleDateString('en-IN')}.`,
            link: '/todo' // Click karne par To-Do page khulega
          });
          remindersSent++;
        }
      }

      console.log(`🔔 2-Hour Cron Run: Sent ${remindersSent} active task reminders.`);
    } catch (error) {
      console.error("❌ Error running todo reminder cron job:", error.message);
    }
  });
};