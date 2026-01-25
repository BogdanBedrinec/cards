import WordCard from "../models/WordCard.js";

export const DEMO_EMAIL = "demo@demo.com";
export const DEMO_DECK = "Demo";

function demoCardsEN_DE() {
  return [
    { word: "hello", translation: "hallo", example: "Hello! Nice to meet you.", deck: DEMO_DECK },
    { word: "good morning", translation: "guten Morgen", example: "Good morning, how are you?", deck: DEMO_DECK },
    { word: "thank you", translation: "danke", example: "Thank you for your help.", deck: DEMO_DECK },
    { word: "please", translation: "bitte", example: "Please, take a seat.", deck: DEMO_DECK },
    { word: "where is…?", translation: "wo ist…?", example: "Where is the station?", deck: DEMO_DECK },
    { word: "how much?", translation: "wie viel?", example: "How much is this?", deck: DEMO_DECK },
    { word: "I would like…", translation: "ich möchte…", example: "I would like a coffee.", deck: DEMO_DECK },
    { word: "help", translation: "Hilfe", example: "Help! I’m lost.", deck: DEMO_DECK },
    { word: "today", translation: "heute", example: "Today I have a lot to do.", deck: DEMO_DECK },
    { word: "tomorrow", translation: "morgen", example: "Tomorrow we’ll study German.", deck: DEMO_DECK },
    { word: "sorry", translation: "entschuldigung", example: "Sorry, I’m late.", deck: DEMO_DECK },
  ];
}

/**
 * ALWAYS reseed for demo user:
 * - delete existing demo cards
 * - insert fresh 11 cards
 */
export async function reseedDemoCards(user) {
  if (!user?.email || user.email.toLowerCase() !== DEMO_EMAIL) return { reseeded: false, inserted: 0 };

  const userId = String(user._id);

  // 1) remove previous demo deck cards
  await WordCard.deleteMany({ userId, deck: DEMO_DECK });

  // 2) insert new set
  const now = new Date();
  const docs = demoCardsEN_DE().map((c) => ({
    userId,
    word: c.word,
    translation: c.translation,
    example: c.example || "",
    deck: c.deck || "Без теми",

    // reset learning progress each time
    reviewCount: 0,
    correctCount: 0,
    lastReviewed: null,
    nextReview: now,
  }));

  // IMPORTANT: your schema has unique index. We delete first, so insertMany is safe.
  const insertedDocs = await WordCard.insertMany(docs, { ordered: true });

  return { reseeded: true, inserted: insertedDocs.length };
}
