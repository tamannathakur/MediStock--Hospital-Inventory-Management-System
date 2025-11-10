// server/controllers/autoclaveController.js
const Autoclave = require('../models/Autoclave');

exports.list = async (req, res) => {
  const items = await Autoclave.find().populate('department').lean();
  res.json(items);
};

exports.create = async (req, res) => {
  const { name, departmentId } = req.body;
  const ac = new Autoclave({ name, department: departmentId });
  await ac.save();
  res.status(201).json(ac);
};

exports.useItem = async (req, res) => {
  const { autoclaveId } = req.params;
  const { itemName, sterilizedBy } = req.body;
  const ac = await Autoclave.findById(autoclaveId);
  if (!ac) return res.status(404).json({ msg: 'Autoclave not found' });
  const item = ac.items.find(i => i.name === itemName);
  if (!item) return res.status(404).json({ msg: 'Item not found' });
  item.status = 'occupied';
  item.usageCount = (item.usageCount || 0) + 1;
  item.lastUsedDate = new Date();
  item.sterilizedBy = sterilizedBy;
  await ac.save();
  res.json(item);
};