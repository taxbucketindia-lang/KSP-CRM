import DevTask from '../models/DevTask.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';

// @route   POST /api/devtasks
// export const createDevTask = async (req, res) => {
//   try {
//     const newTask = await DevTask.create(req.body);
//     res.status(201).json({ success: true, data: newTask });
//   } catch (error) {
//     console.error("Error creating DevTask:", error);
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

export const createDevTask = async (devReq, res) => {
  try {
    const { title, assignedTo } = devReq.body;
    const newTask = await DevTask.create({
      ...devReq.body,
      assignedBy: devReq.user._id,
      assignedByName: devReq.user.name
    });

    // 🔴 Task assign hone par turant Notification bhejne ka logic
    if (assignedTo) {
      // User table se us developer ko dhundho jisko task assign hua hai
      const assignedUser = await User.findOne({ 
        $or: [{ name: assignedTo }, { username: assignedTo }] 
      });

      if (assignedUser) {
        const userRole = assignedUser.role || 'Employee';
        // Role ke hisaab se link set kar sakte hain (jaise aapne example me kiya)
        const targetLink = ['Admin', 'CEO'].includes(userRole) ? '/ceo-panel' : '/it/dev-task';

        await Notification.create({
          recipient: assignedUser._id, // Us employee ki ID
          title: '🚀 New Dev Task Assigned',
          message: `You have been assigned a new task: "${title}". Please check your Dev Tasks panel.`,
          link: targetLink
        });
      }
    }

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


// @route   PUT /api/devtasks/:id
export const updateDevTask = async (req, res) => {
  try {
    const { status, remarkMessage, employeeName, employeeId } = req.body;
    const task = await DevTask.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    // Update Status
    const statusChanged = status && status !== task.status;
    if (status) {
      task.status = status;
    }

    // Har update ek remark ke roop me save hota hai (kisne, kab, kis status par) taaki CEO feed me dikhe
    if (remarkMessage || statusChanged) {
      task.remarks.push({
        employeeName: req.user?.name || employeeName || 'System',
        employeeId: String(req.user?._id || employeeId || 'Unknown'),
        message: remarkMessage || `Status changed to ${task.status}`,
        status: task.status
      });
    }

    await task.save();

    res.status(200).json({ success: true, data: task });
  } catch (error) {
    console.error("Error updating DevTask:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};


// @route   PUT /api/devtasks/:id/edit
export const updateTaskDetails = async (req, res) => {
  try {
    const existing = await DevTask.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Task not found' });

    const update = { ...req.body };
    // Kisi aur ko re-assign hua toh history me likho (kisne kisko diya)
    if (req.body.assignedTo && req.body.assignedTo !== existing.assignedTo) {
      update.$push = {
        remarks: {
          employeeName: req.user.name,
          employeeId: String(req.user._id),
          message: `Re-assigned from ${existing.assignedTo} to ${req.body.assignedTo}`,
          status: existing.status
        }
      };
    }

    const updatedTask = await DevTask.findByIdAndUpdate(
      req.params.id, 
      update, 
      { new: true, runValidators: true }
    );
    
    if (!updatedTask) return res.status(404).json({ success: false, message: 'Task not found' });
    
    res.status(200).json({ success: true, data: updatedTask });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @route   DELETE /api/devtasks/:id
export const deleteDevTask = async (req, res) => {
  try {
    const task = await DevTask.findByIdAndDelete(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    res.status(200).json({ success: true, message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};