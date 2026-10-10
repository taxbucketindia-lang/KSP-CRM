import DevTask, { DEV_STATUSES, DEV_TYPES, DEV_PRIORITIES, DEV_ENVIRONMENTS } from '../models/DevTask.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { isAdminOrAbove } from '../utils/roles.js';

const text = (value, max = 500) => String(value ?? '').trim().slice(0, max);
const hoursValue = (value) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.round(number * 100) / 100 : 0;
};
const dateValue = (value) => {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

// Kaun kya kar sakta hai:
// - Task jisko mila hai (assignee) wo progress update karta hai
// - Task jisne diya (ya Admin / CEO) wo edit, re-assign aur delete kar sakta hai
const isAssignee = (user, task) => !!task.assignedTo && [user.name, user.username].filter(Boolean).includes(task.assignedTo);
const isManager = (user, task) => isAdminOrAbove(user) || (task.assignedBy && String(task.assignedBy) === String(user._id));

// Checklist: form se "har line ek point" ya [{ text, done }] dono chalte hain
const readChecklist = (value, existing = []) => {
  const lines = Array.isArray(value) ? value : String(value || '').split('\n');
  return lines
    .map(item => (typeof item === 'string' ? { text: item } : item))
    .map(item => ({ text: text(item?.text, 200), done: !!item?.done }))
    .filter(item => item.text)
    .slice(0, 30)
    // Pehle se tick kiya hua point dobara likhne par untick na ho
    .map(item => ({ ...item, done: item.done || existing.some(old => old.text === item.text && old.done) }));
};

// Form ke sirf wahi fields jo badle ja sakte hain (status / remarks / assignedBy yahan se nahi badalte)
const readDetails = (body, existing) => {
  const data = {};
  if (body.title !== undefined) data.title = text(body.title, 200);
  if (body.module !== undefined) data.module = text(body.module, 80);
  if (body.description !== undefined) data.description = text(body.description, 5000);
  if (body.assignedTo !== undefined) data.assignedTo = text(body.assignedTo, 100);
  if (DEV_TYPES.includes(body.taskType)) data.taskType = body.taskType;
  if (DEV_PRIORITIES.includes(body.priority)) data.priority = body.priority;
  if (DEV_ENVIRONMENTS.includes(body.environment)) data.environment = body.environment;
  if (body.estimatedHours !== undefined) data.estimatedHours = hoursValue(body.estimatedHours);
  if (body.startDate !== undefined) data.startDate = dateValue(body.startDate) || null;
  if (body.dueDate !== undefined) data.dueDate = dateValue(body.dueDate) || null;
  if (body.pageUrl !== undefined) data.pageUrl = text(body.pageUrl, 300);
  if (body.branchName !== undefined) data.branchName = text(body.branchName, 120);
  if (body.prLink !== undefined) data.prLink = text(body.prLink, 300);
  if (body.attachmentUrl !== undefined) data.attachmentUrl = text(body.attachmentUrl, 500);
  if (body.checklist !== undefined) data.checklist = readChecklist(body.checklist, existing?.checklist || []);
  return data;
};

const findUserByName = (name) => User.findOne({ $or: [{ name }, { username: name }] });

const notify = async (recipientId, title, message) => {
  if (!recipientId) return;
  try {
    await Notification.create({ recipient: recipientId, title, kind: 'devtask', message, link: '/it/dev-task' });
  } catch (error) {
    console.error('DevTask notification failed:', error.message);
  }
};

const notifyAssignee = async (assignedTo, title, message) => {
  const assignedUser = await findUserByName(assignedTo);
  if (assignedUser) await notify(assignedUser._id, title, message);
};

const label = (task) => `${task.taskNo ? `DEV-${task.taskNo} ` : ''}"${task.title}"`;

// @route   POST /api/devtasks
export const createDevTask = async (req, res) => {
  try {
    const data = readDetails(req.body);
    if (!data.title || !data.module || !data.description || !data.assignedTo) {
      return res.status(400).json({ success: false, message: 'Title, module, description and developer are required' });
    }

    // Agla task number (DEV-1, DEV-2, ...)
    const last = await DevTask.findOne({ taskNo: { $gt: 0 } }).sort({ taskNo: -1 }).select('taskNo').lean();

    const newTask = await DevTask.create({
      ...data,
      taskNo: (last?.taskNo || 0) + 1,
      status: DEV_STATUSES.includes(req.body.status) ? req.body.status : 'Backlog',
      assignedBy: req.user._id,
      assignedByName: req.user.name
    });

    // 🔴 Task assign hone par turant Notification
    await notifyAssignee(newTask.assignedTo, '🚀 New Dev Task Assigned', `You have been assigned a new task: ${label(newTask)}. Please check your Dev Tasks panel.`);

    res.status(201).json({ success: true, data: newTask });
  } catch (error) {
    console.error("Error creating DevTask:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @route   GET /api/devtasks
export const getDevTasks = async (req, res) => {
  try {
    const tasks = await DevTask.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: tasks.length, data: tasks });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @route   POST /api/devtasks/:id/remarks  (sirf comment: status nahi badalta, koi bhi team member likh sakta hai)
export const addRemark = async (req, res) => {
  try {
    const message = text(req.body.message, 2000);
    if (!message) return res.status(400).json({ success: false, message: 'Please write a comment' });

    const task = await DevTask.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    task.remarks.push({ employeeName: req.user.name, employeeId: String(req.user._id), message, status: task.status });
    await task.save();

    // Comment kisi aur ne likha toh developer ko pata chale
    if (!isAssignee(req.user, task)) {
      await notifyAssignee(task.assignedTo, '💬 New Comment on Dev Task', `${req.user.name} commented on ${label(task)}: ${message.slice(0, 120)}`);
    }

    res.status(200).json({ success: true, data: task });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @route   PUT /api/devtasks/:id  (progress update: status, ghante, branch / PR, blocker)
export const updateDevTask = async (req, res) => {
  try {
    const { status, remarkMessage } = req.body;
    const task = await DevTask.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    if (!isAssignee(req.user, task) && !isManager(req.user, task)) {
      return res.status(403).json({ success: false, message: 'Only the assigned developer can update the progress of this task' });
    }

    const notes = [];
    const statusChanged = DEV_STATUSES.includes(status) && status !== task.status;
    if (statusChanged) {
      task.status = status;
      if (status !== 'Backlog' && !task.startedAt) task.startedAt = new Date();
      task.completedAt = status === 'Completed' ? new Date() : undefined;
    }

    const hours = hoursValue(req.body.hoursWorked);
    if (hours) task.hoursSpent = Math.round(((task.hoursSpent || 0) + hours) * 100) / 100;

    if (req.body.branchName !== undefined) task.branchName = text(req.body.branchName, 120);
    if (req.body.prLink !== undefined) {
      const prLink = text(req.body.prLink, 300);
      if (prLink && prLink !== task.prLink) notes.push(`PR / commit: ${prLink}`);
      task.prLink = prLink;
    }

    let blockerChanged = false;
    if (req.body.isBlocked !== undefined) {
      const isBlocked = !!req.body.isBlocked && task.status !== 'Completed';
      const reason = isBlocked ? text(req.body.blockedReason, 300) : '';
      if (isBlocked && !reason) return res.status(400).json({ success: false, message: 'Please write what is blocking this task' });
      blockerChanged = isBlocked !== task.isBlocked;
      if (blockerChanged) notes.push(isBlocked ? `Blocked: ${reason}` : 'Blocker cleared');
      task.isBlocked = isBlocked;
      task.blockedReason = reason;
    }
    if (task.status === 'Completed' && task.isBlocked) { task.isBlocked = false; task.blockedReason = ''; }

    // Har update ek remark ke roop me save hota hai (kisne, kab, kis status par) taaki CEO feed me dikhe
    const message = [text(remarkMessage, 2000), ...notes].filter(Boolean).join('\n');
    if (message || statusChanged || hours) {
      task.remarks.push({
        employeeName: req.user.name,
        employeeId: String(req.user._id),
        message: message || (statusChanged ? `Status changed to ${task.status}` : `Logged ${hours} hrs`),
        status: task.status,
        hours
      });
    }

    await task.save();

    // Task dene wale ko batao: review ke liye aaya, poora hua, ya atak gaya
    const byAssigner = task.assignedBy && String(task.assignedBy) === String(req.user._id);
    if (!byAssigner) {
      if (statusChanged && task.status === 'Testing / Review') await notify(task.assignedBy, '🧪 Dev Task Ready for Review', `${req.user.name} moved ${label(task)} to Testing / Review.`);
      else if (statusChanged && task.status === 'Completed') await notify(task.assignedBy, '✅ Dev Task Completed', `${req.user.name} completed ${label(task)}.`);
      if (blockerChanged && task.isBlocked) await notify(task.assignedBy, '⛔ Dev Task Blocked', `${label(task)} is blocked: ${task.blockedReason}`);
    }

    res.status(200).json({ success: true, data: task });
  } catch (error) {
    console.error("Error updating DevTask:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @route   PUT /api/devtasks/:id/checklist/:itemId  (checklist ka ek point tick / untick)
export const toggleChecklistItem = async (req, res) => {
  try {
    const task = await DevTask.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    if (!isAssignee(req.user, task) && !isManager(req.user, task)) {
      return res.status(403).json({ success: false, message: 'Only the assigned developer can update this checklist' });
    }
    const item = task.checklist.id(req.params.itemId);
    if (!item) return res.status(404).json({ success: false, message: 'Checklist item not found' });

    item.done = !!req.body.done;
    await task.save();
    res.status(200).json({ success: true, data: task });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @route   PUT /api/devtasks/:id/edit
export const updateTaskDetails = async (req, res) => {
  try {
    const task = await DevTask.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    if (!isManager(req.user, task)) {
      return res.status(403).json({ success: false, message: 'Only the person who assigned this task (or Admin) can edit it' });
    }

    const data = readDetails(req.body, task);
    if (data.title === '' || data.module === '' || data.description === '' || data.assignedTo === '') {
      return res.status(400).json({ success: false, message: 'Title, module, description and developer cannot be empty' });
    }

    // Kisi aur ko re-assign hua toh history me likho (kisne kisko diya)
    const reassigned = data.assignedTo && data.assignedTo !== task.assignedTo;
    if (reassigned) {
      task.remarks.push({
        employeeName: req.user.name,
        employeeId: String(req.user._id),
        message: `Re-assigned from ${task.assignedTo} to ${data.assignedTo}`,
        status: task.status
      });
    }

    Object.assign(task, data);
    await task.save();

    if (reassigned) await notifyAssignee(task.assignedTo, '🚀 Dev Task Re-Assigned To You', `${req.user.name} assigned you ${label(task)}.`);

    res.status(200).json({ success: true, data: task });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @route   DELETE /api/devtasks/:id
export const deleteDevTask = async (req, res) => {
  try {
    const task = await DevTask.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    if (!isManager(req.user, task)) {
      return res.status(403).json({ success: false, message: 'Only the person who assigned this task (or Admin) can delete it' });
    }

    await task.deleteOne();
    res.status(200).json({ success: true, message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
