import React from "react";

export default function Toolbar({
  t,
  theme,
  setTheme,
  view,
  setView,
  decks,
  deckFilter,
  setDeckFilter,
  deckLabel,
  retryNow,
  logout,
  showImportExport,
  setShowImportExport,
  librarySort,
  setLibrarySort,
}) {
  return (
    <div className="toolbar">
      <div className="toolbar-row toolbar-row-top">
        <button
          className="icon-btn"
          type="button"
          onClick={() => setShowImportExport((v) => !v)}
        >
          {showImportExport ? "✖" : "📦"}
        </button>

        <button
          className="icon-btn"
          type="button"
          onClick={() => setTheme((t0) => (t0 === "dark" ? "light" : "dark"))}
        >
          {theme === "dark" ? "☀️" : "🌙"}
        </button>

        <div className="toolbar-tabs">
          <button type="button" onClick={() => setView("review")}>
            {t.review}
          </button>
          <button type="button" onClick={() => setView("library")}>
            {t.library}
          </button>
          <button type="button" onClick={() => setView("add")}>
            ➕{t.add}
          </button>
        </div>

        <div className="toolbar-actions-right">
          <button type="button" onClick={logout}>🚪</button>
          <button type="button" onClick={retryNow}>🔄</button>
        </div>
      </div>

      <div className="toolbar-row toolbar-row-controls">
        {view === "library" && (
          <div className="ctrl">
            <div className="ctrl-label">{t.sort}</div>
<select
  value={librarySort}
  onChange={(e) => setLibrarySort(e.target.value)}
>
  <option value="createdAt_desc">
    {t.sortNewest || "Newest first"}
  </option>
  <option value="createdAt_asc">
    {t.sortOldest || "Oldest first"}
  </option>
  <option value="nextReview_asc">
    {t.sortNextReviewSoon || "Next review soonest"}
  </option>
  <option value="word_asc">
    {t.sortWordAZ || "Word (A–Z)"}
  </option>
</select>
          </div>
        )}
      </div>
    </div>
  );
}