import { getToken, setToken, setRole } from "./auth";

const DEFAULT_API_URL = "http://localhost:8000";
const rawApiUrl = import.meta.env.VITE_API_URL;
export const API_URL = rawApiUrl
  ? /^(https?:)?\/\//.test(rawApiUrl)
    ? rawApiUrl
    : `https://${rawApiUrl}`
  : DEFAULT_API_URL;

type HttpMethod = "GET" | "POST" | "DELETE" | "PATCH";

async function apiFetch<T>(
  path: string,
  opts?: { method?: HttpMethod; body?: unknown; auth?: boolean; headers?: Record<string, string> }
): Promise<T> {
  const method = opts?.method ?? "GET";
  const auth = opts?.auth ?? true;

  const headers: Record<string, string> = {
    ...(opts?.headers ?? {}),
  };

  if (opts?.body !== undefined) headers["Content-Type"] = "application/json";

  if (auth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: opts?.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const msg = data?.detail ?? `Request failed: ${res.status}`;
    throw new Error(msg);
  }

  return data as T;
}

export async function register(email: string, password: string, role: "artist" | "venue" | "admin") {
  const resp = await apiFetch<{ access_token: string }>(`/auth/register`, {
    method: "POST",
    auth: false,
    body: { email, password, role },
  });
  setToken(resp.access_token);
  setRole(role);
  return resp;
}

/**
 * Supports both:
 * - POST /auth/login-json  (JSON body)
 * - POST /auth/login       (x-www-form-urlencoded OAuth2)
 */
export async function login(email: string, password: string) {
  // Try JSON login first (if you added it). If 404, fallback to OAuth2 form.
  try {
    const resp = await apiFetch<{ access_token: string }>(`/auth/login-json`, {
      method: "POST",
      auth: false,
      body: { email, password },
    });
    setToken(resp.access_token);

    // Fetch user role after login
    try {
      const me = await apiFetch<{ role: "artist" | "venue" }>(`/users/me`);
      setRole(me.role);
    } catch {
      // If /users/me fails, role won't be set - that's ok
    }

    return resp;
  } catch (e: any) {
    // fallback to form login
    const res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ username: email, password }).toString(),
    });

    const text = await res.text();
    const data = text ? JSON.parse(text) : null;

    if (!res.ok) throw new Error(data?.detail ?? `Login failed: ${res.status}`);

    setToken(data.access_token);

    // Fetch user role after login
    try {
      const me = await apiFetch<{ role: "artist" | "venue" }>(`/users/me`);
      setRole(me.role);
    } catch {
      // If /users/me fails, role won't be set - that's ok
    }

    return data as { access_token: string };
  }
}

export async function loginWithGoogle(idToken: string, role?: "artist" | "venue" | "admin") {
  const resp = await apiFetch<{ access_token: string }>(`/auth/google`, {
    method: "POST",
    auth: false,
    body: { id_token: idToken, role },
  });
  setToken(resp.access_token);

  try {
    const me = await apiFetch<{ role: "artist" | "venue" }>(`/users/me`);
    setRole(me.role);
  } catch {
    // If /users/me fails, role won't be set - that's ok
  }

  return resp;
}

export async function health() {
  return apiFetch<{ ok: boolean }>(`/health`, { auth: false });
}

export { apiFetch };
