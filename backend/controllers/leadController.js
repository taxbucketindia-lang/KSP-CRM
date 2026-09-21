
// import Lead from '../models/Lead.js';

// // @desc    Create new lead
// // @route   POST /api/leads
// // @access  Private
// export const createLead = async (req, res) => {
//   try {
//     const lead = new Lead(req.body);
//     const createdLead = await lead.save();
//     res.status(201).json(createdLead);
//   } catch (error) {
//     res.status(400).json({ message: error.message });
//   }
// };

// // @desc    Get all leads
// // @route   GET /api/leads
// // @access  Private (Admin/Manager dekh sakte hain)
// export const getLeads = async (req, res) => {
//   try {
//     // Populate assignedTo user details
//     const leads = await Lead.find({}).populate('assignedTo', 'name email');
//     res.json(leads);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// // @desc    Update an existing lead
// // @route   PUT /api/leads/:id
// // @access  Private
// export const updateLead = async (req, res) => {
//   try {
//     const leadId = req.params.id;

//     // findByIdAndUpdate automatically finds the document and updates it
//     // { new: true } returns the updated document instead of the old one
//     const updatedLead = await Lead.findByIdAndUpdate(
//       leadId,
//       req.body,
//       { new: true, runValidators: true }
//     ).populate('assignedTo', 'name email');

//     if (!updatedLead) {
//       return res.status(404).json({ message: 'Lead not found in database.' });
//     }

//     res.json(updatedLead);
//   } catch (error) {
//     res.status(400).json({ message: error.message });
//   }
// };

// export const deleteLead = async (req, res) => {
//   try {
//     const deletedLead = await Lead.findByIdAndDelete(req.params.id);
    
//     if (!deletedLead) {
//       return res.status(404).json({ message: 'Lead not found' });
//     }
    
//     res.json({ message: 'Lead deleted successfully' });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// // @desc    Bulk Import Leads from Excel/CSV
// // @route   POST /api/leads/import
// export const importLeads = async (req, res) => {
//   try {
//     const { leads } = req.body;
    
//     if (!leads || leads.length === 0) {
//       return res.status(400).json({ message: "No data found to import" });
//     }

//     let insertedCount = 0;

//     // Har lead ko ek-ek karke save karenge taaki auto-ID aur BA update (pre/post save hooks) properly chal sakein
//     for (const leadData of leads) {
//       try {
//         const newLead = new Lead({
//           ...leadData,
//           assignedTo: req.user._id,
//           mobile: Number(leadData.mobile)
//         });
//         await newLead.save(); 
//         insertedCount++;
//       } catch (err) {
//         // Agar koi duplicate mobile number hoga toh skip ho jayega, baaki import hote rahenge
//         console.error(`Skipping lead ${leadData.name}:`, err.message);
//       }
//     }

//     res.status(201).json({ 
//       message: "Leads imported successfully", 
//       count: insertedCount 
//     });
//   } catch (error) {
//     console.error("Bulk Import Error:", error);
//     res.status(500).json({ message: "System error during import.", error: error.message });
//   }
// };  










import Lead from '../models/Lead.js';

export const createLead = async (req, res) => {
  try {
    // 🔴 Logged-in user ki ID createdBy mein daal di
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
    // 🔴 Populate me 'createdBy' add kiya (name aur empId lane ke liye)
    const leads = await Lead.find({})
      .populate('createdBy', 'name email empId') 
      .populate('assignedTo', 'name email');
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
          createdBy: req.user._id, // 🔴 EXCEL UPLOAD MEIN BHI CREATOR KA NAAM JAYEGA
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