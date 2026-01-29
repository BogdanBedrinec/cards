import express from "express";
import auth from "../middleware/auth.js";
import WordCard from "../models/WordCard.js";
import { stringify } from "csv-stringify/sync";
import { parse } from "csv-parse/sync";

const router = express.Router();

const DEFAULT_DECK = "Без теми";

// ============================================
// GET /api/cards
// mode=due | all
// sort=nextReview | createdAt | word | accuracy
// order=asc | desc
// deck=...
// ============================================
router.get("/", auth, async (req, res) => {
  try {
    const userId = req.userId;
    const now = new Date();

    const mode = String(req.query.mode || "due").toLowerCase();
    const sort = String(req.query.sort || "nextReview").toLowerCase();
    const order = String(req.query.order || "asc").toLowerCase() === "desc" ? -1 : 1;
    const deck = req.query.deck;

    const filter = { userId };

    if (deck && deck !== "ALL") filter.deck = deck;

    if (mode === "due") {
      filter.nextReview = { $lte: now };
    }

    let mongoSort = {};
    if (sort === "nextreview") mongoSort = { nextReview: order };
    else if (sort === "createdat") mongoSort = { createdAt: order };
    else if (sort === "word") mongoSort = { word: order };
    else mongoSort = { nextReview: order };

    let cards = await WordCard.find(filter).sort(mongoSort);

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

// ============================================
// GET /api/cards/decks
// ============================================
router.get("/decks", auth, async (req, res) => {
  try {
    const userId = req.userId;
    const decks = await WordCard.distinct("deck", { userId });

    decks.sort((a, b) =>
      a === DEFAULT_DECK ? -1 : b === DEFAULT_DECK ? 1 : a.localeCompare(b)
    );

    res.json(decks);
  } catch (err) {
    console.error("❌ GET /api/cards/decks error:", err);
    res.status(500).json({ message: "Помилка при отриманні тем" });
  }
});

// ============================================
// GET /api/cards/all (legacy)
// ============================================
router.get("/all", auth, async (req, res) => {
  try {
    const userId = req.userId;
    const cards = await WordCard.find({ userId }).sort({ nextReview: 1 });
    res.json(cards);
  } catch (err) {
    console.error("❌ GET /api/cards/all error:", err);
    res.status(500).json({ message: "Помилка при отриманні всіх карток" });
  }
});

// ============================================
// GET /api/cards/due (legacy)
// ============================================
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

// ============================================
// POST /api/cards (add)
// ============================================
router.post("/", auth, async (req, res) => {
  try {
    const { word, translation, example = "", deck = DEFAULT_DECK } = req.body;

    if (!word || !translation) {
      return res.status(400).json({ message: "word і translation обовʼязкові" });
    }

    const cleanWord = String(word).trim();
    const cleanTranslation = String(translation).trim();
    const cleanDeck = String(deck || DEFAULT_DECK).trim() || DEFAULT_DECK;

    // захист від дублювання
    const exists = await WordCard.findOne({
      userId: req.userId,
      word: cleanWord,
      translation: cleanTranslation,
      deck: cleanDeck,
    });

    if (exists) {
      return res.status(409).json({
        message: "⚠️ Така картка вже існує (слово + переклад + тема).",
      });
    }

    const newCard = new WordCard({
      userId: req.userId,
      word: cleanWord,
      translation: cleanTranslation,
      example: String(example || "").trim(),
      deck: cleanDeck,
      nextReview: new Date(), // показати одразу
    });

    await newCard.save();
    res.status(201).json(newCard);
  } catch (err) {
    console.error("❌ addCard error:", err);

    if (err && err.code === 11000) {
      return res.status(409).json({ message: "⚠️ Дублікат: така картка вже є." });
    }

    res.status(500).json({ message: "Помилка при створенні картки" });
  }
});

// ============================================
// Review handler: PUT/POST /api/cards/:id/review
// ============================================
const reviewHandler = async (req, res) => {
  try {
    const { known } = req.body; // фронт надсилає known (true/false)

    const card = await WordCard.findOne({ _id: req.params.id, userId: req.userId });
    if (!card) return res.status(404).json({ message: "Картку не знайдено" });

    card.reviewCount = (card.reviewCount || 0) + 1;
    if (known) card.correctCount = (card.correctCount || 0) + 1;
    card.lastReviewed = new Date();

    // інтервали повторення (в хвилинах)
    const intervals = [1, 5, 30, 180, 1440, 4320, 10080, 43200];
    // 1m, 5m, 30m, 3h, 1d, 3d, 7d, 30d

    const level = Math.min(card.correctCount || 0, intervals.length - 1);

    if (known) {
      const minutes = intervals[level];
      card.nextReview = new Date(Date.now() + minutes * 60 * 1000);
    } else {
      card.nextReview = new Date(Date.now() + 60 * 1000);
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

router.put("/:id/review", auth, reviewHandler);
router.post("/:id/review", auth, reviewHandler);

// ============================================
// DELETE /api/cards/:id
// ============================================
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

// ============================================
// PUT /api/cards/:id (edit)
// ============================================
router.put("/:id", auth, async (req, res) => {
  try {
    const { word, translation, example, deck } = req.body;

    if (!word || !translation) {
      return res.status(400).json({ message: "word і translation обовʼязкові" });
    }

    const updated = await WordCard.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      {
        word: String(word).trim(),
        translation: String(translation).trim(),
        example: (example ?? "").toString(),
        deck: (deck ?? DEFAULT_DECK).toString(),
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

// ============================================
// GET /api/cards/stats  (GLOBAL stats)
// learned rule: correctCount>=3 AND accuracy>=70%
// ============================================
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

    const LEARNED_THRESHOLD = 3;
    const MIN_ACCURACY = 0.7;

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

      const acc = rc > 0 ? cc / rc : 0;
      if (cc >= LEARNED_THRESHOLD && acc >= MIN_ACCURACY) learned += 1;

      // Якщо хочеш ПРОСТІШЕ правило — заміни 2 строки вище на:
      // if (cc >= LEARNED_THRESHOLD) learned += 1;
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
      learned,
      remaining,
      learnedThreshold: LEARNED_THRESHOLD,
      learnedMinAccuracy: MIN_ACCURACY,
    });
  } catch (err) {
    console.error("❌ stats error:", err);
    res.status(500).json({ message: "Помилка при отриманні статистики" });
  }
});

// ============================================
// EXPORT: GET /api/cards/export?format=json|csv
// ============================================
router.get("/export", auth, async (req, res) => {
  try {
    const userId = req.userId;
    const format = String(req.query.format || "json").toLowerCase();

    const cards = await WordCard.find({ userId }).sort({ createdAt: 1 }).lean();

    const clean = cards.map((c) => ({
      word: c.word || "",
      translation: c.translation || "",
      example: c.example || "",
      deck: c.deck || DEFAULT_DECK,
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

    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="cards-${Date.now()}.json"`);
    return res.json({ version: 1, exportedAt: new Date().toISOString(), cards: clean });
  } catch (err) {
    console.error("❌ export error:", err);
    return res.status(500).json({ message: "Помилка експорту" });
  }
});

// ============================================
// IMPORT: POST /api/cards/import
// format=json|csv
// ============================================
router.post("/import", auth, async (req, res) => {
  try {
    const userId = req.userId;
    const format = String(req.body.format || "json").toLowerCase();
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

      incoming = records.map((r) => ({
        word: (r.word || "").trim(),
        translation: (r.translation || "").trim(),
        example: (r.example || "").trim(),
        deck: (r.deck || DEFAULT_DECK).trim(),
        reviewCount: Number(r.reviewCount || 0),
        correctCount: Number(r.correctCount || 0),
        lastReviewed: r.lastReviewed ? new Date(r.lastReviewed) : null,
        nextReview: r.nextReview ? new Date(r.nextReview) : new Date(),
        createdAt: r.createdAt ? new Date(r.createdAt) : null,
      }));
    } else {
      const arr = Array.isArray(raw) ? raw : raw.cards || [];
      if (!Array.isArray(arr)) {
        return res.status(400).json({ message: "Невірний JSON формат (очікую масив cards)" });
      }

      incoming = arr.map((c) => ({
        word: String(c.word || "").trim(),
        translation: String(c.translation || "").trim(),
        example: String(c.example || "").trim(),
        deck: String(c.deck || DEFAULT_DECK).trim(),
        reviewCount: Number(c.reviewCount || 0),
        correctCount: Number(c.correctCount || 0),
        lastReviewed: c.lastReviewed ? new Date(c.lastReviewed) : null,
        nextReview: c.nextReview ? new Date(c.nextReview) : new Date(),
        createdAt: c.createdAt ? new Date(c.createdAt) : null,
      }));
    }

    incoming = incoming.filter((x) => x.word && x.translation);

    if (incoming.length === 0) {
      return res.status(400).json({ message: "Немає валідних карток для імпорту" });
    }

    const uniqKey = (w, t, d) => `${(w || "").toLowerCase()}___${(t || "").toLowerCase()}___${(d || "").toLowerCase()}`;

    // dedup within file
    const map = new Map();
    for (const c of incoming) {
      const key = uniqKey(c.word, c.translation, c.deck || DEFAULT_DECK);
      if (!map.has(key)) map.set(key, c);
    }
    const uniqueIncoming = Array.from(map.values());

    // existing keys from DB
    const existing = await WordCard.find({ userId }, { word: 1, translation: 1, deck: 1 }).lean();
    const existingSet = new Set(existing.map((e) => uniqKey(e.word || "", e.translation || "", e.deck || DEFAULT_DECK)));

    const toInsert = uniqueIncoming
      .filter((c) => !existingSet.has(uniqKey(c.word, c.translation, c.deck || DEFAULT_DECK)))
      .map((c) => ({
        userId,
        word: c.word,
        translation: c.translation,
        example: c.example || "",
        deck: c.deck || DEFAULT_DECK,
        reviewCount: c.reviewCount || 0,
        correctCount: c.correctCount || 0,
        lastReviewed: c.lastReviewed || null,
        nextReview: c.nextReview || new Date(),
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
