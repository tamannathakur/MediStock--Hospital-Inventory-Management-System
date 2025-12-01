const express = require('express');
const connectDB = require('./config/db');
const cors = require('cors');
const multer = require('multer');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
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



// -----------------------------------------------------
// ROUTES (LOAD BEFORE ERROR HANDLER) — FIXED ORDER
// -----------------------------------------------------
const upload = multer({ dest: 'uploads/' });

app.post('/api/ocr', upload.single('image'), (req, res) => {
    console.log("📥 Incoming OCR request...");
    console.log("📥 OCR route hit, file:", req.file);
    if (!req.file) {
        console.error("❌ No file received");
        return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log("📤 Uploaded file:", req.file);
    const originalPath = req.file.path;
    const ext = path.extname(req.file.originalname) || ".jpg";
    const absolutePath = path.resolve(originalPath + ext);

    fs.renameSync(originalPath, absolutePath);
    
    console.log("📤 Sending to OCR:", absolutePath);

    const pythonProcess = spawn("python3", ["ocr_engine.py", absolutePath]);
    let buffer = "";

    pythonProcess.stdout.on("data", (data) => {
        buffer += data.toString();
    });

    pythonProcess.stderr.on("data", (data) => {
        console.warn("⚠ PY ERR:", data.toString());
    });

    pythonProcess.on("close", (code) => {
        if (fs.existsSync(absolutePath)) fs.unlinkSync(absolutePath);

        try {
            const parsed = JSON.parse(buffer);
            return res.json(parsed);  // ← send success + texts array to frontend
        } catch (err) {
            console.error("❌ JSON Parse Error:", buffer);
            res.status(500).json({ error: "OCR parse failed" });
        }
    });
});

app.use(express.json());
// app.post('/api/ocr', upload.single('image'), (req, res) => {
//     if (!req.file) {
//         return res.status(400).json({ error: 'No file uploaded' });
//     }

//     // 1. PREPARE PATHS
//     const originalPath = req.file.path;
//     const extension = path.extname(req.file.originalname) || '.jpg';
    
//     // We defined 'absolutePath' here
//     const absolutePath = path.resolve(originalPath + extension); 
    
//     fs.renameSync(originalPath, absolutePath);

//     // 2. SPAWN PYTHON
//     console.log(`Sending to Python: "${absolutePath}"`);
    
//     // Use 'python' for Windows
//    const pythonProcess = spawn('python3', ['ocr_engine.py', absolutePath]);

// pythonProcess.stdout.on("data", (data) => {
//     console.log("Python Output:", data.toString());
// });

// pythonProcess.stderr.on("data", (data) => {
//     console.error("Python Error:", data.toString());
// });

// pythonProcess.on("close", (code) => {
//     if (fs.existsSync(absolutePath)) fs.unlinkSync(absolutePath);
//     console.log(`Python process exited with code ${code}`);
//     res.json({ message: "OCR completed. Check console for output." });
// });

// });
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
