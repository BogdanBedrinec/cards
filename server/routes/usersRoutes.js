import express from "express";
import User from "../models/User.js";
import auth from "../middleware/auth.js";

const router = express.Router();

router.get("/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select(
      "email username interfaceLang nativeLang learningLang"
    );
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (e) {
    console.error("GET /api/users/me error:", e);
    res.status(500).json({ message: "Server error" });
  }
});

router.patch("/me/ui-lang", auth, async (req, res) => {
  try {
    const { interfaceLang } = req.body;
    const allowed = new Set(["de", "en", "uk"]);
    if (!allowed.has(interfaceLang)) {
      return res.status(400).json({ message: "Invalid language" });
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      { interfaceLang },
      { new: true }
    ).select("interfaceLang nativeLang learningLang");

    if (!user) return res.status(404).json({ message: "User not found" });

    res.json(user);
  } catch (e) {
    console.error("PATCH /api/users/me/ui-lang error:", e);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
