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
  return (
    <div className="review-mode">
      {isCardsLoading ? (
        <div className="panel" style={{ marginTop: 12, padding: 12 }}>
          <span className="spinner" aria-hidden="true" /> {t.loading}
        </div>
      ) : cards.length === 0 ? (
        <p className="empty">{t.noCards}</p>
      ) : (
        <div className="review-card">
          <div className="review-top">
            <span className="review-chip">
              {deckLabel(currentReviewCard?.deck || DEFAULT_DECK_ID)}
            </span>

            <span className="review-progress">
              {progressTotal > 0 ? `${progressIndex} / ${progressTotal}` : `0 / 0`}
            </span>
          </div>

          <div className="review-main">
            <div className="review-word">{currentReviewCard?.word}</div>

            {showAnswer ? (
              <>
                <div className="review-translation">{currentReviewCard?.translation}</div>
                {currentReviewCard?.example ? (
                  <div className="review-example">📘 {currentReviewCard.example}</div>
                ) : null}
              </>
            ) : (
              <button
                className="review-reveal"
                type="button"
                onClick={() => setShowAnswer(true)}
                title="Space / Enter"
                aria-label="Show translation"
              >
                {t.showTranslation}
              </button>
            )}
          </div>

          <div className="review-actions">
            <button type="button" onClick={() => reviewAnswer(true)} disabled={isReviewing}>
              {t.know}
            </button>
            <button type="button" onClick={() => reviewAnswer(false)} disabled={isReviewing}>
              {t.dontKnow}
            </button>
          </div>

          {currentReviewCard?.nextReview &&
            new Date(currentReviewCard.nextReview) > new Date() && (
              <div className="meta" style={{ textAlign: "center", marginTop: 10 }}>
                ⏳ {formatTimeUntil(currentReviewCard.nextReview)}
              </div>
            )}
        </div>
      )}
    </div>
  );
}