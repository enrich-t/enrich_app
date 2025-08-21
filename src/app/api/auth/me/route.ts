export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
const BACKEND = (process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000").replace(/\/+$/, "");

export async function GET() {
  const store = cookies();
  const access = store.get("enrich_access")?.value || null;
  const bsession = store.get("enrich_bsession")?.value ? decodeURIComponent(store.get("enrich_bsession")!.value) : "";

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (access) headers["Authorization"] = \Bearer \\;

  const res = await fetch(\\/auth/me\, {
    method: "GET",
    headers: { ...headers, ...(bsession ? { cookie: bsession } : {}) }
  });

  const text = await res.text();
  let data: any = {};
  try { data = text ? JSON.parse(text) : {}; } catch {}
  return NextResponse.json(data, { status: res.status });
}