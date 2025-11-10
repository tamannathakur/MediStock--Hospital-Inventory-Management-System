const mongoose = require("mongoose");

const departmentInventorySchema = new mongoose.Schema(
  {
    // 🔗 Product reference
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    // 📦 Quantity available in the department
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },

    // 🗓️ Optional expiry for consumables
    expiry: {
      type: Date,
    },

    // 🏷️ Optional category for easy filtering
    category: {
      type: String,
      enum: ["Consumables", "Equipment", "PPE", "Medicines", "Others"],
      default: "Others",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("DepartmentInventory", departmentInventorySchema);
