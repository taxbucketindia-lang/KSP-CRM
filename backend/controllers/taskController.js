import Task from '../models/Task.js';
import TaskActivity from '../models/TaskActivity.js';
import DailyWorkReport from '../models/DailyWorkReport.js';
import User from '../models/User.js';

// @desc    Get all Employees for Dropdown
// @route   GET /api/tasks/employees
export const getAllEmployees = async (req, res) => {
  try {
    // Sirf admin aur employees ko layega, clients ko hide karega
    const users = await User.find({ role: { $ne: 'Client' } }).select('name role empId');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all Tasks (Role Based)
// @route   GET /api/tasks
export const getTasks = async (req, res) => {
  try {
    let query = {};
    
    // 🔴 ROLE BASED ACCESS LOGIC
    if (req.user.role !== 'Admin') {
      // Agar user Admin nahi hai, toh use sirf wahi tasks dikhenge jo use assign huye hain
      query = { assignedTo: req.user._id };
    }

    const tasks = await Task.find(query)
      // 🔴 FIX: client populate hata diya kyunki ab clientName use ho raha hai direct
      .populate('assignedTo', 'name empId role')
      .populate('assignedBy', 'name')
      .populate('reviewer', 'name')
      .sort({ createdAt: -1 });
      
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a new Task
// @route   POST /api/tasks
export const createTask = async (req, res) => {
  try {
    // 🔴 AUTO-GENERATE TASK ID (TSK-1001)
    let nextIdCounter = 1001;
    const lastTask = await Task.findOne({ taskId: { $exists: true } }).sort({ createdAt: -1 });
    
    if (lastTask && lastTask.taskId) {
      const parts = lastTask.taskId.split('-');
      if (parts.length > 1 && !isNaN(parts[1])) {
        nextIdCounter = parseInt(parts[1]) + 1;
      }
    }
    const generatedTaskId = `TSK-${nextIdCounter}`;

    const newTask = new Task({
      ...req.body,
      taskId: generatedTaskId,
      assignedBy: req.user._id,
      // Default initial status
      currentStatus: 'Not Started'
    });

    const savedTask = await newTask.save();

    // Log the initial creation in Activity Logs
    await TaskActivity.create({
      task: savedTask._id,
      user: req.user._id,
      oldStatus: 'Created',
      newStatus: 'Not Started',
      remark: 'Task officially assigned to employee.'
    });

    res.status(201).json(savedTask);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Update Task Status (With Activity Logging)
// @route   PUT /api/tasks/:id/status
export const updateTaskStatus = async (req, res) => {
  try {
    const { currentStatus, pendingReason, nextFollowUpDate, remarks } = req.body;
    
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    // --- RULE #3 LOGIC ---
    if (currentStatus === 'Completed' && task.reviewer) {
      // Agar Reviewer assigned hai, toh Employee direct Completed nahi kar sakta
      if (req.user.role !== 'Admin' && req.user._id.toString() !== task.reviewer.toString()) {
        return res.status(403).json({ 
          message: "Review is mandatory! Please change status to 'Under Review'. Only the assigned reviewer or Admin can mark this as Completed." 
        });
      }
    }

    const oldStatus = task.currentStatus;

    task.currentStatus = currentStatus;
    task.pendingReason = pendingReason || task.pendingReason;
    task.nextFollowUpDate = nextFollowUpDate || task.nextFollowUpDate;
    
    // Output File Upload Handle (Agar form data ya S3 URL pass hua hai)
    if (req.body.outputFileUrl) {
      task.outputFileUrl = req.body.outputFileUrl;
      task.outputRequired = 'Yes';
    } else if (req.file) { 
      // Agar multer use kar rahe hain
      task.outputFileUrl = req.file.path;
      task.outputRequired = 'Yes';
    }

    if (remarks) {
      const dateStamp = new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit' });
      task.remarks = `${task.remarks || ''}\n\n📅 ${dateStamp} | 👤 ${req.user.name}\n💬 ${remarks}`;
    }

    const updatedTask = await task.save();

    if (oldStatus !== currentStatus) {
      await TaskActivity.create({
        task: updatedTask._id,
        user: req.user._id,
        oldStatus: oldStatus,
        newStatus: currentStatus,
        remark: remarks || `Status changed to ${currentStatus}`
      });
    }

    res.json(updatedTask);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Update Task Details
// @route   PUT /api/tasks/:id
export const updateTaskDetails = async (req, res) => {
  try {
    if (req.user.role !== 'Admin') return res.status(403).json({ message: "Only Admin can edit tasks" });
    
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const oldAssignee = task.assignedTo;
    
    // Update core fields
    task.assignedTo = req.body.assignedTo || task.assignedTo;
    task.priority = req.body.priority || task.priority;
    task.dueDate = req.body.dueDate || task.dueDate;
    task.taskDescription = req.body.taskDescription || task.taskDescription;
    task.reviewer = req.body.reviewer || task.reviewer;

    const updatedTask = await task.save();

    // Log if assignee changed
    if (oldAssignee.toString() !== task.assignedTo.toString()) {
       await TaskActivity.create({
        task: updatedTask._id,
        user: req.user._id,
        oldStatus: task.currentStatus,
        newStatus: task.currentStatus,
        remark: `Task re-assigned to new employee.`
      });
    }

    res.json(updatedTask);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Submit Daily Work Report (EOD)
// @route   POST /api/tasks/eod
export const submitEod = async (req, res) => {
  try {
    const newEod = new DailyWorkReport({
      ...req.body,
      employee: req.user._id
    });
    const savedEod = await newEod.save();
    res.status(201).json(savedEod);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get EOD Reports (Admin gets all, Employee gets own)
// @route   GET /api/tasks/eod
export const getEods = async (req, res) => {
  try {
    let query = {};
    if (req.user.role !== 'Admin') {
      query = { employee: req.user._id }; // Employee sirf apna EOD dekhega
    }
    const eods = await DailyWorkReport.find(query)
      .populate('employee', 'name role empId')
      .sort({ createdAt: -1 }); // Sabse naya pehle
      
    res.json(eods);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};