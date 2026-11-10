/** Same-origin API calls with a timeout, typed errors, and no throwing on bad JSON. */

export interface ApiError {
  code: string;
  message: string;
}

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiError };

const OFFLINE: ApiError = {
  code: "offline",
  message: "We couldn't reach the server. Check your connection and try again.",
};

export async function api<T>(path: string, init: RequestInit = {}, timeoutMs = 10_000): Promise<ApiResult<T>> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const headers = new Headers(init.headers);
    if (init.body) headers.set("content-type", "application/json");
    const res = await fetch(`/api/v1${path}`, { ...init, credentials: "same-origin", signal: ctrl.signal, headers });
    const body = (await res.json().catch(() => null)) as unknown;
    if (res.ok) return { ok: true, data: body as T };
    const err = (body as { error?: ApiError } | null)?.error;
    return { ok: false, error: err ?? { code: "http_error", message: "Something went wrong on our side. Try again in a moment." } };
  } catch {
    return { ok: false, error: OFFLINE };
  } finally {
    clearTimeout(timer);
  }
}
