import { useCallback } from "react";
import { API, DEFAULT_DECK_ID } from "../utils/constants.js";
import { getToken } from "../utils/auth.js";
import {  withTimeout } from "../utils/http.js";
import { apiFetch } from "../utils/apiFetch.js";

/**
 * Actions hook: all mutations / commands for Flashcards.
 * Keeps Flashcards.jsx clean (UI only).
 */
export function useFlashcardsActions({
  t,
  view,
  setView,

  // form state
  word,
  setWord,
  translation,
  setTranslation,
  example,
  setExample,

  // deck selections
  deckFilter,
  setDeckFilter,
  deckForNewCard,
  setDeckForNewCard,

  // review state
  currentReviewCard,
  showAnswer,
  setShowAnswer,
  isReviewing,
  setIsReviewing,
  setReviewIndex,
  setSessionDone,
  setSessionTotal,

  // library state
  selectedIds,
  clearSelection,
  bulkDeck,
  setBulkBusy,

  // deck manager state
  deckManageFrom,
  deckManageTo,
  setDeckManageTo,
  deckRemoveTo,
  setDeckManageBusy,
  deckLabel,

  // edit modal state
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

  // import/export
  importText,
  setImportText,
  importFormat,
  setShowImportExport,

  // UI message + auth
  setMessage,
  handle401,
  setFriendlyError,

  // data refresh functions (from useFlashcardsData)
  refreshAll,
  fetchDecks,
  fetchStats,
  fetchCardsDue,
  fetchLibraryCardsAll,
}) {
  // --- helpers ---
  const requireToken = useCallback(() => {
    const token = getToken();
    if (!token) {
      handle401();
      return null;
    }
    return token;
  }, [handle401]);

  // --- add card (apiFetch) ---
  const handleAddCard = useCallback(
    async (e) => {
      e.preventDefault();
      setMessage("");

      if (!word.trim() || !translation.trim()) {
        setMessage("⚠️ Please fill at least word and translation");
        return;
      }

      // Deck: або вибраний, або default
      const deck = String(deckForNewCard || DEFAULT_DECK_ID).trim() || DEFAULT_DECK_ID;

      try {
        const res = await apiFetch({
          url: `${API}/api/cards`,
          method: "POST",
          body: {
            word: word.trim(),
            translation: translation.trim(),
            example: example.trim(),
            deck,
          },
          handle401,
        });

        if (!res.ok) {
          setFriendlyError("❌ Add", null, res.errorMessage);
          return;
        }

        // UI reset
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
    },
    [
      word,
      translation,
      example,
      deckForNewCard,
      setMessage,
      setWord,
      setTranslation,
      setExample,
      setSessionDone,
      setSessionTotal,
      refreshAll,
      setView,
      handle401,
      setFriendlyError,
    ]
  );

  // --- review (поки старий fetch; перенесемо на apiFetch у наступних кроках) ---
  const sendReview = useCallback(
    async (id, known) => {
      const token = requireToken();
      if (!token) return false;

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
    },
    [requireToken, handle401, setFriendlyError]
  );

  const reviewAnswer = useCallback(
    async (known) => {
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

        await Promise.all([fetchCardsDue(), fetchStats(), fetchDecks()]);
      } finally {
        setIsReviewing(false);
      }
    },
    [
      currentReviewCard,
      isReviewing,
      showAnswer,
      setShowAnswer,
      setIsReviewing,
      sendReview,
      setSessionDone,
      setReviewIndex,
      fetchCardsDue,
      fetchStats,
      fetchDecks,
    ]
  );

  // --- export ---
  const handleExport = useCallback(
    async (format) => {
      const token = requireToken();
      if (!token) return;

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
    },
    [requireToken, handle401, setFriendlyError]
  );

  // --- import ---
  const handleImport = useCallback(async () => {
    const token = requireToken();
    if (!token) return;

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
      if (view === "library") await fetchLibraryCardsAll();
    } catch (err) {
      setFriendlyError("❌ Import", err, "Invalid JSON or import error");
    }

    setShowImportExport(false);
  }, [
    requireToken,
    importText,
    importFormat,
    setMessage,
    setImportText,
    setSessionDone,
    setSessionTotal,
    refreshAll,
    view,
    fetchLibraryCardsAll,
    setShowImportExport,
    handle401,
    setFriendlyError,
  ]);

  // --- bulk move ---
  const bulkMove = useCallback(async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    const deck = String(bulkDeck || DEFAULT_DECK_ID).trim() || DEFAULT_DECK_ID;

    setBulkBusy(true);
    setMessage("");

    try {
      const res = await apiFetch({
        url: `${API}/api/cards/bulk-move`,
        method: "POST",
        body: { ids, deck },
        handle401,
      });

      if (!res.ok) {
        setFriendlyError("❌ Bulk move", null, res.errorMessage);
        return;
      }

      setMessage(`✅ ${res.data?.message || "Bulk move ok"}`);
      clearSelection();
      await Promise.all([fetchLibraryCardsAll(), fetchDecks(), fetchCardsDue(), fetchStats()]);
    } catch (err) {
      setFriendlyError("❌ Bulk move", err);
    } finally {
      setBulkBusy(false);
    }
  }, [
    selectedIds,
    bulkDeck,
    setBulkBusy,
    setMessage,
    clearSelection,
    fetchLibraryCardsAll,
    fetchDecks,
    fetchCardsDue,
    fetchStats,
    handle401,
    setFriendlyError,
  ]);

  // --- bulk delete ---
  const bulkDelete = useCallback(async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    const ok = window.confirm(`${t.confirmDeleteN} (${ids.length})`);
    if (!ok) return;

    setBulkBusy(true);
    setMessage("");

    try {
      const res = await apiFetch({
        url: `${API}/api/cards/bulk-delete`,
        method: "POST",
        body: { ids },
        handle401,
      });

      if (!res.ok) {
        setFriendlyError("❌ Bulk delete", null, res.errorMessage);
        return;
      }

      setMessage(`✅ ${res.data?.message || "Bulk delete ok"}`);
      clearSelection();
      await Promise.all([fetchLibraryCardsAll(), fetchDecks(), fetchCardsDue(), fetchStats()]);
    } catch (err) {
      setFriendlyError("❌ Bulk delete", err);
    } finally {
      setBulkBusy(false);
    }
  }, [
    selectedIds,
    t.confirmDeleteN,
    setBulkBusy,
    setMessage,
    clearSelection,
    fetchLibraryCardsAll,
    fetchDecks,
    fetchCardsDue,
    fetchStats,
    handle401,
    setFriendlyError,
  ]);

  // --- deck rename ---
  const renameDeck = useCallback(async () => {
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
      const res = await apiFetch({
        url: `${API}/api/cards/decks/rename`,
        method: "PUT",
        body: { from, to },
        handle401,
      });

      if (!res.ok) {
        setFriendlyError("❌ Rename deck", null, res.errorMessage);
        return;
      }

      setMessage(`✅ ${res.data?.message || "Deck renamed"}`);
      setDeckManageTo("");

      if (deckFilter === from) setDeckFilter("ALL");

      await Promise.all([fetchDecks(), fetchLibraryCardsAll(), fetchCardsDue(), fetchStats()]);
    } catch (err) {
      setFriendlyError("❌ Rename deck", err);
    } finally {
      setDeckManageBusy(false);
    }
  }, [
    deckManageFrom,
    deckManageTo,
    t,
    deckLabel,
    deckFilter,
    setDeckFilter,
    setDeckManageBusy,
    setMessage,
    setDeckManageTo,
    fetchDecks,
    fetchLibraryCardsAll,
    fetchCardsDue,
    fetchStats,
    handle401,
    setFriendlyError,
  ]);

  // --- remove deck (move cards) ---
  const removeDeckMoveCards = useCallback(async () => {
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
      const url = `${API}/api/cards/decks/${encodeURIComponent(name)}?mode=move&to=${encodeURIComponent(to)}`;

      const res = await apiFetch({
        url,
        method: "DELETE",
        handle401,
      });

      if (!res.ok) {
        setFriendlyError("❌ Remove deck", null, res.errorMessage);
        return;
      }

      setMessage(`✅ ${res.data?.message || "Deck removed"}`);

      if (deckFilter === name) setDeckFilter("ALL");

      await Promise.all([fetchDecks(), fetchLibraryCardsAll(), fetchCardsDue(), fetchStats()]);
    } catch (err) {
      setFriendlyError("❌ Remove deck", err);
    } finally {
      setDeckManageBusy(false);
    }
  }, [
    deckManageFrom,
    deckRemoveTo,
    t,
    deckLabel,
    deckFilter,
    setDeckFilter,
    setDeckManageBusy,
    setMessage,
    fetchDecks,
    fetchLibraryCardsAll,
    fetchCardsDue,
    fetchStats,
    handle401,
    setFriendlyError,
  ]);

  // --- delete card (поки старий fetch; перенесемо на apiFetch далі) ---
  const handleDeleteCard = useCallback(
    async (id) => {
      const token = requireToken();
      if (!token) return;

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

        await Promise.all([fetchLibraryCardsAll(), fetchStats(), fetchDecks(), fetchCardsDue()]);
      } catch (err) {
        setFriendlyError("❌ Delete", err);
      }
    },
    [requireToken, handle401, setFriendlyError, fetchLibraryCardsAll, fetchStats, fetchDecks, fetchCardsDue]
  );

  // --- edit modal open ---
  const openEdit = useCallback(
    (c) => {
      setEditCard(c);
      setEditWord(c.word || "");
      setEditTranslation(c.translation || "");
      setEditExample(c.example || "");
      setEditDeck(c.deck || DEFAULT_DECK_ID);
      setEditOpen(true);
    },
    [setEditCard, setEditWord, setEditTranslation, setEditExample, setEditDeck, setEditOpen]
  );

  // --- save edit (через apiFetch) ---
  const saveEdit = useCallback(async () => {
    if (!editCard?._id) return;

    const payload = {
      word: editWord.trim(),
      translation: editTranslation.trim(),
      example: editExample.trim(),
      deck: String(editDeck || DEFAULT_DECK_ID).trim() || DEFAULT_DECK_ID,
    };

    if (!payload.word || !payload.translation) {
      setMessage("⚠️ word + translation required");
      return;
    }

    setMessage("");

    try {
      const res = await apiFetch({
        url: `${API}/api/cards/${editCard._id}`,
        method: "PUT",
        body: payload,
        handle401,
      });

      if (!res.ok) {
        setFriendlyError("❌ Update", null, res.errorMessage);
        return;
      }

      setEditOpen(false);
      setEditCard(null);

      await Promise.all([fetchLibraryCardsAll(), fetchStats(), fetchDecks(), fetchCardsDue()]);
    } catch (err) {
      setFriendlyError("❌ Update", err);
    }
  }, [
    editCard,
    editWord,
    editTranslation,
    editExample,
    editDeck,
    setMessage,
    setEditOpen,
    setEditCard,
    fetchLibraryCardsAll,
    fetchStats,
    fetchDecks,
    fetchCardsDue,
    handle401,
    setFriendlyError,
  ]);

  return {
    handleAddCard,
    reviewAnswer,
    handleExport,
    handleImport,
    bulkMove,
    bulkDelete,
    renameDeck,
    removeDeckMoveCards,
    handleDeleteCard,
    openEdit,
    saveEdit,
  };
}