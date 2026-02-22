import React from "react";

export default function ReviewPanel({
  t,
  cards,
  isCardsLoading,
  currentReviewCard,
  showAnswer,
  setShowAnswer,
  reviewAnswer,
  isReviewing,
  progressIndex,
  progressTotal,
  deckLabel,
  DEFAULT_DECK_ID,
  formatTimeUntil,
}) {
  const hasCards = Array.isArray(cards) && cards.length > 0;

  if (isCardsLoading) {
    return (
      <div className="panel" style={{ marginTop: 12 }}>
        <div style={{ opacity: 0.8 }}>{t.loading}</div>
      </div>
    );
  }

  if (!hasCards) {
    return (
      <div className="panel" style={{ marginTop: 12 }}>
        <h3 style={{ marginTop: 0 }}>{t.review}</h3>
        <p style={{ marginBottom: 0, opacity: 0.85 }}>{t.noCardsToReview || "No cards to review"}</p>
      </div>
    );
  }

  const c = currentReviewCard || cards[0];

  const deckName = deckLabel?.(c.deck || DEFAULT_DECK_ID) ?? (c.deck || DEFAULT_DECK_ID);
  const nextIn = formatTimeUntil?.(c.nextReview);

  return (
    <div className="panel" style={{ marginTop: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ opacity: 0.85 }}>
          <b>{t.deck || "Deck"}:</b> {deckName}
          {nextIn ? <span style={{ marginLeft: 10, opacity: 0.8 }}>• {nextIn}</span> : null}
        </div>

        <div style={{ opacity: 0.85 }}>
          <b>{t.progress || "Progress"}:</b> {progressIndex}/{progressTotal || cards.length}
        </div>
      </div>

      <div
        className="flashcard"
        role="button"
        tabIndex={0}
        onClick={() => setShowAnswer((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") setShowAnswer((v) => !v);
        }}
        style={{
          marginTop: 14,
          padding: 16,
          borderRadius: 12,
          cursor: "pointer",
          userSelect: "none",
        }}
        aria-label="flashcard"
      >
        <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
          {c.word || "—"}
        </div>

        {showAnswer ? (
          <>
            <div style={{ fontSize: 18, marginBottom: 8 }}>{c.translation || "—"}</div>
            {c.example ? <div style={{ opacity: 0.85 }}>{c.example}</div> : null}
          </>
        ) : (
          <div style={{ opacity: 0.7 }}>{t.tapToShow || "Tap to show answer"}</div>
        )}
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => reviewAnswer(true)}
          disabled={isReviewing}
          style={{ minWidth: 140 }}
        >
          {t.know || "Know"} (1)
        </button>

        <button
          type="button"
          onClick={() => reviewAnswer(false)}
          disabled={isReviewing}
          style={{ minWidth: 140 }}
        >
          {t.dontKnow || "Don't know"} (2)
        </button>

        <button
          type="button"
          onClick={() => setShowAnswer(true)}
          disabled={showAnswer}
        >
          {t.show || "Show"} (Space/Enter)
        </button>
      </div>

      <div style={{ marginTop: 10, opacity: 0.7, fontSize: 13 }}>
        {t.shortcutsHint || "Shortcuts: Space/Enter = show, 1 = know, 2 = don't know"}
      </div>
    </div>
  );
}