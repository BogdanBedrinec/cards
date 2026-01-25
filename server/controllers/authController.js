import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { reseedDemoCards } from "../utils/seedDemoCards.js";


function normalizeLang(code, fallback) {
  const allowed = new Set(["de", "en", "uk"]);
  return allowed.has(code) ? code : fallback;
}

export async function register(req, res) {
  try {
    const { email, password, interfaceLang, nativeLang, learningLang } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email і пароль обовʼязкові" });
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(409).json({ message: "Користувач з таким email вже існує" });
    }

    const hashed = await bcrypt.hash(password, 10);

    const ui = normalizeLang(interfaceLang, "de");
    const l1 = normalizeLang(nativeLang, "uk");
    const l2 = normalizeLang(learningLang, "de");

    const user = await User.create({
      email,
      password: hashed,
      interfaceLang: ui,
      nativeLang: l1,
      learningLang: l2,
    });

    // ✅ Видаємо токен одразу після реєстрації (автологін)
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

    return res.status(201).json({
      message: "✅ Реєстрація успішна",
      token,
      userId: user._id,
      interfaceLang: user.interfaceLang,
      nativeLang: user.nativeLang,
      learningLang: user.learningLang,
    });
  } catch (e) {
    console.error("register error:", e);
    return res.status(500).json({ message: "Server error" });
  }
}

export async function login(req, res) {
  try {
    let { email, password } = req.body;

    email = String(email || "").trim().toLowerCase();
    password = String(password || "");

    if (!email || !password) {
      return res.status(400).json({ message: "Email і пароль обовʼязкові" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Невірний email або пароль" });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ message: "Невірний email або пароль" });
    }

// demo language override (EN -> DE)
if (user.email === "demo@demo.com") {
  user.interfaceLang = "en"; // UI EN
  user.nativeLang = "de";    // L1 = DE (переклад)
  user.learningLang = "en";  // L2 = EN (слово)
  await user.save();
}



    await reseedDemoCards(user);

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

    return res.json({
      token,
      userId: user._id,
      interfaceLang: user.interfaceLang,
      nativeLang: user.nativeLang,
      learningLang: user.learningLang,
    });
  } catch (e) {
    console.error("login error:", e);
    return res.status(500).json({ message: "Server error" });
  }
}
