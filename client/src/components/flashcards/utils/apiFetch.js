// src/components/flashcards/utils/apiFetch.js

import { getToken } from "./auth.js";
import { withTimeout } from "./http.js";

/**
 * apiFetch - unified fetch helper for this project.
 *
 * - optionally adds Authorization header (auth=true)
 * - supports JSON body (object -> JSON.stringify)
 * - uses timeout
 * - calls handle401 on 401 (if provided)
 * - can parse json/text/blob
 *
 * Returns:
 *   default: { ok, status, data, errorMessage }
 *   raw:     { ok, status, response, errorMessage }
 */
export async function apiFetch({
  url,
  method = "GET",
  body = undefined,
  headers = {},
  timeoutMs = undefined,
  handle401,

  // If false: no token required, no Authorization header
  auth = true,

  // raw=true returns Response as "response"
  raw = false,

  // force response parsing: "json" | "text" | "blob"
  expect = undefined,
}) {
  const finalHeaders = {
    "Cache-Control": "no-cache",
    ...headers,
  };

  if (auth) {
    const token = getToken();
    if (!token) {
      handle401?.();
      return raw
        ? { ok: false, status: 401, response: null, errorMessage: "No token" }
        : { ok: false, status: 401, data: null, errorMessage: "No token" };
    }
    finalHeaders.Authorization = `Bearer ${token}`;
  }

  const isJsonBody = body !== undefined && typeof body !== "string" && !(body instanceof FormData);

  // Only set JSON content-type if body is a plain object (not string, not FormData)
  if (body !== undefined && isJsonBody && !finalHeaders["Content-Type"]) {
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
      handle401?.();
      return raw
        ? { ok: false, status: 401, response: res, errorMessage: "Unauthorized" }
        : { ok: false, status: 401, data: null, errorMessage: "Unauthorized" };
    }

    // RAW mode: caller reads res.blob()/res.json()/etc
    if (raw) {
      let errorMessage = !res.ok ? `HTTP ${res.status}` : "";
      if (!res.ok) {
        const ct = res.headers.get("content-type") || "";
        if (ct.includes("application/json")) {
          const j = await res.json().catch(() => null);
          errorMessage = j?.message || j?.error || errorMessage;
        }
      }
      return { ok: res.ok, status: res.status, response: res, errorMessage };
    }

    // Non-raw: parse according to expect or content-type heuristics
    let data = null;

    if (expect === "blob") {
      data = await res.blob().catch(() => null);
    } else if (expect === "text") {
      data = await res.text().catch(() => null);
    } else if (expect === "json") {
      data = await res.json().catch(() => null);
    } else {
      // auto
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