const express = require("express");
const router = express.Router();
const { auth, authorize } = require("../../middleware/auth");
const Request = require("../../models/Request");
const Product = require("../../models/Product");
const Transaction = require("../../models/Transaction");

console.log("📦 [requests] request.inventory.js loaded");

// Inventory staff: Approve inventory request (central stock dispatch)
// router.put("/:id/approve-inventory", auth, authorize(["inventory_staff"]), async (req, res) => {
//   try {
//     const request = await Request.findById(req.params.id).populate("product requestedBy");

//     if (!request) return res.status(404).json({ msg: "Request not found" });

//     // Must NOT approve if vendor not delivered yet
//     if (request.requestType === "store_request" && request.vendorStatus !== "received") {
//       return res.status(400).json({ msg: "Vendor has not delivered yet" });
//     }

//     const product = await Product.findById(request.product._id);
//     if (!product) return res.status(404).json({ msg: "Product not found in central inventory" });

//     // Deduct stock
//     if (product.totalQuantity < request.quantity) {
//       return res.status(400).json({ msg: "Not enough stock after vendor update" });
//     }

//     product.totalQuantity -= request.quantity;
//     await product.save();

//     request.status = "approved_and_sent";
//     await request.save();

//     await Transaction.create({
//       from: { role: "central_inventory" },
//       to: { role: "department" },
//       productId: product._id,
//       quantity: request.quantity,
//       initiatedBy: req.user._id,
//       request: request._id,
//       status: "approved_and_sent",
//     });

//     res.json({ msg: "Items dispatched to department", request });

//   } catch (err) {
//     console.error("APPROVE INVENTORY ERROR:", err);
//     res.status(500).json({ msg: err.message });
//   }
// });

router.put("/:id/approve-inventory", auth, authorize(["inventory_staff"]), async (req, res) => {
  try {
    const request = await Request.findById(req.params.id)
      .populate("product requestedBy");

    if (!request) return res.status(404).json({ msg: "Request not found" });

    // 🛑 Case 1 — Store Request
    if (request.requestType === "store_request") {
      if (!Array.isArray(request.items) || request.items.length === 0) {
        return res.status(400).json({ msg: "Store request is missing items" });
      }

      if (request.vendorStatus !== "received") {
        return res.status(400).json({ msg: "Vendor has not delivered yet" });
      }

      for (const item of request.items) {
        const product = await Product.findOne({ name: item.productName });

        if (!product || product.totalQuantity < item.quantity) {
          return res.status(400).json({ msg: `Not enough stock for item ${item.productName}` });
        }

        product.totalQuantity -= item.quantity;
        await product.save();

        await Transaction.create({
          from: { role: "central_inventory" },
          to: { role: "department" },
          productId: product._id,
          quantity: item.quantity,
          initiatedBy: req.user.id,
          request: request.id,
          status: "approved_and_sent"
        });
      }

      request.status = "approved_and_sent";
      await request.save();

      return res.json({ msg: "Store request items dispatched", request });
    }

    // 🟢 Case 2 — Normal Requests
    if (!request.product) return res.status(400).json({ msg: "Request missing product reference" });

    const product = await Product.findById(request.product._id);
    if (!product) return res.status(404).json({ msg: "Product not found" });

    if (product.totalQuantity < request.quantity) {
      return res.status(400).json({ msg: "Not enough stock" });
    }

    product.totalQuantity -= request.quantity;
    await product.save();

    request.status = "approved_and_sent";
    await request.save();

    await Transaction.create({
      from: { role: "central_inventory" },
      to: { role: "department" },
      productId: product._id,
      quantity: request.quantity,
      initiatedBy: req.user.id,
      request: request.id,
      status: "approved_and_sent"
    });

    res.json({ msg: "Normal request dispatched", request });

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
