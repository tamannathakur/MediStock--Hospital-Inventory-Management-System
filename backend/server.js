const express = require('express');
const connectDB = require('./config/db');
const cors = require('cors');
const requestRoutes = require("./routes/requests");
require('dotenv').config();

const app = express();

// Connect Database
connectDB();
console.log("db connected");
// Init Middleware
app.use(cors());
app.use(express.json({ extended: false }));

// Define Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/stock', require('./routes/stock'));
app.use('/api/autoclaves', require('./routes/autoclaves'));
app.use('/api/departments', require('./routes/departments'));
app.use('/api/complaints', require('./routes/complaints'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/almirah', require('./routes/almirah'));
app.use(require('./middleware/errorHandler'));
app.use("/api/department-stock", require("./routes/departmentInventory"));
app.use("/api/requests", requestRoutes);
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));