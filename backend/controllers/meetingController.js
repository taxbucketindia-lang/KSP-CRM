import Meeting from '../models/Meeting.js';
import Notification from '../models/Notification.js';
import { initialReminderFlags } from '../utils/meetingReminders.js';

const parseStart = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

// @desc    Logged-in user ki meetings (optional ?from=&to= date range)
// @route   GET /api/meetings
export const getMeetings = async (req, res) => {
  try {
    const filter = { userId: req.user._id };
    const from = req.query.from ? parseStart(req.query.from) : null;
    const to = req.query.to ? parseStart(req.query.to) : null;
    if (from || to) {
      filter.startAt = {};
      if (from) filter.startAt.$gte = from;
      if (to) filter.startAt.$lte = to;
    }

    const meetings = await Meeting.find(filter).sort({ startAt: 1 });
    res.json(meetings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route   POST /api/meetings
export const createMeeting = async (req, res) => {
  try {
    const { title, type, startAt, location, notes } = req.body;
    const start = parseStart(startAt);
    if (!title?.trim() || !start) return res.status(400).json({ message: 'Title, date and time are required.' });

    const meeting = await Meeting.create({
      userId: req.user._id,
      title: title.trim(),
      type: type || 'Meeting',
      startAt: start,
      location: location || '',
      notes: notes || '',
      reminders: initialReminderFlags(start)
    });

    res.status(201).json(meeting);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @route   PUT /api/meetings/:id
export const updateMeeting = async (req, res) => {
  try {
    const meeting = await Meeting.findOne({ _id: req.params.id, userId: req.user._id });
    if (!meeting) return res.status(404).json({ message: 'Meeting not found' });

    const { title, type, startAt, location, notes, status } = req.body;
    if (title !== undefined) meeting.title = String(title).trim() || meeting.title;
    if (type !== undefined) meeting.type = type;
    if (location !== undefined) meeting.location = location;
    if (notes !== undefined) meeting.notes = notes;
    if (status !== undefined) meeting.status = status;

    if (startAt !== undefined) {
      const start = parseStart(startAt);
      if (!start) return res.status(400).json({ message: 'Invalid date or time.' });
      // Date / time badla toh reminders naye time ke hisaab se dobara chalenge
      if (start.getTime() !== meeting.startAt.getTime()) {
        meeting.startAt = start;
        meeting.reminders = initialReminderFlags(start);
      }
    }

    await meeting.save();
    res.json(meeting);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @route   DELETE /api/meetings/:id
export const deleteMeeting = async (req, res) => {
  try {
    const meeting = await Meeting.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!meeting) return res.status(404).json({ message: 'Meeting not found' });

    await Notification.deleteMany({ meeting: meeting._id });
    res.json({ message: 'Meeting deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
