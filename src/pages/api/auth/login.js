export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method Not Allowed', receivedMethod: req.method });
  }

  const BACKEND = (process.env.NEXT_PUBLIC_API_BASE || 'https://enrich-backend-new.onrender.com').replace(/\/+$/, '');
  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { email, password } = body || {};

  const upstream = await fetch(`${BACKEND}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    redirect: 'manual',
  });

  const text = await upstream.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch {}

  // Capture first backend cookie as name=value
  const sc = upstream.headers.get('set-cookie') || '';
  const m = sc.match(/^\s*([^=;\s]+)=([^;]*)/);
  const setCookies = [];
  if (m) {
    const pair = `${m[1]}=${m[2]}`;
    setCookies.push(`enrich_bsession=${encodeURIComponent(pair)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${60*60*24*7}`);
  }

  // Persist tokens if backend returns them
  const access  = data?.access_token ?? data?.accessToken ?? data?.token ?? null;
  const refresh = data?.refresh_token ?? data?.refreshToken ?? null;
  if (access)  setCookies.push(`enrich_access=${access}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${60*60*24*7}`);
  if (refresh) setCookies.push(`enrich_refresh=${refresh}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${60*60*24*14}`);
  if (setCookies.length) res.setHeader('Set-Cookie', setCookies);

  return res.status(upstream.status).json(upstream.ok ? { ok: true } : (data || { ok: false }));
}