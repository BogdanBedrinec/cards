import { useEffect } from "react";

export function useReviewShortcuts({
  view,
  showAnswer,
  setShowAnswer,
  cardsLength,
  setReviewIndex,
  reviewAnswer,
  showImportExport,
  setShowImportExport,
  editOpen,
  setEditOpen,
  isReviewing,
}) {
  useEffect(() => {
    function onKeyDown(e) {
      const tag = (e.target?.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;

      // Close overlays
      if (e.key === "Escape") {
        if (showImportExport) setShowImportExport(false);
        if (editOpen) setEditOpen(false);
        return;
      }

      // Only in review
      if (view !== "review") return;

      // Show answer
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        if (!showAnswer) setShowAnswer(true);
        return;
      }

      // Answer
      if (e.key === "1") {
        e.preventDefault();
        if (!isReviewing) reviewAnswer(true);
        return;
      }
      if (e.key === "2") {
        e.preventDefault();
        if (!isReviewing) reviewAnswer(false);
        return;
      }

      // Navigate
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setReviewIndex((i) => Math.max(0, i - 1));
        setShowAnswer(false);
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        setReviewIndex((i) => Math.min(cardsLength - 1, i + 1));
        setShowAnswer(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    view,
    showAnswer,
    setShowAnswer,
    cardsLength,
    setReviewIndex,
    reviewAnswer,
    showImportExport,
    setShowImportExport,
    editOpen,
    setEditOpen,
    isReviewing,
  ]);
}