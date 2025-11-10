// server/routes/products.js
const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { auth, authorize } = require('../middleware/auth');

// public get all
router.get('/', auth, productController.list);

// inventory staff: create product
router.post('/', auth, authorize(['inventory_staff']), productController.create);

// get single
router.get('/:id', auth, productController.get);

module.exports = router;