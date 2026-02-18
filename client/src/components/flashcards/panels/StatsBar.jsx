import React from "react";

export default function StatsBar({ stats, t }) {
  if (!stats) return null;

  const acc = Math.min(100, Math.max(0, Number(stats.accuracy) || 0));

  return (
    <div className="stats">
      <div>
        <b>{t.total}:</b> {stats.totalCards}
      </div>
      <div>
        <b>{t.dueNow}:</b> {stats.dueNow}
      </div>
      <div>
        <b>{t.accuracy}:</b> {acc}%
      </div>
      <div>
        <b>{t.learned}:</b> {stats.learned ?? 0}
      </div>
      <div>
        <b>{t.remaining}:</b> {stats.remaining ?? 0}
      </div>
    </div>
  );
}
