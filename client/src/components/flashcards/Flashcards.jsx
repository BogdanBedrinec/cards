// src/components/flashcards/Flashcards.jsx

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Flashcards.css";

// panels
import StatsBar from "./panels/StatsBar.jsx";
import Toolbar from "./panels/Toolbar.jsx";
import ReviewPanel from "./panels/ReviewPanel.jsx";
import LibraryPanel from "./panels/LibraryPanel.jsx";
import AddCardPanel from "./panels/AddCardPanel.jsx";

// modal
import EditCardModal from "./modals/EditCardModal.jsx";

// i18n
import { getT } from "./i18n/dictionary.js";

// ✅ extracted utils
import { API, DEFAULT_DECK_ID, LS_UI, LS_L1, LS_L2, LS_THEME } from "./utils/constants.js";
import { getToken, clearAuth } from "./utils/auth.js";
import { withTimeout, humanFetchError } from "./utils/http.js";
import { normalizeLang, langLabel, formatTimeUntil } from "./utils/format.js";

import { useReviewShortcuts } from "./hooks/useReviewShortcuts";

import { useFlashcardsData } from "./hooks/useFlashcardsData";

export default function Flashcards() {
  const navigate = useNavigate();

  // -------- state --------
  const [view, setView] = useState("review"); // review | library | add

  // add form
  const [word, setWord] = useState("");
  const [translation, setTranslation] = useState("");
  const [example, setExample] = useState("");

  // decks
  const [deckFilter, setDeckFilter] = useState("ALL");
  const [deckForNewCard, setDeckForNewCard] = useState(DEFAULT_DECK_ID);
  const [newDeckName, setNewDeckName] = useState("");

  // review queue
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

  // stats + UI
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

  // ✅ i18n: ONLY HERE (inside component)
  const t = useMemo(() => getT(interfaceLang), [interfaceLang]);

  // -------- helpers --------
  function handle401() {
    clearAuth();
    navigate("/login", { replace: true });
  }

  function setFriendlyError(prefix, err, serverMsg) {
    const human = humanFetchError(err);
    const hint = human.includes("Network error") ? ` — ${t.offlineHint}` : "";
    setMessage(`${prefix}: ${serverMsg || human}${hint}`);
  }

  const deckLabel = (name) => (name === DEFAULT_DECK_ID ? t.defaultDeck : name);

  function logout() {
    clearAuth();
    navigate("/", { replace: true });
  }


  const {
  // data
  decks,
  cards,
  stats,
  libraryCards,

  // loading
  libraryLoading,
  isBootLoading,
  isRefreshing,
  isCardsLoading,
  isDecksLoading,
  isStatsLoading,
  anyLoading,

  // functions
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
  // wrapper with t injected
  function formatTimeUntilLocal(dateStr) {
    return formatTimeUntil(t, dateStr);
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

  useEffect(() => {
  if (!Array.isArray(decks) || decks.length === 0) return;

  // Add panel
  if (deckForNewCard && !decks.includes(deckForNewCard)) {
    setDeckForNewCard(DEFAULT_DECK_ID);
  }

  // Library bulk move
  if (bulkDeck && !decks.includes(bulkDeck)) {
    setBulkDeck(DEFAULT_DECK_ID);
  }

  // Deck manager (rename/remove source)
  if (deckManageFrom && !decks.includes(deckManageFrom)) {
    setDeckManageFrom(DEFAULT_DECK_ID);
  }

  // Deck manager (remove target)
  if (deckRemoveTo && !decks.includes(deckRemoveTo)) {
    setDeckRemoveTo(DEFAULT_DECK_ID);
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [decks]);

  // one-time: load profile langs (optional, safe)
  useEffect(() => {
    async function fetchProfileLangs() {
      const token = getToken();
      if (!token) return;

      try {
        const res = await fetch(`${API}/api/users/me`, {
          headers: { Authorization: `Bearer ${token}`, "Cache-Control": "no-cache" },
          cache: "no-store",
        });

        if (res.status === 401) return handle401();
        if (!res.ok) return;

        const user = await res.json().catch(() => null);
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

useReviewShortcuts({
  view,
  showAnswer,
  setShowAnswer,
  cardsLength: cards.length,
  setReviewIndex,
  reviewAnswer,
  showImportExport,
  setShowImportExport,
  editOpen,
  setEditOpen,
  isReviewing,
});

  // -------- derived --------
  const filteredLibraryCards = useMemo(() => {
    const q = librarySearch.trim().toLowerCase();
    if (!q) return libraryCards;

    return libraryCards.filter((c) => {
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

  // -------- actions --------
  function handleCreateDeckLocal() {
    const name = newDeckName.trim();
    if (!name) return;
    if (!decks.includes(name)) {
      setDecks((prev) => [...prev, name].sort((a, b) => a.localeCompare(b)));
    }
    setDeckForNewCard(name);
    setNewDeckName("");
  }

  async function handleAddCard(e) {
    e.preventDefault();
    setMessage("");

    if (!word.trim() || !translation.trim()) {
      setMessage("⚠️ Please fill at least word and translation");
      return;
    }

    const token = getToken();
    if (!token) return handle401();

    try {
      const payload = {
        word: word.trim(),
        translation: translation.trim(),
        example: example.trim(),
        deck: (deckForNewCard || DEFAULT_DECK_ID).trim() || DEFAULT_DECK_ID,
      };

      const { signal, cleanup } = withTimeout();
      const res = await fetch(`${API}/api/cards`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Cache-Control": "no-cache",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal,
      }).finally(cleanup);

      if (res.status === 401) return handle401();

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setFriendlyError("❌ Add", null, data?.message || data?.error);
        return;
      }

      setWord("");
      setTranslation("");
      setExample("");

      setMessage("✅ Added!");
      setSessionDone(0);
      setSessionTotal(0);

      await refreshAll();
      setView("review");
    } catch (err) {
      setFriendlyError("❌ Add", err);
    }
  }

  async function sendReview(id, known) {
    const token = getToken();
    if (!token) return handle401();

    try {
      const { signal, cleanup } = withTimeout();
      const res = await fetch(`${API}/api/cards/${id}/review`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Cache-Control": "no-cache",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ known }),
        signal,
      }).finally(cleanup);

      if (res.status === 401) return handle401();

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setFriendlyError("❌ Review", null, data?.message || data?.error);
        return false;
      }
      return true;
    } catch (err) {
      setFriendlyError("❌ Review", err);
      return false;
    }
  }

  const currentReviewCard = cards.length > 0 ? cards[Math.min(reviewIndex, cards.length - 1)] : null;

  async function reviewAnswer(known) {
    if (!currentReviewCard) return;
    if (isReviewing) return;

    setIsReviewing(true);
    try {
      if (!showAnswer) {
        setShowAnswer(true);
        await new Promise((r) => setTimeout(r, 250));
      }

      const ok = await sendReview(currentReviewCard._id, known);
      if (!ok) return;

      setSessionDone((d) => d + 1);
      setShowAnswer(false);
      setReviewIndex(0);

      await Promise.all([fetchCards(), fetchStats(), fetchDecks()]);
    } finally {
      setIsReviewing(false);
    }
  }

  async function handleExport(format) {
    const token = getToken();
    if (!token) return handle401();

    try {
      const { signal, cleanup } = withTimeout();
      const res = await fetch(`${API}/api/cards/export?format=${format}`, {
        headers: { Authorization: `Bearer ${token}`, "Cache-Control": "no-cache" },
        signal,
        cache: "no-store",
      }).finally(cleanup);

      if (res.status === 401) return handle401();

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setFriendlyError("❌ Export", null, data?.message || data?.error);
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = format === "csv" ? "cards.csv" : "cards.json";
      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(url);
    } catch (err) {
      setFriendlyError("❌ Export", err);
    }
  }

  async function handleImport() {
    const token = getToken();
    if (!token) return handle401();

    if (!importText.trim()) {
      setMessage("⚠️ Paste data for import");
      return;
    }

    try {
      let dataPayload;
      if (importFormat === "csv") dataPayload = importText;
      else dataPayload = JSON.parse(importText);

      const { signal, cleanup } = withTimeout();
      const res = await fetch(`${API}/api/cards/import`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Cache-Control": "no-cache",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ format: importFormat, data: dataPayload }),
        signal,
      }).finally(cleanup);

      if (res.status === 401) return handle401();

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setFriendlyError("❌ Import", null, data?.message || data?.error);
        return;
      }

      setMessage(
        `✅ ${data.message} | received=${data.received}, inserted=${data.inserted}, skipped=${data.skippedAsDuplicates}`
      );
      setImportText("");
      setSessionDone(0);
      setSessionTotal(0);

      await refreshAll();
      if (view === "library") await fetchLibraryCards();
    } catch (err) {
      setFriendlyError("❌ Import", err, "Invalid JSON or import error");
    }

    setShowImportExport(false);
  }

  async function bulkMove() {
    const token = getToken();
    if (!token) return handle401();

    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    const deck = (bulkDeck || DEFAULT_DECK_ID).trim() || DEFAULT_DECK_ID;

    setBulkBusy(true);
    setMessage("");
    try {
      const { signal, cleanup } = withTimeout();
      const res = await fetch(`${API}/api/cards/bulk-move`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
        },
        body: JSON.stringify({ ids, deck }),
        signal,
      }).finally(cleanup);

      if (res.status === 401) return handle401();

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setFriendlyError("❌ Bulk move", null, data?.message || data?.error);
        return;
      }

      setMessage(`✅ ${data?.message || "Bulk move ok"}`);
      clearSelection();
      await Promise.all([fetchLibraryCards(), fetchDecks(), fetchCards(), fetchStats()]);
    } catch (err) {
      setFriendlyError("❌ Bulk move", err);
    } finally {
      setBulkBusy(false);
    }
  }

  async function bulkDelete() {
    const token = getToken();
    if (!token) return handle401();

    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    const ok = window.confirm(`${t.confirmDeleteN} (${ids.length})`);
    if (!ok) return;

    setBulkBusy(true);
    setMessage("");
    try {
      const { signal, cleanup } = withTimeout();
      const res = await fetch(`${API}/api/cards/bulk-delete`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Cache-Control": "no-cache",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ids }),
        signal,
      }).finally(cleanup);

      if (res.status === 401) return handle401();

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setFriendlyError("❌ Bulk delete", null, data?.message || data?.error);
        return;
      }

      setMessage(`✅ ${data?.message || "Bulk delete ok"}`);
      clearSelection();
      await Promise.all([fetchLibraryCards(), fetchDecks(), fetchCards(), fetchStats()]);
    } catch (err) {
      setFriendlyError("❌ Bulk delete", err);
    } finally {
      setBulkBusy(false);
    }
  }

  async function renameDeck() {
    const token = getToken();
    if (!token) return handle401();

    const from = String(deckManageFrom || "").trim();
    const to = String(deckManageTo || "").trim();
    if (!from || !to) return;

    if (from === DEFAULT_DECK_ID) {
      setMessage(t.cannotRenameDefault);
      return;
    }

    const ok = window.confirm(t.confirmRename(deckLabel(from), to));
    if (!ok) return;

    setDeckManageBusy(true);
    setMessage("");

    try {
      const { signal, cleanup } = withTimeout();
      const res = await fetch(`${API}/api/cards/decks/rename`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Cache-Control": "no-cache",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ from, to }),
        signal,
      }).finally(cleanup);

      if (res.status === 401) return handle401();

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setFriendlyError("❌ Rename deck", null, data?.message || data?.error);
        return;
      }

      setMessage(`✅ ${data?.message || "Deck renamed"}`);
      setDeckManageTo("");

      if (deckFilter === from) setDeckFilter("ALL");

      await Promise.all([fetchDecks(), fetchLibraryCards(), fetchCards(), fetchStats()]);
    } catch (err) {
      setFriendlyError("❌ Rename deck", err);
    } finally {
      setDeckManageBusy(false);
    }
  }

  async function removeDeckMoveCards() {
    const token = getToken();
    if (!token) return handle401();

    const name = String(deckManageFrom || "").trim();
    const to = String(deckRemoveTo || DEFAULT_DECK_ID).trim() || DEFAULT_DECK_ID;
    if (!name) return;

    if (name === DEFAULT_DECK_ID) {
      setMessage(t.cannotDeleteDefault);
      return;
    }

    const ok = window.confirm(t.confirmRemove(deckLabel(name), deckLabel(to)));
    if (!ok) return;

    setDeckManageBusy(true);
    setMessage("");

    try {
      const { signal, cleanup } = withTimeout();
      const url = `${API}/api/cards/decks/${encodeURIComponent(name)}?mode=move&to=${encodeURIComponent(to)}`;

      const res = await fetch(url, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}`, "Cache-Control": "no-cache" },
        cache: "no-store",
        signal,
      }).finally(cleanup);

      if (res.status === 401) return handle401();

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setFriendlyError("❌ Remove deck", null, data?.message || data?.error);
        return;
      }

      setMessage(`✅ ${data?.message || "Deck removed"}`);
      if (deckFilter === name) setDeckFilter("ALL");

      await Promise.all([fetchDecks(), fetchLibraryCards(), fetchCards(), fetchStats()]);
    } catch (err) {
      setFriendlyError("❌ Remove deck", err);
    } finally {
      setDeckManageBusy(false);
    }
  }

  async function handleDeleteCard(id) {
    const token = getToken();
    if (!token) return handle401();

    if (!window.confirm("Delete this card?")) return;

    try {
      const { signal, cleanup } = withTimeout();
      const res = await fetch(`${API}/api/cards/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}`, "Cache-Control": "no-cache" },
        signal,
      }).finally(cleanup);

      if (res.status === 401) return handle401();

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setFriendlyError("❌ Delete", null, data?.message || data?.error);
        return;
      }

      await Promise.all([fetchLibraryCards(), fetchStats(), fetchDecks(), fetchCards()]);
    } catch (err) {
      setFriendlyError("❌ Delete", err);
    }
  }

  function openEdit(c) {
    setEditCard(c);
    setEditWord(c.word || "");
    setEditTranslation(c.translation || "");
    setEditExample(c.example || "");
    setEditDeck(c.deck || DEFAULT_DECK_ID);
    setEditOpen(true);
  }

  async function saveEdit() {
    if (!editCard?._id) return;

    const token = getToken();
    if (!token) return handle401();

    const payload = {
      word: editWord.trim(),
      translation: editTranslation.trim(),
      example: editExample.trim(),
      deck: (editDeck || DEFAULT_DECK_ID).trim() || DEFAULT_DECK_ID,
    };

    if (!payload.word || !payload.translation) {
      setMessage("⚠️ word + translation required");
      return;
    }

    try {
      const { signal, cleanup } = withTimeout();
      const res = await fetch(`${API}/api/cards/${editCard._id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Cache-Control": "no-cache",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal,
      }).finally(cleanup);

      if (res.status === 401) return handle401();

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setFriendlyError("❌ Update", null, data?.message || data?.error);
        return;
      }

      setEditOpen(false);
      setEditCard(null);
      await Promise.all([fetchLibraryCards(), fetchStats(), fetchDecks(), fetchCards()]);
    } catch (err) {
      setFriendlyError("❌ Update", err);
    }
  }

  // -------- progress numbers --------
  const progressTotal = sessionTotal || cards.length;
  const progressIndex = Math.min(sessionDone + 1, progressTotal || 0);

  const isDefaultFrom = String(deckManageFrom || "").trim() === DEFAULT_DECK_ID;
  const isSameRemoveTarget =
    String(deckRemoveTo || "").trim() === String(deckManageFrom || "").trim();

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
        <div className="panel" style={{ marginTop: 12, padding: 12 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
            <button type="button" onClick={() => handleExport("json")}>
              ⬇️ Export JSON
            </button>
            <button type="button" onClick={() => handleExport("csv")}>
              ⬇️ Export CSV
            </button>

            <select value={importFormat} onChange={(e) => setImportFormat(e.target.value)}>
              <option value="json">Import JSON</option>
              <option value="csv">Import CSV</option>
            </select>
          </div>

          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder={
              importFormat === "csv"
                ? "Paste CSV (headers: word,translation,example,deck,...)"
                : "Paste JSON array or {cards:[...]}"
            }
            rows={6}
            style={{ width: "100%", marginBottom: 8 }}
          />

          <button type="button" onClick={handleImport}>
            ⬆️ Import
          </button>
        </div>
      )}

      {view === "review" ? (
        <ReviewPanel
          t={t}
          cards={cards}
          isCardsLoading={isCardsLoading}
          currentReviewCard={currentReviewCard}
          showAnswer={showAnswer}
          setShowAnswer={setShowAnswer}
          reviewAnswer={reviewAnswer}
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
          handleAddCard={handleAddCard}
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
          fetchLibraryCards={fetchLibraryCards}
          libraryLoading={libraryLoading}
          bulkBusy={bulkBusy}
          filteredLibraryCards={filteredLibraryCards}
          libraryCards={libraryCards}
          selectedCount={selectedCount}
          selectAllFiltered={selectAllFiltered}
          clearSelection={clearSelection}
          bulkDeck={bulkDeck}
          setBulkDeck={setBulkDeck}
          bulkMove={bulkMove}
          bulkDelete={bulkDelete}
          decks={decks}
          deckLabel={deckLabel}
          DEFAULT_DECK_ID={DEFAULT_DECK_ID}
          toggleSelect={toggleSelect}
          selectedIds={selectedIds}
          openEdit={openEdit}
          handleDeleteCard={handleDeleteCard}
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
          renameDeck={renameDeck}
          removeDeckMoveCards={removeDeckMoveCards}
          isDefaultFrom={isDefaultFrom}
          isSameRemoveTarget={isSameRemoveTarget}
        />
      )}

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
          onSave={saveEdit}
        />
      )}
    </div>
  );
}