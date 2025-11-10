const express = require('express');
const router = express.Router();
const departmentController = require('../controllers/departmentController');
const { auth, authorize } = require('../middleware/auth');

// Get all departments
router.get('/', auth, departmentController.getAllDepartments);

// Get single department with its inventory
router.get('/:id', auth, departmentController.getDepartment);

// Create department (admin only)
router.post('/', auth, authorize(['admin']), departmentController.createDepartment);

// Update department
router.put('/:id', auth, authorize(['admin']), departmentController.updateDepartment);

// Get department inventory
router.get('/:id/inventory', auth, departmentController.getDepartmentInventory);

// Request product for department
router.post('/:id/request', auth, authorize(['sister_incharge']), departmentController.requestProduct);

// Get department almirahs
router.get('/:id/almirahs', auth, departmentController.getAlmirahs);

// Get department autoclaves
router.get('/:id/autoclaves', auth, departmentController.getAutoclaves);

module.exports = router;