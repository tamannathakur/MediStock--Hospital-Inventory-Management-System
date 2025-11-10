const mongoose = require("mongoose");

const almirahInventorySchema = new mongoose.Schema({
  category: {
    type: String,
    enum: ["Consumables", "Equipment", "PPE", "Medicines", "Others"],
    default: "Others",
  },
  items: [
    {
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
      },
      quantity: { type: Number, required: true, default: 0 },
      expiry: { type: Date }, // ✅ optional expiry date
    },
  ],
}, { timestamps: true });

module.exports = mongoose.model("AlmirahInventory", almirahInventorySchema);
