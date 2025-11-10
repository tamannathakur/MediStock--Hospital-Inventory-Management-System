const mongoose = require('mongoose');

const autoclaveSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    department: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department',
        required: true
    },
    items: [{
        name: String,
        status: {
            type: String,
            enum: ['available', 'occupied'],
            default: 'available'
        },
        usageCount: {
            type: Number,
            default: 0
        },
        lastUsedDate: Date,
        sterilizedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Autoclave', autoclaveSchema);