import React from "react";

export default function LibraryPanel(props) {
  const {
    t,
    librarySearch,
    setLibrarySearch,
    fetchLibraryCards,
    libraryLoading,
    bulkBusy,

    filteredLibraryCards,
    libraryCards,

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
  } = props || {};

  // ✅ bulletproof list (ніколи не undefined)
  const list = Array.isArray(filteredLibraryCards)
    ? filteredLibraryCards
    : Array.isArray(libraryCards)
      ? libraryCards
      : [];

  const decksList = Array.isArray(decks) ? decks : [];
  const sel = selectedIds instanceof Set ? selectedIds : new Set();

  const safeFn = (fn) => (typeof fn === "function" ? fn : () => {});
  const safeToggle = safeFn(toggleSelect);
  const safeEdit = safeFn(openEdit);
  const safeDelete = safeFn(handleDeleteCard);
  const safeFetch = safeFn(fetchLibraryCards);
  const safeSelectAll = safeFn(selectAllFiltered);
  const safeClear = safeFn(clearSelection);
  const safeBulkMove = safeFn(bulkMove);
  const safeBulkDelete = safeFn(bulkDelete);
  const safeRename = safeFn(renameDeck);
  const safeRemoveDeck = safeFn(removeDeckMoveCards);

  return (
    <div className="panel" style={{ marginTop: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <h3 style={{ marginTop: 0, marginBottom: 0 }}>{t?.library || "Library"}</h3>
        <button type="button" onClick={safeFetch} disabled={!!libraryLoading}>
          {libraryLoading ? (t?.loading || "Loading...") : (t?.refresh || "Refresh")}
        </button>
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
        <input
          value={librarySearch || ""}
          onChange={(e) => safeFn(setLibrarySearch)(e.target.value)}
          placeholder={t?.search || "Search..."}
          style={{ flex: "1 1 240px" }}
        />
        <div style={{ opacity: 0.8, alignSelf: "center" }}>
          {(t?.found || "Found")}: <b>{list.length}</b>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: 10,
          marginTop: 12,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <button type="button" onClick={safeSelectAll} disabled={list.length === 0}>
          {t?.selectAll || "Select all"}
        </button>
        <button type="button" onClick={safeClear} disabled={!selectedCount}>
          {t?.clear || "Clear"}
        </button>

        <span style={{ opacity: 0.8 }}>
          {(t?.selected || "Selected")}: <b>{selectedCount || 0}</b>
        </span>

        <select value={bulkDeck || ""} onChange={(e) => safeFn(setBulkDeck)(e.target.value)}>
          {decksList.map((d) => (
            <option key={d} value={d}>
              {deckLabel ? deckLabel(d) : d}
            </option>
          ))}
        </select>

        <button type="button" onClick={safeBulkMove} disabled={!!bulkBusy || !selectedCount}>
          {bulkBusy ? (t?.loading || "Loading...") : (t?.move || "Move")}
        </button>
        <button type="button" onClick={safeBulkDelete} disabled={!!bulkBusy || !selectedCount}>
          {bulkBusy ? (t?.loading || "Loading...") : (t?.delete || "Delete")}
        </button>
      </div>

      <hr style={{ margin: "14px 0", opacity: 0.25 }} />

      <details style={{ marginBottom: 12 }}>
        <summary style={{ cursor: "pointer" }}>{t?.deckManager || "Deck manager"}</summary>

        <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <select value={deckManageFrom || ""} onChange={(e) => safeFn(setDeckManageFrom)(e.target.value)}>
              {decksList.map((d) => (
                <option key={d} value={d}>
                  {deckLabel ? deckLabel(d) : d}
                </option>
              ))}
            </select>

            <input
              value={deckManageTo || ""}
              onChange={(e) => safeFn(setDeckManageTo)(e.target.value)}
              placeholder={t?.newName || "New name"}
              disabled={!!isDefaultFrom}
            />

            <button type="button" onClick={safeRename} disabled={!!deckManageBusy || !!isDefaultFrom}>
              {deckManageBusy ? (t?.loading || "Loading...") : (t?.rename || "Rename")}
            </button>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <select value={deckRemoveTo || ""} onChange={(e) => safeFn(setDeckRemoveTo)(e.target.value)}>
              {decksList.map((d) => (
                <option key={d} value={d}>
                  {deckLabel ? deckLabel(d) : d}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={safeRemoveDeck}
              disabled={!!deckManageBusy || !!isDefaultFrom || !!isSameRemoveTarget}
            >
              {deckManageBusy ? (t?.loading || "Loading...") : (t?.removeDeck || "Remove deck (move cards)")}
            </button>
          </div>

          {isDefaultFrom ? (
            <div style={{ fontSize: 12, opacity: 0.75 }}>
              {t?.cannotEditDefault || "Default deck cannot be renamed/removed."}
            </div>
          ) : null}
        </div>
      </details>

      {list.length === 0 ? (
        <div style={{ opacity: 0.8 }}>{t?.noCards || "No cards"}</div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {list.map((c) => {
            const id = c?._id;
            const checked = id ? sel.has(id) : false;
            const nextIn = formatTimeUntil?.(c?.nextReview);

            return (
              <div
                key={id || Math.random()}
                style={{
                  padding: 12,
                  borderRadius: 12,
                  border: "1px solid rgba(0,0,0,0.08)",
                }}
              >
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <input
                    type="checkbox"
                    checked={!!checked}
                    onChange={() => id && safeToggle(id)}
                    aria-label="select"
                  />

                  <div style={{ flex: "1 1 260px" }}>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>
                      {c?.word || "—"}{" "}
                      <span style={{ opacity: 0.6, fontWeight: 500 }}>
                        ({langLabel?.(learningLang)})
                      </span>
                    </div>
                    <div style={{ opacity: 0.9 }}>
                      {c?.translation || "—"}{" "}
                      <span style={{ opacity: 0.6 }}>({langLabel?.(nativeLang)})</span>
                    </div>
                    {c?.example ? <div style={{ opacity: 0.75 }}>{c.example}</div> : null}
                    <div style={{ opacity: 0.65, fontSize: 12, marginTop: 4 }}>
                      {(t?.deck || "Deck")}: <b>{deckLabel?.(c?.deck) ?? c?.deck ?? "—"}</b>
                      {nextIn ? <span> • {nextIn}</span> : null}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button type="button" onClick={() => safeEdit(c)}>
                      {t?.edit || "Edit"}
                    </button>
                    <button type="button" onClick={() => id && safeDelete(id)}>
                      {t?.delete || "Delete"}
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