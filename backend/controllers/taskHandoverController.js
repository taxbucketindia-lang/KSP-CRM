import TaskHandover from '../models/TaskHandover.js';

// Task Create Karein (Employee 1 -> Employee 2)
export const createTaskHandover = async (req, res) => {
  try {
    const { title, description, assignedTo, clientMasterId, priority } = req.body;
    
    const newTask = await TaskHandover.create({
      title,
      description,
      assignedBy: req.user._id, // Logged-in employee
      assignedTo,
      clientMasterId: clientMasterId || null,
      priority: priority || 'Medium',
      status: 'Pending'
    });

    const populatedTask = await TaskHandover.findById(newTask._id)
      .populate('assignedBy', 'name empId role')
      .populate('assignedTo', 'name empId role');

    res.status(201).json({ success: true, data: populatedTask, message: "Task handed over successfully!" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Logged-in Employee ke Tasks Get Karein (Jo use mile hain ya usne diye hain)
export const getMyHandovers = async (req, res) => {
  try {
    const userId = req.user._id;
    const tasks = await TaskHandover.find({
      $or: [{ assignedBy: userId }, { assignedTo: userId }]
    })
      .populate('assignedBy', 'name empId role')
      .populate('assignedTo', 'name empId role')
      .populate('clientMasterId', 'clientId name pan')
      .sort({ createdAt: -1 });

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

    if (status) task.status = status;
    if (remark) {
      task.updates.push({
        updatedBy: req.user._id,
        message: remark,
        date: new Date()
      });
    }

    await task.save();

    const updatedTask = await TaskHandover.findById(task._id)
      .populate('assignedBy', 'name empId role')
      .populate('assignedTo', 'name empId role');

    res.status(200).json({ success: true, data: updatedTask, message: "Task updated successfully!" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};