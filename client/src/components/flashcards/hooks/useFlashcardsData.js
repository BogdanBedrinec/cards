import { useEffect, useMemo, useRef, useState } from "react";
import { API, DEFAULT_DECK_ID } from "../utils/constants.js";
import { getToken } from "../utils/auth.js";
import { withTimeout, humanFetchError } from "../utils/http.js";

/**
 * Centralized data loading for Flashcards:
 * - decks, cards(due), stats, libraryCards(all)
 * - boot/refresh logic when view/filter/sort changes
 * - retryNow
 *
 * Keep UI state in Flashcards.jsx; this hook only manages remote data + loading flags.
 */
export function useFlashcardsData({
  t,
  view,
  deckFilter,
  librarySortBy,
  librarySortOrder,
  setMessage,
  handle401,
}) {
  const abortRef = useRef(null);

  const [decks, setDecks] = useState([]);
  const [cards, setCards] = useState([]);
  const [stats, setStats] = useState(null);
  const [libraryCards, setLibraryCards] = useState([]);

  const [libraryLoading, setLibraryLoading] = useState(false);

  const [isBootLoading, setIsBootLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCardsLoading, setIsCardsLoading] = useState(false);
  const [isDecksLoading, setIsDecksLoading] = useState(false);
  const [isStatsLoading, setIsStatsLoading] = useState(false);

  const anyLoading =
    isBootLoading || isRefreshing || isCardsLoading || isStatsLoading || isDecksLoading;

  function setFriendlyError(prefix, err, serverMsg) {
    const human = humanFetchError(err);
    const hint = human.includes("Network error") ? ` — ${t.offlineHint}` : "";
    setMessage(`${prefix}: ${serverMsg || human}${hint}`);
  }

  async function wakeBackend() {
    try {
      const { signal, cleanup } = withTimeout(null, 12000);
      await fetch(`${API}/api/health`, { cache: "no-store", signal }).finally(cleanup);
    } catch {
      // ignore
    }
  }

  async function retry(fn, tries = 4, delayMs = 1200) {
    let lastErr = null;
    for (let i = 0; i < tries; i++) {
      try {
        return await fn();
      } catch (e) {
        lastErr = e;
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
    throw lastErr;
  }

  async function fetchDecks() {
    const token = getToken();
    if (!token) return handle401();

    setIsDecksLoading(true);
    try {
      const { signal, cleanup } = withTimeout();
      const res = await fetch(`${API}/api/cards/decks`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}`, "Cache-Control": "no-cache" },
        cache: "no-store",
        signal,
      }).finally(cleanup);

      if (res.status === 401) return handle401();

      const data = await res.json().catch(() => []);
      if (!res.ok) {
        setFriendlyError("❌ Decks", null, data?.message || data?.error);
        throw new Error(data?.message || data?.error || "Decks failed");
      }

      const list = Array.isArray(data) ? data : [];
      const withDefault = list.includes(DEFAULT_DECK_ID) ? list : [DEFAULT_DECK_ID, ...list];
      setDecks(withDefault);
      return withDefault;
    } finally {
      setIsDecksLoading(false);
    }
  }

  async function fetchStats() {
    const token = getToken();
    if (!token) return handle401();

    setIsStatsLoading(true);
    try {
      const { signal, cleanup } = withTimeout();
      const res = await fetch(`${API}/api/cards/stats`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}`, "Cache-Control": "no-cache" },
        cache: "no-store",
        signal,
      }).finally(cleanup);

      if (res.status === 401) return handle401();

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setFriendlyError("❌ Stats", null, data?.message || data?.error);
        throw new Error(data?.message || data?.error || "Stats failed");
      }

      setStats(data);
      return data;
    } catch (err) {
      if (err?.name !== "AbortError") setFriendlyError("❌ Stats", err);
      throw err;
    } finally {
      setIsStatsLoading(false);
    }
  }

  async function fetchCardsDue() {
    const token = getToken();
    if (!token) return handle401();

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

      const { signal, cleanup } = withTimeout(controller.signal);
      const res = await fetch(`${API}/api/cards?${params.toString()}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}`, "Cache-Control": "no-cache" },
        cache: "no-store",
        signal,
      }).finally(cleanup);

      if (res.status === 401) return handle401();

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setFriendlyError("❌ Cards", null, data?.message || data?.error);
        throw new Error(data?.message || data?.error || "Cards failed");
      }

      const list = Array.isArray(data) ? data : [];
      setCards(list);
      return list;
    } catch (err) {
      if (err?.name !== "AbortError") setFriendlyError("❌ Cards", err);
      throw err;
    } finally {
      setIsCardsLoading(false);
    }
  }

  async function fetchLibraryCardsAll() {
    const token = getToken();
    if (!token) return handle401();

    setLibraryLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("mode", "all");
      params.set("sort", librarySortBy);
      params.set("order", librarySortOrder);
      if (deckFilter !== "ALL") params.set("deck", deckFilter);

      const { signal, cleanup } = withTimeout();
      const res = await fetch(`${API}/api/cards?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}`, "Cache-Control": "no-cache" },
        cache: "no-store",
        signal,
      }).finally(cleanup);

      if (res.status === 401) return handle401();

      const data = await res.json().catch(() => []);
      if (!res.ok) {
        setFriendlyError("❌ Library", null, data?.message || data?.error);
        throw new Error(data?.message || data?.error || "Library failed");
      }

      const list = Array.isArray(data) ? data : [];
      setLibraryCards(list);
      return list;
    } catch (err) {
      if (err?.name !== "AbortError") setFriendlyError("❌ Library", err);
      throw err;
    } finally {
      setLibraryLoading(false);
    }
  }

  async function refreshAll() {
    await wakeBackend();
    await Promise.all([retry(fetchDecks, 4), retry(fetchCardsDue, 4), retry(fetchStats, 4)]);
  }

  function retryNow() {
    setMessage("");
    setIsRefreshing(true);

    Promise.resolve()
      .then(() => {
        if (view === "review") return refreshAll();
        if (view === "library") return Promise.all([fetchDecks(), fetchStats(), fetchLibraryCardsAll()]);
        return Promise.all([fetchDecks(), fetchStats()]);
      })
      .finally(() => setIsRefreshing(false));
  }

  // boot + reload when view / filters / sorts change
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setMessage("");
      setIsRefreshing(true);
      try {
        await wakeBackend();

        if (view === "review") {
          await refreshAll();
        } else if (view === "library") {
          await Promise.all([retry(fetchDecks, 4), retry(fetchStats, 4), retry(fetchLibraryCardsAll, 4)]);
        } else {
          await Promise.all([retry(fetchDecks, 4), retry(fetchStats, 4)]);
        }

        if (!cancelled) setMessage("");
      } catch (e) {
        if (!cancelled) setFriendlyError("❌ Load", e);
      } finally {
        if (!cancelled) {
          setIsRefreshing(false);
          setIsBootLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, deckFilter, librarySortBy, librarySortOrder]);

  // expose a stable API surface
  const api = useMemo(
    () => ({
      fetchDecks,
      fetchStats,
      fetchCardsDue,
      fetchLibraryCardsAll,
      refreshAll,
      retryNow,
      wakeBackend,
      setFriendlyError,

      // expose setters in case you want to override in Flashcards.jsx later
      setDecks,
      setCards,
      setStats,
      setLibraryCards,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [view, deckFilter, librarySortBy, librarySortOrder, t]
  );

  return {
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
    ...api,
  };
}