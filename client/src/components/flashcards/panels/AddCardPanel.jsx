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
    <div className="panel" style={{ marginTop: 12 }}>
      <h3 style={{ marginTop: 0 }}>{t.addCard || "Add card"}</h3>

      <form onSubmit={handleAddCard} style={{ display: "grid", gap: 10 }}>
        <div style={{ display: "grid", gap: 6 }}>
          <label style={{ fontSize: 13, opacity: 0.85 }}>{t.word || "Word"}</label>
          <input value={word} onChange={(e) => setWord(e.target.value)} placeholder="DE..." />
        </div>

        <div style={{ display: "grid", gap: 6 }}>
          <label style={{ fontSize: 13, opacity: 0.85 }}>{t.translation || "Translation"}</label>
          <input
            value={translation}
            onChange={(e) => setTranslation(e.target.value)}
            placeholder="UA..."
          />
        </div>

        <div style={{ display: "grid", gap: 6 }}>
          <label style={{ fontSize: 13, opacity: 0.85 }}>{t.example || "Example"}</label>
          <textarea
            rows={3}
            value={example}
            onChange={(e) => setExample(e.target.value)}
            placeholder={t.exampleHint || "Example sentence..."}
          />
        </div>

        <div style={{ display: "grid", gap: 6 }}>
          <label style={{ fontSize: 13, opacity: 0.85 }}>{t.deck || "Deck"}</label>
          <select value={deckForNewCard} onChange={(e) => setDeckForNewCard(e.target.value)}>
            {(decks || []).map((d) => (
              <option key={d} value={d}>
                {deckLabel ? deckLabel(d) : d}
              </option>
            ))}
          </select>
          <div style={{ fontSize: 12, opacity: 0.7 }}>
            {t.defaultDeckNote || `Default: ${deckLabel?.(DEFAULT_DECK_ID) ?? DEFAULT_DECK_ID}`}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <input
            value={newDeckName}
            onChange={(e) => setNewDeckName(e.target.value)}
            placeholder={t.newDeck || "New deck name"}
          />
          <button type="button" onClick={handleCreateDeckLocal}>
            {t.createDeck || "Create deck (local)"}
          </button>
        </div>

        <button type="submit" style={{ marginTop: 6 }}>
          {t.add || "Add"}
        </button>
      </form>
    </div>
  );
}