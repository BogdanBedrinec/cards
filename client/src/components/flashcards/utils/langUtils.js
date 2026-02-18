function normalizeLang(code, fallback = "de") {
  const allowed = new Set(["de", "en", "uk"]);
  return allowed.has(code) ? code : fallback;
}

function langLabel(code) {
    if (code === "de") return "DE";
    if (code === "en") return "EN";
    return "UK";
  }