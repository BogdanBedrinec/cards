import React from "react";

export default function AddCardPanel({
  t,
  word,
  setWord,
  translation,
  setTranslation,
  example,
  setExample,
  handleAddCard,
  decks,
  deckForNewCard,
  setDeckForNewCard,
  newDeckName,
  setNewDeckName,
  handleCreateDeckLocal,
  deckLabel,
  DEFAULT_DECK_ID,
}) {
  return (
    <div className="panel add-card-panel">
      <h3 className="add-card-title">{t.addCard || "Add card"}</h3>

      <form onSubmit={handleAddCard} className="add-card-form">
        <div className="add-card-grid">
          <div className="add-field">
            <label className="add-label">{t.word || "Word"}</label>
            <input
              value={word}
              onChange={(e) => setWord(e.target.value)}
              placeholder="DE..."
            />
          </div>

          <div className="add-field">
            <label className="add-label">{t.translation || "Translation"}</label>
            <input
              value={translation}
              onChange={(e) => setTranslation(e.target.value)}
              placeholder="UA..."
            />
          </div>
        </div>

        <div className="add-field">
          <label className="add-label">{t.example || "Example"}</label>
          <textarea
            rows={3}
            value={example}
            onChange={(e) => setExample(e.target.value)}
            placeholder={t.exampleHint || "Example sentence..."}
          />
        </div>

        <div className="add-card-section">
          <div className="add-field">
            <label className="add-label">{t.deck || "Deck"}</label>
            <select
              value={deckForNewCard}
              onChange={(e) => setDeckForNewCard(e.target.value)}
            >
              {(decks || []).map((d) => (
                <option key={d} value={d}>
                  {deckLabel ? deckLabel(d) : d}
                </option>
              ))}
            </select>
            <div className="add-note">
              {t.defaultDeckNote || `Default: ${deckLabel?.(DEFAULT_DECK_ID) ?? DEFAULT_DECK_ID}`}
            </div>
          </div>

          <div className="add-new-deck-row">
            <div className="add-field add-field-grow">
<label className="add-label">{t.newDeck || "New deck"}</label>
              <input
                value={newDeckName}
                onChange={(e) => setNewDeckName(e.target.value)}
                placeholder={t.newDeckPlaceholder || "Type a new deck name..."}
              />
            </div>

            <button
              type="button"
              className="add-secondary-btn"
              onClick={handleCreateDeckLocal}
              disabled={!newDeckName.trim()}
            >
              {t.createDeck}
            </button>
          </div>
        </div>

        <button type="submit" className="add-primary-btn">
          {t.add || "Add"}
        </button>
      </form>
    </div>
  );
}