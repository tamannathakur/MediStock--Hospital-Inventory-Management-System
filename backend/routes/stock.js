// server/routes/stock.js
const express = require('express');
const router = express.Router();
const stockController = require('../controllers/stockController');
const { auth, authorize } = require('../middleware/auth');

// get central stock
router.get('/central', auth, stockController.getCentralStock);

// inventory staff: add to central
router.post('/central/add', auth, authorize(['inventory_staff']), stockController.addToCentral);

// hod: approve department request (example)
router.post('/request/approve', auth, authorize(['hod']), stockController.approveRequest);

// almirah use by nurse
router.post('/almirah/use', auth, authorize(['nurse','sister_incharge']), stockController.useFromAlmirah);

module.exports = router;