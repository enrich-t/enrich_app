export default async function handler(req, res) {
  // Always reveal the method so we can see what's actually hitting Vercel
  res.setHeader('X-Debug-Method', req.method || 'UNKNOWN');

  // Accept POST for real login later; right now echo for any method to debug 405s
  if (req.method !== 'POST') {
    return res.status(200).json({ ok: false, note: 'login endpoint reached', receivedMethod: req.method });
  }

  const BACKEND = (process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000').replace(/\/+$/, '');
  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { email, password } = body || {};

  const upstream = await fetch(\\/auth/login\, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    redirect: 'manual',
  });

  const text = await upstream.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch {}

  // Capture backend Set-Cookie (single header common case) and store as our HttpOnly cookie
  const sc = upstream.headers.get('set-cookie') || '';
  const m = sc.match(/^\s*([^=;\s]+)=([^;]*)/);
  const pair = m ? \\=\\ : null;

  const setCookies = [];
  if (pair) setCookies.push(\enrich_bsession=\; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=\\);

  const access  = data?.access_token ?? data?.accessToken ?? data?.token ?? null;
  const refresh = data?.refresh_token ?? data?.refreshToken ?? null;
  if (access)  setCookies.push(\enrich_access=\; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=\\);
  if (refresh) setCookies.push(\enrich_refresh=\; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=\\);

  if (setCookies.length) res.setHeader('Set-Cookie', setCookies);

  return res.status(upstream.status).json(upstream.ok ? { ok: true } : (data || { ok: false }));
}