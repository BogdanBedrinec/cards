import React, { useEffect } from "react";

export default function TopBanner({
  t,
  loading,
  notice, // { type: "error"|"success"|"info", text: string } | null
  onClose,
  onRetry,
}) {
  const canClose = typeof onClose === "function";
  const canRetry = typeof onRetry === "function";

  // auto-close success/info (error stays)
  useEffect(() => {
    if (!notice) return;
    if (notice.type === "error") return;
    if (!canClose) return;

    const id = setTimeout(() => onClose(), 2500);
    return () => clearTimeout(id);
  }, [notice, canClose, onClose]);

  if (!loading && !notice) return null;

  const typeClass = notice?.type ? `is-${notice.type}` : "";

  return (
    <div className={`top-banner ${loading ? "is-loading" : ""} ${typeClass}`}>
      <div className="top-banner-left">
        {loading && <span className="spinner" aria-hidden="true" />}
        <span>
          {loading ? t.loading : ""}
          {loading && notice ? " — " : ""}
          {notice ? notice.text : ""}
        </span>
      </div>

      <div className="top-banner-right">
        {notice && canClose && (
          <button type="button" className="banner-btn" onClick={onClose}>
            ✕
          </button>
        )}

        {canRetry && (
          <button type="button" className="banner-btn" onClick={onRetry} disabled={loading}>
            {t.retry}
          </button>
        )}
      </div>
    </div>
  );
}