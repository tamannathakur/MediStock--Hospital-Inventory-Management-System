const mongoose = require("mongoose");

const autoclaveItemSchema = new mongoose.Schema({
  autoclave: { type: mongoose.Schema.Types.ObjectId, ref: "Autoclave", required: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  usageCount: { type: Number, default: 0 },
  lastUsedAt: { type: Date },
  status: {
    type: String,
    enum: ["sterilized", "in_use", "needs_sterilization"],
    default: "sterilized",
  },
}, { timestamps: true });

module.exports = mongoose.model("AutoclaveItem", autoclaveItemSchema);
