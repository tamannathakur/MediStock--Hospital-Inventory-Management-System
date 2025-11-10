// server/routes/autoclaves.js
const express = require('express');
const router = express.Router();
const autoclaveController = require('../controllers/autoclaveController');
const { auth, authorize } = require('../middleware/auth');

router.get('/', auth, autoclaveController.list);
router.post('/', auth, authorize(['sister_incharge','inventory_staff']), autoclaveController.create);
router.post('/items/:autoclaveId/use', auth, autoclaveController.useItem); // increments usageCount

module.exports = router;