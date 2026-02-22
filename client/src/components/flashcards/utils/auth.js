export function getToken() {
  const t = localStorage.getItem("token");
  if (!t || t === "undefined" || t === "null") return null;
  return t;
}

export function clearAuth() {
  localStorage.removeItem("token");
  localStorage.removeItem("userId");
}