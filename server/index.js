import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

import cardRoutes from "./routes/cardRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import usersRoutes from "./routes/usersRoutes.js";

dotenv.config();

const app = express();

// ---------- Basics ----------
app.disable("x-powered-by");
app.set("trust proxy", 1); // important for hosted environments

app.use(express.json({ limit: "1mb" }));

// ---------- CORS (controlled by ENV) ----------
// ENV example:
// CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,https://your-app.vercel.app
const allowedOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const corsOptions = {
  origin(origin, callback) {
    // allow requests without origin (Postman/curl/mobile apps)
    if (!origin) return callback(null, true);

    // if whitelist is empty => allow all (handy for first local run)
    if (allowedOrigins.length === 0) return callback(null, true);

    if (allowedOrigins.includes(origin)) return callback(null, true);

    return callback(new Error("CORS blocked: " + origin));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions)); // preflight for all routes

// ---------- Health check ----------
app.get("/api/health", (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// ---------- Routes ----------
app.use("/api/users", usersRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/cards", cardRoutes);

// ---------- Mongo ----------
const { MONGO_URI } = process.env;
if (!MONGO_URI) {
  console.error("❌ Missing MONGO_URI in .env");
  process.exit(1);
}

mongoose
  .connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => {
    console.error("❌ MongoDB connection FAILED:", err?.message || err);
    process.exit(1);
  });

// ---------- Error handler ----------
app.use((err, req, res, next) => {
  if (err && String(err.message || "").startsWith("CORS blocked")) {
    return res.status(403).json({ message: err.message });
  }
  console.error("❌ Server error:", err);
  res.status(500).json({ message: "Server error" });
});

// ---------- Start ----------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
