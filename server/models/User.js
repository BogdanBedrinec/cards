import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },

  username: { type: String, required: false, default: "Користувач" },

  // ✅ language preferences
  interfaceLang: { type: String, enum: ["de", "en", "uk"], default: "de" }, // UI
  nativeLang: { type: String, enum: ["de", "en", "uk"], default: "uk" },   // L1
  learningLang: { type: String, enum: ["de", "en", "uk"], default: "de" }, // L2

  cards: [{ type: mongoose.Schema.Types.ObjectId, ref: "WordCard" }],
});

export default mongoose.model("User", UserSchema);
