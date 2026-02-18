async function wakeBackend() {
  try {
    const { signal, cleanup } = withTimeout(null, 12000);
    await fetch(`${API}/api/health`, { cache: "no-store", signal }).finally(cleanup);
  } catch {
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

function setFriendlyError(prefix, err, serverMsg) {
    const human = humanFetchError(err);
    const hint = human.includes("Network error") ? ` — ${t.offlineHint}` : "";
    setMessage(`${prefix}: ${serverMsg || human}${hint}`);
}