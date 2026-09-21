// import BA from '../models/BA.js';

// export const createBA = async (req, res) => {
//   try {
//     const ba = new BA(req.body);
//     const createdBA = await ba.save();
//     res.status(201).json(createdBA);
//   } catch (error) {
//     res.status(400).json({ message: error.message });
//   }
// };

// export const getBAs = async (req, res) => {
//   try {
//     const bas = await BA.find({}).populate('assignedRM', 'name');
//     res.json(bas);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };







import BA from '../models/BA.js';

// @desc    Create a new Business Associate
// @route   POST /api/bas
export const createBA = async (req, res) => {
  try {
    const ba = new BA(req.body);
    const createdBA = await ba.save();
    res.status(201).json(createdBA);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get all Business Associates
// @route   GET /api/bas
export const getBAs = async (req, res) => {
  try {
    const bas = await BA.find({}).populate('assignedRM', 'name');
    res.json(bas);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update a Business Associate
// @route   PUT /api/bas/:id
export const updateBA = async (req, res) => {
  try {
    const updatedBA = await BA.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true, runValidators: true }
    );

    if (!updatedBA) {
      return res.status(404).json({ message: 'Business Associate not found' });
    }

    res.json(updatedBA);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete a Business Associate
// @route   DELETE /api/bas/:id
export const deleteBA = async (req, res) => {
  try {
    const deletedBA = await BA.findByIdAndDelete(req.params.id);

    if (!deletedBA) {
      return res.status(404).json({ message: 'Business Associate not found' });
    }

    res.json({ message: 'Business Associate removed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};