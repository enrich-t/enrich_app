"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    try { setAuthed(!!localStorage.getItem("enrich_access")); } catch {}
  }, []);

  return (
    <div style={{ fontFamily: "Inter, system-ui, Arial", maxWidth: 1100, margin: "24px auto", padding: "0 16px" }}>
      <header style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16 }}>
        <h1 style={{ marginRight: "auto" }}>
          <Link href="/">Enrich</Link>
        </h1>
        {!authed && <Link href="/signup">Sign up</Link>}
        {!authed && <Link href="/login">Log in</Link>}
        {authed && <Link href="/dashboard">Dashboard</Link>}
        {authed && <Link href="/profile">Profile</Link>}
      </header>
      <main>{children}</main>
    </div>
  );
}
