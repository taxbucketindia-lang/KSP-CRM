import Employee from '../models/Employee.js';
import Attendance from '../models/Attendance.js';
import Salary from '../models/Salary.js';
import User from '../models/User.js';

// ================= EMPLOYEES =================
export const createEmployee = async (req, res) => {
  try {
    const { email, password, role, ...hrData } = req.body;

    // 1. Check if login email already exists in system
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'A user with this email already exists' });
    }

    // 2. Generate EmpID: TB-EMP-XXX (Naya Bulletproof Logic)
    // Sabse latest employee dhundho
    const lastEmployee = await Employee.findOne({}, { empId: 1 }).sort({ createdAt: -1 });

    let nextNumber = 1;
    if (lastEmployee && lastEmployee.empId) {
        // "TB-EMP-003" se "003" nikal kar number banayenge
        const lastNumber = parseInt(lastEmployee.empId.split('-')[2], 10);
        if (!isNaN(lastNumber)) {
            nextNumber = lastNumber + 1; // Usme +1 add kar do
        }
    }
    
    // Nayi ID set karo (e.g., TB-EMP-004)
    const empId = `TB-EMP-${String(nextNumber).padStart(3, '0')}`;
    
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
    const updatedEmp = await Employee.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true }
    );
    res.json(updatedEmp);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteEmployee = async (req, res) => {
  try {
    // 1. Pehle employee dhundho
    const emp = await Employee.findById(req.params.id);
    if (!emp) return res.status(404).json({ message: 'Employee not found' });
    
    // 2. Employee se juda hua Login Account (User) bhi delete karo
    if (emp.userId) {
      await User.findByIdAndDelete(emp.userId);
    } else if (emp.email) {
       // Agar userId map nahi hua toh email se delete kardo
      await User.findOneAndDelete({ email: emp.email });
    }

    // 3. Main HR Employee record delete karo
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
    const employees = await Employee.find(filter).sort({ createdAt: -1 });
    res.json(employees);
  } catch (error) {
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
    
    // BulkWrite taaki ek employee ki ek mahine ki 2 slip na bane (Upsert)
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