const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    // 🔹 From → who or where the product came from
    from: {
      role: { type: String }, // e.g., "inventory_staff", "sister_incharge", "nurse"
      departmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Department" },
    },

    // 🔹 To → who or where the product was sent to
    to: {
      role: { type: String }, // e.g., "sister_incharge", "nurse"
      departmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Department" },
    },

    // 🔹 The product being moved
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    // 🔹 Quantity of the product transferred
    quantity: {
      type: Number,
      required: true,
      min: [1, "Quantity must be at least 1"],
    },

    // 🔹 Who initiated the transaction (required for traceability)
    initiatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // 🔹 Which request triggered this transaction (optional)
    request: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Request",
    },

    // 🔹 Current status of the request/transaction
    status: {
      type: String,
      enum: [
        "pending_sister_incharge",
        "pending_hod",
        "pending_inventory_approval",
        "approved_and_sent",
        "fulfilled",
        "rejected",
      ],
      default: "pending_sister_incharge",
    },

    // 🔹 Who received the product (optional, used after "Mark as Received")
    receivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // 🔹 Date and time of transaction (defaults to now)
    date: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// 📊 Index for faster lookups and date-based filtering
transactionSchema.index({ date: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);
