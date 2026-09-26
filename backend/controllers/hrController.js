import Employee from '../models/Employee.js';
import Attendance from '../models/Attendance.js';
import Salary from '../models/Salary.js';
import User from '../models/User.js';

// ================= EMPLOYEES =================
export const createEmployee = async (req, res) => {
  try {
    // 🔴 NAYA: empId ab frontend se aayega
    const { email, password, role, empId, ...hrData } = req.body;

    if (!empId) return res.status(400).json({ message: 'Employee ID is required.' });

    // 1. Check if EmpID already exists
    const empExists = await Employee.findOne({ empId });
    if (empExists) return res.status(400).json({ message: 'This Employee ID is already in use.' });

    // 2. Check if login email already exists in system
    if (email) {
        const userExists = await User.findOne({ email });
        if (userExists) return res.status(400).json({ message: 'A user with this email already exists.' });
    }
    
    // 3. Create Login Account for portal access
    const newUser = await User.create({
      name: hrData.name,
      email,
      password, // Password will be hashed in User model pre-save hook
      role: role || 'Sales/Executive',
      empId: empId // Link ID
    });

    // 4. Create HR Employee Record
    const newEmp = new Employee({ 
      ...hrData, 
      email, 
      empId,
      userId: newUser._id // Link to login user
    });
    
    await newEmp.save();
    
    res.status(201).json({ message: "Employee and Login Account created successfully!", data: newEmp });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const updateEmployee = async (req, res) => {
  try {
    // 🔴 NAYA: resetPassword variable ko nikal liya gaya hai
    const { role, email, resetPassword, ...employeeData } = req.body; 

    // 1. Employee table update
    const updatedEmp = await Employee.findByIdAndUpdate(
      req.params.id, 
      { email, ...employeeData }, 
      { new: true }
    );

    if (!updatedEmp) return res.status(404).json({ message: 'Employee not found' });

    // 2. User (Portal Login) table mein role, email, aur PASSWORD update karo
    const targetEmail = email || updatedEmp.email;
    
    // Bulletproof search (Agar userId missing hai toh email/empId se dhundh lega)
    let userDoc = await User.findOne({
       $or: [{ _id: updatedEmp.userId }, { email: targetEmail }, { empId: updatedEmp.empId }]
    });

    if (userDoc) {
      if (role) userDoc.role = role;
      if (email) userDoc.email = email;
      
      // 🔴 Password Reset Logic
      if (resetPassword) {
          userDoc.password = resetPassword; // Mongoose auto-hash kar dega
      }

      await userDoc.save();

      // Agar userId link tuta hua tha toh wapas jod do
      if (!updatedEmp.userId) {
          updatedEmp.userId = userDoc._id;
          await updatedEmp.save();
      }
    } else if (resetPassword) {
      // Agar user login nahi mila
      return res.status(404).json({ message: "Portal login account not found to reset password." });
    }

    res.json({ message: "Employee updated successfully", data: updatedEmp });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteEmployee = async (req, res) => {
  try {
    const emp = await Employee.findById(req.params.id);
    if (!emp) return res.status(404).json({ message: 'Employee not found' });
    
    if (emp.userId) {
      await User.findByIdAndDelete(emp.userId);
    } else if (emp.email) {
      await User.findOneAndDelete({ email: emp.email });
    }

    await Employee.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Employee and associated portal access deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getEmployees = async (req, res) => {
  try {
    const { company } = req.query;
    const filter = company ? { companyName: company } : {};
    
    const employees = await Employee.find(filter)
      .sort({ createdAt: -1 })
      .populate({ 
          path: 'userId', 
          select: 'role', 
          strictPopulate: false 
      }); 
      
    res.json(employees);
  } catch (error) {
    console.error("GET EMPLOYEES ERROR:", error.message);
    res.status(500).json({ message: error.message });
  }
};

// ================= ATTENDANCE =================
export const markAttendance = async (req, res) => {
  try {
    const records = req.body.records; 
    
    const ops = records.map(r => ({
      updateOne: {
        filter: { employee: r.employee, date: r.date },
        update: { $set: r },
        upsert: true
      }
    }));
    
    await Attendance.bulkWrite(ops);
    res.status(200).json({ message: 'Attendance & Locations saved successfully' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};  

export const getAttendance = async (req, res) => {
  try {
    const { company, employee } = req.query;
    const filter = {};
    if (company) filter.companyName = company;
    if (employee) filter.employee = employee;
    
    const records = await Attendance.find(filter).populate('employee', 'name empId');
    res.json(records);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ================= SALARY =================
export const generateSalary = async (req, res) => {
  try {
    const records = req.body.records; 
    
    const ops = records.map(r => ({
      updateOne: {
        filter: { employee: r.employee, monthYear: r.monthYear },
        update: { $set: r },
        upsert: true
      }
    }));
    
    await Salary.bulkWrite(ops);
    res.status(200).json({ message: 'Salary records saved successfully' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getSalaries = async (req, res) => {
  try {
    const { monthYear } = req.query;
    const filter = monthYear ? { monthYear } : {};
    
    const records = await Salary.find(filter).populate('employee', 'name empId');
    res.json(records);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};