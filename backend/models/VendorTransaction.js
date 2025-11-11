const mongoose = require("mongoose");

const vendorTransactionSchema = new mongoose.Schema({
  vendorName: String,
  productName: String,
  quantity: Number,
  cost: Number,
  date: { type: Date, default: Date.now },
  orderedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  billFile: String,
});

module.exports = mongoose.model("VendorTransaction", vendorTransactionSchema);
