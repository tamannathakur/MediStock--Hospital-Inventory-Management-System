const Department = require('../models/Department');
const Stock = require('../models/Stock');
const Request = require('../models/Request');
const Autoclave = require('../models/Autoclave');

// Get all departments
exports.getAllDepartments = async (req, res) => {
    try {
        const departments = await Department.find();
        res.json(departments);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get single department
exports.getDepartment = async (req, res) => {
    try {
        const department = await Department.findById(req.params.id);
        if (!department) {
            return res.status(404).json({ message: 'Department not found' });
        }
        res.json(department);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Create department
exports.createDepartment = async (req, res) => {
    try {
        const { name, location, type } = req.body;
        const department = new Department({
            name,
            location,
            type
        });
        await department.save();
        res.status(201).json(department);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Update department
exports.updateDepartment = async (req, res) => {
    try {
        const department = await Department.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );
        if (!department) {
            return res.status(404).json({ message: 'Department not found' });
        }
        res.json(department);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get department inventory
exports.getDepartmentInventory = async (req, res) => {
    try {
        const stock = await Stock.find({ 
            location: { $regex: `^department_${req.params.id}` } 
        }).populate('product');
        res.json(stock);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Request product for department
exports.requestProduct = async (req, res) => {
    try {
        const { productId, quantity, reason } = req.body;
        const request = new Request({
            department: req.params.id,
            product: productId,
            quantity,
            reason,
            requestedBy: req.user.id,
            status: 'pending'
        });
        await request.save();
        res.status(201).json(request);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get department almirahs
exports.getAlmirahs = async (req, res) => {
    try {
        const stock = await Stock.find({
            location: { $regex: `^almirah_${req.params.id}` }
        }).populate('product');
        res.json(stock);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get department autoclaves
exports.getAutoclaves = async (req, res) => {
    try {
        const autoclaves = await Autoclave.find({
            department: req.params.id
        }).populate('products.product');
        res.json(autoclaves);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};