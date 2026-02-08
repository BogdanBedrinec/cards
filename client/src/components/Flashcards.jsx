// Flashcards.jsx (clean fixed version)
// Replace your entire Flashcards.jsx with this file.

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Flashcards.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";
const REQ_TIMEOUT_MS = 12000;
const DEFAULT_DECK_KEY = "defaultDeck";

// localStorage keys for language settings
const LS_UI = "fc_ui_lang"; // interface language
const LS_L1 = "fc_native_lang"; // native language
const LS_L2 = "fc_learning_lang"; // learning language

function getToken() {
  const t = localStorage.getItem("token");
  if (!t || t === "undefined" || t === "null") return null;
  return t;
}

function normalizeLang(code, fallback = "de") {
  const allowed = new Set(["de", "en", "uk"]);
  return allowed.has(code) ? code : fallback;
}

function withTimeout(signal, ms = REQ_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);

  const onAbort = () => controller.abort();
  if (signal) signal.addEventListener("abort", onAbort);

  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timer);
      if (signal) signal.removeEventListener("abort", onAbort);
    },
  };
}

function humanFetchError(err) {
  if (!err) return "Unknown error";
  if (err.name === "AbortError") return "Request timed out";
  if (err instanceof TypeError) return "Network error (server not reachable)";
  return "Unexpected error";
}

export default function Flashcards() {
  const navigate = useNavigate();

  const [cards, setCards] = useState([]);
  const [message, setMessage] = useState("");

  // view: review | library | add
  const [view, setView] = useState("review");

  // form (add)
  const [word, setWord] = useState("");
  const [translation, setTranslation] = useState("");
  const [example, setExample] = useState("");

  // decks
  const [decks, setDecks] = useState([]);
  const [deckFilter, setDeckFilter] = useState("ALL"); // ALL | deck
  const [deckForNewCard, setDeckForNewCard] = useState(DEFAULT_DECK);
  const [newDeckName, setNewDeckName] = useState("");

  // ===== Review queue params (hidden UI now) =====
  const [mode] = useState("due"); // keep due for review
  const [sortBy] = useState("nextReview");
  const [sortOrder] = useState("asc");

  // ===== Library sorting params (UI shown) =====
  const [librarySortBy, setLibrarySortBy] = useState("createdAt"); // createdAt | word | nextReview | accuracy
  const [librarySortOrder, setLibrarySortOrder] = useState("desc"); // asc | desc

  // stats
  const [stats, setStats] = useState(null);

  // import/export
  const [importText, setImportText] = useState("");
  const [importFormat, setImportFormat] = useState("json"); // json | csv
  const [showImportExport, setShowImportExport] = useState(false);

  // review state
  const [reviewIndex, setReviewIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);

  // ✅ stable progress for "due" sessions
  const [sessionTotal, setSessionTotal] = useState(0);
  const [sessionDone, setSessionDone] = useState(0);

  // theme
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem("flashcardsTheme");
    return saved === "dark" ? "dark" : "light";
  });

  // language settings
  const [interfaceLang, setInterfaceLang] = useState(() => localStorage.getItem(LS_UI) || "de");
  const [nativeLang, setNativeLang] = useState(() => localStorage.getItem(LS_L1) || "uk");
  const [learningLang, setLearningLang] = useState(() => localStorage.getItem(LS_L2) || "de");

  const [isReviewing, setIsReviewing] = useState(false);

  // loading / errors
  const [isBootLoading, setIsBootLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCardsLoading, setIsCardsLoading] = useState(false);
  const [isStatsLoading, setIsStatsLoading] = useState(false);
  const [isDecksLoading, setIsDecksLoading] = useState(false);

  // --- library state ---
  const [libraryCards, setLibraryCards] = useState([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [librarySearch, setLibrarySearch] = useState("");

  // --- bulk selection state (library) ---
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [bulkDeck, setBulkDeck] = useState(DEFAULT_DECK);
  const [bulkBusy, setBulkBusy] = useState(false);

  // --- deck manager (rename / remove deck) ---
  const [deckManageFrom, setDeckManageFrom] = useState(DEFAULT_DECK);
  const [deckManageTo, setDeckManageTo] = useState(""); // new name for rename
  const [deckRemoveTo, setDeckRemoveTo] = useState(DEFAULT_DECK); // move cards to
  const [deckManageBusy, setDeckManageBusy] = useState(false);

  // edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [editCard, setEditCard] = useState(null);
  const [editWord, setEditWord] = useState("");
  const [editTranslation, setEditTranslation] = useState("");
  const [editExample, setEditExample] = useState("");
  const [editDeck, setEditDeck] = useState(DEFAULT_DECK);

  const abortRef = useRef(null);

  // --- i18n dictionary (minimal) ---
  const T = useMemo(
    () => ({
      de: {
        review: "⚡ Wiederholen",
        library: "📖 Bibliothek",
        add: "➕ Hinzufügen",
        refresh: "Aktualisieren",
        deckFilter: "Thema",
        allDecks: "Alle",
        showTranslation: "Übersetzung anzeigen",
        know: "Weiß ich ✅",
        dontKnow: "Weiß ich nicht ❌",
        noCards: "Keine Karten zum Wiederholen 🎉",
        addCard: "Karte hinzufügen",
        addDeck: "Thema hinzufügen",
        newDeck: "➕ Neues Thema (optional)",
        exampleOpt: "📘 Beispiel (optional)",
        wordPlaceholder: "Wort",
        translationPlaceholder: "Übersetzung",
        tipAfterAdd: "Tipp: Danach zu ⚡ Wiederholen wechseln.",
        uiLang: "UI",
        loading: "Laden…",
retry: "Erneut versuchen",
offlineHint: "Server nicht erreichbar. Läuft das Backend?",
searchPlaceholder: "Suche (Wort / Übersetzung / Thema / Beispiel)…",
reload: "Neu laden",
noFound: "Keine Karten gefunden.",
edit: "Bearbeiten",
del: "Löschen",
cancel: "Abbrechen",
save: "Speichern",
editTitle: "Karte bearbeiten",
// bulk
selected: "Ausgewählt",
selectAll: "Alle auswählen",
clear: "Leeren",
moveTo: "Verschieben nach",
move: "Verschieben",
deleteSelected: "Ausgewählte löschen",
confirmDeleteN: "Ausgewählte Karten löschen?",
        total: "Gesamt",
dueNow: "Fällig jetzt",
reviewedToday: "Heute wiederholt",
totalReviews: "Gesamt Wiederholungen",
correct: "Richtig",
accuracy: "Genauigkeit",
learned: "Gelernt",
remaining: "Verbleibend",

az: "A → Z",
za: "Z → A",

deckManagerTitle: "🗂 Themen (Deck-Manager)",
from: "Von",
newName: "Neuer Name (umbenennen)",
removeMoveTo: "Entfernen: Karten verschieben nach",
renameBtn: "✏️ Umbenennen",
removeBtn: "🗑 Entfernen",

deckManagerTitle: "🗂 Themen (Deck Manager)",
from: "Von",
newName: "Neuer Name (umbenennen)",
removeMoveTo: "Entfernen: Karten verschieben →",
renameBtn: "Umbenennen",
removeBtn: "Entfernen",

defaultDeck: "Ohne Thema",

      },
      en: {
        review: "⚡ Review",
        library: "📖 Library",
        add: "➕ Add",
        refresh: "Refresh",
        deckFilter: "Topic",
        allDecks: "All",
        showTranslation: "Show translation",
        know: "I know ✅",
        dontKnow: "I don’t know ❌",
        noCards: "No cards to review 🎉",
        addCard: "Add card",
        addDeck: "Add topic",
        newDeck: "➕ New topic (optional)",
        exampleOpt: "📘 Example (optional)",
        wordPlaceholder: "Word",
        translationPlaceholder: "Translation",
        tipAfterAdd: "Tip: Switch to ⚡ Review after adding.",
        uiLang: "UI",
        loading: "Loading…",
        retry: "Retry",
        offlineHint: "Server not reachable. Did you start backend?",
        searchPlaceholder: "Search (word / translation / deck / example)…",
        reload: "Reload",
        noFound: "No cards found.",
        edit: "Edit",
        del: "Delete",
        cancel: "Cancel",
        save: "Save",
        editTitle: "Edit card",
        sort: "Sorting",
        order: "Order",
        // bulk
        selected: "Selected",
        selectAll: "Select all",
        clear: "Clear",
        moveTo: "Move to",
        move: "Move",
        deleteSelected: "Delete selected",
        confirmDeleteN: "Delete selected cards?",
        total: "Total",
dueNow: "Due now",
reviewedToday: "Reviewed today",
totalReviews: "Total reviews",
correct: "Correct",
accuracy: "Accuracy",
learned: "Learned",
remaining: "Remaining",

az: "A → Z",
za: "Z → A",

deckManagerTitle: "🗂 Topics (Deck manager)",
from: "From",
newName: "New name (rename)",
removeMoveTo: "Remove: move cards →",
renameBtn: "✏️ Rename",
removeBtn: "🗑 Remove",

deckManagerTitle: "🗂 Topics (Deck Manager)",
from: "From",
newName: "New name (rename)",
removeMoveTo: "Remove: move cards →",
renameBtn: "Rename",
removeBtn: "Remove",

defaultDeck: "No topic",


      },
      uk: {
        review: "⚡ Повторення",
        library: "📖 Бібліотека",
        add: "➕ Додати",
        refresh: "Оновити",
        deckFilter: "Тема",
        allDecks: "Усі",
        showTranslation: "Показати переклад",
        know: "Знаю ✅",
        dontKnow: "Не знаю ❌",
        noCards: "Немає карток для повторення 🎉",
        addCard: "Додати картку",
        addDeck: "Додати тему",
        newDeck: "➕ Нова тема (опційно)",
        exampleOpt: "📘 Приклад (необов'язково)",
        wordPlaceholder: "Слово",
        translationPlaceholder: "Переклад",
        tipAfterAdd: "Порада: після додавання переходь у ⚡ Повторення.",
        uiLang: "UI",
        loading: "Завантаження…",
        retry: "Повторити",
        offlineHint: "Сервер недоступний. Ти запустив бекенд?",
        searchPlaceholder: "Пошук (слово / переклад / тема / приклад)…",
        reload: "Оновити список",
        noFound: "Нічого не знайдено.",
        edit: "Редагувати",
        del: "Видалити",
        cancel: "Скасувати",
        save: "Зберегти",
        editTitle: "Редагування картки",
        sort: "Сортування",
        order: "Порядок",
        // bulk
        selected: "Вибрано",
        selectAll: "Вибрати все",
        clear: "Очистити",
        moveTo: "Перемістити в",
        move: "Перемістити",
        deleteSelected: "Видалити вибрані",
        confirmDeleteN: "Видалити вибрані картки?",
        total: "Усього",
dueNow: "До повтору зараз",
reviewedToday: "Повторено сьогодні",
totalReviews: "Усього повторів",
correct: "Правильно",
accuracy: "Точність",
learned: "Вивчено",
remaining: "Залишилось",

az: "А → Я",
za: "Я → А",

deckManagerTitle: "🗂 Теми (керування)",
from: "Звідки",
newName: "Нова назва (перейменувати)",
removeMoveTo: "Видалити: перемістити картки в",
renameBtn: "✏️ Перейменувати",
removeBtn: "🗑 Видалити",

deckManagerTitle: "🗂 Теми (Deck manager)",
from: "З",
newName: "Нова назва (перейменувати)",
removeMoveTo: "Видалити: перемістити картки →",
renameBtn: "Перейменувати",
removeBtn: "Видалити",

defaultDeck: "Без теми",


      },
    }),
    []
  );

  const t = T[normalizeLang(interfaceLang, "de")] || T.de;
  const DEFAULT_DECK = t[DEFAULT_DECK_KEY];


  function langLabel(code) {
    if (code === "de") return "DE";
    if (code === "en") return "EN";
    return "UK";
  }

  // --- Auth guard ---
  useEffect(() => {
    const token = getToken();
    if (!token) navigate("/login", { replace: true });
  }, [navigate]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [view]);

  // ===== Load profile languages from server (one time) =====
  useEffect(() => {
    async function fetchProfileLangs() {
      const token = getToken();
      if (!token) return;

      try {
        const res = await fetch(`${API}/api/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.status === 401) {
          localStorage.removeItem("token");
          navigate("/login", { replace: true });
          return;
        }

        if (!res.ok) return;

        const user = await res.json().catch(() => null);
        if (!user) return;

        const ui = normalizeLang(user.interfaceLang, localStorage.getItem(LS_UI) || "de");
        const l1 = normalizeLang(user.nativeLang, localStorage.getItem(LS_L1) || "uk");
        const l2 = normalizeLang(user.learningLang, localStorage.getItem(LS_L2) || "de");

        localStorage.setItem(LS_UI, ui);
        localStorage.setItem(LS_L1, l1);
        localStorage.setItem(LS_L2, l2);

        setInterfaceLang(ui);
        setNativeLang(l1);
        setLearningLang(l2);
      } catch (e) {
        console.error("fetchProfileLangs error:", e);
      }
    }

    fetchProfileLangs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // persist theme + sync to body
  useEffect(() => {
    localStorage.setItem("flashcardsTheme", theme);
    document.body.dataset.theme = theme;
    return () => {
      delete document.body.dataset.theme;
    };
  }, [theme]);

  // persist only UI language
  useEffect(() => {
    localStorage.setItem(LS_UI, interfaceLang);
  }, [interfaceLang]);

  // ===== unified helpers for 401 + error messages =====
  function handle401() {
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    navigate("/login", { replace: true });
  }

  function setFriendlyError(prefix, err, serverMsg) {
    const human = humanFetchError(err);
    const hint = human.includes("Network error") ? ` — ${t.offlineHint}` : "";
    setMessage(`${prefix}: ${serverMsg || human}${hint}`);
  }

  // ✅ Reset session progress when user changes queue parameters (review only)
  useEffect(() => {
    if (view !== "review") return;
    setSessionDone(0);
    setSessionTotal(0);
    setReviewIndex(0);
    setShowAnswer(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, deckFilter, mode, sortBy, sortOrder]);

  // Clear library selection when leaving library or changing deck filter
  useEffect(() => {
    if (view !== "library") {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, deckFilter]);

  async function refreshAll() {
    await Promise.all([fetchDecks(), fetchCards(), fetchStats()]);
  }

  // ===== data loading triggers =====
  useEffect(() => {
    (async () => {
      setMessage("");
      setIsRefreshing(true);
      try {
        if (view === "review") {
          await refreshAll();
        } else if (view === "library") {
          await Promise.all([fetchDecks(), fetchStats(), fetchLibraryCards()]);
        } else {
          await Promise.all([fetchDecks(), fetchStats()]);
        }
      } finally {
        setIsRefreshing(false);
        setIsBootLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, deckFilter, librarySortBy, librarySortOrder]);

  async function fetchDecks() {
    const token = getToken();
    if (!token) return;

    setIsDecksLoading(true);
    try {
      const { signal, cleanup } = withTimeout();
      const res = await fetch(`${API}/api/cards/decks`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
        signal,
      }).finally(cleanup);

      if (res.status === 401) return handle401();

      const data = await res.json().catch(() => []);
      if (!res.ok) {
        setFriendlyError("❌ Decks", null, data?.message || data?.error);
        return;
      }

      const list = Array.isArray(data) ? data : [];
      const withDefault = list.includes(DEFAULT_DECK) ? list : [DEFAULT_DECK, ...list];
      setDecks(withDefault);

      if (deckForNewCard && !withDefault.includes(deckForNewCard)) setDeckForNewCard(DEFAULT_DECK);
      if (bulkDeck && !withDefault.includes(bulkDeck)) setBulkDeck(DEFAULT_DECK);

      if (deckManageFrom && !withDefault.includes(deckManageFrom)) setDeckManageFrom(DEFAULT_DECK);
      if (deckRemoveTo && !withDefault.includes(deckRemoveTo)) setDeckRemoveTo(DEFAULT_DECK);
    } catch (err) {
      if (err?.name !== "AbortError") setFriendlyError("❌ Decks", err);
    } finally {
      setIsDecksLoading(false);
    }
  }

  async function fetchStats() {
    const token = getToken();
    if (!token) return;

    setIsStatsLoading(true);
    try {
      const { signal, cleanup } = withTimeout();
      const res = await fetch(`${API}/api/cards/stats`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
        signal,
      }).finally(cleanup);

      if (res.status === 401) return handle401();

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setFriendlyError("❌ Stats", null, data?.message || data?.error);
        return;
      }

      setStats(data);
    } catch (err) {
      if (err?.name !== "AbortError") setFriendlyError("❌ Stats", err);
    } finally {
      setIsStatsLoading(false);
    }
  }

  // ===== Review fetch (due queue) =====
  async function fetchCards() {
    const token = getToken();
    if (!token) return;

    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsCardsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("mode", "due");
      params.set("sort", "nextReview");
      params.set("order", "asc");
      if (deckFilter !== "ALL") params.set("deck", deckFilter);

      const url = `${API}/api/cards?${params.toString()}`;

      const { signal, cleanup } = withTimeout(controller.signal);
      const res = await fetch(url, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
        signal,
      }).finally(cleanup);

      if (res.status === 401) return handle401();

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setFriendlyError("❌ Cards", null, data?.message || data?.error);
        return;
      }

      const list = Array.isArray(data) ? data : [];
      setCards(list);
      setMessage("");

      if (view === "review" && sessionTotal === 0 && sessionDone === 0) {
        setSessionTotal(list.length);
      }
    } catch (err) {
      if (err?.name !== "AbortError") setFriendlyError("❌ Cards", err);
    } finally {
      setIsCardsLoading(false);
    }
  }

  // ============== Library: fetch all cards (mode=all) + sort/order ==============
  async function fetchLibraryCards() {
    const token = getToken();
    if (!token) return;

    setLibraryLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("mode", "all");
      params.set("sort", librarySortBy);
      params.set("order", librarySortOrder);
      if (deckFilter !== "ALL") params.set("deck", deckFilter);

      const { signal, cleanup } = withTimeout();
      const res = await fetch(`${API}/api/cards?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal,
      }).finally(cleanup);

      if (res.status === 401) return handle401();

      const data = await res.json().catch(() => []);
      if (!res.ok) {
        setFriendlyError("❌ Library", null, data?.message || data?.error);
        return;
      }

      setLibraryCards(Array.isArray(data) ? data : []);
    } catch (err) {
      if (err?.name !== "AbortError") setFriendlyError("❌ Library", err);
    } finally {
      setLibraryLoading(false);
    }
  }

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

  // selection helpers
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

  async function bulkMove() {
    const token = getToken();
    if (!token) return handle401();

    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    const deck = (bulkDeck || DEFAULT_DECK).trim() || DEFAULT_DECK;

    setBulkBusy(true);
    setMessage("");
    try {
      const { signal, cleanup } = withTimeout();
      const res = await fetch(`${API}/api/cards/bulk-move`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
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

if (from === DEFAULT_DECK) {
  setMessage(`⚠️ Не можна перейменувати '${DEFAULT_DECK}'`);
}


    const ok = window.confirm(`Rename deck "${from}" → "${to}" ?`);
    if (!ok) return;

    setDeckManageBusy(true);
    setMessage("");

    try {
      const { signal, cleanup } = withTimeout();
      const res = await fetch(`${API}/api/cards/decks/rename`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
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

      setMessage(
        `✅ ${data?.message || "Deck renamed"} (moved=${data?.moved || 0}, conflicts=${
          data?.conflicts || 0
        })`
      );
      setDeckManageTo("");

      // if filter points to old deck — reset
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
    const to = String(deckRemoveTo || DEFAULT_DECK).trim() || DEFAULT_DECK;

    if (!name) return;

if (name === DEFAULT_DECK) {
  setMessage(`⚠️ Не можна видалити '${DEFAULT_DECK}'`);
}


    const ok = window.confirm(`Remove deck "${name}" (move cards → "${to}") ?`);
    if (!ok) return;

    setDeckManageBusy(true);
    setMessage("");

    try {
      const { signal, cleanup } = withTimeout();
      const url = `${API}/api/cards/decks/${encodeURIComponent(name)}?mode=move&to=${encodeURIComponent(
        to
      )}`;

      const res = await fetch(url, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
        signal,
      }).finally(cleanup);

      if (res.status === 401) return handle401();

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setFriendlyError("❌ Remove deck", null, data?.message || data?.error);
        return;
      }

      setMessage(
        `✅ ${data?.message || "Deck removed"} (moved=${data?.moved || 0}, conflicts=${
          data?.conflicts || 0
        })`
      );

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
        headers: { Authorization: `Bearer ${token}` },
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
    setEditDeck(c.deck || DEFAULT_DECK);
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
      deck: (editDeck || DEFAULT_DECK).trim(),
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

  // --- Create new deck locally (UI) ---
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
        deck: (deckForNewCard || DEFAULT_DECK).trim(),
      };

      const { signal, cleanup } = withTimeout();
      const res = await fetch(`${API}/api/cards`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
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

  // --- Review (PUT) ---
  async function sendReview(id, known) {
    const token = getToken();
    if (!token) {
      handle401();
      return false;
    }

    try {
      const { signal, cleanup } = withTimeout();
      const res = await fetch(`${API}/api/cards/${id}/review`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ known }),
        signal,
      }).finally(cleanup);

      if (res.status === 401) {
        handle401();
        return false;
      }

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

  // ----- Review helpers -----
  const reviewCards = useMemo(() => cards, [cards]);

  useEffect(() => {
    if (view === "review") {
      setReviewIndex(0);
      setShowAnswer(false);
      setShowImportExport(false);
    }
  }, [view]);

  useEffect(() => {
    if (reviewIndex > Math.max(0, reviewCards.length - 1)) {
      setReviewIndex(Math.max(0, reviewCards.length - 1));
    }
  }, [reviewCards.length, reviewIndex]);

  const currentReviewCard =
    reviewCards.length > 0 ? reviewCards[Math.min(reviewIndex, reviewCards.length - 1)] : null;

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

  // ===== keyboard shortcuts (review UX) =====
  useEffect(() => {
    function onKeyDown(e) {
      const tag = (e.target?.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;

      if (e.key === "Escape") {
        if (showImportExport) setShowImportExport(false);
        if (editOpen) setEditOpen(false);
        return;
      }

      if (view !== "review") return;

      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        if (!showAnswer) setShowAnswer(true);
        return;
      }

      if (e.key === "1") {
        e.preventDefault();
        reviewAnswer(true);
        return;
      }
      if (e.key === "2") {
        e.preventDefault();
        reviewAnswer(false);
        return;
      }

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setReviewIndex((i) => Math.max(0, i - 1));
        setShowAnswer(false);
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        setReviewIndex((i) => Math.min(reviewCards.length - 1, i + 1));
        setShowAnswer(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, showAnswer, reviewCards.length, showImportExport, isReviewing, editOpen]);

  // --- Export ---
  async function handleExport(format) {
    const token = getToken();
    if (!token) return handle401();

    try {
      const { signal, cleanup } = withTimeout();
      const res = await fetch(`${API}/api/cards/export?format=${format}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal,
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

  // --- Import ---
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
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
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

  function formatNextReview(dateStr) {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return null;

    return new Intl.DateTimeFormat("uk-UA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  }

  function minutesUntil(dateStr) {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return null;

    const diffMs = d.getTime() - Date.now();
    return Math.ceil(diffMs / 60000);
  }

  // ===== UI lang change (PATCH to server) =====
  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    navigate("/login");
  }

  const anyLoading =
    isBootLoading || isRefreshing || isCardsLoading || isStatsLoading || isDecksLoading;

  function retryNow() {
    setMessage("");
    setIsRefreshing(true);
    Promise.resolve()
      .then(() => {
        if (view === "review") return refreshAll();
        if (view === "library") return Promise.all([fetchDecks(), fetchStats(), fetchLibraryCards()]);
        return Promise.all([fetchDecks(), fetchStats()]);
      })
      .finally(() => setIsRefreshing(false));
  }

  // ✅ progress numbers (review = due session)
  const progressTotal = sessionTotal || cards.length;
  const progressIndex = Math.min(sessionDone + 1, progressTotal || 0);


  const isDefaultFrom = String(deckManageFrom || "").trim() === DEFAULT_DECK;
  const isSameRemoveTarget =
  String(deckRemoveTo || "").trim() === String(deckManageFrom || "").trim();

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

{stats && (
  <div className="stats">
    <div>
      <b>{t.total}:</b> {stats.totalCards}
    </div>

    <div>
      <b>{t.dueNow}:</b> {stats.dueNow}
    </div>

    <div>
      <b>{t.accuracy}:</b> {stats.accuracy}%
    </div>

    <div>
      <b>{t.learned}:</b> {stats.learned ?? 0}
    </div>

    <div>
      <b>{t.remaining}:</b> {stats.remaining ?? 0}
    </div>
  </div>
)}




      <div className="toolbar">
        <div className="toolbar-row toolbar-row-top">
          <button
            className="icon-btn"
            type="button"
            onClick={() => setShowImportExport((v) => !v)}
            title={showImportExport ? "Close import/export (Esc)" : "Import / Export"}
            aria-label="Import / Export"
          >
            {showImportExport ? "✖" : "📦"}
          </button>

          <button
            className="icon-btn"
            type="button"
            onClick={() => setTheme((t0) => (t0 === "dark" ? "light" : "dark"))}
            title={theme === "dark" ? "Light theme" : "Dark theme"}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>

          <div className="toolbar-tabs">
            <button type="button" onClick={() => setView("review")} title="Review">
              {t.review}
            </button>
            <button type="button" onClick={() => setView("library")} title="Library">
              {t.library}
            </button>
            <button type="button" onClick={() => setView("add")} title="Add card">
              {t.add}
            </button>
          </div>

          <div className="toolbar-actions-right">
            <button type="button" onClick={logout} title="Logout" aria-label="Logout">
              🚪
            </button>
            <button type="button" onClick={retryNow} title={t.refresh} aria-label="Refresh">
              🔄
            </button>
          </div>
        </div>

        <div className="toolbar-row toolbar-row-controls">
          {(view === "review" || view === "library") && (
            <div className="ctrl">
              <div className="ctrl-label">{t.deckFilter}</div>
              <select value={deckFilter} onChange={(e) => setDeckFilter(e.target.value)}>
<option value="ALL">{t.allDecks}</option>
                {decks.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          )}

          {view === "library" && (
            <>
              <div className="ctrl">
                <div className="ctrl-label">{t.sort}</div>
                <select value={librarySortBy} onChange={(e) => setLibrarySortBy(e.target.value)}>
                  <option value="createdAt">🆕 createdAt</option>
                  <option value="word">🔤 word</option>
                  <option value="nextReview">🕒 nextReview</option>
                  <option value="accuracy">🎯 accuracy</option>
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
        <div className="review-mode">
          {isCardsLoading ? (
            <div className="panel" style={{ marginTop: 12, padding: 12 }}>
              <span className="spinner" aria-hidden="true" /> {t.loading}
            </div>
          ) : cards.length === 0 ? (
            <p className="empty">{t.noCards}</p>
          ) : (
            <div className="review-card">
              <div className="review-top">
                <span className="review-chip">{currentReviewCard?.deck || DEFAULT_DECK}</span>

                <span className="review-progress">
                  {progressTotal > 0 ? `${progressIndex} / ${progressTotal}` : `0 / 0`}
                </span>
              </div>

              <div className="review-main">
<div className="review-word">{currentReviewCard?.word}</div>




                {showAnswer ? (
                  <>
<div className="review-translation">{currentReviewCard?.translation}</div>


                    {currentReviewCard?.example ? (
                      <div className="review-example">📘 {currentReviewCard.example}</div>
                    ) : null}
                  </>
                ) : (
                  <button
                    className="review-reveal"
                    type="button"
                    onClick={() => setShowAnswer(true)}
                    title="Space / Enter"
                    aria-label="Show translation"
                  >
                    {t.showTranslation}
                  </button>
                )}
              </div>

              <div className="review-actions">
                <button type="button" onClick={() => reviewAnswer(true)} disabled={isReviewing}>
                  {t.know}
                </button>
                <button type="button" onClick={() => reviewAnswer(false)} disabled={isReviewing}>
                  {t.dontKnow}
                </button>
              </div>

              {currentReviewCard?.nextReview &&
                new Date(currentReviewCard.nextReview) > new Date() && (
                  <div className="meta" style={{ textAlign: "center", marginTop: 10 }}>
                    ⏳ Next: {formatNextReview(currentReviewCard.nextReview)}
                    {minutesUntil(currentReviewCard.nextReview) !== null && (
                      <> (~ {minutesUntil(currentReviewCard.nextReview)} min)</>
                    )}
                  </div>
                )}
            </div>
          )}
        </div>
      ) : view === "add" ? (
        <>
          <form className="add-card-form" onSubmit={handleAddCard}>
            <input
              type="text"
              placeholder={t.wordPlaceholder}
              value={word}
              onChange={(e) => setWord(e.target.value)}
              autoFocus
            />
            <input
              type="text"
              placeholder={t.translationPlaceholder}
              value={translation}
              onChange={(e) => setTranslation(e.target.value)}
            />
            <input
              type="text"
              placeholder={t.exampleOpt}
              value={example}
              onChange={(e) => setExample(e.target.value)}
            />

            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <select value={deckForNewCard} onChange={(e) => setDeckForNewCard(e.target.value)}>
                {decks.length === 0 ? (
                  <option value={DEFAULT_DECK}>{DEFAULT_DECK}</option>
                ) : (
                  decks.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))
                )}
              </select>

              <input
                type="text"
                placeholder={t.newDeck}
                value={newDeckName}
                onChange={(e) => setNewDeckName(e.target.value)}
                style={{ minWidth: 200 }}
              />
              <button type="button" onClick={handleCreateDeckLocal}>
                {t.addDeck}
              </button>
            </div>

            <button type="submit">{t.addCard}</button>
          </form>

          <div className="panel" style={{ marginTop: 12, padding: 12 }}>
            <b>{t.tipAfterAdd}</b>
          </div>
        </>
      ) : (
        // ===== Library view =====
        <div className="panel" style={{ marginTop: 12, padding: 12 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <input
              type="text"
              value={librarySearch}
              onChange={(e) => setLibrarySearch(e.target.value)}
              placeholder={t.searchPlaceholder}
              style={{ flex: 1, minWidth: 220 }}
            />

            <button type="button" onClick={fetchLibraryCards} disabled={libraryLoading || bulkBusy}>
              {libraryLoading ? t.loading : t.reload}
            </button>

            <div style={{ opacity: 0.8 }}>
              {filteredLibraryCards.length} / {libraryCards.length}
            </div>
          </div>

          {/* Deck manager */}
          <div className="panel" style={{ marginTop: 12, padding: 12 }}>
<b>{t.deckManagerTitle}</b>

            <div
              style={{
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
                alignItems: "end",
                marginTop: 10,
              }}
            >
              <div>
<div style={{ opacity: 0.75, fontSize: 12 }}>{t.from}</div>
                <select
                  value={deckManageFrom}
                  onChange={(e) => setDeckManageFrom(e.target.value)}
                  disabled={deckManageBusy}
                >
                  {decks.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ flex: 1, minWidth: 220 }}>
<div style={{ opacity: 0.75, fontSize: 12 }}>{t.newName}</div>

                <input
                  value={deckManageTo}
                  onChange={(e) => setDeckManageTo(e.target.value)}
                  disabled={deckManageBusy}
                  placeholder="Напр. Food"
                />
              </div>

<button
  type="button"
  onClick={renameDeck}
  disabled={deckManageBusy || !deckManageTo.trim() || isDefaultFrom}
  title={t.renameBtn}
>
  ✏️ {t.renameBtn}
</button>



              <div>
<div style={{ opacity: 0.75, fontSize: 12 }}>{t.removeMoveTo}</div>
                <select
                  value={deckRemoveTo}
                  onChange={(e) => setDeckRemoveTo(e.target.value)}
                  disabled={deckManageBusy}
                >
                  {decks.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

<button
  type="button"
  onClick={removeDeckMoveCards}
  disabled={deckManageBusy || isDefaultFrom || isSameRemoveTarget}
  title={t.removeBtn}
>
  {t.removeBtn}
</button>


            </div>
          </div>

          {/* Bulk bar */}
          <div className="panel bulk-bar" style={{ marginTop: 12 }}>
            <div className="bulk-left">
              <b>
                {t.selected}: {selectedCount}
              </b>

              <button
                type="button"
                onClick={selectAllFiltered}
                disabled={filteredLibraryCards.length === 0 || bulkBusy}
              >
                ✅ {t.selectAll}
              </button>

              <button type="button" onClick={clearSelection} disabled={selectedCount === 0 || bulkBusy}>
                ✖ {t.clear}
              </button>
            </div>

            <div className="bulk-right">
              <span className="bulk-label">{t.moveTo}:</span>

              <select value={bulkDeck} onChange={(e) => setBulkDeck(e.target.value)} disabled={bulkBusy}>
                {decks.length === 0 ? (
                  <option value={DEFAULT_DECK}>{DEFAULT_DECK}</option>
                ) : (
                  decks.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))
                )}
              </select>

              <button type="button" onClick={bulkMove} disabled={selectedCount === 0 || bulkBusy}>
                📦 {bulkBusy ? t.loading : t.move}
              </button>

              <button type="button" onClick={bulkDelete} disabled={selectedCount === 0 || bulkBusy}>
                🗑 {bulkBusy ? t.loading : t.deleteSelected}
              </button>
            </div>
          </div>

          {/* Cards list */}
          <div style={{ marginTop: 12 }}>
            {libraryLoading ? (
              <div>
                <span className="spinner" aria-hidden="true" /> {t.loading}
              </div>
            ) : filteredLibraryCards.length === 0 ? (
              <div style={{ opacity: 0.8, padding: 8 }}>{t.noFound}</div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {filteredLibraryCards.map((c) => (
                  <div key={c._id} className="panel" style={{ padding: 12, display: "grid", gap: 6 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        {/* selection checkbox */}
                        <input
                          type="checkbox"
                          checked={selectedIds.has(c._id)}
                          onChange={() => toggleSelect(c._id)}
                          disabled={bulkBusy}
                          title="Select"
                        />
                        <b>{c.deck || DEFAULT_DECK}</b>
                      </div>

                      <div style={{ display: "flex", gap: 8 }}>
                        <button type="button" onClick={() => openEdit(c)} disabled={bulkBusy}>
                          ✏️ {t.edit}
                        </button>
                        <button type="button" onClick={() => handleDeleteCard(c._id)} disabled={bulkBusy}>
                          🗑 {t.del}
                        </button>
                      </div>
                    </div>

                    <div>
                      <b>{langLabel(learningLang)}:</b> {c.word}
                    </div>
                    <div>
                      <b>{langLabel(nativeLang)}:</b> {c.translation}
                    </div>
                    {c.example ? <div style={{ opacity: 0.9 }}>📘 {c.example}</div> : null}

                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", opacity: 0.75 }}>
                      <span>reviews: {c.reviewCount || 0}</span>
                      <span>correct: {c.correctCount || 0}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Edit modal */}
          {editOpen && (
            <div
              role="dialog"
              aria-modal="true"
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.45)",
                display: "grid",
                placeItems: "center",
                padding: 16,
                zIndex: 50,
              }}
              onMouseDown={() => setEditOpen(false)}
            >
              <div
                className="panel"
                style={{ width: "min(720px, 100%)", padding: 14 }}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <b>{t.editTitle}</b>
                  <button type="button" onClick={() => setEditOpen(false)}>
                    ✖
                  </button>
                </div>

                <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
                  <input
                    type="text"
                    value={editWord}
                    onChange={(e) => setEditWord(e.target.value)}
                    placeholder="word"
                  />
                  <input
                    type="text"
                    value={editTranslation}
                    onChange={(e) => setEditTranslation(e.target.value)}
                    placeholder="translation"
                  />
                  <input
                    type="text"
                    value={editExample}
                    onChange={(e) => setEditExample(e.target.value)}
                    placeholder="Example (optional)"
                  />

                  <select value={editDeck} onChange={(e) => setEditDeck(e.target.value)}>
                    {decks.length === 0 ? (
                      <option value={DEFAULT_DECK}>{DEFAULT_DECK}</option>
                    ) : (
                      decks.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))
                    )}
                  </select>

                  <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                    <button type="button" onClick={() => setEditOpen(false)}>
                      {t.cancel}
                    </button>
                    <button type="button" onClick={saveEdit}>
                      {t.save}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
