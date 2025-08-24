'use client';

export const TOKEN_KEY = 'auth_token';
export const BUSINESS_ID_KEY = 'business_id';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(TOKEN_KEY, token);
}
export function clearAuth() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(TOKEN_KEY);
  // keep business id if you want, or clear it too:
  // window.localStorage.removeItem(BUSINESS_ID_KEY);
}
export function setBusinessId(bizId: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(BUSINESS_ID_KEY, bizId);
}
export function getBusinessId(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(BUSINESS_ID_KEY);
}

export function authHeaders(): HeadersInit {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function safeJson<T = any>(res: Response): Promise<T> {
  const txt = await res.text();
  try {
    return JSON.parse(txt);
  } catch {
    // @ts-expect-error – returning string when not json
    return txt;
  }
}

/** Try common response shapes for token + business id */
export function extractToken(anyRes: any): string | null {
  return (
    anyRes?.access_token ||
    anyRes?.token ||
    anyRes?.data?.access_token ||
    anyRes?.data?.token ||
    null
  );
}
export function extractBusinessId(anyRes: any): string | null {
  return (
    anyRes?.business_id ||
    anyRes?.data?.business_id ||
    anyRes?.profile?.business_id ||
    null
  );
}
