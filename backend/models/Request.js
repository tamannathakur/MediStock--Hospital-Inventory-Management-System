const mongoose = require("mongoose");

const RequestSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  quantity: { type: Number, required: true },
  reason: { type: String },
  requestType: { type: String, enum: ["department", "central"], default: "department" },
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  fulfilledBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  vendorETA: { type: String }, // e.g., "24 hours", "48 hours"
vendorStatus: { 
  type: String, 
  enum: ["awaiting_vendor", "ordered", "received", "stored"], 
  default: null 
},
  status: {
  type: String,
  enum: [
    "pending_sister_incharge",     // Nurse -> waiting for Sister In-Charge approval
    "pending_hod",                 // Sister In-Charge -> waiting for HOD approval
    "pending_inventory_approval",  // HOD -> waiting for Inventory Staff
    "approved_and_sent",           // Inventory Staff approved & dispatched
    "in_process",                  // (Optional) In transit to department
    "fulfilled",                   // Sister In-Charge received items
    "rejected_by_sister_incharge", // Sister In-Charge rejected
    "rejected_by_hod",             // HOD rejected
    "rejected_by_inventory"        // Inventory Staff rejected (e.g., no stock)
  ],
  default: "pending_sister_incharge",
},
}, { timestamps: true });

module.exports = mongoose.model("Request", RequestSchema);
