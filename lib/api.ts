export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return (
    localStorage.getItem('auth_token') ||
    localStorage.getItem('access_token') ||
    localStorage.getItem('sb_access_token') ||
    localStorage.getItem('enrich_token') ||
    null
  );
}

export function authHeaders(extra?: HeadersInit): HeadersInit {
  const token = getToken();
  const base: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) base['Authorization'] = `Bearer ${token}`;
  if (extra) {
    const obj: Record<string, string> = { ...base };
    if (extra instanceof Headers) {
      extra.forEach((v, k) => (obj[k] = v));
    } else if (Array.isArray(extra)) {
      for (const [k, v] of extra) obj[k] = String(v);
    } else {
      Object.assign(obj, extra as Record<string, string>);
    }
    return obj;
  }
  return base;
}

export async function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  const path = input.startsWith('/api') ? input : `/api${input.startsWith('/') ? input : `/${input}`}`;
  const headers = authHeaders(init?.headers as HeadersInit | undefined);
  return fetch(path, { ...init, headers, cache: 'no-store' });
}

export type MeResponse = {
  ok?: boolean;
  profile?: {
    id?: string;
    business_id?: string;
    businessId?: string;
    business?: { id?: string };
    business_name?: string;
    email?: string;
  };
};

export async function fetchMe(): Promise<MeResponse | null> {
  try {
    const r = await apiFetch('/auth/me');
    if (!r.ok) return null;
    return (await r.json()) as MeResponse;
  } catch {
    return null;
  }
}

export function extractBusinessId(me: MeResponse | null): string | null {
  const p = me?.profile;
  return (
    p?.business_id ||
    p?.id ||
    p?.businessId ||
    p?.business?.id ||
    null
  );
}
