'use client';

import { getToken } from './auth';

export async function apiFetch(
  input: string,
  init: RequestInit = {},
  { json = false }: { json?: boolean } = {}
): Promise<Response> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string> | undefined),
  };
  if (!headers['Content-Type'] && init.body) headers['Content-Type'] = 'application/json';
  if (!headers['Accept']) headers['Accept'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(input, { ...init, headers });

  // Auto logout + redirect on expired/invalid token
  if (res.status === 401 || res.status === 403) {
    try {
      // Clear auth locally
      localStorage.removeItem('auth_token');
      // Optional: clear any cached business id if it’s tied to the user
      // localStorage.removeItem('business_id');
    } catch {}
    // If this was called from a client component, send to login
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }

  if (json) return res; // caller will .json() or .text()
  return res;
}

export async function apiJson<T = any>(
  input: string,
  init: RequestInit = {}
): Promise<{ ok: boolean; data?: T; raw: Response; text?: string }> {
  const res = await apiFetch(input, init, { json: true });
  const text = await res.text();
  if (!res.ok) {
    return { ok: false, raw: res, text };
  }
  try {
    const data = JSON.parse(text) as T;
    return { ok: true, data, raw: res };
  } catch {
    return { ok: true, raw: res, text };
  }
}
