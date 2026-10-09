import cron from 'node-cron';
import Meeting from '../models/Meeting.js';
import Notification from '../models/Notification.js';

const MIN = 60 * 1000;
const IST_OFFSET = 5.5 * 60 * MIN;
const IST = 'Asia/Kolkata';

// Meeting wale din ka subah 9:30 (India time) ka instant
export const morningReminderTime = (startAt) => {
  const ist = new Date(new Date(startAt).getTime() + IST_OFFSET);
  return new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate(), 9, 30) - IST_OFFSET);
};

// Meeting banate / time badalte waqt: jo reminder ka time nikal chuka hai use "bheja hua" maan lo,
// taaki banate hi purane reminder ek saath na aa jayein
export const initialReminderFlags = (startAt, now = new Date()) => {
  const start = new Date(startAt).getTime();
  const morning = morningReminderTime(startAt).getTime();
  return {
    // Subah 9:30 se pehle ki meeting ke liye alag se subah wala reminder nahi (30 / 10 min wale kaafi hain)
    morningSent: now.getTime() >= morning || start <= morning,
    thirtyMinSent: now.getTime() >= start - 30 * MIN,
    tenMinSent: now.getTime() >= start - 10 * MIN
  };
};

const timeText = (date) => new Date(date).toLocaleTimeString('en-IN', { timeZone: IST, hour: '2-digit', minute: '2-digit' });

const notify = (meeting, title, message) => Notification.create({
  recipient: meeting.userId,
  title,
  message,
  link: '/ceo-panel',
  meeting: meeting._id,
  kind: 'meeting-reminder'
});

export const sendMeetingReminders = async (now = new Date()) => {
  // Sirf aane wale 24 ghante ki Scheduled meetings
  const meetings = await Meeting.find({
    status: 'Scheduled',
    startAt: { $gt: now, $lte: new Date(now.getTime() + 24 * 60 * MIN) }
  });

  for (const meeting of meetings) {
    const start = meeting.startAt.getTime();
    const flags = meeting.reminders || {};
    const where = meeting.location ? ` (${meeting.location})` : '';
    const label = `${meeting.type}: "${meeting.title}"`;
    const update = {};

    if (!flags.tenMinSent && now.getTime() >= start - 10 * MIN) {
      await notify(meeting, '🔔 Starting in 10 minutes', `${label} starts at ${timeText(meeting.startAt)}${where}.`);
      Object.assign(update, { 'reminders.tenMinSent': true, 'reminders.thirtyMinSent': true, 'reminders.morningSent': true });
    } else if (!flags.thirtyMinSent && now.getTime() >= start - 30 * MIN) {
      await notify(meeting, '⏰ Starting in 30 minutes', `${label} starts at ${timeText(meeting.startAt)}${where}.`);
      Object.assign(update, { 'reminders.thirtyMinSent': true, 'reminders.morningSent': true });
    } else if (!flags.morningSent && now.getTime() >= morningReminderTime(meeting.startAt).getTime()) {
      await notify(meeting, '📅 Today\'s Schedule', `You have a ${label} today at ${timeText(meeting.startAt)}${where}.`);
      update['reminders.morningSent'] = true;
    }

    if (Object.keys(update).length > 0) await Meeting.updateOne({ _id: meeting._id }, { $set: update });
  }
};

export const startMeetingReminderCron = () => {
  console.log("📅 Meeting Reminder Cron Initialized (9:30 AM, 30 min & 10 min before).");

  // Har minute check, taaki 30 / 10 minute wala reminder sahi time par jaye
  cron.schedule('* * * * *', () => {
    sendMeetingReminders().catch(error => console.error("❌ Meeting reminder cron error:", error.message));
  }, { timezone: IST });
};
