const express = require("express");
const VendorOrder = require("../models/VendorOrder");
const { auth } = require("../middleware/auth"); // ensure this matches your setup
const router = express.Router();
const Product = require("../models/Product");

// ✅ Create a single vendor order
router.post("/", auth, async (req, res) => {
  try {
    const { productName, quantity, vendorName, unitPrice, etaHours } = req.body;

    if (!productName || !quantity || !vendorName) {
      return res.status(400).json({ msg: "Missing required fields" });
    }

    const order = new VendorOrder({
      productName,
      quantity,
      vendorName,
      unitPrice,
      etaHours,
      orderedBy: req.user.id,
    });

    await order.save();
    res.json(order);
  } catch (err) {
    console.error("Error creating vendor order:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

// ✅ Create multiple vendor orders (batch)
router.post("/batch", auth, async (req, res) => {
  try {
    const items = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ msg: "Invalid request format. Expected an array of items." });
    }

    if (items.length > 10) {
      return res.status(400).json({ msg: "You can only order up to 10 products at once." });
    }

    const createdOrders = await VendorOrder.insertMany(
  items.map((item) => ({
    productName: item.productName,
    quantity: item.quantity,
    vendorName: item.vendorName,
    unitPrice: item.unitPrice,
    etaHours: item.etaHours, // <-- 🔥 ensure this is stored
    orderedBy: req.user.id,
    totalCost: item.quantity * item.unitPrice,
  }))
);


    res.json({ msg: "Batch orders created successfully", createdOrders });
  } catch (err) {
    console.error("❌ Error creating batch vendor orders:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

// ✅ Get all vendor orders
router.get("/", auth, async (req, res) => {
  try {
    const orders = await VendorOrder.find().sort({ orderedAt: -1 });
    res.json(orders);
  } catch (err) {
    console.error("Error fetching vendor orders:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

// 📌 Mark vendor order as received & update inventory
router.put("/:id/mark-received", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { billFile } = req.body;

    const order = await VendorOrder.findById(id);
    if (!order) return res.status(404).json({ msg: "Order not found" });

    // Update order status
    order.status = "received";
    order.receivedAt = new Date();
    order.receivedBy = req.user.id;
    if (billFile) order.billFile = billFile;

    // 🔍 Check if product exists in stock DB
    let product = await Product.findOne({ name: order.productName });

    if (product) {
      // ✳ Update quantity for existing product
      product.totalQuantity += order.quantity;
    } else {
      // 🆕 Create a new product record
      product = new Product({
        name: order.productName,
        vendor: order.vendorName || "",
        pricePerUnit: order.unitPrice || 0,
        totalQuantity: order.quantity,
        category: "General",
      });
    }

    await product.save();
    await order.save();

    res.json({
      msg: "📦 Inventory updated successfully",
      order,
      updatedStock: product,
    });
  } catch (err) {
    console.error("❌ Error marking order received:", err);
    res.status(500).json({ msg: "Server error" });
  }
});


module.exports = router;
