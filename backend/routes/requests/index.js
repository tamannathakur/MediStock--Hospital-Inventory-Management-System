const express = require("express");
const router = express.Router();
const { auth } = require("../../middleware/auth");
const Request = require("../../models/Request");

console.log("📡 Mounting /api/requests routes...");

// Mount other routes FIRST
router.use("/", require("./request.create"));
router.use("/", require("./request.sister"));
router.use("/", require("./request.hod"));
router.use("/", require("./request.inventory"));
router.use("/", require("./request.store"));

router.get("/", auth, async (req, res) => {
  try {
    res.setHeader("Cache-Control", "no-store"); // 🚫 no caching ever

    const requests = await Request.find({})
      .populate("product requestedBy approvedBy fulfilledBy")
      .sort({ createdAt: -1 });

    console.log("📦 Returning Requests:", requests.length);
    res.status(200).json(requests);

  } catch (err) {
    console.error("❌ GET requests error:", err);
    res.status(500).json({ msg: err.message });
  }
});


module.exports = router;
