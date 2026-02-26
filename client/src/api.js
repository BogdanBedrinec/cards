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
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

// 1 retry on AbortError/network error (Render cold start)
async function fetchWithRetry(url, options = {}, timeoutMs = 20000) {
  try {
    return await fetchWithTimeout(url, options, timeoutMs);
  } catch (e) {
    await sleep(1500);
    return await fetchWithTimeout(url, options, timeoutMs);
  }
}

// --- API ---
export async function healthCheck() {
  const res = await fetchWithRetry(`${BASE_URL}/api/health`, {}, 12000);
  // health може бути text або json — не принципово
  if (!res.ok) throw new Error(`Health check failed (${res.status})`);
  return res;
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

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.message || data?.error || "Login failed");
  }
  return data; // { token, userId, interfaceLang, nativeLang, learningLang }
}

export async function register({ email, password, interfaceLang, nativeLang, learningLang }) {
  const res = await fetchWithRetry(
    `${BASE_URL}/api/auth/register`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, interfaceLang, nativeLang, learningLang }),
    },
    20000
  );

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.message || data?.error || "Register failed");
  }
  return data;
}