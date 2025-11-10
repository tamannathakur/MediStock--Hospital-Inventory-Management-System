// backend/seeds/seedDepartmentInventory.js
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const mongoose = require("mongoose");

// ⬇️ adjust paths if your models folder is elsewhere
const DepartmentInventory = require("../models/DepartmentInventory");
const Product = require("../models/Product");
// const Department = require("../models/Department"); // only if you want to use a department id

(async () => {
  try {
    const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!MONGO_URI) {
      console.error("❌ No MONGO_URI / MONGODB_URI in .env");
      process.exit(1);
    }

    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // --- CLI args (optional) ---
    // Usage:
    //   node seeds/seedDepartmentInventory.js <productId> <quantity> [<departmentId>]
    const [, , productIdArg, qtyArg, departmentIdArg] = process.argv;

    // Defaults (use your existing product id for "Gloves")
    const productId = productIdArg || "6911dd6caf1a47f4c95b220c"; // <-- CHANGE if needed
    const quantity = Number(qtyArg || 100);

    // If your DepartmentInventory schema has "department" optional, this can be undefined.
    // If it's required in your schema, pass a real department ObjectId in departmentIdArg.
    const department = departmentIdArg || undefined;

    // Validate product exists (nice to have)
    const productExists = await Product.findById(productId);
    if (!productExists) {
      console.error(`❌ Product not found: ${productId}`);
      process.exit(1);
    }

    // Upsert (create if missing, increment if exists)
    const filter = { product: productId };
    if (department) filter.department = department;

    const update = {
      $inc: { quantity },
      $setOnInsert: { product: productId, ...(department ? { department } : {}) },
    };

    const options = { new: true, upsert: true, setDefaultsOnInsert: true };

    const doc = await DepartmentInventory.findOneAndUpdate(filter, update, options)
      .populate("product");

    console.log("✅ Seeded DepartmentInventory:");
    console.log({
      _id: doc._id.toString(),
      product: doc.product?.name || doc.product?.toString(),
      quantity: doc.quantity,
    });

    await mongoose.disconnect();
    console.log("🔌 Disconnected. Done!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Seed error:", err);
    process.exit(1);
  }
})();
