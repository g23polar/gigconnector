import { setRole } from "./auth";

const DEFAULT_API_URL = "http://localhost:8000";
const rawApiUrl = import.meta.env.VITE_API_URL;
export const API_URL = rawApiUrl
  ? /^(https?:)?\/\//.test(rawApiUrl)
    ? rawApiUrl
    : `https://${rawApiUrl}`
  : DEFAULT_API_URL;

type HttpMethod = "GET" | "POST" | "DELETE" | "PATCH";

type AuthResponse = { access_token: string; role: "artist" | "venue" | "admin" };

async function apiFetch<T>(
  path: string,
  opts?: { method?: HttpMethod; body?: unknown; headers?: Record<string, string> }
): Promise<T> {
  const method = opts?.method ?? "GET";

  const headers: Record<string, string> = {
    ...(opts?.headers ?? {}),
  };

  if (opts?.body !== undefined) headers["Content-Type"] = "application/json";

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    credentials: "include",
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
  const resp = await apiFetch<AuthResponse>(`/auth/register`, {
    method: "POST",
    body: { email, password, role },
  });
  setRole(resp.role);
  return resp;
}

/**
 * Supports both:
 * - POST /auth/login-json  (JSON body)
 * - POST /auth/login       (x-www-form-urlencoded OAuth2)
 */
export async function login(email: string, password: string) {
  // Try JSON login first. If 404, fallback to OAuth2 form.
  try {
    const resp = await apiFetch<AuthResponse>(`/auth/login-json`, {
      method: "POST",
      body: { email, password },
    });
    setRole(resp.role);
    return resp;
  } catch (e: any) {
    // fallback to form login
    const res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      credentials: "include",
      body: new URLSearchParams({ username: email, password }).toString(),
    });

    const text = await res.text();
    const data = text ? JSON.parse(text) : null;

    if (!res.ok) throw new Error(data?.detail ?? `Login failed: ${res.status}`);

    const resp = data as AuthResponse;
    setRole(resp.role);
    return resp;
  }
}

export async function loginWithGoogle(idToken: string, role?: "artist" | "venue" | "admin") {
  const resp = await apiFetch<AuthResponse>(`/auth/google`, {
    method: "POST",
    body: { id_token: idToken, role },
  });
  setRole(resp.role);
  return resp;
}

export async function health() {
  return apiFetch<{ ok: boolean }>(`/health`);
}

export async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const msg = data?.detail ?? `Request failed: ${res.status}`;
    throw new Error(msg);
  }

  return data as T;
}

export { apiFetch };
