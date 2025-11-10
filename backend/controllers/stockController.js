// server/controllers/stockController.js
const Stock = require('../models/Stock');
const Product = require('../models/Product');
const Transaction = require('../models/Transaction');

// Get all central stock
exports.getCentralStock = async (req, res) => {
  try {
    const stock = await Stock.find({ location: 'central' })
      .populate('product', 'name');
    res.json(stock);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.addToCentral = async (req, res) => {
  const { productId, quantity } = req.body;
  // update central stock (location 'central')
  let stock = await Stock.findOne({ product: productId, location: 'central' });
  if (!stock) {
    stock = new Stock({ product: productId, location: 'central', quantity });
  } else {
    stock.quantity += quantity;
    stock.lastUpdated = new Date();
  }
  await stock.save();
  // increment product.totalQuantity
  await Product.findByIdAndUpdate(productId, { $inc: { totalQuantity: quantity }});
  // log transaction
  await Transaction.create({ from: { role: 'vendor' }, to: { role: 'central' }, productId, quantity, type: 'issue', date: new Date() });
  res.json(stock);
};

// HOD approves department request
exports.approveRequest = async (req, res) => {
  try {
    const { requestId, approved } = req.body;
    // Add your logic here for approving department requests
    res.json({ message: 'Request processed successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Nurse/Sister uses product from almirah
exports.useFromAlmirah = async (req, res) => {
  try {
    const { productId, quantity, almirahId } = req.body;
    // Add your logic here for using products from almirah
    // This should update the stock quantity in the specific almirah
    res.json({ message: 'Product used successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};