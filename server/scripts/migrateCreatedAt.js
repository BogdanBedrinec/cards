import mongoose from "mongoose";
import dotenv from "dotenv";
import WordCard from "../models/WordCard.js";

dotenv.config();

async function run() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("❌ MONGO_URI не знайдено в .env");
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected");

    const cards = await WordCard.find({
      $or: [{ createdAt: { $exists: false } }, { createdAt: null }],
    }).select("_id createdAt updatedAt");

    console.log(`🔎 Знайдено карток для міграції: ${cards.length}`);

    let updated = 0;

    for (const c of cards) {
      const createdAt = c._id.getTimestamp(); 

      c.createdAt = createdAt;
      c.updatedAt = createdAt;

      await c.save();
      updated++;
    }

    console.log(`✅ Оновлено карток: ${updated}`);
  } catch (err) {
    console.error("❌ Migration error:", err);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 MongoDB disconnected");
  }
}

run();
