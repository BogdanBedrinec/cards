import express from "express";
import auth from "../middleware/auth.js";
import WordCard from "../models/WordCard.js";
import { stringify } from "csv-stringify/sync";
import { parse } from "csv-parse/sync";


const router = express.Router();

// ✅ Отримати картки, які "дозріли" до повторення + фільтр по темі (?deck=...)
// ✅ Отримати картки
// mode=due | all
// sort=nextReview | createdAt | word | accuracy
// order=asc | desc
// deck=...
router.get("/", auth, async (req, res) => {
  try {
    const userId = req.userId;
    const now = new Date();

    const mode = (req.query.mode || "due").toLowerCase(); // default: due
    const sort = (req.query.sort || "nextReview").toLowerCase();
    const order = (req.query.order || "asc").toLowerCase() === "desc" ? -1 : 1;
    const deck = req.query.deck;

    const filter = { userId };

    // фільтр по темі (якщо є)
    if (deck && deck !== "ALL") filter.deck = deck;

    // due vs all
    if (mode === "due") {
      filter.nextReview = { $lte: now };
    }

    // --- сортування ---
    // 1) прості сорти в Mongo
    let mongoSort = {};
    if (sort === "nextreview") mongoSort = { nextReview: order };
    else if (sort === "createdat") mongoSort = { createdAt: order };
    else if (sort === "word") mongoSort = { word: order };
    else if (sort === "translation") mongoSort = { translation: order };
    else mongoSort = { nextReview: order }; // fallback

    let cards = await WordCard.find(filter).sort(mongoSort);

    // 2) "accuracy" — це похідне поле, Mongo нормально не відсортує без агрегації
    // тому сортуємо в JS (для твоїх обсягів норм)
    if (sort === "accuracy") {
      cards = cards.sort((a, b) => {
        const accA = a.reviewCount ? a.correctCount / a.reviewCount : 0;
        const accB = b.reviewCount ? b.correctCount / b.reviewCount : 0;
        return (accA - accB) * order;
      });
    }

    res.json(cards);
  } catch (err) {
    console.error("❌ GET /api/cards error:", err);
    res.status(500).json({ message: "Помилка при отриманні карток" });
  }
});


// ✅ Список тем (decks) для dropdown
router.get("/decks", auth, async (req, res) => {
  try {
    const userId = req.userId;

    const decks = await WordCard.distinct("deck", { userId });

    // щоб "Без теми" було першим
    decks.sort((a, b) =>
      a === "Без теми" ? -1 : b === "Без теми" ? 1 : a.localeCompare(b)
    );

    res.json(decks);
  } catch (err) {
    console.error("❌ GET /api/cards/decks error:", err);
    res.status(500).json({ message: "Помилка при отриманні тем" });
  }
});


// ✅ Отримати ВСІ картки користувача (без фільтра по nextReview)
router.get("/all", auth, async (req, res) => {
  try {
    const userId = req.userId;

    const cards = await WordCard
      .find({ userId })
      .sort({ nextReview: 1 }); // щоб було красиво по черзі

    res.json(cards);
  } catch (err) {
    console.error("❌ GET /api/cards/all error:", err);
    res.status(500).json({ message: "Помилка при отриманні всіх карток" });
  }
});


// ✅ Додати картку
router.post("/", auth, async (req, res) => {
  try {
    const { word, translation, example = "", deck = "Без теми" } = req.body;

    if (!word || !translation) {
      return res.status(400).json({ message: "word і translation обовʼязкові" });
    }
// ✅ Захист від дублювання (у межах одного користувача)
const exists = await WordCard.findOne({
  userId: req.userId,
  word: word.trim(),
  translation: translation.trim(),
  deck,
});

if (exists) {
  return res.status(409).json({
    message: "⚠️ Така картка вже існує (слово + переклад + тема).",
  });
}

    const newCard = new WordCard({
      userId: req.userId,
      word,
      translation,
      example,
      deck,
      nextReview: new Date(), // показати одразу
    });

    await newCard.save(); // 🔥 ВАЖЛИВО (у тебе цього не було)
    res.status(201).json(newCard);
  } catch (err) {
    console.error("❌ addCard error:", err);
    res.status(500).json({ message: "Помилка при створенні картки" });
    if (err && err.code === 11000) {
  return res.status(409).json({
    message: "⚠️ Дублікат: така картка вже є.",
  });
}

  }
});

const reviewHandler = async (req, res) => {
  try {
    const { known } = req.body; // ✅ фронт надсилає known (true/false)

    const card = await WordCard.findOne({ _id: req.params.id, userId: req.userId });
    if (!card) return res.status(404).json({ message: "Картку не знайдено" });

    // статистика
    card.reviewCount = (card.reviewCount || 0) + 1;
    if (known) card.correctCount = (card.correctCount || 0) + 1;
    card.lastReviewed = new Date();

    // ⏱ інтервали повторення (в хвилинах)
    const intervals = [1, 5, 30, 180, 1440, 4320, 10080, 43200]; 
    // 1m, 5m, 30m, 3h, 1d, 3d, 7d, 30d

    const level = Math.min(card.correctCount || 0, intervals.length - 1);

    if (known) {
      const minutes = intervals[level];
      card.nextReview = new Date(Date.now() + minutes * 60 * 1000);
    } else {
      card.nextReview = new Date(Date.now() + 60 * 1000); // ❌ не знаю → через 1 хв
    }

    await card.save();

    return res.json({
      message: known ? "✅ Запамʼятано" : "❌ Повторимо скоро",
      card,
    });
  } catch (err) {
    console.error("❌ review error:", err);
    return res.status(500).json({ message: "Помилка при оновленні картки" });
  }
};

// ✅ Статистика по всіх картках користувача
router.get("/stats", auth, async (req, res) => {
  try {
    const userId = req.userId;
    const now = new Date();

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const allCards = await WordCard.find({ userId }).lean();

    let totalReviews = 0;
    let totalCorrect = 0;
    let reviewedToday = 0;
    let dueNow = 0;

    // ✅ new stats
    const LEARNED_THRESHOLD = 3;
    let learned = 0;

    for (const c of allCards) {
      const rc = c.reviewCount || 0;
      const cc = c.correctCount || 0;

      totalReviews += rc;
      totalCorrect += cc;

      if (c.lastReviewed && new Date(c.lastReviewed) >= startOfToday) {
        reviewedToday += 1;
      }

      if (!c.nextReview || new Date(c.nextReview) <= now) {
        dueNow += 1;
      }

      // ✅ learned rule
      if (cc >= LEARNED_THRESHOLD) {
        learned += 1;
      }
    }

    const accuracy = totalReviews === 0 ? 0 : Math.round((totalCorrect / totalReviews) * 100);
    const totalCards = allCards.length;
    const remaining = Math.max(0, totalCards - learned);

    res.json({
      totalCards,
      dueNow,
      reviewedToday,
      totalReviews,
      totalCorrect,
      accuracy,

      // ✅ add these
      learned,
      remaining,
      learnedThreshold: LEARNED_THRESHOLD,
    });
  } catch (err) {
    console.error("❌ stats error:", err);
    res.status(500).json({ message: "Помилка при отриманні статистики" });
  }
});



router.put("/:id/review", auth, reviewHandler);
router.post("/:id/review", auth, reviewHandler);

// ✅ Видалити картку
router.delete("/:id", auth, async (req, res) => {
  try {
    const deleted = await WordCard.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!deleted) return res.status(404).json({ message: "Картку не знайдено" });

    res.json({ message: "Картку видалено" });
  } catch (err) {
    console.error("❌ delete error:", err);
    res.status(500).json({ message: "Помилка при видаленні" });
  }
});

// ✅ Редагувати картку
router.put("/:id", auth, async (req, res) => {
  try {
    const userId = req.userId;
    const { word, translation, example, deck } = req.body;

    // базова валідація (можеш послабити, але краще так)
    if (!word || !translation) {
      return res.status(400).json({ message: "word і translation обовʼязкові" });
    }

    const updated = await WordCard.findOneAndUpdate(
      { _id: req.params.id, userId }, // захист: тільки свої
      {
        word: String(word).trim(),
        translation: String(translation).trim(),
        example: (example ?? "").toString(),
        deck: (deck ?? "Без теми").toString(),
      },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Картку не знайдено" });
    }

    res.json({ message: "✅ Картку оновлено", card: updated });
  } catch (err) {
    console.error("❌ PUT /api/cards/:id error:", err);
    res.status(500).json({ message: "Помилка при редагуванні картки" });
  }
});


// ✅ Додатковий маршрут для фронта: /api/cards/due
router.get("/due", auth, async (req, res) => {
  try {
    const userId = req.userId;
    const now = new Date();

    const cards = await WordCard.find({
      userId,
      nextReview: { $lte: now },
    }).sort({ nextReview: 1 });

    res.json(cards);
  } catch (err) {
    console.error("❌ GET /api/cards/due error:", err);
    res.status(500).json({ message: "Помилка при отриманні карток" });
  }
});

// =====================
// EXPORT
// =====================

// ✅ Export JSON: GET /api/cards/export?format=json
// ✅ Export CSV:  GET /api/cards/export?format=csv
router.get("/export", auth, async (req, res) => {
  try {
    const userId = req.userId;
    const format = (req.query.format || "json").toLowerCase();

    const cards = await WordCard
      .find({ userId })
      .sort({ createdAt: 1 })
      .lean();

    // Забираємо технічні поля (за бажанням можеш залишити)
    const clean = cards.map(c => ({
      word: c.word || "",
      translation: c.translation || "",
      example: c.example || "",
      deck: c.deck || "Без теми",
      reviewCount: c.reviewCount || 0,
      correctCount: c.correctCount || 0,
      lastReviewed: c.lastReviewed || null,
      nextReview: c.nextReview || null,
      createdAt: c.createdAt || null,
    }));

    if (format === "csv") {
      const csv = stringify(clean, {
        header: true,
        columns: [
          "word",
          "translation",
          "example",
          "deck",
          "reviewCount",
          "correctCount",
          "lastReviewed",
          "nextReview",
          "createdAt",
        ],
      });

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="cards-${Date.now()}.csv"`);
      return res.send(csv);
    }

    // json
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="cards-${Date.now()}.json"`);
    return res.json({ version: 1, exportedAt: new Date().toISOString(), cards: clean });
  } catch (err) {
    console.error("❌ export error:", err);
    return res.status(500).json({ message: "Помилка експорту" });
  }
});


// =====================
// IMPORT
// =====================
// POST /api/cards/import
// Варіант А (JSON): { format:"json", data: {cards:[...]} } або { format:"json", data:[...] }
// Варіант Б (CSV):  { format:"csv",  data:"word,translation,example,deck\n..." }
router.post("/import", auth, async (req, res) => {
  try {
    const userId = req.userId;
    const format = (req.body.format || "json").toLowerCase();
    const raw = req.body.data;

    if (!raw) {
      return res.status(400).json({ message: "Немає даних для імпорту (data)" });
    }

    let incoming = [];

    if (format === "csv") {
      if (typeof raw !== "string") {
        return res.status(400).json({ message: "Для CSV data має бути рядком" });
      }

      const records = parse(raw, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });

      incoming = records.map(r => ({
        word: (r.word || "").trim(),
        translation: (r.translation || "").trim(),
        example: (r.example || "").trim(),
        deck: (r.deck || "Без теми").trim(),
        reviewCount: Number(r.reviewCount || 0),
        correctCount: Number(r.correctCount || 0),
        lastReviewed: r.lastReviewed ? new Date(r.lastReviewed) : null,
        nextReview: r.nextReview ? new Date(r.nextReview) : new Date(), // якщо нема — показати одразу
        createdAt: r.createdAt ? new Date(r.createdAt) : null,
      }));
    } else {
      // json
      // підтримка: raw.cards (якщо це обʼєкт) або масив
      const arr = Array.isArray(raw) ? raw : (raw.cards || []);
      if (!Array.isArray(arr)) {
        return res.status(400).json({ message: "Невірний JSON формат (очікую масив cards)" });
      }

      incoming = arr.map(c => ({
        word: String(c.word || "").trim(),
        translation: String(c.translation || "").trim(),
        example: String(c.example || "").trim(),
        deck: String(c.deck || "Без теми").trim(),
        reviewCount: Number(c.reviewCount || 0),
        correctCount: Number(c.correctCount || 0),
        lastReviewed: c.lastReviewed ? new Date(c.lastReviewed) : null,
        nextReview: c.nextReview ? new Date(c.nextReview) : new Date(),
        createdAt: c.createdAt ? new Date(c.createdAt) : null,
      }));
    }

    // фільтруємо пусті
    incoming = incoming.filter(x => x.word && x.translation);

    if (incoming.length === 0) {
      return res.status(400).json({ message: "Немає валідних карток для імпорту" });
    }

    // ✅ Dedup в межах імпорту: по word+translation
    const uniqKey = (w, t) => `${w.toLowerCase()}___${t.toLowerCase()}`;
    const map = new Map();
    for (const c of incoming) {
      const key = uniqKey(c.word, c.translation);
      if (!map.has(key)) map.set(key, c);
    }
    const uniqueIncoming = Array.from(map.values());

    // ✅ Щоб не створювати дублікати з тим, що вже є в БД — теж по word+translation
    const existing = await WordCard.find({ userId }, { word: 1, translation: 1 }).lean();
    const existingSet = new Set(existing.map(e => uniqKey(e.word || "", e.translation || "")));

    const toInsert = uniqueIncoming
      .filter(c => !existingSet.has(uniqKey(c.word, c.translation)))
      .map(c => ({
        userId,
        word: c.word,
        translation: c.translation,
        example: c.example || "",
        deck: c.deck || "Без теми",
        reviewCount: c.reviewCount || 0,
        correctCount: c.correctCount || 0,
        lastReviewed: c.lastReviewed || null,
        nextReview: c.nextReview || new Date(),
        // createdAt навмисно НЕ форсуємо — нехай Mongo поставить сам
      }));

    const inserted = toInsert.length ? await WordCard.insertMany(toInsert, { ordered: false }) : [];

    return res.json({
      message: "Імпорт завершено ✅",
      received: incoming.length,
      uniqueInFile: uniqueIncoming.length,
      inserted: inserted.length,
      skippedAsDuplicates: uniqueIncoming.length - toInsert.length,
    });
  } catch (err) {
    console.error("❌ import error:", err);
    return res.status(500).json({ message: "Помилка імпорту" });
  }
});


export default router;
