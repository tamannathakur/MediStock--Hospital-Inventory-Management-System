const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  from: { role: String, departmentId: mongoose.Schema.Types.ObjectId },
  to: { role: String, departmentId: mongoose.Schema.Types.ObjectId },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  quantity: Number,
  type: { type: String, enum: ['issue','return','loan'] },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Transaction', transactionSchema);