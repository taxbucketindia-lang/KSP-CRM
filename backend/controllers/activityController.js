import FollowUp from '../models/FollowUp.js';
import Lead from '../models/Lead.js';
import Client from '../models/Client.js';

// @desc    Add a new follow-up
// @route   POST /api/activity/followup
export const addFollowUp = async (req, res) => {
  try {
    const followUp = new FollowUp({
      ...req.body,
      assignedTo: req.user._id // Automatically assign to the logged-in user
    });
    
    const createdFollowUp = await followUp.save();

    // Optionally update the Lead's "Next Follow-up" date
    if (req.body.referenceModel === 'Lead' && req.body.nextFollowUpDate) {
      await Lead.findByIdAndUpdate(req.body.referenceId, {
        nextFollowUpDate: req.body.nextFollowUpDate
      });
    }

    res.status(201).json(createdFollowUp);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get follow-ups for a specific Lead or Client
// @route   GET /api/activity/followup/:model/:id
export const getHistory = async (req, res) => {
  try {
    const history = await FollowUp.find({ 
      referenceModel: req.params.model,
      referenceId: req.params.id 
    }).populate('assignedTo', 'name').sort({ followUpDateTime: -1 });
    
    res.json(history);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};