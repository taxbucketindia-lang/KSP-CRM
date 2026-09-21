import User from '../models/User.js';

// @desc    Get all employees
// @route   GET /api/users/employees
export const getEmployees = async (req, res) => {
  try {
    // Password hide karke baaki data bhejenge
    const employees = await User.find({}).select('-password').sort({ createdAt: -1 });
    res.json(employees);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create new employee
// @route   POST /api/users/create-employee
export const createEmployee = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    
    // Check for duplicate email
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'Employee with this email already exists' });
    }

    // ID GENERATION
    const count = await User.countDocuments();
    const generatedEmpId = `EMP${String(count + 1).padStart(3, '0')}`;

    // Naya user create aur save kar rahe hain
    const newUser = new User({ 
      empId: generatedEmpId, 
      name, 
      email, 
      password, 
      role,
      permissions: [] // 🔴 NAYA FIX: Naye user ko by default empty array milega
    });

    await newUser.save();

    res.status(201).json({ message: 'Employee created successfully' });
  } catch (error) {
    console.log("Creation Error: ", error); 
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update employee status (Active/Inactive)
// @route   PUT /api/users/:id/status
export const updateEmployeeStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Employee not found' });
    
    // Status update karenge par password ko touch nahi karenge
    user.status = req.body.status;
    await user.save();
    
    res.json({ message: 'Status updated successfully', status: user.status });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Reset employee password
// @route   PUT /api/users/:id/reset-password
export const resetEmployeePassword = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Employee not found' });
    
    user.password = req.body.newPassword;
    await user.save(); // pre-save hook apne aap hash kar dega
    
    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete employee
// @route   DELETE /api/users/:id
export const deleteEmployee = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: 'Employee not found' });
    res.json({ message: 'Employee removed permanently' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update Permissions
// @route   PUT /api/users/:id/permissions
export const updateEmployeePermissions = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Employee not found' });
    
    user.permissions = req.body.permissions; 
    await user.save();
    
    res.json({ message: 'Permissions updated successfully', permissions: user.permissions });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getMe = async (req, res) => {
  try {
    // req.user JWT token se aata hai
    const user = await User.findById(req.user._id).select('name email role permissions status');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};