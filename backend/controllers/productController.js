// server/controllers/productController.js
const Product = require('../models/Product');

exports.list = async (req, res) => {
  const products = await Product.find().lean();
  res.json(products);
};

exports.create = async (req, res) => {
  const { name, category, batchNo, expiryDate, vendor, pricePerUnit, totalQuantity } = req.body;
  const p = new Product({ name, category, batchNo, expiryDate, vendor, pricePerUnit, totalQuantity });
  await p.save();
  res.status(201).json(p);
};

exports.get = async (req, res) => {
  const p = await Product.findById(req.params.id);
  if (!p) return res.status(404).json({ msg: 'Not found' });
  res.json(p);
};