export const runtime = "nodejs";

import { NextResponse } from "next/server";

const BACKEND = (process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000").replace(/\/+$/, "");

// Turn multiple Set-Cookie headers into "name=value; name2=value2"
function extractCookiePairs(all: string[]): string {
  const pairs: string[] = [];
  for (const sc of all) {
    const m = sc.match(/^\s*([^=;\s]+)=([^;]*)/);
    if (m) pairs.push(`${m[1]}=${m[2]}`);
  }
  return pairs.join("; ");
}

export async function POST(req: Request) {
  const { email, password } = await req.json();

  const res = await fetch(`${BACKEND}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    redirect: "manual",
  });

  const raw = await res.text();
  let data: any = {};
  try { data = raw ? JSON.parse(raw) : {}; } catch {}

  const out = NextResponse.json(res.ok ? { ok: true } : (data || { ok: false }), { status: res.status });

  // Capture backend cookies -> our domain cookie (for server-side proxying later)
  // getSetCookie() exists in Next runtime; fall back to single header if needed.
  // @ts-ignore
  const setCookies: string[] = (typeof res.headers.getSetCookie === "function"
    // @ts-ignore
    ? res.headers.getSetCookie()
    : (res.headers.get("set-cookie") ? [res.headers.get("set-cookie") as string] : [])
  );

  const cookiePairs = extractCookiePairs(setCookies || []);
  if (cookiePairs) {
    out.cookies.set({
      name: "enrich_bsession",
      value: encodeURIComponent(cookiePairs),
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
  }

  // If backend returns tokens, also store them as HttpOnly cookies
  const access = data?.access_token ?? data?.accessToken ?? data?.token ?? null;
  const refresh = data?.refresh_token ?? data?.refreshToken ?? null;

  if (access) {
    out.cookies.set({
      name: "enrich_access",
      value: access,
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
  }
  if (refresh) {
    out.cookies.set({
      name: "enrich_refresh",
      value: refresh,
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 14,
    });
  }

  return out;
}
