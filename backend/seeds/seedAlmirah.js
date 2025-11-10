require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const AlmirahInventory = require("../models/AlmirahInventory");
const Product = require("../models/Product");

(async () => {
  try {
    await connectDB();
    console.log("🧺 Connected to MongoDB — seeding simple AlmirahInventory...");

    // 1️⃣ Get a few existing products
    const products = await Product.find().limit(3);
    if (!products.length) {
      throw new Error("❌ No products found in DB. Please add products first.");
    }

    // 2️⃣ Clear old Almirah data (optional but recommended)
    await AlmirahInventory.deleteMany({});
    console.log("🧹 Cleared old almirah entries.");

    // 3️⃣ Create new record
    const almirah = new AlmirahInventory({
      category: "Consumables",
      items: [
        {
          product: products[0]._id,
          quantity: 10,
          expiry: new Date("2027-12-31"),
        },
        {
          product: products[1]._id,
          quantity: 5,
        },
        {
          product: products[2]._id,
          quantity: 3,
        },
      ],
    });

    await almirah.save();
    console.log("✅ Successfully seeded AlmirahInventory:");
    console.log(almirah);

    process.exit(0);
  } catch (err) {
    console.error("❌ Seed error:", err);
    process.exit(1);
  }
})();
