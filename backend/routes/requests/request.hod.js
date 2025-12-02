const express = require("express");
const router = express.Router();
const { auth, authorize } = require("../../middleware/auth");
const Request = require("../../models/Request");
const Transaction = require("../../models/Transaction");
const Product = require("../../models/Product");


console.log("📦 [requests] request.hod.js loaded");

// HOD approval
// router.put("/:id/approve-hod", auth, authorize(["hod"]), async (req, res) => {
//   try {
//     const request = await Request.findById(req.params.id).populate("product requestedBy");
//     if (!request) return res.status(404).json({ msg: "Request not found" });

//     // 🛑 If store_request → Always check central store first
//     if (request.requestType === "store_request") {
//       let enoughStock = true;

//       for (const it of request.items) {
//         const product = await Product.findById(it.productId);
//         if (!product || product.totalQuantity < it.quantity) {
//           enoughStock = false;
//           break;
//         }
//       }

//       if (!enoughStock) {
//         // ❌ No stock → vendor needed
//         request.status = "awaiting_vendor";
//         request.vendorStatus = "awaiting_vendor";
//         await request.save();

//         await Transaction.create({
//           from: { role: "hod" },
//           to: { role: "inventory_staff" },
//           initiatedBy: req.user.id,
//           request: request._id,
//           status: "awaiting_vendor",
//           quantity: request.quantity
//         });

//         return res.json({
//           msg: "Stock unavailable — Vendor required. Waiting for inventory staff ETA.",
//           request,
//         });
//       }
//     }

//     // 🟢 Stock available → normal process continues
//     request.status = "pending_inventory_approval";
//     await request.save();

//     await Transaction.create({
//       from: { role: "hod" },
//       to: { role: "inventory_staff" },
//       initiatedBy: req.user.id,
//       request: request._id,
//       status: "pending_inventory_approval",
//       quantity: request.quantity
//     });

//     res.json({
//       msg: "HOD approved — Inventory staff to dispatch",
//       request,
//     });

//   } catch (err) {
//     console.error("HOD APPROVE ERROR:", err);
//     res.status(500).json({ msg: err.message });
//   }
// });

// router.put("/:id/approve-hod", auth, authorize(["hod"]), async (req, res) => {
//   try {
//     // 1. Fetch Request
//     // Note: populating 'product' turns request.product into an Object, not an ID
//     const request = await Request.findById(req.params.id).populate("product requestedBy");
//     if (!request) return res.status(404).json({ msg: "Request not found" });

//     // 2. Determine Stock Availability
//     let isStockAvailable = true;
//     console.log("🔍 Checking stock for request:", request);
//     // SCENARIO A: Request has an 'items' array (Multiple Items)
//     if (request.items && request.items.length > 0) {
//       console.log("📋 Request has multiple items, checking each for stock...A");
//       for (const item of request.items) {
//         const product = await Product.findById(item.productId);
//         // If product missing OR stock < requested quantity
//         if (!product || product.totalQuantity < item.quantity) {
//           isStockAvailable = false;
//           console.log("📋 UNAVAILABLE");
//           break; // Stop checking, we know we need a vendor
//         }
//       }
//     } 
//     // SCENARIO B: Request has a single 'product' field (Single Item)
//     // We check this if 'items' array was empty or didn't exist
//     else if (request.product && request.quantity) {
//       console.log("📦 Request has single product, checking stock...B");
//       // Since we used .populate("product"), request.product is the actual product object
//       if (request.product.totalQuantity < request.quantity) {
//         console.log("📦 UNAVAILABLE");
//         isStockAvailable = false;
//       }
//     }
//     // Edge Case: If the product ID is invalid/deleted (product is null after populate)
//     else if (!request.product && !request.items) {
//       console.log("⚠️ Request has no valid product or items.");
//        isStockAvailable = false;
//     }

//     // 3. APPLY LOGIC BASED ON STOCK

//     // 🔴 CASE 1: NOT ENOUGH STOCK / PRODUCT MISSING
//     if (!isStockAvailable) {
//       console.log("🚫 Stock unavailable, vendor required.");
//       request.status = "awaiting_vendor";
//       request.vendorStatus = "awaiting_vendor";
//       await request.save();

//       await Transaction.create({
//         from: { role: "hod" },
//         to: { role: "inventory_staff" },
//         initiatedBy: req.user.id,
//         request: request._id,
//         status: "awaiting_vendor",
//         quantity: request.quantity // Ensure this matches your schema
//       });

//       return res.json({
//         msg: "Stock unavailable — Vendor required. Waiting for inventory staff.",
//         status: "awaiting_vendor",
//         request,
//       });
//     }

//     // 🟢 CASE 2: STOCK IS AVAILABLE (Central Inventory)
//     request.status = "pending_inventory_approval";
//     await request.save();
//     console.log("✅ Stock available, proceeding with HOD approval.");
//     await Transaction.create({
//       from: { role: "hod" },
//       to: { role: "inventory_staff" },
//       initiatedBy: req.user.id,
//       request: request._id,
//       status: "pending_inventory_approval",
//       quantity: request.quantity
//     });

//     return res.json({
//       msg: "HOD approved — Inventory staff to dispatch.",
//       status: "pending_inventory_approval",
//       request,
//     });

//   } catch (err) {
//     console.error("HOD APPROVE ERROR:", err);
//     res.status(500).json({ msg: err.message });
//   }
// });

router.put("/:id/approve-hod", auth, authorize(["hod"]), async (req, res) => {
  try {
    console.log(`\n🔄 [HOD APPROVAL] Processing Request ID: ${req.params.id}`);

    const request = await Request.findById(req.params.id).populate("product requestedBy");
    if (!request) return res.status(404).json({ msg: "Request not found" });

    let isStockAvailable = true;

    if (request.items && request.items.length > 0) {
      console.log(`📋 Checking Multiple Items by NAME (Count: ${request.items.length})`);
      
      for (const item of request.items) {
       
        const product = await Product.findOne({ name: item.productName });

        if (!product) {
          console.log(`❌ Product '${item.productName}' NOT found in Inventory DB`);
          isStockAvailable = false;
          break;
        }

        console.log(`   🔸 Item: ${product.name} | Stock: ${product.totalQuantity} | Requested: ${item.quantity}`);
        
        if (product.totalQuantity < item.quantity) {
          console.log("   🔻 Insufficient Stock");
          isStockAvailable = false;
          break;
        }
      }
    } 
    
    else if (request.product && request.quantity) {
      console.log(`📦 Checking Single Product: ${request.product.name}`);
      
      if (request.product.totalQuantity < request.quantity) {
        console.log(`   🔻 Stock Low: Have ${request.product.totalQuantity}, Need ${request.quantity}`);
        isStockAvailable = false;
      }
    }
    else {
      console.log("⚠️ No valid items or product found in request");
      isStockAvailable = false;
    }

    
    if (!isStockAvailable) {
      console.log("🚀 routing -> awaiting_vendor");
      
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
        msg: "Stock unavailable — Vendor required. Status updated to awaiting_vendor.",
        status: "awaiting_vendor",
        request,
      });
    }

   
    console.log("🚀 routing -> pending_inventory_approval");
    
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

    return res.json({
      msg: "HOD approved — Inventory staff to dispatch.",
      status: "pending_inventory_approval",
      request,
    });

  } catch (err) {
    console.error("HOD APPROVE ERROR:", err);
    res.status(500).json({ msg: err.message });
  }
});



module.exports = router;
