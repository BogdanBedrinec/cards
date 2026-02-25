import React, { useEffect } from "react";

export default function TopBanner({
  t,
  loading,
  notice,          // { type: "error"|"success"|"info", text: string } | null
  onClose,
  onRetry,
}) {
  // авто-закриття success/info (error хай висить)
  useEffect(() => {
    if (!notice) return;
    if (notice.type === "error") return;

    const id = setTimeout(() => onClose?.(), 2500);
    return () => clearTimeout(id);
  }, [notice, onClose]);

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
        {notice && (
          <button type="button" className="banner-btn" onClick={onClose}>
            ✕
          </button>
        )}

        {onRetry && (
          <button type="button" className="banner-btn" onClick={onRetry} disabled={loading}>
            {t.retry}
          </button>
        )}
      </div>
    </div>
  );
}