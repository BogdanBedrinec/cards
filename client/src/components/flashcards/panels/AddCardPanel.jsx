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
      <h3 className="add-card-title">{t.addCard}</h3>

      <form onSubmit={handleAddCard} className="add-card-form">
        <div className="add-card-grid">
          <div className="add-field">
            <label className="add-label">{t.word}</label>
            <input
              value={word}
              onChange={(e) => setWord(e.target.value)}
              placeholder="DE..."
            />
          </div>

          <div className="add-field">
            <label className="add-label">{t.translation}</label>
            <input
              value={translation}
              onChange={(e) => setTranslation(e.target.value)}
              placeholder="UA..."
            />
          </div>
        </div>

        <div className="add-field">
          <label className="add-label">{t.example}</label>
          <textarea
            rows={3}
            value={example}
            onChange={(e) => setExample(e.target.value)}
            placeholder={t.exampleHint}
          />
        </div>

        <div className="add-card-section">
          <div className="add-field">
            <label className="add-label">{t.deck}</label>
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
              {t.defaultDeckNote?.replace("{default}", deckLabel?.(DEFAULT_DECK_ID) ?? DEFAULT_DECK_ID)}
            </div>
          </div>

          <div className="add-new-deck-row">
            <div className="add-field add-field-grow">
<label className="add-label">{t.newDeck}</label>
              <input
                value={newDeckName}
                onChange={(e) => setNewDeckName(e.target.value)}
                placeholder={t.newDeckPlaceholder}
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
          {t.add}
        </button>
      </form>
    </div>
  );
}