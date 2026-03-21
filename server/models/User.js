import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },

  username: { type: String, required: false, default: "Користувач" },

  interfaceLang: { type: String, enum: ["de", "en", "uk"], default: "de" }, 
  nativeLang: { type: String, enum: ["de", "en", "uk"], default: "uk" },  
  learningLang: { type: String, enum: ["de", "en", "uk"], default: "de" },

  cards: [{ type: mongoose.Schema.Types.ObjectId, ref: "WordCard" }],
});

export default mongoose.model("User", UserSchema);
