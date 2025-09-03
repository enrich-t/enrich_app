import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  // Lightweight OK so the app always boots; we use scripts/smoke.mjs to test the backend
  return NextResponse.json({ ok: true, t: Date.now() }, { status: 200 });
}
