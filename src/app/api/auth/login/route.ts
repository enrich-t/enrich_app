export const runtime = "nodejs";
import { NextResponse } from "next/server";
const BACKEND = (process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000").replace(/\/+$/, "");

export async function POST(req: Request) {
  const { email, password } = await req.json();

  const res = await fetch(\\/auth/login\, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    redirect: "manual",
  });

  const raw = await res.text();
  let data: any = {};
  try { data = raw ? JSON.parse(raw) : {}; } catch {}

  const out = NextResponse.json(res.ok ? { ok: true } : (data || { ok: false }), { status: res.status });

  // Capture single Set-Cookie header (common case) into our own HttpOnly cookie
  const sc = res.headers.get("set-cookie") || "";
  if (sc) {
    const m = sc.match(/^\s*([^=;\s]+)=([^;]*)/);
    if (m) {
      const pair = \\=\\;
      out.cookies.set({
        name: "enrich_bsession",
        value: encodeURIComponent(pair),
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7
      });
    }
  }

  // If backend returned tokens, store as HttpOnly cookies too
  const access = data?.access_token ?? data?.accessToken ?? data?.token ?? null;
  const refresh = data?.refresh_token ?? data?.refreshToken ?? null;
  if (access) out.cookies.set({ name: "enrich_access", value: access, httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60*60*24*7 });
  if (refresh) out.cookies.set({ name: "enrich_refresh", value: refresh, httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60*60*24*14 });

  return out;
}