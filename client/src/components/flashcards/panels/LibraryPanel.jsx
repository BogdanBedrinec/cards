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
    <div className="panel" style={{ marginTop: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <h3 style={{ marginTop: 0, marginBottom: 0 }}>{t.library || "Library"}</h3>
        <button type="button" onClick={fetchLibraryCards} disabled={libraryLoading}>
          {libraryLoading ? t.loading : t.refresh || "Refresh"}
        </button>
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
        <input
          value={librarySearch}
          onChange={(e) => setLibrarySearch(e.target.value)}
          placeholder={t.search || "Search..."}
          style={{ flex: "1 1 240px" }}
        />
        <div style={{ opacity: 0.8, alignSelf: "center" }}>
          {t.found || "Found"}: <b>{list.length}</b>
        </div>
      </div>

      {/* Bulk actions */}
      <div
        style={{
          display: "flex",
          gap: 10,
          marginTop: 12,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <button type="button" onClick={selectAllFiltered} disabled={list.length === 0}>
          {t.selectAll || "Select all"}
        </button>
        <button type="button" onClick={clearSelection} disabled={selectedCount === 0}>
          {t.clear || "Clear"}
        </button>

        <span style={{ opacity: 0.8 }}>
          {t.selected || "Selected"}: <b>{selectedCount}</b>
        </span>

        <select value={bulkDeck} onChange={(e) => setBulkDeck(e.target.value)}>
          {decksList.map((d) => (
            <option key={d} value={d}>
              {deckLabel ? deckLabel(d) : d}
            </option>
          ))}
        </select>

        <button type="button" onClick={bulkMove} disabled={bulkBusy || selectedCount === 0}>
          {bulkBusy ? t.loading : t.move || "Move"}
        </button>
        <button type="button" onClick={bulkDelete} disabled={bulkBusy || selectedCount === 0}>
          {bulkBusy ? t.loading : t.delete || "Delete"}
        </button>
      </div>

      <hr style={{ margin: "14px 0", opacity: 0.25 }} />

      {/* Deck manager */}
      <details style={{ marginBottom: 12 }}>
        <summary style={{ cursor: "pointer" }}>{t.deckManager || "Deck manager"}</summary>

        <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <select value={deckManageFrom} onChange={(e) => setDeckManageFrom(e.target.value)}>
              {decksList.map((d) => (
                <option key={d} value={d}>
                  {deckLabel ? deckLabel(d) : d}
                </option>
              ))}
            </select>

            <input
              value={deckManageTo}
              onChange={(e) => setDeckManageTo(e.target.value)}
              placeholder={t.newName || "New name"}
              disabled={isDefaultFrom}
            />

            <button type="button" onClick={renameDeck} disabled={deckManageBusy || isDefaultFrom}>
              {deckManageBusy ? t.loading : t.rename || "Rename"}
            </button>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <select value={deckRemoveTo} onChange={(e) => setDeckRemoveTo(e.target.value)}>
              {decksList.map((d) => (
                <option key={d} value={d}>
                  {deckLabel ? deckLabel(d) : d}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={removeDeckMoveCards}
              disabled={deckManageBusy || isDefaultFrom || isSameRemoveTarget}
            >
              {deckManageBusy ? t.loading : t.removeDeck || "Remove deck (move cards)"}
            </button>
          </div>

          {isDefaultFrom ? (
            <div style={{ fontSize: 12, opacity: 0.75 }}>
              {t.cannotEditDefault || "Default deck cannot be renamed/removed."}
            </div>
          ) : null}
        </div>
      </details>

      {/* Cards list */}
      {list.length === 0 ? (
        <div style={{ opacity: 0.8 }}>{t.noCards || "No cards"}</div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {list.map((c) => {
            const id = c._id;
            const checked = sel.has(id);
            const nextIn = formatTimeUntil?.(c.nextReview);

            return (
              <div
                key={id}
                style={{
                  padding: 12,
                  borderRadius: 12,
                  border: "1px solid rgba(0,0,0,0.08)",
                }}
              >
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleSelect(id)}
                    aria-label="select"
                  />

                  <div style={{ flex: "1 1 260px" }}>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>
                      {c.word || "—"}{" "}
                      <span style={{ opacity: 0.6, fontWeight: 500 }}>
                        ({langLabel?.(learningLang)})
                      </span>
                    </div>
                    <div style={{ opacity: 0.9 }}>
                      {c.translation || "—"}{" "}
                      <span style={{ opacity: 0.6 }}>({langLabel?.(nativeLang)})</span>
                    </div>
                    {c.example ? <div style={{ opacity: 0.75 }}>{c.example}</div> : null}
                    <div style={{ opacity: 0.65, fontSize: 12, marginTop: 4 }}>
                      {t.deck || "Deck"}: <b>{deckLabel?.(c.deck) ?? c.deck}</b>
                      {nextIn ? <span> • {nextIn}</span> : null}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button type="button" onClick={() => openEdit(c)}>
                      {t.edit || "Edit"}
                    </button>
                    <button type="button" onClick={() => handleDeleteCard(id)}>
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
  );
}