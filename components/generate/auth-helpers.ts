'use client';

/** Helpers local to the Generate feature — does NOT touch your global auth/api files. */

export function getBusinessId(): string | null {
  return process.env.NEXT_PUBLIC_BUSINESS_ID ?? null;
}

/* ---------- discover Supabase token blob ----------- */
function findSupabaseAuthKey(): string | null {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)!;
      if (k && /^sb-.*-auth-token$/.test(k)) return k;
    }
  } catch {}
  return null;
}

export function readSupabaseTokens():
  | { accessToken: string | null; refreshToken: string | null }
  | null {
  try {
    const key = findSupabaseAuthKey();
    const raw = key ? localStorage.getItem(key) : null;
    if (!raw) return { accessToken: null, refreshToken: null };
    const parsed = JSON.parse(raw);
    const accessToken = parsed?.currentSession?.access_token ?? parsed?.access_token ?? null;
    const refreshToken = parsed?.currentSession?.refresh_token ?? parsed?.refresh_token ?? null;
    return { accessToken, refreshToken };
  } catch {
    return { accessToken: null, refreshToken: null };
  }
}

export function findAnyAccessToken(): string | null {
  try {
    const candidates = ['apiToken', 'api_token', 'access_token', 'sb-access-token', 'token'];
    for (const k of candidates) {
      const v = localStorage.getItem(k);
      if (v && v.length > 10) return v;
    }
    // fallback: any JWT-looking string
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)!;
      const val = localStorage.getItem(key);
      if (val && /[\w-]+\.[\w-]+\.[\w-]+/.test(val)) return val;
    }
  } catch {}
  return null;
}

function setCommonAccessToken(newAccess: string) {
  try {
    localStorage.setItem('access_token', newAccess);
    localStorage.setItem('apiToken', newAccess);
    localStorage.setItem('sb-access-token', newAccess);

    const key = findSupabaseAuthKey();
    if (key) {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.currentSession) parsed.currentSession.access_token = newAccess;
        else parsed.access_token = newAccess;
        localStorage.setItem(key, JSON.stringify(parsed));
      }
    }
  } catch {}
}

/* ---------- refresh & fetch ---------- */
export async function tryRefreshAccessToken(): Promise<string | null> {
  const refresh = readSupabaseTokens()?.refreshToken || null;
  if (!refresh) return null;

  const endpoints = [
    '/api/auth/refresh',
    '/api/auth/refresh-token',
    '/api/auth/refresh_access_token',
  ];

  for (const ep of endpoints) {
    try {
      const r = await fetch(ep, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refresh }),
      });
      if (!r.ok) continue;
      const j = await r.json();
      const newAccess: string | undefined =
        j?.access_token || j?.data?.access_token || j?.token;
      if (newAccess && newAccess.length > 20) {
        setCommonAccessToken(newAccess);
        return newAccess;
      }
    } catch {}
  }
  return null;
}

export async function fetchWithAuth(input: string, init: RequestInit = {}) {
  const adhoc = findAnyAccessToken();
  const supa = readSupabaseTokens();
  const accessToken = adhoc || supa?.accessToken || null;

  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string>),
    'Content-Type': 'application/json',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  };

  let res = await fetch(input, { ...init, headers });
  if (res.status !== 401) return res;

  // Only retry if backend said INVALID_TOKEN
  try {
    const body = await res.clone().json().catch(() => null);
    if (body?.detail?.code !== 'INVALID_TOKEN') return res;
  } catch {}

  const refreshed = await tryRefreshAccessToken();
  if (!refreshed) return res;

  return fetch(input, {
    ...init,
    headers: { ...headers, Authorization: `Bearer ${refreshed}` },
  });
}

export function clearLocalAuthForGenerate() {
  try {
    const key = findSupabaseAuthKey();
    if (key) localStorage.removeItem(key);
    ['apiToken', 'api_token', 'access_token', 'sb-access-token', 'token'].forEach((k) =>
      localStorage.removeItem(k)
    );
  } catch {}
}
