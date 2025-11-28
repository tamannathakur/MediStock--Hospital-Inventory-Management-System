const mongoose = require("mongoose");

const vendorOrderSchema = new mongoose.Schema({
  productName: {
    type: String,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
  },
  vendorName: {
    type: String,
    required: true,
  },
  unitPrice: {
    type: Number,
    required: true,
  },
  totalCost: {
    type: Number,
  },
  status: {
    type: String,
    enum: ["requested", "ordered", "received"],
    default: "requested",
  },
  // ✅ Add ETA
  etaHours: {
    type: Number,
    default: null,
  },
  billFile: {
    type: String, // Firebase or local file URL
  },
  orderedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  receivedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  orderedAt: {
    type: Date,
    default: Date.now,
  },
  receivedAt: {
    type: Date,
  },
},{timestamps: true });

vendorOrderSchema.pre("save", function (next) {
  if (this.quantity && this.unitPrice) {
    this.totalCost = this.quantity * this.unitPrice;
  }
  next();
});

module.exports = mongoose.model("VendorOrder", vendorOrderSchema);
