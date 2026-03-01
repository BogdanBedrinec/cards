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
  bulkDeck,
  setBulkDeck,
  bulkMove,
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

  // deck manager
  deckManageFrom,
  setDeckManageFrom,
  deckManageTo,
  setDeckManageTo,
  deckRemoveTo,
  setDeckRemoveTo,
  deckManageBusy,
  renameDeck,
  removeDeckMoveCards,
  isDefaultFrom,
  isSameRemoveTarget,
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
            {t.found || "Found"}: <b>{list.length}</b>
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

          <div className="library-bulk-right">
            <span className="library-inline-label">
              {t.moveTo || "Move to"}
            </span>

            <select
              className="library-bulk-select"
              value={bulkDeck}
              onChange={(e) => setBulkDeck(e.target.value)}
            >
              {decksList.map((d) => (
                <option key={d} value={d}>
                  {deckLabel ? deckLabel(d) : d}
                </option>
              ))}
            </select>

            <button
              type="button"
              className="library-bulk-btn"
              onClick={bulkMove}
              disabled={bulkBusy || selectedCount === 0}
            >
              {bulkBusy ? t.loading : t.move || "Move"}
            </button>

            <button
              type="button"
              className="library-bulk-btn danger"
              onClick={bulkDelete}
              disabled={bulkBusy || selectedCount === 0}
            >
              {bulkBusy ? t.loading : t.deleteSelected || t.delete || "Delete"}
            </button>
          </div>
        </div>

        <details className="library-deck-manager">
          <summary className="library-deck-summary">
            {t.deckManagerTitle || t.deckManager || "Deck manager"}
          </summary>

          <div className="library-deck-manager-inner">
            <div className="library-deck-row">
              <label className="library-field">
                <span className="library-field-label">
                  {t.from || "From"}
                </span>

                <select
                  value={deckManageFrom}
                  onChange={(e) => setDeckManageFrom(e.target.value)}
                >
                  {decksList.map((d) => (
                    <option key={d} value={d}>
                      {deckLabel ? deckLabel(d) : d}
                    </option>
                  ))}
                </select>
              </label>

              <label className="library-field library-field-grow">
                <span className="library-field-label">
                  {t.newName || "New name"}
                </span>

                <input
                  value={deckManageTo}
                  onChange={(e) => setDeckManageTo(e.target.value)}
                  placeholder={t.newName || "New name"}
                  disabled={isDefaultFrom}
                />
              </label>

              <button
                type="button"
                className="library-action-btn"
                onClick={renameDeck}
                disabled={deckManageBusy || isDefaultFrom}
              >
                {deckManageBusy ? t.loading : t.renameBtn || t.rename || "Rename"}
              </button>
            </div>

            <div className="library-deck-row">
              <label className="library-field">
                <span className="library-field-label">
                  {t.removeMoveTo || "Remove: move cards to"}
                </span>

                <select
                  value={deckRemoveTo}
                  onChange={(e) => setDeckRemoveTo(e.target.value)}
                >
                  {decksList.map((d) => (
                    <option key={d} value={d}>
                      {deckLabel ? deckLabel(d) : d}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="button"
                className="library-action-btn danger"
                onClick={removeDeckMoveCards}
                disabled={deckManageBusy || isDefaultFrom || isSameRemoveTarget}
              >
                {deckManageBusy ? t.loading : t.removeBtn || t.removeDeck || "Remove"}
              </button>
            </div>

            {isDefaultFrom ? (
              <div className="library-deck-hint">
                {t.cannotEditDefault || "Default deck cannot be renamed or removed."}
              </div>
            ) : null}
          </div>
        </details>

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
                          {c.word || "—"}
                          <span className="library-card-lang">
                            ({langLabel?.(learningLang)})
                          </span>
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

                      <div className="library-card-translation">
                        {c.translation || "—"}
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