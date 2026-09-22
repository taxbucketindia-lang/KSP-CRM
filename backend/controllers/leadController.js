import Lead from '../models/Lead.js';

export const createLead = async (req, res) => {
  try {
    const lead = new Lead({
      ...req.body,
      createdBy: req.user._id 
    });
    const createdLead = await lead.save();
    res.status(201).json(createdLead);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getLeads = async (req, res) => {
  try {
    // 🔴 SOLUTION: Maine filtering hata di hai. Ab Company ki SAARI LEADS har ek Employee ko dikhengi. 
    // Isse aapka team collaboration aasan ho jayega aur koi bhi lead kisi se chhupegi nahi.
    
    const leads = await Lead.find({})
      .populate('createdBy', 'name email empId') 
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 });

    res.json(leads);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateLead = async (req, res) => {
  try {
    const leadId = req.params.id;
    const updatedLead = await Lead.findByIdAndUpdate(
      leadId,
      req.body,
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email empId');

    if (!updatedLead) {
      return res.status(404).json({ message: 'Lead not found in database.' });
    }

    res.json(updatedLead);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteLead = async (req, res) => {
  try {
    const deletedLead = await Lead.findByIdAndDelete(req.params.id);
    if (!deletedLead) {
      return res.status(404).json({ message: 'Lead not found' });
    }
    res.json({ message: 'Lead deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const importLeads = async (req, res) => {
  try {
    const { leads } = req.body;
    if (!leads || leads.length === 0) {
      return res.status(400).json({ message: "No data found to import" });
    }

    let insertedCount = 0;

    for (const leadData of leads) {
      try {
        const newLead = new Lead({
          ...leadData,
          createdBy: req.user._id, 
          mobile: Number(leadData.mobile)
        });
        await newLead.save(); 
        insertedCount++;
      } catch (err) {
        console.error(`Skipping lead ${leadData.name}:`, err.message);
      }
    }

    res.status(201).json({ 
      message: "Leads imported successfully", 
      count: insertedCount 
    });
  } catch (error) {
    console.error("Bulk Import Error:", error);
    res.status(500).json({ message: "System error during import.", error: error.message });
  }
};