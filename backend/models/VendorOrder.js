const mongoose = require("mongoose");

const vendorOrderSchema = new mongoose.Schema({
  productName: String,
  quantity: Number,
  unitPrice: Number,
  vendorName: String,
  orderedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  status: { 
    type: String, 
    enum: ["requested", "ordered", "received"], 
    default: "requested" 
  },
  billFile: String, // uploaded PDF/image file of bill
  orderedAt: { type: Date, default: Date.now },
  receivedAt: { type: Date },
});

module.exports = mongoose.model("VendorOrder", vendorOrderSchema);
