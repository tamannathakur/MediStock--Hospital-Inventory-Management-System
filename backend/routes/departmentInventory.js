const express = require("express");
const router = express.Router();
const { auth, authorize } = require("../middleware/auth");
const DepartmentInventory = require("../models/DepartmentInventory");

// 📦 GET all Department Inventory items
router.get("/", auth, authorize(["sister_incharge", "hod"]), async (req, res) => {
  try {
    console.log("📦 [DEPARTMENT-STOCK] Fetching department inventory...");

    const inventory = await DepartmentInventory.find().populate("product");

    if (!inventory || inventory.length === 0) {
      return res.status(200).json({ msg: "No items in department inventory", items: [] });
    }

    const formatted = inventory.map((item) => ({
      _id: item._id,
      productId: item.product?._id,
      name: item.product?.name || "Unknown Product",
      category: item.category || "Others",
      vendor: item.product?.vendor || "N/A",
      quantity: item.quantity,
      expiry: item.expiry || null,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));

    console.log(`✅ [DEPARTMENT-STOCK] Found ${formatted.length} items`);
    res.json({ items: formatted });
  } catch (err) {
    console.error("❌ [DEPARTMENT-STOCK] Error fetching inventory:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
});

module.exports = router;
