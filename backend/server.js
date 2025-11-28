const express = require('express');
const connectDB = require('./config/db');
const cors = require('cors');
require('dotenv').config();

const app = express();
// Connect Database
connectDB();
console.log("db connected");

// Middleware
app.use(cors()); // Enable CORS for all routes by default
// app.use(cors({
//   origin: "http://localhost:8080",
//   methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
//   allowedHeaders: ["Content-Type", "Authorization"],
//   credentials: true,
// }));

// // 🔥 Very important: allow OPTIONS for all paths
// //app.options(cors());
// app.disable("etag");

app.use(express.json());

// -----------------------------------------------------
// ROUTES (LOAD BEFORE ERROR HANDLER) — FIXED ORDER
// -----------------------------------------------------

app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/stock', require('./routes/stock'));
app.use('/api/autoclave', require('./routes/autoclave'));   // ONLY ONCE
app.use('/api/departments', require('./routes/departments'));
app.use('/api/complaints', require('./routes/complaints'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/almirah', require('./routes/almirah'));
app.use('/api/stores', require('./routes/stores'));
app.use('/api/department-stock', require('./routes/departmentInventory'));
console.log("⚡ Loading: routes/requests (folder or file?)");
console.log("Resolved path:", require.resolve("./routes/requests"));
app.use('/api/requests', require('./routes/requests'));     // <-- NOW LOADED IN PROPER ORDER
app.use('/api/transactions', require('./routes/transactions'));

// -----------------------------------------------------
// ERROR HANDLER MUST BE LAST
// -----------------------------------------------------
app.use(require('./middleware/errorHandler'));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
