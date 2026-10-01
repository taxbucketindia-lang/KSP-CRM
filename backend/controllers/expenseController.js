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