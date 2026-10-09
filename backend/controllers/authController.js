// backend/controllers/authController.js
import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import { getEffectivePermissions } from '../utils/permissions.js';

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// TEMPORARY FOR TESTING: Create a new user
export const registerUser = async (req, res) => {
  const { name, email, password, role } = req.body;

  // Yeh route public hai, isliye yahan se CEO / Admin account nahi ban sakta
  // (CEO: scripts/createCeo.js, Admin: sirf CEO Settings se banata hai)
  if (role === 'CEO' || role === 'Admin') {
    return res.status(403).json({ message: 'CEO / Admin account cannot be created from this route' });
  }

  const userExists = await User.findOne({ email });
  if (userExists) {
    return res.status(400).json({ message: 'User already exists' });
  }

  const user = await User.create({ name, email, password, role });

  if (user) {
    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id),
    });
  } else {
    res.status(400).json({ message: 'Invalid user data' });
  }
};

export const loginUser = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });

  if (user && (await user.matchPassword(password))) {
    // 🔴 FIX: isActive ki jagah naya status format ('Inactive') use kiya gaya hai
    if (user.status === 'Inactive') {
      return res.status(401).json({ message: 'Account disabled' });
    }
    
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id),
      permissions: getEffectivePermissions(user), // asli rights (tab + khaas kaam)
    });
  } else {
    res.status(401).json({ message: 'Invalid email or password' });
  }
};