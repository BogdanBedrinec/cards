import Card from "../models/WordCard.js";

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

export const addCard = async (req, res) => {
  try {
    const userId = req.user?.id || req.userId;

    const { word, translation, example, deck } = req.body;

    const card = await Card.create({
      userId: String(userId),
      word,
      translation,
      example: example || "",
      deck: deck || "__DEFAULT__",
    });

    res.json(card);
  } catch (err) {
    console.error("❌ Помилка addCard:", err);
    res.status(500).json({ message: "Помилка при створенні картки" });
  }
};
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

export const reviewCard = async (req, res) => {
  try {
    const userId = req.user?.id || req.userId;
    const { id } = req.params;

    const known = !!req.body.known;

    const card = await Card.findOne({ _id: id, userId: String(userId) });
    if (!card) return res.status(404).json({ message: "Картку не знайдено" });

    card.reviewCount = (card.reviewCount || 0) + 1;
    if (known) card.correctCount = (card.correctCount || 0) + 1;

    card.lastReviewed = new Date();

    if (known) {
      const days = Math.min(30, 1 + (card.correctCount || 1)); 
      card.nextReview = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    } else {
      card.nextReview = new Date(); 
    }

    await card.save();
    res.json(card);
  } catch (error) {
    console.error("❌ Помилка reviewCard:", error);
    res.status(500).json({ message: "Помилка сервера" });
  }
};
