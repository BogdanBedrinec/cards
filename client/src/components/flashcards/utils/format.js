export function normalizeLang(code, fallback = "en") {
  const allowed = new Set(["de", "en", "uk"]);
  return allowed.has(code) ? code : fallback;
}

export function langLabel(code) {
  if (code === "de") return "DE";
  if (code === "en") return "EN";
  return "UK";
}

export function formatTimeUntil(t, dateStr) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;

  const diffMs = d.getTime() - Date.now();
  const diffMin = Math.ceil(diffMs / 60000);
  if (diffMin <= 0) return null;

  if (diffMin < 60) return `${t.timeIn} ${diffMin} ${t.timeMin}`;

  const diffHours = diffMin / 60;
  if (diffHours < 24) return `${t.timeIn} ${Math.ceil(diffHours)} ${t.timeHour}`;

  const diffDays = diffHours / 24;
  return `${t.timeIn} ${Math.ceil(diffDays)} ${t.timeDay}`;
}