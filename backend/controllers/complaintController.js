const Complaint = require('../models/Complaint');

exports.getComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.find()
      .sort({ createdAt: -1 })
      .populate('product', 'name');
    res.json(complaints);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createComplaint = async (req, res) => {
  try {
    const { product, description } = req.body;
    const complaint = new Complaint({
      product,
      description,
      raisedBy: req.user._id,
      status: 'open'
    });
    await complaint.save();
    res.status(201).json(complaint);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.resolveComplaint = async (req, res) => {
  try {
    const { id } = req.params;
    const { resolutionNotes } = req.body;
    const complaint = await Complaint.findByIdAndUpdate(
      id,
      {
        status: 'resolved',
        resolvedBy: req.user._id,
        resolutionNotes,
      },
      { new: true }
    );
    if (!complaint) {
      return res.status(404).json({ error: 'Complaint not found' });
    }
    res.json(complaint);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};