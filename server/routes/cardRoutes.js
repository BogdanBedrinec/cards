import express from "express";
import auth from "../middleware/auth.js";
import WordCard from "../models/WordCard.js";
import { stringify } from "csv-stringify/sync";
import { parse } from "csv-parse/sync";
import mongoose from "mongoose"; // додай зверху файлу, якщо ще нема

const router = express.Router();
const DEFAULT_DECK = "Без теми";

// ============================================
// GET /api/cards
// mode=due | all
// sort=nextReview | createdAt | word | translation | accuracy
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

    // due includes: missing/null OR <= now
    if (mode === "due") {
      filter.$or = [
        { nextReview: { $exists: false } },
        { nextReview: null },
        { nextReview: { $lte: now } },
      ];
    }

    // DB sort for most fields
    let mongoSort = {};
    if (sort === "nextreview") mongoSort = { nextReview: order, _id: 1 };
    else if (sort === "createdat") mongoSort = { createdAt: order, _id: 1 };
    else if (sort === "word") mongoSort = { word: order, _id: 1 };
    else if (sort === "translation") mongoSort = { translation: order, _id: 1 };
    else mongoSort = { nextReview: order, _id: 1 };

    let cards = await WordCard.find(filter).sort(mongoSort);

    // accuracy: computed in JS (because stored fields)
    if (sort === "accuracy") {
      cards = cards.sort((a, b) => {
        const accA = a.reviewCount ? a.correctCount / a.reviewCount : 0;
        const accB = b.reviewCount ? b.correctCount / b.reviewCount : 0;

        if (accA === accB) {
          // stable tie-breaker
          const ca = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const cb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          if (ca === cb) return String(a._id).localeCompare(String(b._id));
          return (ca - cb) * order;
        }

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
// PUT /api/cards/decks/rename
// body: { from, to }
// ============================================
router.put("/decks/rename", auth, async (req, res) => {
  try {
    const userId = req.userId;
    const from = String(req.body.from || "").trim();
    const to = String(req.body.to || "").trim();

    if (!from || !to) return res.status(400).json({ message: "from/to required" });
    if (from === DEFAULT_DECK)
      return res.status(400).json({ message: "Не можна перейменувати дефолтну тему" });
    if (from === to) return res.json({ message: "No changes", moved: 0, conflicts: 0 });

    // знайти всі _id карток у цьому deck
    const cards = await WordCard.find({ userId, deck: from }, { _id: 1 }).lean();
    const ids = cards.map((c) => c._id);

    if (ids.length === 0) {
      return res.json({ message: "Deck renamed", moved: 0, conflicts: 0 });
    }

    const ops = ids.map((id) => ({
      updateOne: {
        filter: { _id: id, userId },
        update: { $set: { deck: to } },
      },
    }));

    try {
      const bulkRes = await WordCard.bulkWrite(ops, { ordered: false });
      return res.json({
        message: "Deck renamed",
        moved: bulkRes.modifiedCount ?? bulkRes.nModified ?? 0,
        conflicts: 0,
      });
    } catch (e) {
      const r = e?.result;
      return res.status(207).json({
        message:
          "Deck rename частково виконано ⚠️ (частина не перейменована через дублікати у цільовій темі)",
        moved: r?.nModified ?? r?.modifiedCount ?? 0,
        conflicts: "unknown",
      });
    }
  } catch (err) {
    console.error("❌ rename deck error:", err);
    return res.status(500).json({ message: "Помилка перейменування теми" });
  }
});


// ============================================
// DELETE /api/cards/decks/:name
// query: mode=move|delete  & to=...
// ============================================
router.delete("/decks/:name", auth, async (req, res) => {
  try {
    const userId = req.userId;
    const name = String(req.params.name || "").trim();
    const mode = String(req.query.mode || "move").toLowerCase();
    const to = String(req.query.to || DEFAULT_DECK).trim() || DEFAULT_DECK;

    if (!name) return res.status(400).json({ message: "deck name required" });
    if (name === DEFAULT_DECK)
      return res.status(400).json({ message: "Не можна видалити дефолтну тему" });

    if (mode === "delete") {
      const r = await WordCard.deleteMany({ userId, deck: name });
      return res.json({ message: "Deck deleted", deletedCards: r.deletedCount });
    }

    // mode=move
    if (to === name) {
      return res.status(400).json({ message: "to не може дорівнювати deck, який видаляємо" });
    }

    const cards = await WordCard.find({ userId, deck: name }, { _id: 1 }).lean();
    const ids = cards.map((c) => c._id);

    if (ids.length === 0) {
      return res.json({ message: "Deck removed (cards moved)", moved: 0, conflicts: 0, to });
    }

    const ops = ids.map((id) => ({
      updateOne: {
        filter: { _id: id, userId },
        update: { $set: { deck: to } },
      },
    }));

    try {
      const bulkRes = await WordCard.bulkWrite(ops, { ordered: false });
      return res.json({
        message: "Deck removed (cards moved)",
        moved: bulkRes.modifiedCount ?? bulkRes.nModified ?? 0,
        conflicts: 0,
        to,
      });
    } catch (e) {
      const r = e?.result;
      return res.status(207).json({
        message:
          "Remove deck частково виконано ⚠️ (частина не перенесена через дублікати у цільовій темі)",
        moved: r?.nModified ?? r?.modifiedCount ?? 0,
        conflicts: "unknown",
        to,
      });
    }
  } catch (err) {
    console.error("❌ delete deck error:", err);
    return res.status(500).json({ message: "Помилка видалення теми" });
  }
});


// ============================================
// PATCH /api/cards/bulk
// { ids: [...], action: "delete" | "moveDeck", toDeck? }
// ============================================
router.patch("/bulk", auth, async (req, res) => {
  try {
    const userId = req.userId;
    const ids = Array.isArray(req.body.ids) ? req.body.ids : [];
    const action = String(req.body.action || "").toLowerCase();
    const toDeck = String(req.body.toDeck || DEFAULT_DECK).trim() || DEFAULT_DECK;

    if (!ids.length) return res.status(400).json({ message: "ids required" });
    if (ids.length > 500) return res.status(400).json({ message: "Too many ids (max 500)" });

    if (action === "delete") {
      const r = await WordCard.deleteMany({ userId, _id: { $in: ids } });
      return res.json({ message: "Deleted", deleted: r.deletedCount });
    }

    if (action === "movedeck") {
      const cards = await WordCard.find({ userId, _id: { $in: ids } });

      let moved = 0;
      let conflicts = 0;

      for (const c of cards) {
        c.deck = toDeck;
        try {
          await c.save();
          moved += 1;
        } catch (e) {
          if (e && e.code === 11000) {
            conflicts += 1;
            continue;
          }
          throw e;
        }
      }

      return res.json({ message: "Moved", moved, conflicts, toDeck });
    }

    return res.status(400).json({ message: "Unknown action" });
  } catch (err) {
    console.error("❌ bulk error:", err);
    return res.status(500).json({ message: "Помилка bulk операції" });
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
      $or: [{ nextReview: { $exists: false } }, { nextReview: null }, { nextReview: { $lte: now } }],
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
    const { known } = req.body;

    const card = await WordCard.findOne({ _id: req.params.id, userId: req.userId });
    if (!card) return res.status(404).json({ message: "Картку не знайдено" });

    card.reviewCount = (card.reviewCount || 0) + 1;
    if (known) card.correctCount = (card.correctCount || 0) + 1;
    card.lastReviewed = new Date();

    const intervals = [1, 5, 30, 180, 1440, 4320, 10080, 43200];
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
// BULK: POST /api/cards/bulk-delete
// body: { ids: ["id1","id2", ...] }
// ============================================
router.post("/bulk-delete", auth, async (req, res) => {
  try {
    const userId = req.userId;
    const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];

    if (ids.length === 0) {
      return res.status(400).json({ message: "ids має бути непорожнім масивом" });
    }

    // валідні ObjectId (щоб не падало)
    const objectIds = ids
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    if (objectIds.length === 0) {
      return res.status(400).json({ message: "Немає валідних id" });
    }

    const result = await WordCard.deleteMany({
      userId,
      _id: { $in: objectIds },
    });

    return res.json({
      message: "Bulk delete ✅",
      requested: ids.length,
      validIds: objectIds.length,
      deleted: result.deletedCount || 0,
    });
  } catch (err) {
    console.error("❌ bulk-delete error:", err);
    return res.status(500).json({ message: "Помилка bulk delete" });
  }
});

// ============================================
// BULK: POST /api/cards/bulk-move
// body: { ids: ["id1","id2", ...], deck: "New Deck" }
// ============================================
router.post("/bulk-move", auth, async (req, res) => {
  try {
    const userId = req.userId;
    const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
    const deckRaw = req.body?.deck;

    if (ids.length === 0) {
      return res.status(400).json({ message: "ids має бути непорожнім масивом" });
    }

    const newDeck = String(deckRaw || DEFAULT_DECK).trim() || DEFAULT_DECK;

    // валідні ObjectId
    const objectIds = ids
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    if (objectIds.length === 0) {
      return res.status(400).json({ message: "Немає валідних id" });
    }

    // updateMany може впасти через unique index (userId+word+translation+deck),
    // якщо у цільовому deck вже є така сама картка.
    // Тому робимо "обережний" bulkWrite з ordered:false
    const ops = objectIds.map((id) => ({
      updateOne: {
        filter: { _id: id, userId },
        update: { $set: { deck: newDeck } },
      },
    }));

    let bulkRes;
    try {
      bulkRes = await WordCard.bulkWrite(ops, { ordered: false });
    } catch (e) {
      // Навіть якщо частина впала через дублікати — bulkWrite все одно може частково оновити
      bulkRes = e?.result || null;

      // Повернемо зрозуміле повідомлення
      return res.status(207).json({
        message:
          "Bulk move частково виконано ⚠️ (частина карток не перенеслась через дублікати у цільовій темі)",
        toDeck: newDeck,
        requested: ids.length,
        validIds: objectIds.length,
        modified: bulkRes?.nModified ?? bulkRes?.modifiedCount ?? 0,
        matched: bulkRes?.nMatched ?? bulkRes?.matchedCount ?? 0,
      });
    }

    return res.json({
      message: "Bulk move ✅",
      toDeck: newDeck,
      requested: ids.length,
      validIds: objectIds.length,
      matched: bulkRes?.matchedCount ?? bulkRes?.nMatched ?? 0,
      modified: bulkRes?.modifiedCount ?? bulkRes?.nModified ?? 0,
    });
  } catch (err) {
    console.error("❌ bulk-move error:", err);
    return res.status(500).json({ message: "Помилка bulk move" });
  }
});


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
// GET /api/cards/stats
// ============================================
router.get("/stats", auth, async (req, res) => {
  try {
    const userId = req.userId;
    const now = new Date();

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const LEARNED_THRESHOLD = 3;

    const totalCards = await WordCard.countDocuments({ userId });

    const dueNow = await WordCard.countDocuments({
      userId,
      $or: [{ nextReview: { $exists: false } }, { nextReview: null }, { nextReview: { $lte: now } }],
    });

    const reviewedToday = await WordCard.countDocuments({
      userId,
      lastReviewed: { $gte: startOfToday },
    });

    const agg = await WordCard.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: null,
          totalReviews: { $sum: { $ifNull: ["$reviewCount", 0] } },
          totalCorrect: { $sum: { $ifNull: ["$correctCount", 0] } },
          learned: {
            $sum: {
              $cond: [{ $gte: [{ $ifNull: ["$correctCount", 0] }, LEARNED_THRESHOLD] }, 1, 0],
            },
          },
        },
      },
    ]);

    const totals = agg[0] || { totalReviews: 0, totalCorrect: 0, learned: 0 };

    const totalReviews = totals.totalReviews || 0;
    const totalCorrect = totals.totalCorrect || 0;
    const learned = totals.learned || 0;

    const accuracy = totalReviews === 0 ? 0 : Math.round((totalCorrect / totalReviews) * 100);
    const remaining = Math.max(0, totalCards - learned);

    return res.json({
      totalCards,
      dueNow,
      reviewedToday,
      totalReviews,
      totalCorrect,
      accuracy,
      learned,
      remaining,
      learnedThreshold: LEARNED_THRESHOLD,
    });
  } catch (err) {
    console.error("❌ stats error:", err);
    return res.status(500).json({ message: "Помилка при отриманні статистики" });
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

    const uniqKey = (w, t, d) =>
      `${(w || "").toLowerCase()}___${(t || "").toLowerCase()}___${(d || "").toLowerCase()}`;

    const map = new Map();
    for (const c of incoming) {
      const key = uniqKey(c.word, c.translation, c.deck || DEFAULT_DECK);
      if (!map.has(key)) map.set(key, c);
    }
    const uniqueIncoming = Array.from(map.values());

    const existing = await WordCard.find({ userId }, { word: 1, translation: 1, deck: 1 }).lean();
    const existingSet = new Set(
      existing.map((e) => uniqKey(e.word || "", e.translation || "", e.deck || DEFAULT_DECK))
    );

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
