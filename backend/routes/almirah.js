const express = require("express");
const router = express.Router();
const { auth, authorize } = require("../middleware/auth"); // ✅ fixed import
const AlmirahInventory = require("../models/AlmirahInventory");

router.get("/", auth, async (req, res) => {
  try {
    const almirahs = await AlmirahInventory.find()
      .populate("items.product");

    // ✅ Filter out empty/malformed almirahs
    const validAlmirahs = almirahs.filter(a => Array.isArray(a.items) && a.items.length > 0);

    if (validAlmirahs.length === 0) {
      return res.status(200).json({ msg: "No items found in almirah", items: [] });
    }

    const formattedItems = validAlmirahs.flatMap((almirah) =>
      almirah.items.map((item) => ({
        productId: item.product?._id,
        name: item.product?.name || "Unknown Product",
        category: almirah.category,
        quantity: item.quantity,
        expiry: item.expiry || null,
        nurse: almirah.nurse || null,
      }))
    );

    res.json({
      totalAlmirahs: validAlmirahs.length,
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
