// client/src/api.js
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// --- helpers ---
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 20000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return res;
  } finally {
    clearTimeout(id);
  }
}

// 1 retry if timeout / network error (good for Render cold start)
async function fetchWithRetry(url, options = {}, timeoutMs = 20000) {
  try {
    return await fetchWithTimeout(url, options, timeoutMs);
  } catch (e) {
    // AbortError / network error => wait a bit and retry once
    await sleep(1500);
    return await fetchWithTimeout(url, options, timeoutMs);
  }
}

// --- API ---
export async function healthCheck() {
  const res = await fetchWithRetry(`${BASE_URL}/api/health`, {}, 12000);
  if (!res.ok) throw new Error("Health check failed");
  return res.json();
}

export async function login(email, password) {
  const res = await fetchWithRetry(
    `${BASE_URL}/api/auth/login`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    },
    20000
  );

  // якщо сервер відповів, але з помилкою
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.message || "Login failed");
  }
  return data; // очікую: { token, userId, ... }
}

export async function register(email, password) {
  const res = await fetchWithRetry(
    `${BASE_URL}/api/auth/register`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    },
    20000
  );

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || "Register failed");
  return data;
}
