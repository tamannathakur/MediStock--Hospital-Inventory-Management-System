const express = require("express");
const router = express.Router();
const { auth, authorize } = require("../../middleware/auth");
const Request = require("../../models/Request");
const Product = require("../../models/Product");
const Transaction = require("../../models/Transaction");

console.log("📦 [requests] request.store.js loaded");


// Create a store-request (multi-item) — used when product not in central or insufficient
router.post("/store-request", auth, authorize(["nurse","sister_incharge","hod","inventory_staff","admin"]), async (req, res) => {
  try {
    console.log("🔐 AUTH HEADERS:", req.headers.authorization);
console.log("🔍 req.user BEFORE:", req.user);
     console.log("🔥 STORE-REQUEST HIT");
    const { items , reason} = req.body;
    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ msg: "Items array required" });

    const processed = [];
    let needsVendor = false;
    let totalQ = 0;

    for (const it of items) {
      const name = String(it.product).trim();
      const qty = Number(it.quantity) || 0;
      totalQ += qty;

      let product = await Product.findOne({ name: new RegExp(`^${name}$`, "i") });
       if (!product) {
        // New product → create placeholder
        product = await Product.create({ name, totalQuantity: 0, category: "General" });
        needsVendor = true;
      } else {
        if (product.totalQuantity < qty) needsVendor = true;
      }

      processed.push({
        productId: product._id,
        productName: name,
        quantity: qty,
        source: product.totalQuantity >= qty ? "central" : "vendor"
      });
    }

    let initialStatus = "pending_sister_incharge";

// Sister directly escalates to HOD
if (req.user.role === "sister_incharge") {
  initialStatus = "pending_hod";
}

// Inventory staff only steps in *after* HOD approval → NEVER initial requester
if (req.user.role === "inventory_staff") {
  initialStatus = "awaiting_vendor";
}

    const storeRequest = await Request.create({
      requestedBy: req.user._id,
      requestType: "store_request",
      items: processed,
      quantity: totalQ,
      status: initialStatus,
      vendorStatus: needsVendor ? null : "stored",
      vendorETA: null,
      requestedBy: req.user._id,
      vendorETAExpiresAt: null,
      reason,
    });

    await Transaction.create({
      from: { role: req.user.role },
      to: {
  role:
    initialStatus === "pending_sister_incharge"
      ? "Sister-In-Charge"
      : initialStatus === "pending_hod"
      ? "HOD"
      : "Inventory Staff" // awaiting_vendor → goes to inventory
},

      request: storeRequest._id,
      quantity: totalQ,
      productId: null,
      initiatedBy: req.user.id,
      status: initialStatus,
    });

    res.json({
      msg: needsVendor
        ? "Store request created — HOD approval required before vendor"
        : "Direct store dispatch possible",
      request: storeRequest
    });

  } catch (err) {
    console.error("STORE REQUEST ERROR", err);
    res.status(500).json({ msg: err.message });
  }
});

// Vendor delivers for a store-request (inventory staff marks vendor received)
router.put("/:id/vendor-received", auth, authorize(["inventory_staff"]), async (req, res) => {
  try {
    console.log("🔥 vendor-received HIT for ID:", req.params.id);
    console.log("req.user = ", req.user);

    const request = await Request.findById(req.params.id);
    if (!request) return res.status(404).json({ msg: "Request not found" });

    if (request.requestType !== "store_request") return res.status(400).json({ msg: "Not a store-request" });
    if (request.status !== "awaiting_vendor") return res.status(400).json({ msg: "Request not awaiting vendor" });

    // add delivered quantities to central store
    for (const item of request.items) {
      if (!item.productId) continue;
      const product = await Product.findById(item.productId);
      if (!product) {
        console.warn("STORE -> productId not found:", item.productId);
        continue;
      }
      product.totalQuantity = (product.totalQuantity || 0) + (item.quantity || 0);
      await product.save();
    }

    request.vendorStatus = "received";
    request.status = "pending_inventory_approval"; // now inventory can dispatch
    request.vendorETAExpiresAt = null;
    request.vendorETA = null;

    request.vendorReminderSent = true;
    await request.save();

    await Transaction.create({
      from: { role: "vendor" },
      to: { role: "central_inventory" },
      productId: null,
      quantity: request.quantity,
      initiatedBy: req.user.id,
      request: request._id,
      status: "received",
    });

    res.json({ msg: "Vendor delivered and central store updated", request });

  } catch (err) {
    console.error("VENDOR-RECEIVED ERROR:", err);
    res.status(500).json({ msg: err.message });
  }
});

// Inventory approves & sends items in store-request to department
router.put("/:id/approve-store-request", auth, authorize(["inventory_staff"]), async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);
    if (!request) return res.status(404).json({ msg: "Store request not found" });
    const etaHours = parseInt(req.body.vendorETA);
    if (!request.vendorETA && etaHours > 0) {
      // Set ETA NOW — only when inventory staff decides
      request.status = "awaiting_vendor";
      request.vendorStatus = "awaiting_vendor";
      request.vendorETA = `${etaHours} hours`;
      request.vendorETAExpiresAt = new Date(Date.now() + etaHours * 3600000);
      await request.save();
      return res.json({
        msg: "Vendor ETA assigned by inventory staff",
        request
      });
    }
    if (request.requestType !== "store_request") return res.status(400).json({ msg: "Not a store-request" });
    if (!["awaiting_vendor", "fulfilled", "pending_inventory_approval"].includes(request.status)) {
      return res.status(400).json({ msg: "Store request not ready for approval" });
    }

    // set to approved and sent
    request.status = "approved_and_sent";
    request.vendorStatus = "stored";
    await request.save();

    await Transaction.create({
      from: { role: "central_inventory" },
      to: { role: "department" },
      productId: null,
      quantity: request.quantity,
      initiatedBy: req.user.id,
      request: request._id,
      status: "approved_and_sent",
    });

    res.json({ msg: "Store request approved & dispatched to department", request });

  } catch (err) {
    console.error("APPROVE-STORE-REQUEST ERROR:", err);
    res.status(500).json({ msg: err.message });
  }
});

module.exports = router;
