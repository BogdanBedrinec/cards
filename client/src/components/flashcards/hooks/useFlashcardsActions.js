// src/components/flashcards/hooks/useFlashcardsActions.js

import { useCallback } from "react";
import { API, DEFAULT_DECK_ID } from "../utils/constants.js";
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

  // UI notice + auth
  setNotice, // ✅ NOTICE
  handle401,
  setFriendlyError,

  // data refresh functions
  refreshAll,
  fetchDecks,
  fetchStats,
  fetchCardsDue,
  fetchLibraryCardsAll,
}) {
  const clearNotice = useCallback(() => setNotice?.(null), [setNotice]);
  const info = useCallback((text) => setNotice?.({ type: "info", text }), [setNotice]);
  const success = useCallback((text) => setNotice?.({ type: "success", text }), [setNotice]);

  // --- add card ---
  const handleAddCard = useCallback(
    async (e) => {
      e.preventDefault();
      clearNotice();

      if (!word.trim() || !translation.trim()) {
        info("⚠️ Please fill at least word and translation");
        return;
      }

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

        setWord("");
        setTranslation("");
        setExample("");

        success("✅ Added!");
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
      clearNotice,
      info,
      success,
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

  // --- review ---
  const sendReview = useCallback(
    async (id, known) => {
      try {
        const res = await apiFetch({
          url: `${API}/api/cards/${id}/review`,
          method: "PUT",
          body: { known },
          handle401,
        });

        if (!res.ok) {
          setFriendlyError("❌ Review", null, res.errorMessage);
          return false;
        }

        return true;
      } catch (err) {
        setFriendlyError("❌ Review", err);
        return false;
      }
    },
    [handle401, setFriendlyError]
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
      try {
        const res = await apiFetch({
          url: `${API}/api/cards/export?format=${format}`,
          method: "GET",
          expect: "blob",
          handle401,
        });

        if (!res.ok) {
          setFriendlyError("❌ Export", null, res.errorMessage);
          return;
        }

        const blob = res.data;
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
    [handle401, setFriendlyError]
  );

  // --- import ---
  const handleImport = useCallback(async () => {
    if (!importText.trim()) {
      info("⚠️ Paste data for import");
      return;
    }

    try {
      let dataPayload;
      if (importFormat === "csv") dataPayload = importText;
      else dataPayload = JSON.parse(importText);

      const res = await apiFetch({
        url: `${API}/api/cards/import`,
        method: "POST",
        body: { format: importFormat, data: dataPayload },
        handle401,
      });

      if (!res.ok) {
        setFriendlyError("❌ Import", null, res.errorMessage);
        return;
      }

      const data = res.data || {};
      success(
        `✅ ${data.message || "Imported"} | received=${data.received}, inserted=${data.inserted}, skipped=${data.skippedAsDuplicates}`
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
    importText,
    importFormat,
    info,
    success,
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
    clearNotice();

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

      success(`✅ ${res.data?.message || "Bulk move ok"}`);
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
    clearNotice,
    success,
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
    clearNotice();

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

      success(`✅ ${res.data?.message || "Bulk delete ok"}`);
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
    clearNotice,
    success,
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
      info(t.cannotRenameDefault);
      return;
    }

    const ok = window.confirm(t.confirmRename(deckLabel(from), to));
    if (!ok) return;

    setDeckManageBusy(true);
    clearNotice();

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

      success(`✅ ${res.data?.message || "Deck renamed"}`);
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
    clearNotice,
    info,
    success,
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
      info(t.cannotDeleteDefault);
      return;
    }

    const ok = window.confirm(t.confirmRemove(deckLabel(name), deckLabel(to)));
    if (!ok) return;

    setDeckManageBusy(true);
    clearNotice();

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

      success(`✅ ${res.data?.message || "Deck removed"}`);

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
    clearNotice,
    info,
    success,
    fetchDecks,
    fetchLibraryCardsAll,
    fetchCardsDue,
    fetchStats,
    handle401,
    setFriendlyError,
  ]);

  // --- delete card ---
  const handleDeleteCard = useCallback(
    async (id) => {
      const ok = window.confirm("Delete this card?");
      if (!ok) return;

      clearNotice();

      try {
        const res = await apiFetch({
          url: `${API}/api/cards/${id}`,
          method: "DELETE",
          handle401,
        });

        if (!res.ok) {
          setFriendlyError("❌ Delete", null, res.errorMessage);
          return;
        }

        await Promise.all([fetchLibraryCardsAll(), fetchStats(), fetchDecks(), fetchCardsDue()]);
        success("✅ Deleted");
      } catch (err) {
        setFriendlyError("❌ Delete", err);
      }
    },
    [
      clearNotice,
      fetchLibraryCardsAll,
      fetchStats,
      fetchDecks,
      fetchCardsDue,
      handle401,
      setFriendlyError,
      success,
    ]
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

  // --- save edit ---
  const saveEdit = useCallback(async () => {
    if (!editCard?._id) return;

    const payload = {
      word: editWord.trim(),
      translation: editTranslation.trim(),
      example: editExample.trim(),
      deck: String(editDeck || DEFAULT_DECK_ID).trim() || DEFAULT_DECK_ID,
    };

    if (!payload.word || !payload.translation) {
      info("⚠️ word + translation required");
      return;
    }

    clearNotice();

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
      success("✅ Updated");
    } catch (err) {
      setFriendlyError("❌ Update", err);
    }
  }, [
    editCard,
    editWord,
    editTranslation,
    editExample,
    editDeck,
    clearNotice,
    info,
    success,
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