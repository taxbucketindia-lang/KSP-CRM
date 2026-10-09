import User from '../models/User.js';
import { canManageUser, canGrantRole, isCeo } from '../utils/roles.js';
import { getEffectivePermissions, sanitizePermissions, ALL_PERMISSIONS } from '../utils/permissions.js';

// Frontend ko user ke asli rights ke saath bhejna
const withAccess = (user) => {
  const plain = typeof user.toObject === 'function' ? user.toObject() : { ...user };
  delete plain.password;
  return { ...plain, effectivePermissions: getEffectivePermissions(plain) };
};

// @desc    Get all employees (dropdowns ke liye: sab users)
// @route   GET /api/users/all-developers , /api/users/empls
export const getEmployees = async (req, res) => {
  try {
    // Password hide karke baaki data bhejenge
    const employees = await User.find({}).select('-password').sort({ createdAt: -1 });
    res.json(employees);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Access Control ki list: CEO ko Admin + employees, Admin ko sirf employees
// @route   GET /api/users/employees
export const getManageableUsers = async (req, res) => {
  try {
    const filter = isCeo(req.user) ? {} : { role: { $nin: ['CEO', 'Admin'] } };
    const users = await User.find(filter).select('-password').sort({ createdAt: -1 });
    res.json(users.map(withAccess));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create new employee
// @route   POST /api/users/create-employee
export const createEmployee = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!canGrantRole(req.user, role)) {
      return res.status(403).json({ message: 'Only the CEO can create an Admin or CEO account' });
    }

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

const NOT_ALLOWED = 'Only the CEO can manage an Admin or CEO account';

// @desc    Update employee status (Active/Inactive)
// @route   PUT /api/users/:id/status
export const updateEmployeeStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Employee not found' });
    if (!canManageUser(req.user, user)) return res.status(403).json({ message: NOT_ALLOWED });
    if (user._id.equals(req.user._id)) return res.status(400).json({ message: 'You cannot deactivate your own account' });

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
    // Apna password koi bhi Admin / CEO badal sakta hai
    if (!user._id.equals(req.user._id) && !canManageUser(req.user, user)) return res.status(403).json({ message: NOT_ALLOWED });

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
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Employee not found' });
    if (!canManageUser(req.user, user)) return res.status(403).json({ message: NOT_ALLOWED });
    if (user._id.equals(req.user._id)) return res.status(400).json({ message: 'You cannot delete your own account' });

    await user.deleteOne();
    res.json({ message: 'Employee removed permanently' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update access rights (tabs + khaas kaam)
// @route   PUT /api/users/:id/permissions
//   CEO  -> Admin ke rights (ya "Full access") aur kisi bhi employee ke rights set kar sakta hai
//   Admin -> sirf employees ke, aur sirf wahi rights de sakta hai jo khud ke paas hain
export const updateEmployeePermissions = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Employee not found' });
    if (user.role === 'CEO') return res.status(400).json({ message: 'CEO always has full access' });
    if (!canManageUser(req.user, user)) return res.status(403).json({ message: 'Only the CEO can change an Admin\'s rights' });

    const requested = sanitizePermissions(req.body.permissions);
    const mine = getEffectivePermissions(req.user);
    const current = getEffectivePermissions(user);

    let final = requested;
    if (!isCeo(req.user)) {
      // Admin wahi right de sakta hai jo uske paas hai. Jo right uske bas ke bahar hai (CEO ne diya tha) use chhedta nahi.
      const notMine = requested.filter(key => !mine.includes(key) && !current.includes(key));
      if (notMine.length > 0) {
        return res.status(403).json({ message: `You cannot give rights you do not have: ${notMine.join(', ')}` });
      }
      const keptFromOthers = current.filter(key => !mine.includes(key));
      final = [...new Set([...requested.filter(key => mine.includes(key)), ...keptFromOthers])];
    }

    user.permissions = final;
    user.permsVersion = 2; // ab is user ke rights naye (tab-wise) system se chalte hain

    if (user.role === 'Admin') {
      // CEO "Full access" de ya chuninda rights
      user.fullAccess = req.body.fullAccess === true || final.length === ALL_PERMISSIONS.length;
    }

    await user.save();

    res.json({ message: 'Access rights updated successfully', user: withAccess(user) });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Role badalna (Admin banana / hatana sirf CEO kar sakta hai)
// @route   PUT /api/users/:id/role
export const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Employee not found' });
    if (!User.schema.path('role').enumValues.includes(role)) return res.status(400).json({ message: 'Invalid role' });
    if (user._id.equals(req.user._id)) return res.status(400).json({ message: 'You cannot change your own role' });
    if (role === 'CEO' || user.role === 'CEO') return res.status(403).json({ message: 'CEO role cannot be changed from here' });
    if (!canManageUser(req.user, user) || !canGrantRole(req.user, role)) {
      return res.status(403).json({ message: 'Only the CEO can make or remove an Admin' });
    }

    const wasAdmin = user.role === 'Admin';
    user.role = role;

    if (role === 'Admin' && !wasAdmin) {
      // Naya Admin: CEO ne jo rights chune wahi, warna shuru me koi nahi (CEO turant set karega)
      user.fullAccess = req.body.fullAccess === true;
      user.permissions = sanitizePermissions(req.body.permissions ?? getEffectivePermissions({ ...user.toObject(), role: 'Employee' }));
      user.permsVersion = 2;
    } else if (wasAdmin && role !== 'Admin') {
      // Admin se hataya: ab uske paas sirf wahi rights jo list me hain (poora access nahi)
      user.permissions = sanitizePermissions(user.fullAccess === false ? user.permissions : []);
      user.fullAccess = undefined;
      user.permsVersion = 2;
    }

    await user.save();
    res.json({ message: role === 'Admin' ? `${user.name} is now an Admin` : `Role changed to ${role}`, user: withAccess(user) });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getMe = async (req, res) => {
  try {
    // req.user JWT token se aata hai
    const user = await User.findById(req.user._id).select('name email role permissions fullAccess permsVersion status');
    if (!user) return res.status(404).json({ message: 'User not found' });
    // permissions = asli (effective) rights, taaki frontend ko purana / naya system alag se na sochna pade
    res.json({ ...withAccess(user), permissions: getEffectivePermissions(user) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
