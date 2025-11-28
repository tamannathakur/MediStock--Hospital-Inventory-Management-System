const mongoose = require("mongoose");

const RequestSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: false },
  quantity: { type: Number},
  reason: { type: String },
  requestType: { type: String, enum: ["department", "central", "store_request"], default: "department" },
   items: [
    {
      productName: String,
      quantity: Number
    }
  ],

  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  fulfilledBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  vendorETA: { type: String }, // e.g., "24 hours", "48 hours"
  vendorETAExpiresAt: { type: Date }, // exact timestamp when ETA ends
vendorReminderSent: { type: Boolean, default: false }, // to avoid duplicate reminders
vendorStatus: { 
  type: String, 
  enum: ["awaiting_vendor","pending", "ordered", "received", "stored"], 
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
    ,"awaiting_vendor"
  ],
  default: "pending_sister_incharge",
},
}, { timestamps: true });

module.exports = mongoose.model("Request", RequestSchema);
