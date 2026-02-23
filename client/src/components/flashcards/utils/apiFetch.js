import { getToken } from "./auth.js";
import { withTimeout } from "./http.js";

/**
 * apiFetch - unified fetch helper for this project.
 *
 * - adds Authorization header
 * - supports JSON body
 * - uses timeout
 * - calls handle401 on 401
 * - parses JSON when possible
 *
 * Returns: { ok, status, data, errorMessage }
 */
export async function apiFetch({
  url,
  method = "GET",
  body = undefined,
  headers = {},
  timeoutMs = undefined,
  handle401,
}) {
  const token = getToken();
  if (!token) {
    handle401?.();
    return { ok: false, status: 401, data: null, errorMessage: "No token" };
  }

  const isJsonBody = body !== undefined && typeof body !== "string";
  const finalHeaders = {
    Authorization: `Bearer ${token}`,
    "Cache-Control": "no-cache",
    ...headers,
  };

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
      handle401?.();
      return { ok: false, status: 401, data: null, errorMessage: "Unauthorized" };
    }

    // try parse json, but not mandatory
    let data = null;
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      data = await res.json().catch(() => null);
    } else {
      // for blobs etc.
      data = null;
    }

    const errorMessage = data?.message || data?.error || (!res.ok ? `HTTP ${res.status}` : "");
    return { ok: res.ok, status: res.status, data, errorMessage };
  } finally {
    cleanup();
  }
}