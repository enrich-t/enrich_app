import type { NextApiRequest, NextApiResponse } from 'next';

const BACKEND = (process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000').replace(/\/+$/, '');

function firstCookiePair(sc: string): string | null {
  const m = sc.match(/^\s*([^=;\s]+)=([^;]*)/);
  return m ? ${m[1]}= : null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { email, password } = body || {};

  const upstream = await fetch(${BACKEND}/auth/login, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    redirect: 'manual',
  });

  const text = await upstream.text();
  let data: any = {};
  try { data = text ? JSON.parse(text) : {}; } catch {}

  // Capture backend Set-Cookie (single header common case) and store as our HttpOnly cookie
  const sc = upstream.headers.get('set-cookie') || '';
  const pair = sc ? firstCookiePair(sc) : null;
  const setCookies: string[] = [];

  if (pair) {
    setCookies.push(enrich_bsession=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=);
  }

  // Also persist tokens if backend returns them
  const access  = data?.access_token ?? data?.accessToken ?? data?.token ?? null;
  const refresh = data?.refresh_token ?? data?.refreshToken ?? null;
  if (access)  setCookies.push(enrich_access=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=);
  if (refresh) setCookies.push(enrich_refresh=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=);

  if (setCookies.length) res.setHeader('Set-Cookie', setCookies);

  return res.status(upstream.status).json(upstream.ok ? { ok: true } : (data || { ok: false }));
}