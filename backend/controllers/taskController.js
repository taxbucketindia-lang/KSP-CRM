import Task from '../models/Task.js';
import TaskActivity from '../models/TaskActivity.js';
import DailyWorkReport from '../models/DailyWorkReport.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { isCeo, getAssignError } from '../utils/roles.js';
import { can } from '../utils/permissions.js';

// 🔴 "Assign Task" right: task dena, edit / re-assign / delete karna aur sabke tasks dekhna.
// CEO ke paas hamesha hai; Admin ko CEO deta hai; employee ko Admin deta hai.
const canManageTasks = (user) => can(user, 'WORK_ASSIGN');

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
    if (!canManageTasks(req.user)) {
      // Jiske paas Assign Task ka right nahi, toh use sirf wahi tasks dikhenge jo use assign huye hain
      query = { assignedTo: req.user._id };
    }

    const tasks = await Task.find(query)
      .populate('assignedTo', 'name empId role')
      .populate('assignedBy', 'name role')
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

    // 🔴 Clean payload: Agar clientId nahi hai toh use empty/undefined kar dein taaki Mongoose validation fail na ho
    if (!canManageTasks(req.user)) return res.status(403).json({ message: "You do not have the right to assign tasks" });

    const taskData = { ...req.body };

    // 🔴 HIERARCHY: CEO -> Admin, Admin -> Employee
    const assignee = await User.findById(taskData.assignedTo).select('role');
    const assignError = getAssignError(req.user, assignee);
    if (assignError) return res.status(403).json({ message: assignError });

    if (!taskData.clientId) {
      delete taskData.clientId;
      delete taskData.clientName;
    }

    const newTask = new Task({
      ...taskData,
      taskId: generatedTaskId,
      assignedBy: req.user._id,
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

    // 🔴 NAYA CODE: EMPLOYEE KO NOTIFICATION BHEJO JAB NAYA TASK MILE
    if (savedTask.assignedTo) {
      await Notification.create({
        recipient: savedTask.assignedTo,
        title: 'New Task Assigned',
        kind: 'task-assigned',
        message: `${req.user.name} (${req.user.role}) has assigned you a new task: ${savedTask.taskTitle || savedTask.clientName || 'Internal Task'}`,
        link: '/work-management'
      });
    }

    res.status(201).json(savedTask);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Update Task Status (With Activity Logging)
// @route   PUT /api/tasks/:id/status
// export const updateTaskStatus = async (req, res) => {
//   try {
//     const { currentStatus, pendingReason, nextFollowUpDate, remarks } = req.body;
    
//     const task = await Task.findById(req.params.id);
//     if (!task) return res.status(404).json({ message: 'Task not found' });

//     // --- RULE #3 LOGIC ---
//     if (currentStatus === 'Completed' && task.reviewer) {
//       // Agar Reviewer assigned hai, toh Employee direct Completed nahi kar sakta
//       if (req.user.role !== 'Admin' && req.user._id.toString() !== task.reviewer.toString()) {
//         return res.status(403).json({ 
//           message: "Review is mandatory! Please change status to 'Under Review'. Only the assigned reviewer or Admin can mark this as Completed." 
//         });
//       }
//     }

//     const oldStatus = task.currentStatus;

//     task.currentStatus = currentStatus;
//     task.pendingReason = pendingReason || task.pendingReason;
//     task.nextFollowUpDate = nextFollowUpDate || task.nextFollowUpDate;
    
//     // Output File Upload Handle (Agar form data ya S3 URL pass hua hai)
//     if (req.body.outputFileUrl) {
//       task.outputFileUrl = req.body.outputFileUrl;
//       task.outputRequired = 'Yes';
//     } else if (req.file) { 
//       task.outputFileUrl = req.file.path;
//       task.outputRequired = 'Yes';
//     }

//     if (remarks) {
//       const dateStamp = new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit' });
//       task.remarks = `${task.remarks || ''}\n\n📅 ${dateStamp} | 👤 ${req.user.name}\n💬 ${remarks}`;
//     }

//     const updatedTask = await task.save();

//     if (oldStatus !== currentStatus) {
//       await TaskActivity.create({
//         task: updatedTask._id,
//         user: req.user._id,
//         oldStatus: oldStatus,
//         newStatus: currentStatus,
//         remark: remarks || `Status changed to ${currentStatus}`
//       });
//     }

//     res.json(updatedTask);
//   } catch (error) {
//     res.status(400).json({ message: error.message });
//   }
// };
// @desc    Update Task Status (With Activity Logging)
// @route   PUT /api/tasks/:id/status
export const updateTaskStatus = async (req, res) => {
  try {
    // 🔴 1. Yahan destructuring mein 'govStatus' add karein
    const { currentStatus, govStatus, pendingReason, nextFollowUpDate, remarks } = req.body; 
    
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    // --- RULE #3 LOGIC ---
    if (currentStatus === 'Completed' && task.reviewer) {
      if (!canManageTasks(req.user) && req.user._id.toString() !== task.reviewer.toString()) {
        return res.status(403).json({ 
          message: "Review is mandatory! Please change status to 'Under Review'." 
        });
      }
    }

    const oldStatus = task.currentStatus;

    task.currentStatus = currentStatus;
    
    // 🔴 2. YAHAN NAYI LINE ADD KAREIN taaki database me save ho
    if (govStatus !== undefined) {
      task.govStatus = govStatus;
    }
    
    task.pendingReason = pendingReason || task.pendingReason;
    task.nextFollowUpDate = nextFollowUpDate || task.nextFollowUpDate;
    
    // Output File Upload Handle (Agar form data ya S3 URL pass hua hai)
    if (req.body.outputFileUrl) {
      task.outputFileUrl = req.body.outputFileUrl;
      task.outputRequired = 'Yes';
    } else if (req.file) { 
      task.outputFileUrl = req.file.path;
      task.outputRequired = 'Yes';
    }

    if (remarks) {
      const dateStamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit' });
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
    if (!canManageTasks(req.user)) return res.status(403).json({ message: "You do not have the right to edit tasks" });
    
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const oldAssignee = task.assignedTo;

    // Re-assign par bhi wahi hierarchy rule lagega
    if (req.body.assignedTo && req.body.assignedTo.toString() !== oldAssignee?.toString()) {
      const assignee = await User.findById(req.body.assignedTo).select('role');
      const assignError = getAssignError(req.user, assignee);
      if (assignError) return res.status(403).json({ message: assignError });
    }
    
    // Update core fields
    task.taskTitle = req.body.taskTitle !== undefined ? req.body.taskTitle : task.taskTitle;
    task.assignedTo = req.body.assignedTo || task.assignedTo;
    task.priority = req.body.priority || task.priority;
    task.dueDate = req.body.dueDate || task.dueDate;
    task.taskDescription = req.body.taskDescription || task.taskDescription;
    task.reviewer = req.body.reviewer || task.reviewer;

    const updatedTask = await task.save();

    // Log if assignee changed
    if (oldAssignee && oldAssignee.toString() !== task.assignedTo.toString()) {
       await TaskActivity.create({
        task: updatedTask._id,
        user: req.user._id,
        oldStatus: task.currentStatus,
        newStatus: task.currentStatus,
        remark: `Task re-assigned to new employee.`
      });

      // 🔴 NAYA CODE: NAYE EMPLOYEE KO BHI NOTIFICATION BHEJO
      await Notification.create({
        recipient: task.assignedTo,
        title: 'Task Re-Assigned To You',
        kind: 'task-assigned',
        message: `A task has been re-assigned to you: ${task.taskTitle || task.clientName || 'Internal Task'}`,
        link: '/work-management'
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
    if (!canManageTasks(req.user)) {
      query = { employee: req.user._id };
    }
    const eods = await DailyWorkReport.find(query)
      .populate('employee', 'name role empId')
      .sort({ createdAt: -1 });
      
    res.json(eods);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// @desc    Delete a Task
// @route   DELETE /api/tasks/:id
export const deleteTask = async (req, res) => {
  try {
    if (!canManageTasks(req.user)) {
      return res.status(403).json({ message: "You do not have the right to delete tasks" });
    }
    const task = await Task.findById(req.params.id).populate('assignedBy', 'role');
    if (!task) return res.status(404).json({ message: "Task not found" });

    // CEO ka diya hua task Admin delete nahi kar sakta
    if (isCeo(task.assignedBy) && !isCeo(req.user)) {
      return res.status(403).json({ message: "Only the CEO can delete a task assigned by the CEO" });
    }
    await task.deleteOne();
    
    res.status(200).json({ message: "Task deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



// @desc    Get Paginated Tasks (Server-side Pagination)
// @route   GET /api/tasks/paginated
export const getPaginatedTasks = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status, priority, employee, startDate, endDate } = req.query;

    let query = {};
    // Role based check
    if (!canManageTasks(req.user)) {
      query.assignedTo = req.user._id;
    }

    // Filters
    if (search) {
      query.$or = [
        { taskId: { $regex: search, $options: 'i' } },
        { taskTitle: { $regex: search, $options: 'i' } },
        { clientName: { $regex: search, $options: 'i' } }
      ];
    }

    if (status && status !== 'ALL') {
      if (status === 'OVERDUE') {
         query.dueDate = { $lt: new Date() };
         query.currentStatus = { $nin: ['Completed', 'Cancelled'] };
      } else {
         query.currentStatus = status;
      }
    }

    if (priority && priority !== 'ALL') query.priority = priority;
    if (employee && employee !== 'ALL') query.assignedTo = employee;

    if (startDate || endDate) {
      query.taskDate = {};
      if (startDate) query.taskDate.$gte = new Date(startDate);
      if (endDate) {
         let ed = new Date(endDate);
         ed.setHours(23, 59, 59, 999);
         query.taskDate.$lte = ed;
      }
    }

    // Kitne task skip karne hain
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const tasks = await Task.find(query)
      .populate('assignedTo', 'name empId role')
      .populate('assignedBy', 'name role')
      .populate('reviewer', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalCount = await Task.countDocuments(query);

    // Global Stats (KPI Cards ke liye)
    let statQuery = !canManageTasks(req.user) ? { assignedTo: req.user._id } : {};
    const total = await Task.countDocuments(statQuery);
    const inProgress = await Task.countDocuments({ ...statQuery, currentStatus: 'In Progress' });
    const pendingClient = await Task.countDocuments({ ...statQuery, currentStatus: 'Pending Client' });
    const underReview = await Task.countDocuments({ ...statQuery, currentStatus: 'Under Review' });
    const completed = await Task.countDocuments({ ...statQuery, currentStatus: 'Completed' });

    res.json({
      tasks,
      totalPages: Math.ceil(totalCount / parseInt(limit)),
      currentPage: parseInt(page),
      stats: { total, inProgress, pendingClient, underReview, completed }
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};