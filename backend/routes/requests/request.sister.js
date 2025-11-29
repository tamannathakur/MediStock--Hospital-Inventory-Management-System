const express = require("express");
const router = express.Router();
const { auth, authorize } = require("../../middleware/auth");
const Request = require("../../models/Request");
const DepartmentInventory = require("../../models/DepartmentInventory");
const AlmirahInventory = require("../../models/AlmirahInventory");
const Transaction = require("../../models/Transaction");
const Product = require("../../models/Product");

console.log("📦 [requests] request.sister.js loaded");

// Sister In-Charge approval (from nurse -> sister)
router.put("/:id/approve-sister", auth, authorize(["sister_incharge"]), async (req, res) => {
  try {
    const request = await Request.findById(req.params.id).populate("product requestedBy");
    if (!request) return res.status(404).json({ msg: "Request not found" });

    // If this is a store_request, sister can't approve stock — escalate to HOD/inventory
    if (request.requestType === "store_request") {
  request.status = "pending_hod";
  request.approvedBy = req.user._id;
  await request.save();

  await Transaction.create({
    from: { role: "sister_incharge" },
    to: { role: "hod" },
    request: request._id,
    productId: null,
    quantity: request.quantity,
    initiatedBy: req.user.id,
    status: "pending_hod",
  });

  return res.json({
    msg: "Store request forwarded to HOD",
    request
  });
}


    // Check department stock for the product
    const deptProduct = await DepartmentInventory.findOne({ product: request.product._id });

    if (deptProduct && deptProduct.quantity >= request.quantity) {
      // Deduct
      deptProduct.quantity -= request.quantity;
      await deptProduct.save();

      // Add to nurse's almirah
      let almirah = await AlmirahInventory.findOne({ nurse: request.requestedBy._id });
      if (!almirah) {
        almirah = await AlmirahInventory.create({
          nurse: request.requestedBy._id,
          category: request.product.category || "Consumables",
          items: [],
        });
      }

      const existing = almirah.items.find(i => i.product.toString() === request.product._id.toString());
      if (existing) existing.quantity += request.quantity;
      else almirah.items.push({ product: request.product._id, quantity: request.quantity, expiry: request.product.expiryDate || null });

      await almirah.save();

      request.status = "fulfilled";
      request.approvedBy = req.user._id;
      request.fulfilledBy = req.user._id;
      await request.save();

      await Transaction.create({
        from: { role: "department", departmentId: req.user.departmentId || null },
        to: { role: "almirah" },
        productId: request.product._id,
        quantity: request.quantity,
        initiatedBy: request.requestedBy._id,
        receivedBy: req.user._id,
        request: request._id,
        status: "fulfilled",
      });

      return res.json({ msg: "Approved & delivered from department store", request });
    }

    // Not available in department -> escalate to HOD
    request.status = "pending_hod";
    request.approvedBy = req.user._id;
    await request.save();

    await Transaction.create({
      from: { role: "sister_incharge", departmentId: req.user.departmentId || null },
      to: { role: "hod" },
      productId: request.product?._id || null,
      quantity: request.quantity,
      initiatedBy: request.requestedBy._id,
      receivedBy: req.user._id,
      request: request._id,
      status: "pending_hod",
    });

    res.json({ msg: "Forwarded to HOD for approval", request });

  } catch (err) {
    console.error("SISTER APPROVE ERROR:", err);
    res.status(500).json({ msg: err.message });
  }
});

// Sister In-Charge marks as received (when central inventory sent items)
// router.put("/:id/mark-received", auth, authorize(["sister_incharge"]), async (req, res) => {
//   console.log("🔍 MARK-RECEIVED CALLED");
//   console.log("🔐 AUTH HEADERS:", req.headers.authorization);
//   console.log("🔐 req.user:", req.user);

//   try {
//     const request = await Request.findById(req.params.id).populate("product requestedBy");
//     if (!request) return res.status(404).json({ msg: "Request not found" });

//     if (!["approved_and_sent", "fulfilled"].includes(request.status)) {
//       return res.status(400).json({ msg: "Request not ready to be marked received" });
//     }

//     request.status = "fulfilled";
//     await request.save();

//     // If sister had requested (dept), update DepartmentInventory
//     if (request.requestedBy.role === "sister_incharge") {
//       const deptItem = await DepartmentInventory.findOne({ product: request.product._id });
//       if (deptItem) {
//         deptItem.quantity += request.quantity;
//         await deptItem.save();
//       } else {
//         await DepartmentInventory.create({
//           product: request.product._id,
//           quantity: request.quantity,
//           category: request.product.category || "Others",
//         });
//       }
//     }

//     // If nurse requested, add to nurse almirah
//     if (request.requestedBy.role === "nurse") {
//       let almirah = await AlmirahInventory.findOne({ nurse: request.requestedBy._id });
//       if (!almirah) {
//         almirah = await AlmirahInventory.create({
//           nurse: request.requestedBy._id,
//           category: request.product.category || "Consumables",
//           items: [],
//         });
//       }

//       const existing = almirah.items.find(i => i.product.toString() === request.product._id.toString());
//       if (existing) existing.quantity += request.quantity;
//       else almirah.items.push({ product: request.product._id, quantity: request.quantity, expiry: request.product.expiryDate || null });

//       await almirah.save();
//     }

//     await Transaction.create({
//       from: { role: "department", departmentId: req.user.departmentId || null },
//       to: { role: request.requestedBy.role === "nurse" ? "almirah" : "department" },
//       productId: request.product._id,
//       quantity: request.quantity,
//       initiatedBy: req.user._id,
//       receivedBy: request.requestedBy._id,
//       request: request._id,
//       status: "fulfilled",
//     });

//     res.json({ msg: "Items received and stored in appropriate inventory", request });

//   } catch (err) {
//     console.error("MARK RECEIVED ERROR:", err);
//     res.status(500).json({ msg: err.message });
//   }
// });
// Sister In-Charge marks as received (when central inventory sent items)

// router.put("/:id/mark-received", auth, authorize(["sister_incharge"]), async (req, res) => {
//   console.log("🔍 MARK-RECEIVED CALLED");
//   console.log("🔐 req.user:", req.user);

//   try {
//     const request = await Request.findById(req.params.id)
//       .populate("requestedBy items.productName");

//     if (!request) return res.status(404).json({ msg: "Request not found" });

//     // Request must be approved and sent from inventory
//     if (!["approved_and_sent", "fulfilled"].includes(request.status)) {
//       return res.status(400).json({ msg: "Request not ready to be marked received" });
//     }

//     request.status = "fulfilled";
//     await request.save();

//     // ========= MULTI ITEM STORE REQUEST LOGIC ==========
//     if (request.requestType === "store_request" && Array.isArray(request.items)) {
//       console.log("🧾 Handling Store Multi-Item Receive...");

//       for (const item of request.items) {
//         if (!item.product) continue;

//         // Update nurse almirah
//         let almirah = await AlmirahInventory.findOne({
//           nurse: request.requestedBy._id
//         });

//         if (!almirah) {
//           almirah = await AlmirahInventory.create({
//             nurse: request.requestedBy._id,
//             items: []
//           });
//         }

//         const exists = almirah.items.find(
//           i => i.product.toString() === item.product._id.toString()
//         );

//         if (exists) exists.quantity += item.quantity;
//         else almirah.items.push({ product: item.product._id, quantity: item.quantity });

//         await almirah.save();

//         // Transaction per product line
//         await Transaction.create({
//           from: { role: "central_inventory" },
//           to: { role: "department" },
//           productId: item.product._id,
//           quantity: item.quantity,
//           initiatedBy: req.user.id,
//           receivedBy: request.requestedBy._id,
//           request: request._id,
//           status: "fulfilled"
//         });
//       }

//       return res.json({
//         msg: "Store request items received & added to nurse almirah",
//         request
//       });
//     }

//     // ========= SINGLE PRODUCT NORMAL REQUEST ==========
//     const product = request.product;
//     if (!product) return res.json({ msg: "No product found", request });

//     // Update almirah if nurse requested
//     if (request.requestedBy.role === "nurse") {
//       let almirah = await AlmirahInventory.findOne({
//         nurse: request.requestedBy._id
//       });

//       if (!almirah) {
//         almirah = await AlmirahInventory.create({
//           nurse: request.requestedBy._id,
//           items: []
//         });
//       }

//       const exists = almirah.items.find(
//         i => i.product.toString() === product._id.toString()
//       );

//       if (exists) exists.quantity += request.quantity;
//       else almirah.items.push({ product: product._id, quantity: request.quantity });

//       await almirah.save();
//     }

//     await Transaction.create({
//       from: { role: "central_inventory" },
//       to: { role: request.requestedBy.role === "nurse" ? "almirah" : "department" },
//       productId: product._id,
//       quantity: request.quantity,
//       initiatedBy: req.user.id,
//       receivedBy: request.requestedBy._id,
//       request: request._id,
//       status: "fulfilled"
//     });

//     res.json({
//       msg: "Item received successfully",
//       request
//     });

//   } catch (err) {
//     console.error("MARK RECEIVED ERROR:", err);
//     res.status(500).json({ msg: err.message });
//   }
// });

router.put("/:id/mark-received", auth, authorize(["sister_incharge"]), async (req, res) => {
  try {
    const request = await Request.findById(req.params.id)
      .populate("product")
      .populate("requestedBy", "name role email"); // ensure role is always included

if (request.requestedBy) {
  console.log("🎯 requestedBy Role:", request.requestedBy.role || "NO ROLE FIELD");
} else {
  console.log("❌ requestedBy is MISSING!");
}

console.log("🛒 Items for store_request:", request.items || "NO ITEMS");

    console.log("request status",request.status);
    if (!request) return res.status(404).json({ msg: "Request not found" });

    if (!["approved_and_sent", "approved", "awaiting_nurse_receive","fulfilled"].includes(request.status)) {
      return res.status(400).json({ msg: "Request not ready to be marked received" });
    }

    request.status = "fulfilled";
    request.fulfilledBy = req.user._id;
    await request.save();

    // 🧾 MULTI-ITEM STORE REQUEST
    if (request.requestType === "store_request" && Array.isArray(request.items)) {
      for (const item of request.items) {
        const productDoc = await Product.findOne({ name: item.productName });
        if (!productDoc) continue;

        if (request.requestedBy.role === "sister_incharge") {
          await addToDepartment(productDoc._id, item.quantity);
        } else {
          await addToAlmirah(request.requestedBy._id, productDoc._id, item.quantity);
        }

        await logTransaction(req.user, request, productDoc._id, item.quantity);
      }

      return res.json({ msg: "Store request items received", request });
    }


    // 🧺 SINGLE PRODUCT REQUEST
    const product = request.product;
    if (!product) return res.json({ msg: "Product missing", request });

    if (request.requestedBy.role === "nurse") {
      await addToAlmirah(request.requestedBy._id, product._id, request.quantity);
    } else {
      await addToDepartment(product._id, request.quantity);
    }

    await logTransaction(req.user, request, product._id, request.quantity);

    res.json({ msg: "Item received into correct inventory", request });

  } catch (err) {
    console.error("MARK RECEIVED ERROR:", err);
    res.status(500).json({ msg: err.message });
  }
});
async function addToAlmirah(nurseId, productId, qty, expiry = null) {
  let almirah = await AlmirahInventory.findOne({ nurse: nurseId });
  
  if (!almirah) {
    almirah = await AlmirahInventory.create({
      nurse: nurseId,
      category: "Consumables",
      items: []
    });
  }

  const item = almirah.items.find(i => i.product.toString() === productId.toString());
  if (item) {
    item.quantity += qty;
  } else {
    almirah.items.push({ product: productId, quantity: qty, expiry });
  }

  return almirah.save();
}

async function addToDepartment(productId, qty, expiry = null) {
  let deptItem = await DepartmentInventory.findOne({ product: productId });

  if (deptItem) {
    deptItem.quantity += qty;
  } else {
    deptItem = await DepartmentInventory.create({
      product: productId,
      quantity: qty,
      expiry,
      category: "Consumables"
    });
  }

  return deptItem.save();
}


async function logTransaction(user, request, productId, qty) {

  console.log("user: ", user);
  return Transaction.create({
    from: { role: "central_inventory" },
    to: { role: request.requestedBy.role === "nurse" ? "almirah" : "department" },
    productId,
    quantity: qty,
    initiatedBy: user.id,
    receivedBy: request.requestedBy._id,
    request: request.id,
    status: "fulfilled",
  });
}


module.exports = router;
