import type { NextApiRequest, NextApiResponse } from 'next';

const BACKEND = (process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000').replace(/\/+$/, '');

function cookieMap(h: string | undefined) {
  const out: Record<string,string> = {};
  (h || '').split(';').forEach(c => {
    const i = c.indexOf('=');
    if (i > -1) out[decodeURIComponent(c.slice(0,i).trim())] = decodeURIComponent(c.slice(i+1).trim());
  });
  return out;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).end('Method Not Allowed');
  }

  const cmap = cookieMap(req.headers.cookie);
  const bsession = cmap['enrich_bsession'] ? decodeURIComponent(cmap['enrich_bsession']) : '';
  const access   = cmap['enrich_access'] || '';

  const headers: Record<string,string> = { 'Content-Type': 'application/json' };
  if (access) headers['Authorization'] = Bearer ;
  if (bsession) headers['cookie'] = bsession;

  const upstream = await fetch(${BACKEND}/auth/me, { method: 'GET', headers });
  const text = await upstream.text();
  let data: any = {};
  try { data = text ? JSON.parse(text) : {}; } catch {}

  return res.status(upstream.status).json(data);
}