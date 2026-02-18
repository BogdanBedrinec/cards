function getToken() {
  const t = localStorage.getItem("token");
  if (!t || t === "undefined" || t === "null") return null;
  return t;
}

function withTimeout(signal, ms = REQ_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);

  const onAbort = () => controller.abort();
  if (signal) signal.addEventListener("abort", onAbort);

  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timer);
      if (signal) signal.removeEventListener("abort", onAbort);
    },
  };
}

function humanFetchError(err) {
  if (!err) return "Unknown error";
  if (err.name === "AbortError") return "Request timed out";
  if (err instanceof TypeError) return "Network error (server not reachable)";
  return "Unexpected error";
}