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
  expect = undefined, // "json" | "text" | "blob"
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

  // ставимо Content-Type тільки коли реально відправляємо JSON-об'єкт
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

    // пробуємо витягнути корисну помилку, навіть при 401/400
    const ct = res.headers.get("content-type") || "";
    const isJson = ct.includes("application/json");

    // 401: якщо auth=true — викликаємо handle401, але все одно спробуємо розпарсити
    if (res.status === 401 && auth) {
      handle401?.();
    }

    let data = null;

    if (expect === "blob") {
      // якщо сервер повернув json з помилкою — краще зчитати json
      if (!res.ok && isJson) data = await res.json().catch(() => null);
      else data = await res.blob().catch(() => null);
    } else if (expect === "text") {
      data = await res.text().catch(() => null);
    } else if (expect === "json") {
      data = await res.json().catch(() => null);
    } else {
      // auto
      if (isJson) data = await res.json().catch(() => null);
      else data = await res.text().catch(() => null); // корисно для plain-text помилок
    }

    const errorMessage =
      (data && typeof data === "object" ? data?.message || data?.error : "") ||
      (!res.ok ? `HTTP ${res.status}` : "");

    return { ok: res.ok, status: res.status, data, errorMessage };
  } finally {
    cleanup();
  }
}