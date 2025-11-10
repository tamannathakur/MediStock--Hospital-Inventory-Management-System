const express = require('express');
const router = express.Router();
const complaintController = require('../controllers/complaintController');
const { auth, authorize } = require('../middleware/auth');

// Get all complaints
router.get('/', auth, complaintController.getComplaints);

// Create a new complaint
router.post('/', auth, complaintController.createComplaint);

// Resolve a complaint (HOD and inventory staff only)
router.put('/:id/resolve', auth, authorize(['hod', 'inventory_staff']), complaintController.resolveComplaint);

module.exports = router;