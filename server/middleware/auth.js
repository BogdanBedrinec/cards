import jwt from "jsonwebtoken";

export default function auth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) return res.status(401).json({ message: "Немає токена" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ✅ один стандарт на весь проєкт
    req.userId = String(decoded.userId);
    req.user = { id: req.userId };

    next();
  } catch (err) {
    console.error("❌ Auth error:", err);
    return res.status(401).json({ message: "Невірний або прострочений токен" });
  }
}
