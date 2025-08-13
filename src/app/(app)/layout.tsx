"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<{email:string; business_id:string; profile?: any} | null>(null);
  useEffect(() => {
    api.me().then(setMe).catch(() => {
      window.location.href = "/login";
    });
  }, []);

  // Basic loading state while checking session
  if (!me) return <div className="p-10 text-sm text-zinc-500">Loading…</div>;

  // Apply brand colors if present
  useEffect(() => {
    const root = document.documentElement;
    const p = me?.profile?.brand_primary_colour;
    const s = me?.profile?.brand_secondary_colour;
    if (p) root.style.setProperty("--brand-primary", p);
    if (s) root.style.setProperty("--brand-secondary", s);
  }, [me]);

  return (
    <div className="min-h-screen grid md:grid-cols-[260px_1fr]">
      <aside className="border-r border-zinc-200 bg-white p-5 space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl" style={{ background: "var(--brand-primary)" }} />
          <div>
            <div className="font-semibold">Enrich</div>
            <div className="text-xs text-zinc-500">Welcome{me?.email ? `, ${me.email}` : ""}</div>
          </div>
        </div>

        <nav className="flex flex-col gap-2 text-sm">
          <Link className="btn-ghost" href="/dashboard">Dashboard</Link>
          <Link className="btn-ghost" href="/profile">Profile</Link>
        </nav>

        <form onSubmit={async (e) => { e.preventDefault(); await api.logout().catch(()=>{}); window.location.href="/login"; }}>
          <button className="btn-ghost w-full" type="submit">Log out</button>
        </form>
      </aside>

      <main className="p-6 md:p-10 bg-zinc-50">
        {children}
      </main>
    </div>
  );
}
