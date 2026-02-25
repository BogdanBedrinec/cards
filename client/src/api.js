// client/src/api.js
import { apiFetch } from "./components/flashcards/utils/apiFetch.js";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// API wrappers (public endpoints => auth:false)
export async function healthCheck() {
  const res = await apiFetch({
    url: `${BASE_URL}/api/health`,
    method: "GET",
    auth: false,
    expect: "json",
    timeoutMs: 12000,
  });

  if (!res.ok) throw new Error(res.errorMessage || "Health check failed");
  return res.data;
}

export async function login(email, password) {
  const res = await apiFetch({
    url: `${BASE_URL}/api/auth/login`,
    method: "POST",
    auth: false,
    body: { email, password },
    expect: "json",
    timeoutMs: 20000,
  });

  if (!res.ok) throw new Error(res.errorMessage || "Login failed");
  return res.data; // { token, userId, ... }
}

export async function register(email, password, extra = {}) {
  const res = await apiFetch({
    url: `${BASE_URL}/api/auth/register`,
    method: "POST",
    auth: false,
    body: { email, password, ...extra },
    expect: "json",
    timeoutMs: 20000,
  });

  if (!res.ok) throw new Error(res.errorMessage || "Register failed");
  return res.data;
}