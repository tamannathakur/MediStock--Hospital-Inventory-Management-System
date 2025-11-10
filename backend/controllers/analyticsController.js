const Product = require('../models/Product');
const Request = require('../models/Request');
const Complaint = require('../models/Complaint');
const Transaction = require('../models/Transaction');

exports.getDashboardStats = async (req, res) => {
  try {
    // Get total products count
    const totalProducts = await Product.countDocuments();

    // Get pending requests count
    const pendingRequests = await Request.countDocuments({ status: 'pending' });

    // Get open complaints count
    const openComplaints = await Complaint.countDocuments({ status: 'open' });

    // Get recent activity count (last 24 hours)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const recentActivity = await Transaction.countDocuments({
      createdAt: { $gte: yesterday }
    });

    res.json({
      totalProducts,
      pendingRequests,
      openComplaints,
      recentActivity
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};