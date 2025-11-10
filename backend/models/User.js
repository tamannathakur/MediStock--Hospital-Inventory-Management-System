// server/models/User.js
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  // keep field name 'password' because controllers expect user.password
  password: { type: String, required: true },
  role: { type: String, enum: ["inventory_staff","sister_incharge","hod","nurse"], required: true },
  departmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Department" },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("User", UserSchema);