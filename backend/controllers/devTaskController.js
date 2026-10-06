import DevTask from '../models/DevTask.js';

// @route   POST /api/devtasks
export const createDevTask = async (req, res) => {
  try {
    const newTask = await DevTask.create(req.body);
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

// @route   POST /api/devtasks/:id/remarks
export const addRemark = async (req, res) => {
  try {
    const { employeeName, employeeId, message } = req.body;
    const task = await DevTask.findById(req.params.id);
    
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    task.remarks.push({ employeeName, employeeId, message });
    await task.save();

    res.status(200).json({ success: true, data: task });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};