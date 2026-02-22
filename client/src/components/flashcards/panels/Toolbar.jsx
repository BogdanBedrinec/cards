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
  librarySortBy,
  setLibrarySortBy,
  librarySortOrder,
  setLibrarySortOrder,
}) {
  return (
    <div className="toolbar">
      <div className="toolbar-row toolbar-row-top">

        <button
          className="icon-btn"
          type="button"
          onClick={() => setShowImportExport(v => !v)}
        >
          {showImportExport ? "✖" : "📦"}
        </button>

        <button
          className="icon-btn"
          type="button"
          onClick={() => setTheme(t0 => (t0 === "dark" ? "light" : "dark"))}
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
          <>
            <div className="ctrl">
              <div className="ctrl-label">{t.sort}</div>
              <select
                value={librarySortBy}
                onChange={(e) => setLibrarySortBy(e.target.value)}
              >
                <option value="createdAt">{t.sortByCreatedAt}</option>
                <option value="word">{t.sortByWord}</option>
                <option value="nextReview">{t.sortByNextReview}</option>
                <option value="accuracy">{t.sortByAccuracy}</option>
              </select>
            </div>

            <div className="ctrl">
              <div className="ctrl-label">{t.order}</div>
              <select
                value={librarySortOrder}
                onChange={(e) => setLibrarySortOrder(e.target.value)}
              >
                <option value="asc">⬆️ {t.az}</option>
                <option value="desc">⬇️ {t.za}</option>
              </select>
            </div>
          </>
        )}

      </div>
    </div>
  );
}