const express = require("express");
const router = express.Router();
const { auth, authorize } = require("../middleware/auth");
const Request = require("../models/Request");
const DepartmentInventory = require("../models/DepartmentInventory");
const AlmirahInventory = require("../models/AlmirahInventory");
const Product = require("../models/Product");
const Transaction = require("../models/Transaction");


// 🧑‍⚕️ Nurse creates request
// 🧑‍⚕️ Nurse/Sister creates a request
router.post("/", auth, authorize(["nurse", "sister_incharge"]), async (req, res) => {
  try {
    const { productName, quantity, reason } = req.body;

    if (!productName || !quantity)
      return res.status(400).json({ msg: "Product name and quantity required" });

    // 1️⃣ Check if product already exists in Product collection
    let product = await Product.findOne({ name: new RegExp(`^${productName}$`, "i") });

    // CASE A: Product exists → NORMAL REQUEST
    if (product) {
      const request = await Request.create({
        product: product._id,
        quantity,
        reason,
        requestType: "department",
        requestedBy: req.user.id,
        status: req.user.role === "nurse"
          ? "pending_sister_incharge"
          : "pending_hod",
      });

      await Transaction.create({
        from: { role: "Nurse" },
        to: { role: "Sister-In-Charge" },
        productId: product._id,
        quantity,
        initiatedBy: req.user.id,
        request: request._id,
        status: "pending_sister_incharge",
      });

      return res.json({ msg: "Normal request created", request });
    }

    // CASE B: Product does NOT exist → STORE REQUEST
    // create NEW product entry with 0 quantity
    product = await Product.create({
      name: productName,
      totalQuantity: 0,
      category: "General"
    });

    const storeRequest = await Request.create({
      requestedBy: req.user.id,
      requestType: "store_request",
      product: null,
      quantity,
      items: [{
        productId: product._id,
        productName,
        quantity
      }],
      status: "awaiting_vendor",
      vendorStatus: "awaiting_vendor",
    });

    await Transaction.create({
      from: { role: "Inventory Staff" },
      to: { role: "Vendor" },
      productId: product._id,
      quantity,
      initiatedBy: req.user.id,
      request: storeRequest._id,
      status: "awaiting_vendor",
    });

    return res.json({
      msg: "Product not found → Store Request sent to Inventory Staff",
      request: storeRequest
    });

  } catch (err) {
    console.error("REQUEST CREATION ERROR:", err);
    res.status(500).json({ msg: err.message });
  }
});


// ❌ Sister or HOD rejects a request
router.put("/:id/reject", auth, authorize(["sister_incharge", "hod"]), async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);
    if (!request) return res.status(404).json({ msg: "Request not found" });

    request.status = "rejected";
    request.approvedBy = req.user.id;
    await request.save();

    res.json({ msg: "Request rejected", request });
    
  } catch (err) {
    console.error("❌ Reject request error:", err);
    res.status(400).json({ error: err.message });
  }
});

// 👩‍⚕️ Sister In-Charge approves
router.put("/:id/approve-sister", auth, authorize(["sister_incharge"]), async (req, res) => {
  try {
    const request = await Request.findById(req.params.id).populate("product");
    if (!request) return res.status(404).json({ msg: "Request not found" });

    // Find the product in department inventory
    const deptProduct = await DepartmentInventory.findOne({
      product: request.product._id,
    });

    // ✅ CASE 1: If available in Department store
    if (deptProduct && deptProduct.quantity >= request.quantity) {
      // Deduct from department inventory
      deptProduct.quantity -= request.quantity;
      await deptProduct.save();

      // Find or create nurse's almirah
      let almirah = await AlmirahInventory.findOne({ nurse: request.requestedBy });
      if (!almirah) {
        almirah = new AlmirahInventory({
          nurse: request.requestedBy,
          category: request.product.category || "Consumables",
          items: [],
        });
      }

      // Find if the product already exists in nurse’s almirah
      const existingItem = almirah.items.find(
        (i) => i.product.toString() === request.product._id.toString()
      );

      if (existingItem) {
        existingItem.quantity += request.quantity;
      } else {
        almirah.items.push({
          product: request.product._id,
          quantity: request.quantity,
          expiry: request.product.expiryDate || null,
        });
      }

      await almirah.save();

      // ✅ Update request status
      request.status = "fulfilled";
      request.approvedBy = req.user.id;
      request.fulfilledBy = req.user.id;
      await request.save();

      const transaction = new Transaction({
  from: { role: "Department" },
  to: { role: "Almirah" },
  productId: request.product._id,
  quantity: request.quantity,
  initiatedBy: request.requestedBy, // Nurse initiated the request
  receivedBy: req.user._id,         // Sister fulfilled it
  request: request._id,
  status: "fulfilled",
});
await transaction.save();

      return res.json({
        msg: "✅ Approved and fulfilled by Sister-In-Charge (from department stock)",
        request,
      });
    }

    // ❌ CASE 2: Not available → escalate to HOD
    request.status = "pending_hod";
    request.approvedBy = req.user.id;
    await request.save();
    
    // ✅ Log transaction: Sister → HOD
const transaction = new Transaction({
  from: { role: "Sister-In-Charge" },
  to: { role: "HOD" },
  productId: request.product._id,
  quantity: request.quantity,
  initiatedBy: request.requestedBy,
  receivedBy: req.user._id,
  request: request._id,
  status: "pending_hod",
});
await transaction.save();

    res.json({ msg: "⏳ Forwarded to HOD for approval", request });


  } catch (err) {
    console.error("❌ Sister approve error:", err);
    res.status(400).json({ error: err.message });
  }
});


// 📦 Inventory Staff fulfills
router.put("/:id/fulfill", auth, authorize(["inventory_staff"]), async (req, res) => {
  try {
    const request = await Request.findById(req.params.id)
      .populate("product requestedBy approvedBy fulfilledBy");

    if (!request) return res.status(404).json({ msg: "Request not found" });

    // Determine who raised the request
    const requestedUser = request.requestedBy;
    if (!requestedUser) return res.status(404).json({ msg: "Requesting user not found" });

    if (requestedUser.role === "sister_incharge") {
      // 🏬 Sister’s request → goes to DepartmentInventory
      await DepartmentInventory.findOneAndUpdate(
        { product: request.product._id },
        { $inc: { quantity: request.quantity } },
        { upsert: true, new: true }
      );

      request.status = "fulfilled";
      request.fulfilledBy = req.user.id;
      await request.save();

      return res.json({
        msg: "✅ Fulfilled and added to Department Inventory",
        request,
      });

    } else if (requestedUser.role === "nurse") {
      // 🧺 Nurse’s request → goes directly to Almirah

      let nurseAlmirah = await AlmirahInventory.findOne({ nurse: requestedUser._id });
      if (!nurseAlmirah) {
        nurseAlmirah = new AlmirahInventory({
          nurse: requestedUser._id,
          category: request.product.category || "Consumables",
          items: [],
        });
      }

      const existingItem = nurseAlmirah.items.find(
        (i) => i.product.toString() === request.product._id.toString()
      );

      if (existingItem) {
        existingItem.quantity += request.quantity;
      } else {
        nurseAlmirah.items.push({
          product: request.product._id,
          quantity: request.quantity,
          expiry: request.product.expiryDate || null,
        });
      }

      await nurseAlmirah.save();

      request.status = "fulfilled";
      request.fulfilledBy = req.user.id;
      await request.save();

      return res.json({
        msg: "✅ Fulfilled and delivered to Nurse’s Almirah",
        request,
      });
    }

    res.status(400).json({ msg: "Invalid request flow or role" });

  } catch (err) {
    console.error("❌ Fulfill error:", err);
    res.status(400).json({ error: err.message });
  }
});


// // ✅ Step 3: Inventory Staff Approval & Dispatch
// router.put("/:id/approve-inventory", auth, authorize(["inventory_staff"]), async (req, res) => {
//   try {
//     const request = await Request.findById(req.params.id)
//       .populate("product", "name")
//       .populate("requestedBy", "_id name role");

//     if (!request) return res.status(404).json({ msg: "Request not found" });

//     // ✅ Deduct from central stock (Product)
//     const product = await Product.findById(request.product._id);
//     if (!product) return res.status(404).json({ msg: "Product not found in central inventory" });

//     if (product.quantity < request.quantity) {
//       return res.status(400).json({ msg: "Insufficient stock in central inventory" });
//     }

//     product.quantity -= request.quantity;
//     await product.save();

//     // ✅ Update request status
//     request.status = "approved_and_sent";
//     await request.save();

//     console.log("🟡 initiatedByUser:", initiatedByUser);
//     if (!initiatedByUser) {
//       throw new Error("initiatedByUser is undefined — auth or request missing");
//     }

//     const transaction = new Transaction({
//   from: { role: "Central Inventory" },
//   to: { role: "Department" },
//   productId: request.product._id,
//   quantity: request.quantity,
//   initiatedBy: req.user._id,
//   receivedBy: request.requestedBy,
//   request: request._id,
//   status: "approved_and_sent",
// });
// await transaction.save();
//     res.json({ msg: "Inventory staff approved and dispatched items successfully.", request });
//   } catch (err) {
//     console.error("❌ Error in approve-inventory route:", err.message, err.stack);
// res.status(500).json({ msg: err.message || "Server error" });
//   }
// });



// Step 2: HOD Approval
router.put("/:id/approve-hod", auth, authorize(["hod"]), async (req, res) => {
  const request = await Request.findById(req.params.id);
  request.status = "pending_inventory_approval";
  await request.save();

  const transaction = new Transaction({
    from: { role: "HOD" },
    to: { role: "Inventory Staff" },
    productId: request.product,
    quantity: request.quantity,
    initiatedBy: request.requestedBy,
    request: request._id,
    status: "pending_inventory_approval",
  });
  await transaction.save();
  res.json({ msg: "Request approved by HOD and sent to inventory staff." });
});


// // 📦 Inventory Staff fulfills
// router.put("/:id/fulfill", auth, authorize(["inventory_staff"]), async (req, res) => {
//   try {
//     const request = await Request.findById(req.params.id);
//     if (!request) return res.status(404).json({ msg: "Request not found" });

//     request.status = "fulfilled";
//     request.fulfilledBy = req.user.id;
//     await request.save();

//     res.json({ msg: "Fulfilled by Inventory Staff", request });
//   } catch (err) {
//     res.status(400).json({ error: err.message });
//   }
// });

// ✅ Step 3: Inventory Staff Approval & Dispatch
router.put("/:id/approve-inventory", auth, authorize(["inventory_staff"]), async (req, res) => {
  try {
    // 🧠 Fetch the request
    const request = await Request.findById(req.params.id)
      .populate("product", "name")
      .populate("requestedBy", "_id name role");


    if (!request) return res.status(404).json({ msg: "Request not found" });

    // ✅ Get product and verify stock
    const product = await Product.findById(request.product._id);
    
    // ❌ If central store does NOT have enough stock
if (!product || product.totalQuantity < request.quantity) {

  const eta = req.body.vendorETA || "48 hours"; // dynamic time sent by Inventory Staff
  const hours = parseInt(eta);                   // extract numeric hours

  request.status = "awaiting_vendor";
  request.vendorStatus = "awaiting_vendor";
  request.vendorETA = eta;
  request.vendorETAExpiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
  request.vendorReminderSent = false;

  await request.save();

  const transaction = new Transaction({
    from: { role: "Inventory Staff" },
    to: { role: "Vendor" },
    productId: request.product?._id || null,
    quantity: request.quantity,
    initiatedBy: req.user._id,
    request: request._id,
    status: "awaiting_vendor",
  });
  await transaction.save();

  return res.json({
    msg: `❌ Not in stock. Vendor arranged. ETA: ${request.vendorETA}`,
    request
  });
}

    

    // ✅ Deduct quantity
    product.totalQuantity -= request.quantity;
    await product.save();

    // ✅ Update request status
    request.status = "approved_and_sent";
    await request.save();

    // ✅ Assign initiatedByUser safely
    const initiatedByUser =
      (request.requestedBy && request.requestedBy._id) ||
      (req.user && req.user.id);

    if (!initiatedByUser) {
      throw new Error("initiatedByUser is undefined — missing user context");
    }

    // ✅ Create and save transaction
    const transaction = new Transaction({
      from: { role: "Central Inventory" },
      to: { role: "Department" },
      productId: request.product._id,
      quantity: request.quantity,
      initiatedBy: initiatedByUser,
      receivedBy: request.requestedBy?._id || null,
      request: request._id,
      status: "approved_and_sent",
      date: new Date(),
    });

    await transaction.save();
    res.json({
      msg: "✅ Inventory staff approved and dispatched items successfully.",
      request,
    });
  } catch (err) {
    console.error("❌ Error in approve-inventory route:", err);
    res.status(500).json({ msg: err.message });
  }
});

router.put("/:id/approve-inventory", auth, authorize(["inventory_staff"]), async (req, res) => {
  try {
    const request = await Request.findById(req.params.id)
      .populate("product", "name")
      .populate("requestedBy", "_id name role");

    if (!request) return res.status(404).json({ msg: "Request not found" });

    // 🛑 Store requests should NOT come here — they use approve-store-request
    if (request.requestType === "store_request") {
      return res.status(400).json({ msg: "Use /approve-store-request for store requests" });
    }

    // 🛑 Safety check
    if (!request.product) {
      return res.status(400).json({ msg: "No product found for this request" });
    }

    // Now proceed normally
    const product = await Product.findById(request.product._id);
    if (!product) return res.status(404).json({ msg: "Product not found" });

    if (product.totalQuantity < request.quantity) {
      const eta = req.body.vendorETA || "48 hours";
      const hours = parseInt(eta);

      request.status = "awaiting_vendor";
      request.vendorStatus = "awaiting_vendor";
      request.vendorETA = eta;
      request.vendorETAExpiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
      request.vendorReminderSent = false;
      await request.save();

      await Transaction.create({
        from: { role: "Inventory Staff" },
        to: { role: "Vendor" },
        productId: request.product._id,
        quantity: request.quantity,
        initiatedBy: req.user._id,
        request: request._id,
        status: "awaiting_vendor",
      });

      return res.json({
        msg: `Not in stock. Vendor will supply. ETA: ${request.vendorETA}`,
        request
      });
    }

    // Deduct stock
    product.totalQuantity -= request.quantity;
    await product.save();

    request.status = "approved_and_sent";
    await request.save();

    await Transaction.create({
      from: { role: "Central Inventory" },
      to: { role: "Department" },
      productId: request.product._id,
      quantity: request.quantity,
      initiatedBy: req.user._id,
      receivedBy: request.requestedBy._id,
      request: request._id,
      status: "approved_and_sent",
    });

    res.json({ msg: "Approved & dispatched successfully", request });

  } catch (err) {
    console.error("❌ approve-inventory error:", err);
    res.status(500).json({ msg: err.message });
  }
});


// router.put("/:id/vendor-received", auth, authorize(["inventory_staff"]), async (req, res) => {
//   try {
//     const request = await Request.findById(req.params.id);
//     if (!request) return res.status(404).json({ msg: "Request not found" });

//     if (request.requestType !== "store_request") {
//       return res.status(400).json({ msg: "Not a store-request" });
//     }

//     if (request.status !== "awaiting_vendor") {
//       return res.status(400).json({ msg: "Request is not awaiting vendor delivery" });
//     }

//     // 🔥 Process each item independently
//     for (const item of request.items) {
//       const product = await Product.findById(item.productId);

//       if (!product) continue; // shouldn't happen

//       // 🟩 Add delivered quantity to central store
//       product.totalQuantity += item.quantity;
//       await product.save();
//     }

//     // 🔄 Update request
//     request.vendorStatus = "received";
//     request.status = "pending_inventory_approval"; // inventory staff will now dispatch
//     request.vendorETAExpiresAt = null;
//     request.vendorReminderSent = true;
//     await request.save();

//     // 📝 Log transaction
//     await Transaction.create({
//       from: { role: "Vendor" },
//       to: { role: "Central Inventory" },
//       productId: null, // because multi-item delivery
//       quantity: request.quantity,
//       request: request._id,
//       initiatedBy: req.user.id,
//       status: "received"
//     });

//     res.json({ msg: "Vendor delivered all items → Central inventory updated", request });

//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ msg: err.message });
//   }
// });

// ✅ Inventory Staff approves & sends store-request items
router.put("/:id/approve-store-request", auth, authorize(["inventory_staff"]), async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);
    if (!request) return res.status(404).json({ msg: "Store request not found" });

    if (request.requestType !== "store_request") {
      return res.status(400).json({ msg: "Not a store request" });
    }

    // must be after vendor delivered OR already fulfilled directly
    if (!["awaiting_vendor", "fulfilled"].includes(request.status)) {
      return res.status(400).json({ msg: "Store request not ready for approval" });
    }

    // Update status
    request.status = "approved_and_sent";
    request.vendorStatus = "stored";
    await request.save();

    // Log transaction
    await Transaction.create({
      from: { role: "Central Inventory" },
      to: { role: "Department" },
      initiatedBy: req.user.id,
      request: request._id,
      status: "approved_and_sent",
      productId: null,
      quantity: null
    });

    res.json({ msg: "Store request approved & sent successfully", request });

  } catch (err) {
    console.error("Store approval error:", err);
    res.status(500).json({ msg: err.message });
  }
});

router.post("/store-request", auth, authorize([
  "nurse",
  "sister_incharge",
  "hod",
  "inventory_staff",
  "admin"
]), async (req, res) => {
  try {
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ msg: "Items array is required" });
    }

    const processedItems = [];
    let requestNeedsVendor = false;
    let totalQuantity = 0;

    for (const i of items) {
      const name = i.product.trim();
      const qty = Number(i.quantity);
      totalQuantity += qty;

      // 1️⃣ Check if product exists
      let product = await Product.findOne({ name: new RegExp(`^${name}$`, "i") });

      if (product) {
        // 2️⃣ Product exists → check quantity
        if (product.totalQuantity >= qty) {
          product.totalQuantity -= qty;
          await product.save();

          processedItems.push({
            productId: product._id,
            productName: name,
            quantity: qty,
            source: "central"
          });
        } else {
          requestNeedsVendor = true;

          processedItems.push({
            productId: product._id,
            productName: name,
            quantity: qty,
            source: "vendor"
          });
        }
      } else {
        // 3️⃣ Product doesn't exist → create it
        product = await Product.create({
          name,
          totalQuantity: 0,
          category: "General"
        });

        requestNeedsVendor = true;

        processedItems.push({
          productId: product._id,
          productName: name,
          quantity: qty,
          source: "vendor"
        });
      }
    }

    // 4️⃣ Create request
    const storeRequest = await Request.create({
      requestedBy: req.user.id,
      requestType: "store_request",
      items: processedItems,
      quantity: totalQuantity,      // 🔥 ROOT LEVEL QUANTITY
      product: null,                // 🔥 Because multiple items
      status: requestNeedsVendor ? "awaiting_vendor" : "fulfilled",
      vendorStatus: requestNeedsVendor ? "awaiting_vendor" : "stored",
    });

    // 5️⃣ Log transaction
    await Transaction.create({
      from: { role: requestNeedsVendor ? "Inventory Staff" : "Central Inventory" },
      to: { role: requestNeedsVendor ? "Vendor" : "Department" },
      productId: null,
      quantity: totalQuantity,
      initiatedBy: req.user.id,
      request: storeRequest._id,
      status: requestNeedsVendor ? "awaiting_vendor" : "fulfilled"
    });

    res.json({
      msg: requestNeedsVendor
        ? "Some items need to be ordered from vendor."
        : "All items fulfilled from central stock.",
      request: storeRequest
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: err.message });
  }
});



// router.put("/:id/vendor-received", auth, authorize(["inventory_staff"]), async (req, res) => {
//   try {
//     const request = await Request.findById(req.params.id).populate("product");
//     if (!request) return res.status(404).json({ msg: "Request not found" });

//     if (request.status !== "awaiting_vendor") {
//       return res.status(400).json({ msg: "Request is not awaiting vendor delivery" });
//     }

//     // update in central inventory
//     const product = await Product.findById(request.product._id);
//     product.totalQuantity += request.quantity;
//     await product.save();

//     request.vendorStatus = "received";
//     request.status = "pending_inventory_approval"; // ready to dispatch
//     request.vendorETAExpiresAt = null;
//     request.vendorReminderSent = true; // stop reminders
//     await request.save();

//     await new Transaction({
//       from: { role: "Vendor" },
//       to: { role: "Central Inventory" },
//       productId: product._id,
//       quantity: request.quantity,
//       request: request._id,
//       status: "received",
//     }).save();

//     res.json({ msg: "Vendor delivered — added to central stock", request });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ msg: err.message });
//   }
// });

// // Step 4: Sister In-Charge Receiving
// // ✅ Sister In-Charge marks as received and stores in correct inventory
// router.put("/:id/mark-received", auth, authorize(["sister_incharge"]), async (req, res) => {
//   try {
//     const request = await Request.findById(req.params.id)
//       .populate("product")
//       .populate("requestedBy");

//     if (!request) return res.status(404).json({ msg: "Request not found" });

//     if (request.status !== "approved_and_sent") {
//       return res.status(400).json({ msg: "Request not ready for receiving" });
//     }

//     // ✅ Update status
//     request.status = "fulfilled";

//     // 🧠 If Sister-In-Charge requested → goes to DepartmentInventory
//     if (request.requestedBy.role === "sister_incharge") {
//       let deptItem = await DepartmentInventory.findOne({ product: request.product._id });
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

//     // 🧠 If Nurse requested → goes to her Almirah
//     else if (request.requestedBy.role === "nurse") {
//       let almirah = await AlmirahInventory.findOne({ nurse: request.requestedBy._id });
//       if (!almirah) {
//         almirah = new AlmirahInventory({
//           nurse: request.requestedBy._id,
//           category: request.product.category || "Consumables",
//           items: [],
//         });
//       }

//       const existingItem = almirah.items.find(
//         (item) => item.product.toString() === request.product._id.toString()
//       );

//       if (existingItem) {
//         existingItem.quantity += request.quantity;
//       } else {
//         almirah.items.push({
//           product: request.product._id,
//           quantity: request.quantity,
//           expiry: request.product.expiryDate || null,
//         });
//       }

//       await almirah.save();
//     }

//     await request.save();
//     // ✅ Log transaction
//     const transaction = new Transaction({
//   from: { role: "Department" },
//   to: { role: "Almirah" },
//   productId: request.product._id,
//   quantity: request.quantity,
//   initiatedBy: req.user._id, // Sister-In-Charge
//   receivedBy: request.requestedBy, // Nurse
//   request: request._id,
//   status: "fulfilled",
// });
// await transaction.save();

    
//     res.json({ msg: "✅ Items received and added to appropriate inventory.", request });
//   } catch (err) {
//     console.error("❌ Mark received error:", err);
//     res.status(500).json({ msg: "Server error" });
//   }
// });


// ✅ Sister-In-Charge marks as received and stores in correct inventory

router.put("/:id/mark-received", auth, authorize(["sister_incharge"]), async (req, res) => {
  try {
    const request = await Request.findById(req.params.id)
      .populate("product")
      .populate("requestedBy");

    if (!request) {
      return res.status(404).json({ msg: "Request not found" });
    }

    // Allow only if approved_and_sent
    if (!["approved_and_sent", "fulfilled"].includes(request.status)) {
      return res.status(400).json({ msg: "Request not ready for receiving" });
    }

    // ✅ Update status
    request.status = "fulfilled";

    // 🧠 Handle inventory based on requester role
    if (request.requestedBy.role === "sister_incharge") {
      let deptItem = await DepartmentInventory.findOne({ product: request.product._id });
      if (deptItem) {
        deptItem.quantity += request.quantity;
        await deptItem.save();
      } else {
        await DepartmentInventory.create({
          product: request.product._id,
          quantity: request.quantity,
          category: request.product.category || "Others",
        });
      }
    } else if (request.requestedBy.role === "nurse") {
      let almirah = await AlmirahInventory.findOne({ nurse: request.requestedBy._id });
      if (!almirah) {
        almirah = new AlmirahInventory({
          nurse: request.requestedBy._id,
          category: request.product.category || "Consumables",
          items: [],
        });
      }

      const existingItem = almirah.items.find(
        (item) => item.product.toString() === request.product._id.toString()
      );

      if (existingItem) {
        existingItem.quantity += request.quantity;
      } else {
        almirah.items.push({
          product: request.product._id,
          quantity: request.quantity,
          expiry: request.product.expiryDate || null,
        });
      }

      await almirah.save();
    }

    await request.save();

    // ✅ Create Transaction
    const transaction = new Transaction({
      from: { role: "Department" },
      to: { role: "Almirah" },
      productId: request.product._id,
      quantity: request.quantity,
      initiatedBy: req.user._id || req.user.id, // Sister-In-Charge (receiver)
      receivedBy: request.requestedBy?._id || request.requestedBy || null, // safer fallback
      request: request._id,
      status: "fulfilled",
      date: new Date(),
    });

    await transaction.save();

    res.json({ msg: "✅ Items received and added to appropriate inventory.", request });
  } catch (err) {
    console.error("❌ Mark received error:", err.message);
    console.error(err.stack);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
});

// 📋 View requests
// 📋 Get requests (filtered by user role)
router.get("/", auth, async (req, res) => {
  try {
    let filter = {};

    // Nurse only sees their own
    if (req.user.role === "nurse") {
      filter = { requestedBy: req.user.id };
    }

    // Sister sees everything in her department (for simplicity now — all pending + hers)
    else if (req.user.role === "sister_incharge") {
  filter = { status: { $in: ["pending_sister_incharge", "pending_hod", "pending_inventory_approval", "approved", "approved_and_sent",
     "awaiting_vendor",
        "fulfilled"
  ] } };
}


    // ✅ HOD sees requests waiting for approval
    else if (req.user.role === "hod") {
      filter = { status: "pending_hod" };
    }

    const requests = await Request.find(filter)
      .populate("product requestedBy approvedBy fulfilledBy")
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});


module.exports = router;
