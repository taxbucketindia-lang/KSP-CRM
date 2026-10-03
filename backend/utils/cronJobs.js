import cron from 'node-cron';
import Todo from '../models/Todo.js';
import Notification from '../models/Notification.js';

export const startCronJobs = () => {
  console.log("⏰ Task Reminder Cron Job Initialized.");

  // Har 2 ghante mein chalega: '0 */2 * * *' (Testing ke liye '* * * * *')
  cron.schedule('0 */2 * * *', async () => {
    try {
      const now = new Date();
      
      // 1. Pending tasks uthao aur uske owner ka Role bhi pata karo (.populate lagakar)
      const pendingTodos = await Todo.find({ status: 'Pending' }).populate('userId', 'role');

      if (pendingTodos.length === 0) return;

      let remindersSent = 0;

      // 2. Har pending task check karo
      for (const todo of pendingTodos) {
        
        // Owner ka role check karke Link set karo
        const userRole = todo.userId?.role || 'Employee';
        const targetLink = userRole === 'Admin' ? '/ceo-panel' : '/todo';

        // Task ki aakhri date nikalo
        const taskEndDate = new Date(todo.endDate || todo.dueDate);
        taskEndDate.setHours(23, 59, 59, 999); 

        // Jab tak "Task End Date" nahi aati (Yaani task future me hai)
        if (now <= taskEndDate) {
          await Notification.create({
            recipient: todo.userId._id, // User ki ID
            title: '⏰ To-Do Action Required',
            message: `Reminder: Your task "${todo.title}" is pending. Please complete it before ${taskEndDate.toLocaleDateString('en-IN')}.`,
            link: targetLink // 🔴 NAYA: Role ke hisaab se sahi page par bhejega
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