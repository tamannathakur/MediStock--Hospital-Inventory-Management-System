const mongoose = require("mongoose");

const autoclaveSchema = new mongoose.Schema({
  name: { type: String, required: true },
  status: {
    type: String,
    enum: ["free", "sterilizing", "occupied"],
    default: "free",
  },
  lastUsedAt: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model("Autoclave", autoclaveSchema);
