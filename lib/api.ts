export type ApiInit = RequestInit & { noAuthRedirect?: boolean };

export async function apiFetch(url: string, init: ApiInit = {}): Promise<Response> {
  const base = process.env.NEXT_PUBLIC_BACKEND_URL || '';
  // Accept absolute URLs or relative to /api (rewritten to backend by next.config.js)
  const isAbs = /^https?:\/\//i.test(url);
  const full = isAbs ? url : url.startsWith('/api') ? url : `/api${url.startsWith('/') ? '' : '/'}${url}`;

  const headers = new Headers(init.headers || {});
  // Attach token from browser storage (client side)
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);
  } catch { /* SSR-safe */ }

  const res = await fetch(full, { ...init, headers, cache: init.cache ?? 'no-store' });
  // Optional guard: if 401/403 and not explicitly suppressed, bounce to login
  if (!res.ok && (res.status === 401 || res.status === 403) && !init.noAuthRedirect) {
    if (typeof window !== 'undefined') window.location.replace('/login');
  }
  return res;
}
