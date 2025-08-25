'use client';

export const TOKEN_KEY = 'auth_token';
export const BUSINESS_ID_KEY = 'business_id';

function toStr(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === 'string') return v;
  try {
    // Avoid serializing giant objects into headers—just bail
    const s = String(v);
    return s;
  } catch {
    return null;
  }
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(TOKEN_KEY);
  return toStr(raw);
}

export function setToken(token: unknown) {
  if (typeof window === 'undefined') return;
  const s = toStr(token);
  if (!s) {
    console.warn('[auth] setToken called with non-string token:', token);
    return;
  }
  window.localStorage.setItem(TOKEN_KEY, s);
}

export function clearAuth() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(TOKEN_KEY);
  // window.localStorage.removeItem(BUSINESS_ID_KEY); // keep if you want
}

export function setBusinessId(bizId: unknown) {
  if (typeof window === 'undefined') return;
  const s = toStr(bizId);
  if (!s) {
    console.warn('[auth] setBusinessId called with non-string bizId:', bizId);
    return;
  }
  window.localStorage.setItem(BUSINESS_ID_KEY, s);
}

export function getBusinessId(): string | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(BUSINESS_ID_KEY);
  return toStr(raw);
}

export function authHeaders(): HeadersInit {
  const token = getToken();
  if (typeof token === 'string' && token.trim().length > 0) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
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

/** Safely extract a string token from common response shapes */
export function extractToken(anyRes: any): string | null {
  const candidates = [
    anyRes?.access_token,
    anyRes?.token,
    anyRes?.data?.access_token,
    anyRes?.data?.token,
  ];
  for (const c of candidates) {
    if (typeof c === 'string') return c;
  }
  if (candidates.some((c) => c != null)) {
    console.warn('[auth] token present but not a string; ignoring:', candidates);
  }
  return null;
}

export function extractBusinessId(anyRes: any): string | null {
  const candidates = [
    anyRes?.business_id,
    anyRes?.data?.business_id,
    anyRes?.profile?.business_id,
  ];
  for (const c of candidates) {
    if (typeof c === 'string') return c;
    if (typeof c === 'number') return String(c);
  }
  if (candidates.some((c) => c != null)) {
    console.warn('[auth] business_id present but not a string/number; ignoring:', candidates);
  }
  return null;
}
