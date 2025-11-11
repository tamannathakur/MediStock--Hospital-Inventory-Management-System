const express = require("express");
const router = express.Router();
const { auth, authorize } = require("../middleware/auth");
const Request = require("../models/Request");
const DepartmentInventory = require("../models/DepartmentInventory");
const AlmirahInventory = require("../models/AlmirahInventory");
const Product = require("../models/Product");
const Transaction = require("../models/Transaction");


// 🧑‍⚕️ Nurse creates request
router.post("/", auth, authorize(["nurse", "sister_incharge"]), async (req, res) => {
  try {
    const { product, quantity, reason, requestType } = req.body;

    if (!product || !quantity)
      return res.status(400).json({ error: "Product and quantity required" });

    const request = new Request({
      product,
      quantity,
      reason,
      requestType: requestType || "department",
      requestedBy: req.user.id,
      status: req.user.role === "nurse" ? "pending_sister_incharge" : "pending_hod",
    });

    const saved = await request.save();
    const transaction = new Transaction({
  from: { role: "Nurse" },
  to: { role: "Sister-In-Charge" },
  productId: saved.product,
  quantity: saved.quantity,
  initiatedBy: saved.requestedBy,
   receivedBy: null,
  request: saved._id,
  status: "pending_sister_incharge",
});
await transaction.save();

    res.status(201).json(saved);
  } catch (err) {
    console.error("❌ Request creation error:", err);
    res.status(400).json({ error: err.message });
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

//       console.log("===== DEBUG START =====");
//     console.log("Request found:", !!request);
//     if (request) {
//       console.log("Request ID:", request._id.toString());
//       console.log("Requested By:", request.requestedBy);
//       console.log("req.user (logged-in user):", req.user);
//     }
//     console.log("===== DEBUG END =====");

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
    
    if (!product || product.quantity < request.quantity) {
  request.status = "awaiting_vendor";
  request.vendorStatus = "awaiting_vendor";
  request.vendorETA = req.body.vendorETA || "48 hours";
  await request.save();

  // Create transaction log
  const transaction = new Transaction({
    from: { role: "Inventory Staff" },
    to: { role: "Vendor" },
    productId: request.product?._id || null,
    quantity: request.quantity,
    initiatedBy: req.user._id || req.user.id,
    request: request._id,
    status: "awaiting_vendor",
    date: new Date(),
  });
  await transaction.save();

  // 🔔 Schedule reminder before ETA
  // (You can use node-cron, agenda, or in your case, store as a task)
  scheduleReminder(request._id, request.vendorETA);

  return res.json({
    msg: `Not in stock. Ordered from store. ETA: ${request.vendorETA}`,
    request,
  });
}

    // ✅ Deduct quantity
    product.quantity -= request.quantity;
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
  filter = { status: { $in: ["pending_sister_incharge", "pending_hod", "approved", "approved_and_sent"] } };
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
