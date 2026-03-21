import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "./styles/index.css";

import StatsBar from "./panels/StatsBar.jsx";
import Toolbar from "./panels/Toolbar.jsx";
import ReviewPanel from "./panels/ReviewPanel.jsx";
import LibraryPanel from "./panels/LibraryPanel.jsx";
import AddCardPanel from "./panels/AddCardPanel.jsx";
import ImportExportPanel from "./panels/ImportExportPanel.jsx";

import EditCardModal from "./modals/EditCardModal.jsx";

import { getT } from "./i18n/dictionary.js";

import { DEFAULT_DECK_ID, LS_UI, LS_L1, LS_L2, LS_THEME } from "./utils/constants.js";
import { getToken, clearAuth } from "./utils/auth.js";
import { langLabel, formatTimeUntil } from "./utils/format.js";
import ErrorBoundary from "./utils/ErrorBoundary.jsx";

import { useReviewShortcuts } from "./hooks/useReviewShortcuts";
import { useFlashcardsData } from "./hooks/useFlashcardsData";
import { useFlashcardsActions } from "./hooks/useFlashcardsActions";
import { useProfileLangsOnce } from "./hooks/useProfileLangsOnce";

import TopBanner from "./ui/TopBanner.jsx";

export default function Flashcards() {
  const navigate = useNavigate();

  const [view, setView] = useState("review"); 

  const [word, setWord] = useState("");
  const [translation, setTranslation] = useState("");
  const [example, setExample] = useState("");

  const [deckFilter, setDeckFilter] = useState("ALL");
  const [deckForNewCard, setDeckForNewCard] = useState(DEFAULT_DECK_ID);
  const [newDeckName, setNewDeckName] = useState("");

  const [reviewIndex, setReviewIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);

  const [sessionTotal, setSessionTotal] = useState(0);
  const [sessionDone, setSessionDone] = useState(0);

  const [librarySearch, setLibrarySearch] = useState("");
  const [librarySort, setLibrarySort] = useState("createdAt_desc");

  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editCard, setEditCard] = useState(null);
  const [editWord, setEditWord] = useState("");
  const [editTranslation, setEditTranslation] = useState("");
  const [editExample, setEditExample] = useState("");
  const [editDeck, setEditDeck] = useState(DEFAULT_DECK_ID);

  const [showImportExport, setShowImportExport] = useState(false);
  const [importText, setImportText] = useState("");
  const [importFormat, setImportFormat] = useState("json");

  const [notice, setNotice] = useState(null);

  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem(LS_THEME);
    return saved === "dark" ? "dark" : "light";
  });

  const [interfaceLang, setInterfaceLang] = useState(() => localStorage.getItem(LS_UI) || "en");
  const [nativeLang, setNativeLang] = useState(() => localStorage.getItem(LS_L1) || "uk");
  const [learningLang, setLearningLang] = useState(() => localStorage.getItem(LS_L2) || "en");

  const t = useMemo(() => getT(interfaceLang), [interfaceLang]);

  const handle401 = useCallback(() => {
    clearAuth();
    navigate("/login", { replace: true });
  }, [navigate]);

  const deckLabel = useCallback((name) => (name === DEFAULT_DECK_ID ? t.defaultDeck : name), [t]);

  const logout = useCallback(() => {
    clearAuth();
    navigate("/", { replace: true });
  }, [navigate]);

  const formatTimeUntilLocal = useCallback((dateStr) => formatTimeUntil(t, dateStr), [t]);

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
  librarySort,
  setNotice,
  handle401,
});

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
  if (deckFilter !== "ALL") setDeckFilter("ALL");
}, []);

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

useEffect(() => {
  if (!Array.isArray(decks) || decks.length === 0) return;

  if (deckForNewCard && !decks.includes(deckForNewCard)) setDeckForNewCard(DEFAULT_DECK_ID);
}, [decks]);

  useProfileLangsOnce({
    handle401,
    setInterfaceLang,
    setNativeLang,
    setLearningLang,
  });

  useEffect(() => {
    if (view !== "review") return;
    setSessionDone(0);
    setSessionTotal(0);
    setReviewIndex(0);
    setShowAnswer(false);
  }, [view, deckFilter]);

  useEffect(() => {
  if (view !== "review") return;
  if (sessionTotal > 0) return;
  if (!Array.isArray(cards) || cards.length === 0) return;

  setSessionTotal(cards.length);
}, [view, cards, sessionTotal]);

  useEffect(() => {
    if (view !== "library") {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set());
  }, [view, deckFilter]);

const filteredLibraryCards = useMemo(() => {
  const q = librarySearch.trim().toLowerCase();
  const list = Array.isArray(libraryCards) ? libraryCards : [];

  if (!q) return list;

  const starts = [];
  const includes = [];

  for (const c of list) {
    const word = (c.word || "").toLowerCase().trim();
    const translation = (c.translation || "").toLowerCase().trim();

    if (word.startsWith(q) || translation.startsWith(q)) {
      starts.push(c);
    } else if (word.includes(q) || translation.includes(q)) {
      includes.push(c);
    }
  }

  return [...starts, ...includes];
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

  const currentReviewCard =
    cards.length > 0 ? cards[Math.min(reviewIndex, cards.length - 1)] : null;

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

    deckFilter,
    setDeckFilter,
    deckForNewCard,

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
    setBulkBusy,

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

    setNotice,
    handle401,
    setFriendlyError,

    refreshAll,
    fetchDecks,
    fetchStats,
    fetchCardsDue,
    fetchLibraryCardsAll,
  });

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

const progressTotal = sessionTotal > 0 ? sessionTotal : cards.length;
const progressIndex =
  progressTotal > 0 ? Math.min(sessionDone + 1, progressTotal) : 0;

  return (
    <div className="flashcards-container" data-theme={theme}>
      <h1 className="title">📚 Flashcards</h1>

      <TopBanner
        t={t}
        loading={anyLoading}
        notice={notice}
        onClose={() => setNotice(null)}
        onRetry={notice?.type === "error" || anyLoading ? retryNow : null}
      />

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
  librarySort={librarySort}
  setLibrarySort={setLibrarySort}
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