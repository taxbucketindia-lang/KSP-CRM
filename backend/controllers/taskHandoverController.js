import TaskHandover from '../models/TaskHandover.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { isAdminOrAbove } from '../utils/roles.js';

const HANDOVER_LINK = '/taskhandover';

const populateHandover = (query) => query
  .populate('assignedBy', 'name empId role')
  .populate('assignedTo', 'name empId role')
  .populate('clientMasterId', 'clientId name pan')
  .populate('updates.updatedBy', 'name role');

const sameUser = (a, b) => String(a?._id || a) === String(b?._id || b);

// Assignee ke purane hourly reminders hata do (taaki notification list na bhare)
const clearReminders = (handoverId) => Notification.deleteMany({ handover: handoverId, kind: 'handover-reminder' });

// Task Create Karein (Koi bhi -> Koi bhi: Employee, Admin ya CEO)
export const createTaskHandover = async (req, res) => {
  try {
    const { title, description, assignedTo, clientMasterId, priority } = req.body;

    if (!title?.trim() || !description?.trim() || !assignedTo) {
      return res.status(400).json({ success: false, message: "Title, description and assignee are required." });
    }
    if (sameUser(assignedTo, req.user)) {
      return res.status(400).json({ success: false, message: "You cannot hand over a task to yourself." });
    }

    const assignee = await User.findById(assignedTo).select('name status');
    if (!assignee || assignee.status === 'Inactive') {
      return res.status(400).json({ success: false, message: "Selected person is not an active user." });
    }

    const newTask = await TaskHandover.create({
      title: title.trim(),
      description: description.trim(),
      assignedBy: req.user._id, // Logged-in user
      assignedTo,
      clientMasterId: clientMasterId || null,
      priority: priority || 'Medium',
      status: 'Pending',
      awaitingResponse: true,
      lastReminderAt: new Date()
    });

    // 🔔 Jisko task mila use turant notification
    await Notification.create({
      recipient: assignedTo,
      title: '📌 New Task Handed Over To You',
      message: `${req.user.name} (${req.user.role}) handed over: "${newTask.title}". Please update it.`,
      link: HANDOVER_LINK,
      handover: newTask._id,
      kind: 'handover-new'
    });

    const populatedTask = await populateHandover(TaskHandover.findById(newTask._id));

    res.status(201).json({ success: true, data: populatedTask, message: "Task handed over successfully!" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Logged-in user ke Tasks (jo use mile hain ya usne diye hain). CEO / Admin ?scope=all se sab dekh sakte hain
export const getMyHandovers = async (req, res) => {
  try {
    const userId = req.user._id;
    const seeAll = req.query.scope === 'all' && isAdminOrAbove(req.user);
    const filter = seeAll ? {} : { $or: [{ assignedBy: userId }, { assignedTo: userId }] };

    const tasks = await populateHandover(TaskHandover.find(filter)).sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: tasks });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Status ya Update / Reply Add Karein
export const updateTaskStatusOrAddRemark = async (req, res) => {
  try {
    const { status, remark } = req.body;
    const task = await TaskHandover.findById(req.params.id);

    if (!task) return res.status(404).json({ success: false, message: "Task not found" });

    const isAssignee = sameUser(task.assignedTo, req.user);
    const isAssigner = sameUser(task.assignedBy, req.user);
    if (!isAssignee && !isAssigner && !isAdminOrAbove(req.user)) {
      return res.status(403).json({ success: false, message: "You are not part of this task." });
    }

    const cleanRemark = remark?.trim();
    const statusChanged = status && status !== task.status;
    if (!statusChanged && !cleanRemark) {
      return res.status(400).json({ success: false, message: "Nothing to update." });
    }

    if (statusChanged) {
      task.updates.push({ updatedBy: req.user._id, message: `Status changed: ${task.status} → ${status}`, date: new Date() });
      task.status = status;
    }
    if (cleanRemark) {
      task.updates.push({ updatedBy: req.user._id, message: cleanRemark, date: new Date() });
    }

    // 🔴 REMINDER LOGIC
    if (task.status === 'Resolved' || isAssignee) {
      // Assignee ne update de diya (ya task resolve ho gaya): hourly reminder band
      task.awaitingResponse = false;
    } else if (statusChanged && task.status === 'Pending') {
      // Dene wale ne task wapas Pending (re-open) kiya: reminder dobara shuru
      task.awaitingResponse = true;
      task.lastReminderAt = new Date();
    }

    await task.save();
    if (!task.awaitingResponse) await clearReminders(task._id);

    // 🔔 Dusre person ko ek baar bata do ki update aaya hai
    const recipient = isAssignee ? task.assignedBy : task.assignedTo;
    if (!sameUser(recipient, req.user)) {
      await Notification.create({
        recipient,
        title: statusChanged ? `Task ${task.status}: ${task.title}` : `New update on: ${task.title}`,
        message: `${req.user.name} (${req.user.role}) ${statusChanged ? `changed the status to ${task.status}` : 'added an update'}${cleanRemark ? `: "${cleanRemark}"` : '.'}`,
        link: HANDOVER_LINK,
        handover: task._id,
        kind: 'handover-update'
      });
    }

    const updatedTask = await populateHandover(TaskHandover.findById(task._id));

    res.status(200).json({ success: true, data: updatedTask, message: "Task updated successfully!" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Galti se diya hua task hatana (sirf dene wala ya CEO / Admin)
export const deleteTaskHandover = async (req, res) => {
  try {
    const task = await TaskHandover.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: "Task not found" });

    if (!sameUser(task.assignedBy, req.user) && !isAdminOrAbove(req.user)) {
      return res.status(403).json({ success: false, message: "Only the person who assigned this task can delete it." });
    }

    await Notification.deleteMany({ handover: task._id });
    await task.deleteOne();

    res.status(200).json({ success: true, message: "Task deleted." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
