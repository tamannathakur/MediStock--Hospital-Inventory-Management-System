//request.get.js
const express = require("express");
const router = express.Router();
const { auth } = require("../../middleware/auth");
const Request = require("../../models/Request");

console.log("📋 [requests] GET route loaded");

router.get("/", auth, async (req, res) => {
  try {
    const role = req.user.role;
    const userId = req.user.id;

    let filter = {};

    if (role === "nurse") {
      filter = { requestedBy: userId };
    }
    else if (role === "sister_incharge") {
      filter = {
        status: { $in: [
          "pending_sister_incharge",
          "pending_hod",
          "pending_inventory_approval",
          "approved_and_sent",
          "fulfilled",
          "awaiting_vendor"
        ]}
      };
    }
    else if (role === "hod") {
      filter = { status: "pending_hod" };
    }
    else if (role === "inventory_staff") {
      filter = {
        status: { $in: [
          "pending_inventory_approval",
          "awaiting_vendor",
          "approved_and_sent"
        ]}
      };
    }
    else {
      filter = {}; // Admin sees all
    }

    const requests = await Request.find(filter)
      .populate("product requestedBy approvedBy fulfilledBy")
      .sort({ createdAt: -1 });

    res.json(requests);

  } catch (err) {
    console.error("GET REQUESTS ERROR:", err);
    res.status(500).json({ msg: err.message });
  }
});

module.exports = router;
