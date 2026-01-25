import Card from "../models/WordCard.js";

// ===============================
//     Отримати всі картки
// ===============================
export const getCards = async (req, res) => {
  try {
    const userId = req.user?.id || req.userId;
    const cards = await Card.find({ userId: String(userId) });
    res.json(cards);
  } catch (error) {
    console.error("❌ Помилка getCards:", error);
    res.status(500).json({ message: "Помилка сервера" });
  }
};

// ===============================
//     Додати нову картку
// ===============================
export const addCard = async (req, res) => {
  try {
    const userId = req.user?.id || req.userId;

    const { word, translation, example, deck } = req.body;

    const card = await Card.create({
      userId: String(userId), // ✅ завжди string
      word,
      translation,
      example: example || "",
      deck: deck || "Без теми",
    });

    res.json(card);
  } catch (err) {
    console.error("❌ Помилка addCard:", err);
    res.status(500).json({ message: "Помилка при створенні картки" });
  }
};

// ===============================
//     Видалити картку
// ===============================
export const deleteCard = async (req, res) => {
  try {
    const userId = req.user?.id || req.userId;

    const card = await Card.findOneAndDelete({
      _id: req.params.id,
      userId: String(userId),
    });

    if (!card) return res.status(404).json({ message: "Картку не знайдено" });

    res.json({ message: "Картку видалено" });
  } catch (error) {
    console.error("❌ Помилка deleteCard:", error);
    res.status(500).json({ message: "Помилка сервера" });
  }
};

// ===============================
//     Оновити статистику (review)
// ===============================
export const reviewCard = async (req, res) => {
  try {
    const userId = req.user?.id || req.userId;
    const { id } = req.params;

    // ✅ фронт шле { known: true/false }, а не { correct }
    const known = !!req.body.known;

    const card = await Card.findOne({ _id: id, userId: String(userId) });
    if (!card) return res.status(404).json({ message: "Картку не знайдено" });

    card.reviewCount = (card.reviewCount || 0) + 1;
    if (known) card.correctCount = (card.correctCount || 0) + 1;

    card.lastReviewed = new Date();

    // ✅ мінімальна логіка nextReview (щоб “due” працювало)
    // якщо знає → відкласти, якщо не знає → лишити на зараз
    if (known) {
      const days = Math.min(30, 1 + (card.correctCount || 1)); // 2,3,4... днів (до 30)
      card.nextReview = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    } else {
      card.nextReview = new Date(); // відразу due
    }

    await card.save();
    res.json(card);
  } catch (error) {
    console.error("❌ Помилка reviewCard:", error);
    res.status(500).json({ message: "Помилка сервера" });
  }
};
