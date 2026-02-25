// src/components/flashcards/utils/apiFetch.js
import { getToken } from "./auth.js";
import { withTimeout } from "./http.js";

/**
 * apiFetch - unified fetch helper.
 *
 * Supports:
 * - auth=true/false (default true)
 * - JSON body auto stringify
 * - timeout
 * - handle401 on 401
 * - expect: "json" | "text" | "blob" | undefined (auto)
 *
 * Returns (non-raw):
 *   { ok, status, data, errorMessage }
 */
export async function apiFetch({
  url,
  method = "GET",
  body = undefined,
  headers = {},
  timeoutMs = undefined,
  handle401,

  // NEW: allow calls without token (login/register/health)
  auth = true,

  // force response parsing
  // "json" | "text" | "blob"
  expect = undefined,
}) {
  const token = getToken();

  if (auth && !token) {
    handle401?.();
    return { ok: false, status: 401, data: null, errorMessage: "No token" };
  }

  const isJsonBody =
    body !== undefined && typeof body !== "string" && !(body instanceof FormData);

  const finalHeaders = {
    "Cache-Control": "no-cache",
    ...headers,
  };

  if (auth && token) {
    finalHeaders.Authorization = `Bearer ${token}`;
  }

  if (body !== undefined && isJsonBody) {
    finalHeaders["Content-Type"] = "application/json";
  }

  const { signal, cleanup } = withTimeout(null, timeoutMs);

  try {
    const res = await fetch(url, {
      method,
      headers: finalHeaders,
      body: body === undefined ? undefined : isJsonBody ? JSON.stringify(body) : body,
      cache: "no-store",
      signal,
    });

    if (res.status === 401) {
      if (auth) handle401?.();
      return { ok: false, status: 401, data: null, errorMessage: "Unauthorized" };
    }

    let data = null;

    if (expect === "blob") data = await res.blob().catch(() => null);
    else if (expect === "text") data = await res.text().catch(() => null);
    else if (expect === "json") data = await res.json().catch(() => null);
    else {
      const ct = res.headers.get("content-type") || "";
      if (ct.includes("application/json")) data = await res.json().catch(() => null);
      else data = null;
    }

    const errorMessage =
      (data && typeof data === "object" ? data?.message || data?.error : "") ||
      (!res.ok ? `HTTP ${res.status}` : "");

    return { ok: res.ok, status: res.status, data, errorMessage };
  } finally {
    cleanup();
  }
}