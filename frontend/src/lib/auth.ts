const ROLE_KEY = "gc_role";

const _rawApiUrl = import.meta.env.VITE_API_URL;
const _apiUrl = _rawApiUrl
  ? /^(https?:)?\/\//.test(_rawApiUrl)
    ? _rawApiUrl
    : `https://${_rawApiUrl}`
  : "http://localhost:8000";

export function getRole(): "artist" | "venue" | "admin" | null {
  const role = localStorage.getItem(ROLE_KEY);
  if (role === "artist" || role === "venue" || role === "admin") return role;
  return null;
}

export function setRole(role: "artist" | "venue" | "admin") {
  localStorage.setItem(ROLE_KEY, role);
}

export function clearAuth() {
  localStorage.removeItem(ROLE_KEY);
  // keepalive ensures the request completes even during page navigation
  fetch(`${_apiUrl}/auth/logout`, {
    method: "POST",
    credentials: "include",
    keepalive: true,
  }).catch(() => {});
}

export function isAuthed(): boolean {
  return !!getRole();
}

/** @deprecated Use clearAuth() instead */
export function clearToken() {
  clearAuth();
}
