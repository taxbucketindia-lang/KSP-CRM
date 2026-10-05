import Expense from '../models/Expense.js';

// @desc    Get all expenses
// @route   GET /api/expenses
export const getExpenses = async (req, res) => {
  try {
    const expenses = await Expense.find()
      .populate('createdBy', 'name')
      .sort({ date: -1, createdAt: -1 }); // Naye expenses upar dikhenge
      
    // Aapke frontend ke hisaab se { success: true, data: [...] } bhej rahe hain
    res.status(200).json({ success: true, data: expenses });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add a new office expense
// @route   POST /api/expenses
export const createExpense = async (req, res) => {
  try {
    const { date, nature, paidBy, amount, remarks } = req.body;
    
    if (!amount || !nature || !paidBy) {
      return res.status(400).json({ success: false, message: "Please fill all mandatory fields" });
    }

    const newExpense = await Expense.create({
      date,
      nature,
      paidBy,
      amount,
      remarks,
      createdBy: req.user._id // 'protect' middleware se aayega
    });

    res.status(201).json({ success: true, data: newExpense });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Update an expense (ADMIN ONLY)
// @route   PUT /api/expenses/:id
export const updateExpense = async (req, res) => {
  try {
    // 1. Check if user is Admin
    if (req.user.role !== 'Admin') {
      return res.status(403).json({ success: false, message: "Security Alert: Only Admins can edit expenses." });
    }

    // 2. Find and Update
    const expense = await Expense.findById(req.params.id);
    if (!expense) {
        return res.status(404).json({ success: false, message: "Expense not found" });
    }

    const updatedExpense = await Expense.findByIdAndUpdate(req.params.id, req.body, { new: true });
    
    res.status(200).json({ success: true, data: updatedExpense });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Delete an expense (ADMIN ONLY)
// @route   DELETE /api/expenses/:id
export const deleteExpense = async (req, res) => {
  try {
    // 1. Check if user is Admin
    if (req.user.role !== 'Admin') {
      return res.status(403).json({ success: false, message: "Security Alert: Only Admins can delete expenses." });
    }

    const expense = await Expense.findById(req.params.id);
    if (!expense) {
        return res.status(404).json({ success: false, message: "Expense not found" });
    }

    await expense.deleteOne();
    
    res.status(200).json({ success: true, message: "Expense deleted successfully" });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};