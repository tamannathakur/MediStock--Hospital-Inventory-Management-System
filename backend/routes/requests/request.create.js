const express = require("express");
const router = express.Router();
const { auth, authorize } = require("../../middleware/auth");
const Request = require("../../models/Request");
const Product = require("../../models/Product");
const Transaction = require("../../models/Transaction");

console.log("📦 [requests] request.create.js loaded");

// Nurse / Sister create request
// router.post("/", auth, authorize(["nurse", "sister_incharge"]), async (req, res) => {
//   try {
//     const { productName, quantity, reason } = req.body;
//     if (!productName || !quantity) return res.status(400).json({ msg: "Product name and quantity required" });

//     // find product (case-insensitive)
//     let product = await Product.findOne({ name: new RegExp(`^${productName}$`, "i") });
//     console.log("requested by:", req.user.id);
//     // CASE A: product exists & enough stock => normal department request
//     if (product && product.totalQuantity >= quantity) {
//       const request = await Request.create({
//         product: product._id,
//         quantity,
//         reason,
//         requestType: "department",
//         requestedBy: req.user.id,
//         status: req.user.role === "nurse" ? "pending_sister_incharge" : "pending_hod",
//       });

//       await Transaction.create({
//         from: { role: req.user.role, departmentId: req.user.departmentId || null },
//         to: { role: "sister_incharge" },
//         productId: product._id,
//         quantity,
//         initiatedBy: req.user._id,
//         request: request._id,
//         status: request.status,
//       });

//       return res.json({ msg: "Normal department request created", request });
//     }
//     console.log("requested by:", req.user.id);
//     // CASE C: product exists but insufficient quantity => generate store_request (vendor)
//     if (product && product.totalQuantity < quantity) {
//       const storeRequest = await Request.create({
//         requestedBy: req.user.id,
//         requestType: "store_request",
//         product: null,
//         quantity,
//         items: [{ productId: product._id, productName, quantity }],
//         status: "pending_hod",
//         vendorStatus: null,
//       });

//       await Transaction.create({
//         from: { role: "inventory_staff" },
//         to: { role: "vendor" },
//         productId: product._id,
//         quantity,
//         initiatedBy: req.user._id,
//         request: storeRequest._id,
//         status: "awaiting_vendor",
//       });

//       return res.json({ msg: "Insufficient central stock → store request created", request: storeRequest });
//     }

//     // CASE B: product does not exist → create product (0 qty) + store request
//     product = await Product.create({ name: productName, totalQuantity: 0, category: "General" });
//     console.log("requested by:", req.user.id);
//     const storeRequest = await Request.create({
//       requestedBy: req.user.id,
//       requestType: "store_request",
//       product: null,
//       quantity,
//       items: [{ productId: product._id, productName, quantity }],
//       status: "pending_hod",
//       vendorStatus: null,
//     });

//     await Transaction.create({
//       from: { role: req.user.role },
//       to: { role: "hod" },
//       productId: product._id,
//       quantity,
//       initiatedBy: req.user._id,
//       request: storeRequest._id,
//       status: "pending_hod",
//     });

//     res.json({ msg: "Product created and vendor store-request created", request: storeRequest });

//   } catch (err) {
//     console.error("REQUEST CREATION ERROR:", err);
//     res.status(500).json({ msg: err.message });
//   }
// });
// Nurse / Sister create request
router.post("/", auth, authorize(["nurse", "sister_incharge"]), async (req, res) => {
  try {
    const { productName, quantity, reason } = req.body;
    if (!productName || !quantity) {
      return res.status(400).json({ msg: "Product name and quantity required" });
    }

    // Find product (case-insensitive)
    let product = await Product.findOne({ name: new RegExp(`^${productName}$`, "i") });

    // 👉 CASE 1: Product exists in hospital (central store knows about it)
    if (product) {
      const request = await Request.create({
        product: product._id,
        quantity,
        reason,
        requestType: "department",        // ⭐ always normal request
        requestedBy: req.user._id,
        status: req.user.role === "nurse"
          ? "pending_sister_incharge"
          : "pending_hod",
      });

      // Optional: log transaction for "request raised"
      await Transaction.create({
        from: { role: req.user.role },
        to: { role: "sister_incharge" },
        productId: product._id,
        quantity,
        initiatedBy: req.user._id,
        request: request._id,
        status: request.status,
      });

      return res.json({ msg: "Department request created", request });
    }

    // 👉 CASE 2: Product does NOT exist at all → THIS is a vendor/store case
    product = await Product.create({
      name: productName,
      totalQuantity: 0,
      category: "General",
    });

    const storeRequest = await Request.create({
      requestedBy: req.user._id,
      requestType: "store_request",
      product: null,
      quantity,
      items: [{ productId: product._id, productName, quantity }],
      status: "pending_hod",        // still goes via HOD
      vendorStatus: null,
    });

    await Transaction.create({
      from: { role: req.user.role },
      to: { role: "hod" },
      productId: null,
      quantity,
      initiatedBy: req.user._id,
      request: storeRequest._id,
      status: "pending_hod",
    });

    res.json({
      msg: "New item request created — HOD approval required before vendor",
      request: storeRequest,
    });

  } catch (err) {
    console.error("REQUEST CREATION ERROR:", err);
    res.status(500).json({ msg: err.message });
  }
});

module.exports = router;
