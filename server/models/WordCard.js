import mongoose from "mongoose";

const DEFAULT_DECK = "__DEFAULT__";
const WordCardSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    word: { type: String, required: true },
    translation: { type: String, required: true },
    example: { type: String, default: "" },

    reviewCount: { type: Number, default: 0 },
    correctCount: { type: Number, default: 0 },
    lastReviewed: { type: Date, default: null },
    nextReview: { type: Date, default: Date.now },
    deck: { type: String, default: DEFAULT_DECK },

  },
  { timestamps: true } // ✅ ось це додає createdAt і updatedAt
);
WordCardSchema.index(
  { userId: 1, word: 1, translation: 1, deck: 1 },
  { unique: true }
);


export default mongoose.model("WordCard", WordCardSchema);
