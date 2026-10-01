import Todo from '../models/Todo.js';

export const getTodos = async (req, res) => {
  try {
    // 🔴 THE MAGIC: Sirf login kiye hue user ke tasks hi database se layega
    const todos = await Todo.find({ userId: req.user._id }).sort({ dueDate: 1 });
    res.json(todos);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const createTodo = async (req, res) => {
  try {
    const newTodo = await Todo.create({ ...req.body, userId: req.user._id });
    res.status(201).json(newTodo);
  } catch (error) { res.status(400).json({ message: error.message }); }
};

export const updateTodo = async (req, res) => {
  try {
    // Sirf wahi task update hoga jo us user ka ho
    const updatedTodo = await Todo.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id }, 
      req.body, { new: true }
    );
    res.json(updatedTodo);
  } catch (error) { res.status(400).json({ message: error.message }); }
};

export const deleteTodo = async (req, res) => {
  try {
    await Todo.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    res.json({ message: 'Deleted' });
  } catch (error) { res.status(500).json({ message: error.message }); }
};