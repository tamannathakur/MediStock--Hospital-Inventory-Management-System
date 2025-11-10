// server/seeds/seed.js
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Department = require('../models/Department');
const bcrypt = require('bcryptjs');

(async () => {
  await connectDB();
  await User.deleteMany({});
  await Department.deleteMany({});

  const dep1 = await Department.create({ name: 'Emergency', description: 'Emergency dept' });
  const dep2 = await Department.create({ name: 'Blood Bank' });

  const salt = await bcrypt.genSalt(10);
  const pwd = await bcrypt.hash('password123', salt);

  await User.create({ name: 'HOD One', email: 'hod@example.com', password: pwd, role: 'hod', departmentId: dep1._id });
  await User.create({ name: 'Inventory Staff', email: 'inventory@example.com', password: pwd, role: 'inventory_staff' });
  await User.create({ name: 'Sister InCharge', email: 'sister@example.com', password: pwd, role: 'sister_incharge', departmentId: dep1._id });
  await User.create({ name: 'Nurse A', email: 'nurse@example.com', password: pwd, role: 'nurse', departmentId: dep1._id });

  console.log('Seed finished');
  process.exit(0);
})();