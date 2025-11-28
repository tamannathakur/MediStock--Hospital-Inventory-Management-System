const express = require("express");
const router = express.Router();
const { auth, authorize } = require("../../middleware/auth");
const Request = require("../../models/Request");
const Transaction = require("../../models/Transaction");
const Product = require("../../models/Product");


console.log("📦 [requests] request.hod.js loaded");

// HOD approval
// HOD approval
// HOD approval
router.put("/:id/approve-hod", auth, authorize(["hod"]), async (req, res) => {
  try {
    const request = await Request.findById(req.params.id).populate("product requestedBy");
    if (!request) return res.status(404).json({ msg: "Request not found" });

    // 🛑 If store_request → Always check central store first
    if (request.requestType === "store_request") {
      let enoughStock = true;

      for (const it of request.items) {
        const product = await Product.findById(it.productId);
        if (!product || product.totalQuantity < it.quantity) {
          enoughStock = false;
          break;
        }
      }

      if (!enoughStock) {
        // ❌ No stock → vendor needed
        request.status = "awaiting_vendor";
        request.vendorStatus = "awaiting_vendor";
        await request.save();

        await Transaction.create({
          from: { role: "hod" },
          to: { role: "inventory_staff" },
          initiatedBy: req.user.id,
          request: request._id,
          status: "awaiting_vendor",
          quantity: request.quantity
        });

        return res.json({
          msg: "Stock unavailable — Vendor required. Waiting for inventory staff ETA.",
          request,
        });
      }
    }

    // 🟢 Stock available → normal process continues
    request.status = "pending_inventory_approval";
    await request.save();

    await Transaction.create({
      from: { role: "hod" },
      to: { role: "inventory_staff" },
      initiatedBy: req.user.id,
      request: request._id,
      status: "pending_inventory_approval",
      quantity: request.quantity
    });

    res.json({
      msg: "HOD approved — Inventory staff to dispatch",
      request,
    });

  } catch (err) {
    console.error("HOD APPROVE ERROR:", err);
    res.status(500).json({ msg: err.message });
  }
});




module.exports = router;
