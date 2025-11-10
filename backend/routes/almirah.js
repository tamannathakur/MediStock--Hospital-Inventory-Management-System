const express = require("express");
const router = express.Router();
const { auth, authorize } = require("../middleware/auth"); // ✅ fixed import
const AlmirahInventory = require("../models/AlmirahInventory");

// 🧺 Get Almirah inventory (simplified schema, no nurse)
router.get("/", auth, async (req, res) => {
  console.log("🧭 [ALMIRAH] GET /api/almirah called");

  try {
    const almirah = await AlmirahInventory.findOne().populate("items.product");
    console.log("🧱 [ALMIRAH] Query result:", almirah);

    if (!almirah) {
      console.log("⚠️ [ALMIRAH] No almirah found in DB");
      return res.status(200).json({ msg: "No items found in almirah", items: [] });
    }

    if (!almirah.items || almirah.items.length === 0) {
      console.log("⚠️ [ALMIRAH] Almirah found but no items inside");
      return res.status(200).json({ msg: "No items found in almirah", items: [] });
    }

    const formattedItems = almirah.items.map((item) => ({
      productId: item.product?._id,
      name: item.product?.name || "Unknown Product",
      category: almirah.category,
      quantity: item.quantity,
      expiry: item.expiry || null,
    }));

    console.log("✅ [ALMIRAH] Sending formatted response:", formattedItems.length, "items");

    res.json({
      category: almirah.category,
      items: formattedItems,
    });
  } catch (err) {
    console.error("❌ [ALMIRAH] Error fetching inventory:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
});

// 🧺 Use a product from nurse’s almirah (reduce quantity)
router.put("/use/:productId", auth, authorize(["nurse"]), async (req, res) => {
  try {
    const nurseId = req.user.id;
    const { productId } = req.params;
    const { quantity } = req.body;

    if (!quantity || quantity <= 0) {
      return res.status(400).json({ msg: "Invalid quantity" });
    }

    // Find the nurse’s almirah
    const almirah = await AlmirahInventory.findOne();

    if (!almirah) {
      return res.status(404).json({ msg: "Almirah not found" });
    }

    // Find the product in almirah
    const item = almirah.items.find(
      (i) => i.product.toString() === productId.toString()
    );
    if (!item) {
      return res.status(404).json({ msg: "Product not found in almirah" });
    }

    // Ensure enough stock
    if (item.quantity < quantity) {
      return res.status(400).json({ msg: "Not enough quantity in almirah" });
    }

    // Deduct the quantity
    item.quantity -= quantity;

    // Remove if quantity hits 0
    if (item.quantity === 0) {
      almirah.items = almirah.items.filter(
        (i) => i.product.toString() !== productId.toString()
      );
    }

    await almirah.save();

    res.json({
      msg: `Used ${quantity} unit(s) of product successfully`,
      updatedItem: item,
    });
  } catch (err) {
    console.error("❌ Error using product:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;
