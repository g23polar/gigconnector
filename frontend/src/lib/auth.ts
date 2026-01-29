const TOKEN_KEY = "gc_token";
const ROLE_KEY = "gc_role";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getRole(): "artist" | "venue" | "admin" | null {
  const role = localStorage.getItem(ROLE_KEY);
  if (role === "artist" || role === "venue" || role === "admin") return role;
  return null;
}

export function setRole(role: "artist" | "venue" | "admin") {
  localStorage.setItem(ROLE_KEY, role);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ROLE_KEY);
}

export function isAuthed(): boolean {
  return !!getToken();
}
