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
      <div className="review-shell">
        <div className="review-card review-card-empty">
          <div className="review-empty-text">{t.loading || "Loading..."}</div>
        </div>
      </div>
    );
  }

  if (!hasCards) {
    return (
      <div className="review-shell">
        <div className="review-card review-card-empty">
          <h3 className="review-empty-title">{t.review || "Review"}</h3>
          <p className="review-empty-text">
            {t.noCardsToReview || "No cards to review"}
          </p>
        </div>
      </div>
    );
  }

  const c = currentReviewCard || cards[0];
  const deckName = deckLabel?.(c.deck || DEFAULT_DECK_ID) ?? (c.deck || DEFAULT_DECK_ID);
  const nextIn = formatTimeUntil?.(c.nextReview);

  return (
    <div className="review-shell">
      <div className="review-card">
        <div className="review-card-head">
          <div className="review-deck-wrap">
            <span className="review-deck-label">{t.deck || "Deck"}:</span>
            <span className="review-chip">{deckName}</span>
            {nextIn ? <span className="review-next-time">• {nextIn}</span> : null}
          </div>

          <div className="review-progress">
            <span className="review-progress-label">{t.progress || "Progress"}:</span>
            <span className="review-progress-value">
              {progressIndex}/{progressTotal || cards.length}
            </span>
          </div>
        </div>

        <div
          className="review-main"
          role="button"
          tabIndex={0}
          onClick={() => setShowAnswer((v) => !v)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setShowAnswer((v) => !v);
            }
          }}
          aria-label="flashcard"
        >
          <div className="review-word">{c.word || "—"}</div>

          {!showAnswer ? (
            <div className="review-hint">
              {t.tapToShow || "Tap to show answer"}
            </div>
          ) : (
            <div className="review-answer-block">
              <div className="review-translation">{c.translation || "—"}</div>

              {c.example ? (
                <div className="review-example">{c.example}</div>
              ) : null}
            </div>
          )}
        </div>

        <div className="review-actions">
          <button
            type="button"
            className="review-btn review-btn-good"
            onClick={() => reviewAnswer(true)}
            disabled={isReviewing}
          >
            {(t.know || "Know")} (1)
          </button>

          <button
            type="button"
            className="review-btn review-btn-bad"
            onClick={() => reviewAnswer(false)}
            disabled={isReviewing}
          >
            {(t.dontKnow || "Don't know")} (2)
          </button>

          <button
            type="button"
            className="review-btn review-btn-show"
            onClick={() => setShowAnswer(true)}
            disabled={showAnswer}
          >
            {(t.show || "Show")} (Space/Enter)
          </button>
        </div>

        <div className="review-shortcuts">
          {t.shortcutsHint || "Shortcuts: Space/Enter = show, 1 = know, 2 = don't know"}
        </div>
      </div>
    </div>
  );
}