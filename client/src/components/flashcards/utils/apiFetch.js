import { getToken } from "./auth.js";
import { withTimeout } from "./http.js";

export async function apiFetch({
  url,
  method = "GET",
  body = undefined,
  headers = {},
  timeoutMs = undefined,
  handle401,
  auth = true,
  expect = undefined,
}) {
  const token = getToken();

  if (auth && !token) {
    handle401?.();
    return { ok: false, status: 401, data: null, errorMessage: "No token" };
  }

  const hasBody = body !== undefined && body !== null;
  const isJsonBody =
    hasBody && typeof body !== "string" && !(body instanceof FormData);

  const finalHeaders = {
    "Cache-Control": "no-cache",
    ...headers,
  };

  if (auth && token) {
    finalHeaders.Authorization = `Bearer ${token}`;
  }

  if (isJsonBody) {
    finalHeaders["Content-Type"] = "application/json";
  }

  const { signal, cleanup } = withTimeout(null, timeoutMs);

  try {
    const res = await fetch(url, {
      method,
      headers: finalHeaders,
      body: !hasBody ? undefined : isJsonBody ? JSON.stringify(body) : body,
      cache: "no-store",
      signal,
    });

    const ct = res.headers.get("content-type") || "";
    const isJson = ct.includes("application/json");

    if (res.status === 401 && auth) {
      handle401?.();
    }

    let data = null;

    if (expect === "blob") {
      if (!res.ok && isJson) data = await res.json().catch(() => null);
      else data = await res.blob().catch(() => null);
    } else if (expect === "text") {
      data = await res.text().catch(() => null);
    } else if (expect === "json") {
      data = await res.json().catch(() => null);
    } else {
      if (isJson) data = await res.json().catch(() => null);
      else data = await res.text().catch(() => null);
    }

    const errorMessage =
      (data && typeof data === "object" ? data?.message || data?.error : "") ||
      (!res.ok ? `HTTP ${res.status}` : "");

    return { ok: res.ok, status: res.status, data, errorMessage };
  } finally {
    cleanup();
  }
}