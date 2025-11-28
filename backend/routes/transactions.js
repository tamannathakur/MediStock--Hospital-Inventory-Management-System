const express = require("express");
const router = express.Router();
const { auth, authorize } = require("../middleware/auth");
const Transaction = require("../models/Transaction");
const User = require("../models/User");
const Product = require("../models/Product");
const ExcelJS = require("exceljs");

// // 📄 GET all transactions (role-based filtering)
// router.get("/", auth, async (req, res) => {
//   try {
//     const user = req.user;
//     let filter = {};

//     // 🩺 Sister-In-Charge — sees own department transactions
//     if (user.role === "sister_incharge") {
//       filter = {}; 
//     }

//     // 👩‍⚕️ Nurse — sees only their own requests
//     else if (user.role === "nurse") {
//       filter = {
//         $or: [{ initiatedBy: user._id }, { receivedBy: user._id }],
//       };
//     }

//     // 🏢 Inventory Staff — sees central <-> department movements only
//     else if (user.role === "inventory_staff") {
//       filter = {
//         $or: [
//           { "from.role": "Inventory Staff" },
//           { "to.role": "Inventory Staff" },
//           { "to.role": "Central Inventory" },
//           { "from.role": "Central Inventory" },
//         ],
//       };
//     }

//     // 👨‍⚕️ HOD — sees all transactions
//     else if (user.role === "hod") {
//       filter = {}; // no restrictions
//     }

//     const transactions = await Transaction.find(filter)
//       .populate("productId", "name category batchNo")
//       .populate("initiatedBy", "name role email")
//       .populate("receivedBy", "name role email")
//       .populate("request", "status quantity")
//       .sort({ date: -1 });

//     res.json(transactions);
//   } catch (err) {
//     console.error("❌ Error fetching transactions:", err);
//     res.status(500).json({ error: "Server error fetching transactions" });
//   }
// });



 router.get("/", auth, async (req, res) => {
  try {
    const user = req.user;

    const transactions = await Transaction.find()
      .populate("productId", "name category batchNo")
      .populate("initiatedBy", "name role email")
      .populate("receivedBy", "name role email")
      .populate("request", "status quantity")
      .sort({ date: -1 });

    res.json(transactions);
  } catch (err) {
    console.error("❌ Error fetching transactions:", err);
    res.status(500).json({ error: "Server error fetching transactions" });
  }
});


// 📄 GET transactions between date range (for Excel download)
router.get("/export", auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ error: "Start and End date are required" });
    }

    const transactions = await Transaction.find({
      date: { $gte: new Date(startDate), $lte: new Date(endDate) },
    })
      .populate("productId", "name category batchNo")
      .populate("initiatedBy", "name role")
      .populate("receivedBy", "name role")
      .sort({ date: -1 });

    // 📘 Generate Excel
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Transactions");

    sheet.columns = [
      { header: "Date", key: "date", width: 20 },
      { header: "Product", key: "product", width: 25 },
      { header: "Quantity", key: "quantity", width: 10 },
      { header: "From (Role)", key: "fromRole", width: 20 },
      { header: "To (Role)", key: "toRole", width: 20 },
      { header: "Initiated By", key: "initiatedBy", width: 20 },
      { header: "Received By", key: "receivedBy", width: 20 },
      { header: "Status", key: "status", width: 20 },
    ];

    transactions.forEach((t) => {
      sheet.addRow({
        date: new Date(t.date).toLocaleString(),
        product: t.productId?.name || "Unknown",
        quantity: t.quantity,
        fromRole: t.from?.role || "-",
        toRole: t.to?.role || "-",
        initiatedBy: t.initiatedBy?.name || "-",
        receivedBy: t.receivedBy?.name || "-",
        status: t.status,
      });
    });

    res.setHeader(
      "Content-Disposition",
      `attachment; filename=transactions_${startDate}_to_${endDate}.xlsx`
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("❌ Error exporting transactions:", err);
    res.status(500).json({ error: "Failed to export transactions" });
  }
});

module.exports = router;
