const express = require("express");
const router = express.Router();
const { auth, authorize } = require("../middleware/auth");
const Request = require("../models/Request");
const DepartmentInventory = require("../models/DepartmentInventory");
const AlmirahInventory = require("../models/AlmirahInventory");
const Product = require("../models/Product");


// 🧑‍⚕️ Nurse creates request
router.post("/", auth, authorize(["nurse", "sister_incharge"]), async (req, res) => {
  try {
    console.log("📦 Incoming request:", req.body);
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

      // Add to nurse’s Almirah
      await AlmirahInventory.findOneAndUpdate(
        { nurse: request.requestedBy, product: request.product._id },
        { $inc: { quantity: request.quantity } },
        { upsert: true, new: true }
      );

      // Update request status
      request.status = "fulfilled";
      request.approvedBy = req.user.id;
      request.fulfilledBy = req.user.id;
      await request.save();

      return res.json({
        msg: "Approved and fulfilled by Sister-In-Charge (from department stock)",
        request,
      });
    }

    // ❌ CASE 2: Not available → escalate to HOD
    request.status = "pending_hod";
    request.approvedBy = req.user.id;
    await request.save();

    res.json({ msg: "Forwarded to HOD for approval", request });
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
    const requestedUser = await User.findById(request.requestedBy);
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
        msg: "Fulfilled and added to Department Inventory",
        request,
      });

    } else if (requestedUser.role === "nurse") {
      // 🧺 Nurse’s request → goes directly to Almirah
      await AlmirahInventory.findOneAndUpdate(
        { nurse: requestedUser._id, product: request.product._id },
        { $inc: { quantity: request.quantity } },
        { upsert: true, new: true }
      );

      request.status = "fulfilled";
      request.fulfilledBy = req.user.id;
      await request.save();

      return res.json({
        msg: "Fulfilled and delivered to Nurse’s Almirah",
        request,
      });
    }

    res.status(400).json({ msg: "Invalid request flow or role" });

  } catch (err) {
    console.error("❌ Fulfill error:", err);
    res.status(400).json({ error: err.message });
  }
});

// ✅ Step 3: Inventory Staff Approval & Dispatch
router.put("/:id/approve-inventory", auth, authorize(["inventory_staff"]), async (req, res) => {
  try {
    const request = await Request.findById(req.params.id).populate("product");
    if (!request) return res.status(404).json({ msg: "Request not found" });

    // ✅ Deduct from central stock (Product)
    const product = await Product.findById(request.product._id);
    if (!product) return res.status(404).json({ msg: "Product not found in central inventory" });

    if (product.quantity < request.quantity) {
      return res.status(400).json({ msg: "Insufficient stock in central inventory" });
    }

    product.quantity -= request.quantity;
    await product.save();

    // ✅ Update request status
    request.status = "approved_and_sent";
    await request.save();

    res.json({ msg: "Inventory staff approved and dispatched items successfully.", request });
  } catch (err) {
    console.error("❌ Error in approve-inventory route:", err);
    res.status(500).json({ msg: "Server error" });
  }
});



// Step 2: HOD Approval
router.put("/:id/approve-hod", auth, authorize(["hod"]), async (req, res) => {
  const request = await Request.findById(req.params.id);
  request.status = "pending_inventory_approval";
  await request.save();
  res.json({ msg: "Request approved by HOD and sent to inventory staff." });
});


// 📦 Inventory Staff fulfills
router.put("/:id/fulfill", auth, authorize(["inventory_staff"]), async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);
    if (!request) return res.status(404).json({ msg: "Request not found" });

    request.status = "fulfilled";
    request.fulfilledBy = req.user.id;
    await request.save();

    res.json({ msg: "Fulfilled by Inventory Staff", request });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Step 4: Sister In-Charge Receiving
router.put("/:id/mark-received", auth, authorize(["sister_incharge"]), async (req, res) => {
  try {
    const request = await Request.findById(req.params.id)
      .populate("product")
      .populate("requestedBy"); // Assuming requestedBy stores the user who raised the request

    if (!request) return res.status(404).json({ msg: "Request not found" });

    request.status = "fulfilled";

    // Determine where to store received items
    if (request.requestedBy.role === "sister_incharge") {
      // ✅ If Sister-In-Charge raised it → store in DepartmentInventory
      let departmentInv = await DepartmentInventory.findOne({ department: request.department });
      if (!departmentInv) {
        departmentInv = new DepartmentInventory({ department: request.department, items: [] });
      }

      // Check if product already exists, then just update quantity
      const existingItem = departmentInv.items.find(item => item.product.toString() === request.product._id.toString());
      if (existingItem) {
        existingItem.quantity += request.quantity;
      } else {
        departmentInv.items.push({
          product: request.product._id,
          quantity: request.quantity,
        });
      }

      await departmentInv.save();
    } 
    else if (request.requestedBy.role === "nurse") {
      // ✅ If Nurse raised it → store in AlmirahInventory
      let almirahInv = await AlmirahInventory.findOne({
        department: request.department,
        nurse: request.requestedBy._id
      });

      if (!almirahInv) {
        almirahInv = new AlmirahInventory({
          department: request.department,
          nurse: request.requestedBy._id,
          items: [],
        });
      }

      // Check if product already exists
      const existingItem = almirahInv.items.find(item => item.product.toString() === request.product._id.toString());
      if (existingItem) {
        existingItem.quantity += request.quantity;
      } else {
        almirahInv.items.push({
          product: request.product._id,
          quantity: request.quantity,
        });
      }

      await almirahInv.save();
    } 
    else {
      return res.status(400).json({ msg: "Invalid requester role" });
    }

    await request.save();
    res.json({ msg: "Items received and added to appropriate inventory (department/almirah)." });

  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
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
      filter = { status: { $in: ["pending_sister_incharge", "pending_hod", "approved"] } };
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
