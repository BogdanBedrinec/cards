import express from "express";
import User from "../models/User.js";

const router = express.Router();

// ✅ Отримати всіх користувачів (без паролів)
router.get("/", async (req, res) => {
  try {
    const users = await User.find({}, "-password"); // мінус означає "не брати"
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Помилка при отриманні користувачів", error });
  }
});

// ✅ Отримати одного користувача за ID
router.get("/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id, "-password");
    if (!user) return res.status(404).json({ message: "Користувача не знайдено" });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Помилка при отриманні користувача", error });
  }
});

// ✅ Видалити користувача
router.delete("/:id", async (req, res) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.params.id);
    if (!deletedUser) return res.status(404).json({ message: "Користувача не знайдено" });
    res.json({ message: "Користувача видалено" });
  } catch (error) {
    res.status(500).json({ message: "Помилка при видаленні користувача", error });
  }
});

export default router;
