const express = require("express");
const router = express.Router();
const { auth, authorize } = require("../middleware/auth");
const Autoclave = require("../models/Autoclave");
const AutoclaveItem = require("../models/AutoclaveItem");
const Product = require("../models/Product");

/**
 * 🔹 Get all autoclaves (for sister/hod monitoring)
 */
router.get("/", auth, authorize(["sister_incharge", "hod", "inventory_staff"]), async (req, res) => {
  try {
    const autoclaves = await Autoclave.find();
    res.json(autoclaves);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 🔹 Get all items inside a specific autoclave
 */
router.get("/:id/items", auth, async (req, res) => {
  try {
    const items = await AutoclaveItem.find({ autoclave: req.params.id })
      .populate("product autoclave");
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 🔹 Add new autoclave item (only inventory staff)
 * Called automatically when inventory fulfills autoclave equipment requests
 */
router.post("/:id/add-item", auth, authorize(["inventory_staff"]), async (req, res) => {
  try {
    const { productId } = req.body;
    const product = await Product.findById(productId);

    if (!product || product.category !== "Autoclave Equipments") {
      return res.status(400).json({ error: "Invalid or non-autoclave product" });
    }

    const item = new AutoclaveItem({
      autoclave: req.params.id,
      product: productId,
    });
    await item.save();

    res.json({ msg: "✅ Autoclave item added", item });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 🔹 Nurse uses autoclave item (marks as needs sterilization)
 */
router.put("/item/:itemId/use", auth, authorize(["nurse"]), async (req, res) => {
  try {
    const item = await AutoclaveItem.findById(req.params.itemId);
    if (!item) return res.status(404).json({ error: "Item not found" });

    item.usageCount += 1;
    item.status = "needs_sterilization";
    item.lastUsedAt = new Date();
    await item.save();

    res.json({ msg: "🧺 Autoclave item used", item });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 🔹 Sister sterilizes item (marks as sterilized)
 */
router.put("/item/:itemId/sterilize", auth, authorize(["sister_incharge"]), async (req, res) => {
  try {
    const item = await AutoclaveItem.findById(req.params.itemId);
    if (!item) return res.status(404).json({ error: "Item not found" });

    item.status = "sterilized";
    await item.save();

    // Update autoclave machine status too
    await Autoclave.findByIdAndUpdate(item.autoclave, { status: "free" });

    res.json({ msg: "✅ Item sterilized successfully", item });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 🔹 Update autoclave status manually
 */
router.put("/:id/status", auth, authorize(["sister_incharge", "hod"]), async (req, res) => {
  try {
    const { status } = req.body;
    const autoclave = await Autoclave.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    res.json({ msg: "Autoclave status updated", autoclave });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
