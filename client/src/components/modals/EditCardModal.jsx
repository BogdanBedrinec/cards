import React from "react";

export default function EditCardModal({
  open,
  t,
  decks,
  deckLabel,
  DEFAULT_DECK_ID,

  editWord,
  setEditWord,
  editTranslation,
  setEditTranslation,
  editExample,
  setEditExample,
  editDeck,
  setEditDeck,

  onClose,
  onSave,
}) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "grid",
        placeItems: "center",
        padding: 16,
        zIndex: 50,
      }}
      onMouseDown={onClose}
    >
      <div
        className="panel"
        style={{ width: "min(720px, 100%)", padding: 14 }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <b>{t?.editTitle || "Edit card"}</b>
          <button type="button" onClick={onClose}>
            ✖
          </button>
        </div>

        <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
          <input
            type="text"
            value={editWord}
            onChange={(e) => setEditWord(e.target.value)}
            placeholder="word"
          />
          <input
            type="text"
            value={editTranslation}
            onChange={(e) => setEditTranslation(e.target.value)}
            placeholder="translation"
          />
          <input
            type="text"
            value={editExample}
            onChange={(e) => setEditExample(e.target.value)}
            placeholder="Example (optional)"
          />

          <select value={editDeck} onChange={(e) => setEditDeck(e.target.value)}>
            {decks?.length === 0 ? (
              <option value={DEFAULT_DECK_ID}>{t?.defaultDeck || "No topic"}</option>
            ) : (
              decks.map((d) => (
                <option key={d} value={d}>
                  {deckLabel ? deckLabel(d) : d}
                </option>
              ))
            )}
          </select>

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button type="button" onClick={onClose}>
              {t?.cancel || "Cancel"}
            </button>
            <button type="button" onClick={onSave}>
              {t?.save || "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}