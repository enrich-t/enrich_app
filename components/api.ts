'use client';

import { getToken } from './auth';

type FetchOpts = {
  json?: boolean;
  /** When true, do NOT auto-redirect to /login on 401/403 (used by the login page itself). */
  noAuthRedirect?: boolean;
};

export async function apiFetch(
  input: string,
  init: RequestInit = {},
  opts: FetchOpts = {}
): Promise<Response> {
  const { noAuthRedirect = false } = opts;

  const token = getToken();
  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string> | undefined),
  };
  if (!headers['Content-Type'] && init.body) headers['Content-Type'] = 'application/json';
  if (!headers['Accept']) headers['Accept'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(input, { ...init, headers });

  // Auto logout + redirect on expired/invalid token — unless explicitly disabled
  if (!noAuthRedirect && (res.status === 401 || res.status === 403)) {
    try {
      localStorage.removeItem('auth_token');
      // localStorage.removeItem('business_id'); // keep if you tie business to user
    } catch {}
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }

  return res;
}

export async function apiJson<T = any>(
  input: string,
  init: RequestInit = {},
  opts: FetchOpts = {}
): Promise<{ ok: boolean; data?: T; raw: Response; text?: string }> {
  const res = await apiFetch(input, init, opts);
  const text = await res.text();
  if (!res.ok) return { ok: false, raw: res, text };
  try {
    const data = JSON.parse(text) as T;
    return { ok: true, data, raw: res };
  } catch {
    return { ok: true, raw: res, text };
  }
}
