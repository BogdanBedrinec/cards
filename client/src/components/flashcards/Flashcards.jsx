// src/components/flashcards/Flashcards.jsx

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Flashcards.css";
import { apiFetch } from "./utils/apiFetch.js";

// panels
import StatsBar from "./panels/StatsBar.jsx";
import Toolbar from "./panels/Toolbar.jsx";
import ReviewPanel from "./panels/ReviewPanel.jsx";
import LibraryPanel from "./panels/LibraryPanel.jsx";
import AddCardPanel from "./panels/AddCardPanel.jsx";
import ImportExportPanel from "./panels/ImportExportPanel.jsx";

// modal
import EditCardModal from "./modals/EditCardModal.jsx";

// i18n
import { getT } from "./i18n/dictionary.js";

// utils
import { API, DEFAULT_DECK_ID, LS_UI, LS_L1, LS_L2, LS_THEME } from "./utils/constants.js";
import { getToken, clearAuth } from "./utils/auth.js";
import { normalizeLang, langLabel, formatTimeUntil } from "./utils/format.js";
import ErrorBoundary from "./utils/ErrorBoundary.jsx";

// hooks
import { useReviewShortcuts } from "./hooks/useReviewShortcuts";
import { useFlashcardsData } from "./hooks/useFlashcardsData";
import { useFlashcardsActions } from "./hooks/useFlashcardsActions";

export default function Flashcards() {
  const navigate = useNavigate();

  // -------- state --------
  const [view, setView] = useState("review"); // review | library | add

  // add form
  const [word, setWord] = useState("");
  const [translation, setTranslation] = useState("");
  const [example, setExample] = useState("");

  // decks (UI selections only)
  const [deckFilter, setDeckFilter] = useState("ALL");
  const [deckForNewCard, setDeckForNewCard] = useState(DEFAULT_DECK_ID);
  const [newDeckName, setNewDeckName] = useState("");

  // review queue UI
  const [reviewIndex, setReviewIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);

  // stable session progress
  const [sessionTotal, setSessionTotal] = useState(0);
  const [sessionDone, setSessionDone] = useState(0);

  // library
  const [librarySearch, setLibrarySearch] = useState("");
  const [librarySortBy, setLibrarySortBy] = useState("createdAt");
  const [librarySortOrder, setLibrarySortOrder] = useState("desc");

  // bulk selection
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [bulkDeck, setBulkDeck] = useState(DEFAULT_DECK_ID);
  const [bulkBusy, setBulkBusy] = useState(false);

  // deck manager
  const [deckManageFrom, setDeckManageFrom] = useState(DEFAULT_DECK_ID);
  const [deckManageTo, setDeckManageTo] = useState("");
  const [deckRemoveTo, setDeckRemoveTo] = useState(DEFAULT_DECK_ID);
  const [deckManageBusy, setDeckManageBusy] = useState(false);

  // edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [editCard, setEditCard] = useState(null);
  const [editWord, setEditWord] = useState("");
  const [editTranslation, setEditTranslation] = useState("");
  const [editExample, setEditExample] = useState("");
  const [editDeck, setEditDeck] = useState(DEFAULT_DECK_ID);

  // import/export
  const [showImportExport, setShowImportExport] = useState(false);
  const [importText, setImportText] = useState("");
  const [importFormat, setImportFormat] = useState("json");

  // UI message
  const [message, setMessage] = useState("");

  // theme
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem(LS_THEME);
    return saved === "dark" ? "dark" : "light";
  });

  // langs (labels + UI)
  const [interfaceLang, setInterfaceLang] = useState(() => localStorage.getItem(LS_UI) || "en");
  const [nativeLang, setNativeLang] = useState(() => localStorage.getItem(LS_L1) || "uk");
  const [learningLang, setLearningLang] = useState(() => localStorage.getItem(LS_L2) || "en");

  // ✅ i18n
  const t = useMemo(() => getT(interfaceLang), [interfaceLang]);

  // -------- helpers --------
  function handle401() {
    clearAuth();
    navigate("/login", { replace: true });
  }

  const deckLabel = (name) => (name === DEFAULT_DECK_ID ? t.defaultDeck : name);

  function logout() {
    clearAuth();
    navigate("/", { replace: true });
  }

  function formatTimeUntilLocal(dateStr) {
    return formatTimeUntil(t, dateStr);
  }

  // -------- data hook (ETAP 3) --------
  const {
    decks: serverDecks,
    cards,
    stats,
    libraryCards,

    libraryLoading,
    anyLoading,
    isCardsLoading,

    fetchDecks,
    fetchStats,
    fetchCardsDue,
    fetchLibraryCardsAll,
    refreshAll,
    retryNow,
    setFriendlyError,
  } = useFlashcardsData({
    t,
    view,
    deckFilter,
    librarySortBy,
    librarySortOrder,
    setMessage,
    handle401,
  });

  // -------- extraDecks (UI-only drafts) --------
  const [extraDecks, setExtraDecks] = useState([]);

  const decks = useMemo(() => {
    const arr = [...(Array.isArray(serverDecks) ? serverDecks : [])];

    for (const d of extraDecks) {
      if (!arr.includes(d)) arr.push(d);
    }

    const withDefault = arr.includes(DEFAULT_DECK_ID) ? arr : [DEFAULT_DECK_ID, ...arr];
    const uniq = Array.from(new Set(withDefault));

    const [def, ...rest] = uniq;
    rest.sort((a, b) => String(a).localeCompare(String(b)));

    return [def, ...rest];
  }, [serverDecks, extraDecks]);

  useEffect(() => {
    if (!Array.isArray(serverDecks) || extraDecks.length === 0) return;
    setExtraDecks((prev) => prev.filter((d) => !serverDecks.includes(d)));
  }, [serverDecks, extraDecks.length]);

  function handleCreateDeckLocal() {
    const name = newDeckName.trim();
    if (!name) return;

    setExtraDecks((prev) => (prev.includes(name) ? prev : [...prev, name]));
    setDeckForNewCard(name);
    setNewDeckName("");
  }

  // -------- guards / persist --------
  useEffect(() => {
    const token = getToken();
    if (!token) navigate("/login", { replace: true });
  }, [navigate]);

  useEffect(() => {
    localStorage.setItem(LS_THEME, theme);
    document.body.dataset.theme = theme;
    return () => {
      delete document.body.dataset.theme;
    };
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(LS_UI, interfaceLang);
  }, [interfaceLang]);

  // ✅ if decks change — validate selections
  useEffect(() => {
    if (!Array.isArray(decks) || decks.length === 0) return;

    if (deckForNewCard && !decks.includes(deckForNewCard)) setDeckForNewCard(DEFAULT_DECK_ID);
    if (bulkDeck && !decks.includes(bulkDeck)) setBulkDeck(DEFAULT_DECK_ID);
    if (deckManageFrom && !decks.includes(deckManageFrom)) setDeckManageFrom(DEFAULT_DECK_ID);
    if (deckRemoveTo && !decks.includes(deckRemoveTo)) setDeckRemoveTo(DEFAULT_DECK_ID);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decks]);

  // one-time: load profile langs
  useEffect(() => {
  async function fetchProfileLangs() {
    try {
const res = await apiFetch({
  url: `${API}/api/users/me`,
  method: "GET",
  handle401,
});

if (!res.ok) return;

const user = res.data;
if (!user) return;

      const ui = normalizeLang(user.interfaceLang, localStorage.getItem(LS_UI) || "en");
      const l1 = normalizeLang(user.nativeLang, localStorage.getItem(LS_L1) || "uk");
      const l2 = normalizeLang(user.learningLang, localStorage.getItem(LS_L2) || "en");

      localStorage.setItem(LS_UI, ui);
      localStorage.setItem(LS_L1, l1);
      localStorage.setItem(LS_L2, l2);

      setInterfaceLang(ui);
      setNativeLang(l1);
      setLearningLang(l2);
    } catch {
      // ignore
    }
  }

  fetchProfileLangs();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

  // reset progress when entering review / changing deck filter
  useEffect(() => {
    if (view !== "review") return;
    setSessionDone(0);
    setSessionTotal(0);
    setReviewIndex(0);
    setShowAnswer(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, deckFilter]);

  // clear selection when leaving library or changing filter
  useEffect(() => {
    if (view !== "library") {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, deckFilter]);

  // -------- derived --------
  const filteredLibraryCards = useMemo(() => {
    const q = librarySearch.trim().toLowerCase();
    if (!q) return libraryCards;

    return (Array.isArray(libraryCards) ? libraryCards : []).filter((c) => {
      const w = (c.word || "").toLowerCase();
      const tr = (c.translation || "").toLowerCase();
      const ex = (c.example || "").toLowerCase();
      const dk = (c.deck || "").toLowerCase();
      return w.includes(q) || tr.includes(q) || ex.includes(q) || dk.includes(q);
    });
  }, [libraryCards, librarySearch]);

  const selectedCount = selectedIds.size;

  function toggleSelect(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllFiltered() {
    setSelectedIds(() => new Set(filteredLibraryCards.map((c) => c._id)));
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  const currentReviewCard = cards.length > 0 ? cards[Math.min(reviewIndex, cards.length - 1)] : null;

  // -------- actions hook (ETAP 4) --------
  const actions = useFlashcardsActions({
    t,
    view,
    setView,

    word,
    setWord,
    translation,
    setTranslation,
    example,
    setExample,

    decks,
    deckFilter,
    setDeckFilter,
    deckForNewCard,
    setDeckForNewCard,

    cards,
    currentReviewCard,
    showAnswer,
    setShowAnswer,
    isReviewing,
    setIsReviewing,
    setReviewIndex,
    setSessionDone,
    setSessionTotal,

    selectedIds,
    clearSelection,
    bulkDeck,
    bulkBusy,
    setBulkBusy,

    deckManageFrom,
    deckManageTo,
    setDeckManageTo,
    deckRemoveTo,
    deckManageBusy,
    setDeckManageBusy,
    deckLabel,

    setEditOpen,
    setEditCard,
    editCard,
    editWord,
    setEditWord,
    editTranslation,
    setEditTranslation,
    editExample,
    setEditExample,
    editDeck,
    setEditDeck,

    importText,
    setImportText,
    importFormat,
    setShowImportExport,

    setMessage,
    handle401,
    setFriendlyError,

    refreshAll,
    fetchDecks,
    fetchStats,
    fetchCardsDue,
    fetchLibraryCardsAll,
  });

  // ✅ review shortcuts
  useReviewShortcuts({
    view,
    showAnswer,
    setShowAnswer,
    cardsLength: cards.length,
    setReviewIndex,
    reviewAnswer: actions.reviewAnswer,
    showImportExport,
    setShowImportExport,
    editOpen,
    setEditOpen,
    isReviewing,
  });

  // -------- progress numbers --------
  const progressTotal = sessionTotal || cards.length;
  const progressIndex = Math.min(sessionDone + 1, progressTotal || 0);

  const isDefaultFrom = String(deckManageFrom || "").trim() === DEFAULT_DECK_ID;
  const isSameRemoveTarget = String(deckRemoveTo || "").trim() === String(deckManageFrom || "").trim();

  // -------- render --------
  return (
    <div className="flashcards-container" data-theme={theme}>
      <h1 className="title">📚 Flashcards</h1>

      {(anyLoading || message) && (
        <div className={`top-banner ${anyLoading ? "is-loading" : ""}`}>
          <div className="top-banner-left">
            {anyLoading && <span className="spinner" aria-hidden="true" />}
            <span>
              {anyLoading ? t.loading : ""}
              {message ? message : ""}
            </span>
          </div>

          <div className="top-banner-right">
            <button type="button" className="banner-btn" onClick={retryNow} disabled={anyLoading}>
              {t.retry}
            </button>
          </div>
        </div>
      )}

      <StatsBar stats={stats} t={t} />

      <Toolbar
        t={t}
        theme={theme}
        setTheme={setTheme}
        view={view}
        setView={setView}
        decks={decks}
        deckFilter={deckFilter}
        setDeckFilter={setDeckFilter}
        deckLabel={deckLabel}
        retryNow={retryNow}
        logout={logout}
        showImportExport={showImportExport}
        setShowImportExport={setShowImportExport}
        librarySortBy={librarySortBy}
        setLibrarySortBy={setLibrarySortBy}
        librarySortOrder={librarySortOrder}
        setLibrarySortOrder={setLibrarySortOrder}
      />

      {showImportExport && (
        <ImportExportPanel
          importFormat={importFormat}
          setImportFormat={setImportFormat}
          importText={importText}
          setImportText={setImportText}
          onExportJson={() => actions.handleExport("json")}
          onExportCsv={() => actions.handleExport("csv")}
          onImport={actions.handleImport}
        />
      )}

      <ErrorBoundary>
        {view === "review" ? (
          <ReviewPanel
            t={t}
            cards={cards}
            isCardsLoading={isCardsLoading}
            currentReviewCard={currentReviewCard}
            showAnswer={showAnswer}
            setShowAnswer={setShowAnswer}
            reviewAnswer={actions.reviewAnswer}
            isReviewing={isReviewing}
            progressIndex={progressIndex}
            progressTotal={progressTotal}
            deckLabel={deckLabel}
            DEFAULT_DECK_ID={DEFAULT_DECK_ID}
            formatTimeUntil={formatTimeUntilLocal}
          />
        ) : view === "add" ? (
          <AddCardPanel
            t={t}
            word={word}
            setWord={setWord}
            translation={translation}
            setTranslation={setTranslation}
            example={example}
            setExample={setExample}
            handleAddCard={actions.handleAddCard}
            decks={decks}
            deckForNewCard={deckForNewCard}
            setDeckForNewCard={setDeckForNewCard}
            newDeckName={newDeckName}
            setNewDeckName={setNewDeckName}
            handleCreateDeckLocal={handleCreateDeckLocal}
            deckLabel={deckLabel}
            DEFAULT_DECK_ID={DEFAULT_DECK_ID}
          />
        ) : (
          <LibraryPanel
            t={t}
            librarySearch={librarySearch}
            setLibrarySearch={setLibrarySearch}
            fetchLibraryCards={fetchLibraryCardsAll}
            libraryLoading={libraryLoading}
            bulkBusy={bulkBusy}
            filteredLibraryCards={filteredLibraryCards}
            selectedCount={selectedCount}
            selectAllFiltered={selectAllFiltered}
            clearSelection={clearSelection}
            bulkDeck={bulkDeck}
            setBulkDeck={setBulkDeck}
            bulkMove={actions.bulkMove}
            bulkDelete={actions.bulkDelete}
            decks={decks}
            deckLabel={deckLabel}
            toggleSelect={toggleSelect}
            selectedIds={selectedIds}
            openEdit={actions.openEdit}
            handleDeleteCard={actions.handleDeleteCard}
            learningLang={learningLang}
            nativeLang={nativeLang}
            langLabel={langLabel}
            formatTimeUntil={formatTimeUntilLocal}
            // deck manager
            deckManageFrom={deckManageFrom}
            setDeckManageFrom={setDeckManageFrom}
            deckManageTo={deckManageTo}
            setDeckManageTo={setDeckManageTo}
            deckRemoveTo={deckRemoveTo}
            setDeckRemoveTo={setDeckRemoveTo}
            deckManageBusy={deckManageBusy}
            renameDeck={actions.renameDeck}
            removeDeckMoveCards={actions.removeDeckMoveCards}
            isDefaultFrom={isDefaultFrom}
            isSameRemoveTarget={isSameRemoveTarget}
          />
        )}
      </ErrorBoundary>

      {editOpen && (
        <EditCardModal
          t={t}
          decks={decks}
          deckLabel={deckLabel}
          DEFAULT_DECK_ID={DEFAULT_DECK_ID}
          editWord={editWord}
          setEditWord={setEditWord}
          editTranslation={editTranslation}
          setEditTranslation={setEditTranslation}
          editExample={editExample}
          setEditExample={setEditExample}
          editDeck={editDeck}
          setEditDeck={setEditDeck}
          onClose={() => setEditOpen(false)}
          onSave={actions.saveEdit}
        />
      )}
    </div>
  );
}