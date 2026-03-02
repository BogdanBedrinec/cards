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
            {t.add}
          </button>
        </div>

        <div className="toolbar-actions-right">
          <button type="button" onClick={logout}>🚪</button>
          <button type="button" onClick={retryNow}>🔄</button>
        </div>
      </div>

      <div className="toolbar-row toolbar-row-controls">
        {(view === "review" || view === "library") && (
          <div className="ctrl">
            <div className="ctrl-label">{t.deckFilter}</div>
            <select
              value={deckFilter}
              onChange={(e) => setDeckFilter(e.target.value)}
            >
              <option value="ALL">{t.allDecks}</option>
              {decks.map((d) => (
                <option key={d} value={d}>
                  {deckLabel(d)}
                </option>
              ))}
            </select>
          </div>
        )}

        {view === "library" && (
          <div className="ctrl">
            <div className="ctrl-label">{t.sort}</div>
            <select
              value={librarySort}
              onChange={(e) => setLibrarySort(e.target.value)}
            >
              <option value="createdAt_desc">{t.sortByCreatedAt} ↓</option>
              <option value="createdAt_asc">{t.sortByCreatedAt} ↑</option>
              <option value="nextReview_asc">{t.sortByNextReview} ↑</option>
              <option value="nextReview_desc">{t.sortByNextReview} ↓</option>
            </select>
          </div>
        )}
      </div>
    </div>
  );
}