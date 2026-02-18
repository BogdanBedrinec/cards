function formatTimeUntil(dateStr) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;

  const diffMs = d.getTime() - Date.now();
  const diffMin = Math.ceil(diffMs / 60000);

  if (diffMin <= 0) return null;

  // < 1 години → хвилини
  if (diffMin < 60) {
    return `${t.timeIn} ${diffMin} ${t.timeMin}`;
  }

  const diffHours = diffMin / 60;

  // < 1 дня → години
  if (diffHours < 24) {
    return `${t.timeIn} ${Math.ceil(diffHours)} ${t.timeHour}`;
  }

  // ≥ 1 дня → дні
  const diffDays = diffHours / 24;
  return `${t.timeIn} ${Math.ceil(diffDays)} ${t.timeDay}`;
}