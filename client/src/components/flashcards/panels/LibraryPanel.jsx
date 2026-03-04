import React from "react";

export default function LibraryPanel({
  t,
  librarySearch,
  setLibrarySearch,
  fetchLibraryCards,
  libraryLoading,

  bulkBusy,
  filteredLibraryCards,
  selectedCount,
  selectAllFiltered,
  clearSelection,
  bulkDelete,

  decks,
  deckLabel,
  toggleSelect,
  selectedIds,
  openEdit,
  handleDeleteCard,

  learningLang,
  nativeLang,
  langLabel,
  formatTimeUntil,
}) {
  const list = Array.isArray(filteredLibraryCards) ? filteredLibraryCards : [];
  const decksList = Array.isArray(decks) ? decks : [];
  const sel = selectedIds instanceof Set ? selectedIds : new Set();

  return (
    <div className="library-shell">
      <div className="library-panel">
        <div className="library-header">
          <h3 className="library-title">{t.library || "Library"}</h3>

          <button
            type="button"
            className="library-reload-btn"
            onClick={fetchLibraryCards}
            disabled={libraryLoading}
          >
            {libraryLoading ? t.loading : t.refresh || "Refresh"}
          </button>
        </div>

        <div className="library-search-row">
          <input
            className="library-search-input"
            value={librarySearch}
            onChange={(e) => setLibrarySearch(e.target.value)}
            placeholder={t.searchPlaceholder || t.search || "Search..."}
          />

<div className="library-found">
  <b>{list.length}</b> {t.cardsLabel || "Karten"}
</div>
        </div>

<div className="library-bulk-bar">
  <div className="library-bulk-left">
    <button
      type="button"
      className="library-bulk-btn"
      onClick={selectAllFiltered}
      disabled={list.length === 0}
    >
      {t.selectAll || "Select all"}
    </button>

    <button
      type="button"
      className="library-bulk-btn"
      onClick={clearSelection}
      disabled={selectedCount === 0}
    >
      {t.clear || "Clear"}
    </button>

    <span className="library-selected">
      {t.selected || "Selected"}: <b>{selectedCount}</b>
    </span>
  </div>

{selectedCount > 0 && (
  <div className="library-bulk-right">
    <button
      type="button"
      className="library-bulk-btn danger"
      onClick={bulkDelete}
      disabled={bulkBusy}
    >
      {bulkBusy ? t.loading : t.deleteSelected || t.delete || "Delete"}
    </button>
  </div>
)}
</div>

        {list.length === 0 ? (
          <div className="library-empty">
            {t.noFound || t.noCards || "No cards"}
          </div>
        ) : (
          <div className="library-cards-list">
            {list.map((c) => {
              const id = c._id;
              const checked = sel.has(id);
              const nextIn = formatTimeUntil?.(c.nextReview);

              return (
                <div key={id} className="library-card-item">
                  <div className="library-card-main">
                    <div className="library-checkbox-wrap">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSelect(id)}
                        aria-label="select"
                      />
                    </div>

<div className="library-card-content">
  <div className="library-card-word-row">
<div className="library-card-word">
  {c.word || "—"}{" "}
  <span className="library-card-lang">
    ({langLabel?.(learningLang)})
  </span>
</div>
  </div>

<div className="library-card-translation">
  {c.translation || "—"}{" "}
  <span className="library-card-lang">
    ({langLabel?.(nativeLang)})
  </span>
</div>

  {c.example ? (
    <div className="library-card-example">{c.example}</div>
  ) : null}

  <div className="library-card-meta">
    <span>
      {t.deckFilter || t.deck || "Deck"}:{" "}
      <b>{deckLabel?.(c.deck) ?? c.deck}</b>
    </span>

    {nextIn ? <span>• {nextIn}</span> : null}
  </div>
</div>

<div className="library-card-actions">
  <button
    type="button"
    className="library-item-btn"
    onClick={() => openEdit(c)}
  >
    {t.edit || "Edit"}
  </button>

  <button
    type="button"
    className="library-item-btn danger"
    onClick={() => handleDeleteCard(id)}
  >
    {t.delete || "Delete"}
  </button>
</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}