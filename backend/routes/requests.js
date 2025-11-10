const express = require("express");
const router = express.Router();
const { auth, authorize } = require("../middleware/auth");
const Request = require("../models/Request");

// Nurse/Sister: create request
router.post("/", auth, authorize(["nurse", "sister_incharge"]), async (req, res) => {
  try {
    const { product, quantity, reason, department } = req.body;
    const newRequest = new Request({
      product,
      quantity,
      reason,
      department,
      requestedBy: req.user.id,
      status: req.user.role === "nurse" ? "pending_sister_incharge" : "pending_hod",
    });
    await newRequest.save();
    res.status(201).json(newRequest);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Sister In-Charge approves
router.put("/:id/approve-sister", auth, authorize(["sister_incharge"]), async (req, res) => {
  const request = await Request.findById(req.params.id);
  if (!request) return res.status(404).json({ msg: "Request not found" });
  request.status = "pending_hod";
  request.approvedBy = req.user.id;
  await request.save();
  res.json(request);
});

// HOD approves
router.put("/:id/approve-hod", auth, authorize(["hod"]), async (req, res) => {
  const request = await Request.findById(req.params.id);
  if (!request) return res.status(404).json({ msg: "Request not found" });
  request.status = "approved";
  request.approvedBy = req.user.id;
  await request.save();
  res.json(request);
});

// Inventory Staff fulfills
router.put("/:id/fulfill", auth, authorize(["inventory_staff"]), async (req, res) => {
  const request = await Request.findById(req.params.id);
  if (!request) return res.status(404).json({ msg: "Request not found" });
  request.status = "fulfilled";
  request.fulfilledBy = req.user.id;
  await request.save();
  res.json(request);
});

// Get all requests (for dashboard or role filtering)
router.get("/", auth, async (req, res) => {
  const filter = {};
  if (req.user.role === "nurse") filter.requestedBy = req.user.id;
  if (req.user.role === "sister_incharge") filter.department = req.user.department;
  const requests = await Request.find(filter)
    .populate("product requestedBy approvedBy fulfilledBy")
    .sort({ createdAt: -1 });
  res.json(requests);
});

module.exports = router;
