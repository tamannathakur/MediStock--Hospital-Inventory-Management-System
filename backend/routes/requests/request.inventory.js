const express = require("express");
const router = express.Router();
const { auth, authorize } = require("../../middleware/auth");
const Request = require("../../models/Request");
const Product = require("../../models/Product");
const Transaction = require("../../models/Transaction");

console.log("📦 [requests] request.inventory.js loaded");

// Inventory staff: Approve inventory request (central stock dispatch OR vendor ETA)
router.put("/:id/approve-inventory", auth, authorize(["inventory_staff"]), async (req, res) => {
  try {
    const request = await Request.findById(req.params.id).populate("product requestedBy");
    if (!request) return res.status(404).json({ msg: "Request not found" });

    // Store-requests must be handled via store routes
    if (request.requestType === "store_request") {
      return res.status(400).json({ msg: "Use /approve-store-request for store requests" });
    }

    // Safety: ensure request.product exists
    if (!request.product) return res.status(400).json({ msg: "Request has no product" });

    const product = await Product.findById(request.product._id);
    if (!product) return res.status(404).json({ msg: "Product not found in central inventory" });

    // If insufficient stock → create vendor ETA
    if (product.totalQuantity < request.quantity) {
      const eta = req.body.vendorETA || "48"; // hours number (frontend should send numeric or "48")
      const hours = parseInt(String(eta), 10) || 48;

      request.status = "awaiting_vendor";
      request.vendorStatus = "awaiting_vendor";
      request.vendorETA = `${hours} hours`;
      request.vendorETAExpiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
      request.vendorReminderSent = false;
      await request.save();

      await Transaction.create({
        from: { role: "inventory_staff" },
        to: { role: "vendor" },
        productId: request.product._id,
        quantity: request.quantity,
        initiatedBy: req.user._id,
        request: request._id,
        status: "awaiting_vendor",
      });

      return res.json({ msg: "Insufficient stock → vendor ETA set", request });
    }

    // Enough stock → deduct & dispatch
    product.totalQuantity -= request.quantity;
    await product.save();

    request.status = "approved_and_sent";
    request.vendorStatus = null;
    await request.save();

    await Transaction.create({
      from: { role: "central_inventory" },
      to: { role: "department", departmentId: request.requestedBy.departmentId || null },
      productId: request.product._id,
      quantity: request.quantity,
      initiatedBy: req.user._id,
      receivedBy: request.requestedBy._id,
      request: request._id,
      status: "approved_and_sent",
    });

    res.json({ msg: "Items dispatched from central inventory", request });

  } catch (err) {
    console.error("APPROVE INVENTORY ERROR:", err);
    res.status(500).json({ msg: err.message });
  }
});

// Inventory staff: Fulfill simple requests (add to department / almirah) — kept for legacy/utility
router.put("/:id/fulfill", auth, authorize(["inventory_staff"]), async (req, res) => {
  try {
    const request = await Request.findById(req.params.id).populate("product requestedBy");
    if (!request) return res.status(404).json({ msg: "Request not found" });

    // Basic fulfillment — this route can be used for direct fulfill actions if needed
    request.status = "fulfilled";
    request.fulfilledBy = req.user._id;
    await request.save();

    await Transaction.create({
      from: { role: "inventory_staff" },
      to: { role: "department", departmentId: request.requestedBy.departmentId || null },
      productId: request.product?._id || null,
      quantity: request.quantity,
      initiatedBy: req.user._id,
      request: request._id,
      status: "fulfilled",
    });

    res.json({ msg: "Request fulfilled by inventory staff", request });

  } catch (err) {
    console.error("FULFILL ERROR:", err);
    res.status(500).json({ msg: err.message });
  }
});

module.exports = router;
