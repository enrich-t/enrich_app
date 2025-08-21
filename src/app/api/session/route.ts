import { NextResponse } from "next/server";

const COOKIE = "enrich_session";

export async function POST(req: Request) {
  const { token, user } = await req.json();
  if (!token) return new NextResponse("Missing token", { status: 400 });

  const res = new NextResponse("ok", { status: 200 });
  res.headers.append(
    "Set-Cookie",
    `${COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`
  );
  if (user) {
    res.headers.append(
      "Set-Cookie",
      `enrich_user=${encodeURIComponent(JSON.stringify(user))}; Path=/; SameSite=Lax; Max-Age=2592000`
    );
  }
  return res;
}

export async function DELETE() {
  const res = new NextResponse("ok", { status: 200 });
  res.headers.append("Set-Cookie", `${COOKIE}=; Path=/; Max-Age=0`);
  res.headers.append("Set-Cookie", `enrich_user=; Path=/; Max-Age=0`);
  return res;
}
