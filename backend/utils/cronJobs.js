import cron from 'node-cron';
import Todo from '../models/Todo.js';
import Notification from '../models/Notification.js';
import TaskHandover from '../models/TaskHandover.js';

const HOUR_MS = 60 * 60 * 1000;

// 🔴 TASK HANDOVER REMINDER: jis Pending task par assignee ne abhi tak koi update nahi diya,
// uske liye har ghante ek reminder notification (purana reminder hata kar naya, taaki list na bhare)
const sendHandoverReminders = async () => {
  const now = new Date();
  const dueBefore = new Date(now.getTime() - HOUR_MS);

  const pending = await TaskHandover.find({
    status: 'Pending',
    awaitingResponse: { $ne: false },
    $or: [
      { lastReminderAt: { $lte: dueBefore } },
      { lastReminderAt: { $exists: false }, createdAt: { $lte: dueBefore } }
    ]
  }).populate('assignedBy', 'name');

  for (const task of pending) {
    const hoursPending = Math.max(1, Math.floor((now - task.createdAt) / HOUR_MS));
    const waitingFor = hoursPending >= 24 ? `${Math.floor(hoursPending / 24)} day(s)` : `${hoursPending} hour(s)`;

    await Notification.deleteMany({ handover: task._id, kind: 'handover-reminder' });
    await Notification.create({
      recipient: task.assignedTo,
      title: '⏰ Pending Task Reminder',
      message: `"${task.title}" from ${task.assignedBy?.name || 'your team'} is waiting for your update since ${waitingFor}.`,
      link: '/taskhandover',
      handover: task._id,
      kind: 'handover-reminder'
    });

    await TaskHandover.updateOne({ _id: task._id }, { $set: { lastReminderAt: now }, $inc: { reminderCount: 1 } });
  }

  if (pending.length > 0) console.log(`🔔 Handover reminders sent: ${pending.length}`);
};

export const startCronJobs = () => {
  // Har 10 minute me check: jis task ka pichla reminder 1 ghanta purana ho gaya use naya reminder
  cron.schedule('*/10 * * * *', () => {
    sendHandoverReminders().catch(error => console.error("❌ Error running handover reminder cron job:", error.message));
  });

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
        const targetLink = ['Admin', 'CEO'].includes(userRole) ? '/ceo-panel' : '/todo';

        // Task ki aakhri date nikalo
        const taskEndDate = new Date(todo.endDate || todo.dueDate);
        taskEndDate.setHours(23, 59, 59, 999); 

        // Jab tak "Task End Date" nahi aati (Yaani task future me hai)
        if (now <= taskEndDate) {
          await Notification.deleteMany({ recipient: todo.userId._id, kind: 'todo-reminder', refId: String(todo._id) });
          await Notification.create({
            recipient: todo.userId._id, // User ki ID
            kind: 'todo-reminder',
            refId: String(todo._id),
            title: '⏰ To-Do Action Required',
            message: `Reminder: Your task "${todo.title}" is pending. Please complete it before ${taskEndDate.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}.`,
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