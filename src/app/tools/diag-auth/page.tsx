"use client";
import { useEffect, useMemo, useState } from "react";

export default function AuthDiag() {
  const base = useMemo(() => (process.env.NEXT_PUBLIC_API_BASE_URL || "https://enrich-backend-new.onrender.com").replace(/\/$/, ""), []);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [out, setOut] = useState<string>("(idle)");

  useEffect(() => {
    try {
      setToken(localStorage.getItem("enrich_access"));
      const u = localStorage.getItem("enrich_user");
      setUser(u ? JSON.parse(u) : null);
    } catch {}
  }, []);

  async function testMe() {
    setOut("Testing /auth/me…");
    try {
      const res = await fetch(`${base}/auth/me`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const text = await res.text();
      setOut(`GET /auth/me → ${res.status} ${res.ok ? "OK" : "ERR"}\n` + text);
    } catch (e: any) {
      setOut(`Network error: ${e?.message || e}`);
    }
  }

  function clearSession() {
    try {
      localStorage.removeItem("enrich_access");
      localStorage.removeItem("enrich_user");
    } catch {}
    setToken(null);
    setUser(null);
    setOut("(cleared)");
  }

  return (
    <div style={{ fontFamily: "Inter, system-ui, Arial", maxWidth: 900, margin: "24px auto", padding: "0 16px" }}>
      <h2>Auth Diagnostics</h2>
      <div style={{ marginBottom: 6 }}>API base: <code>{base}</code></div>
      <div style={{ marginBottom: 12 }}>
        <div>Token present: <strong>{token ? "yes" : "no"}</strong></div>
        <div>User: <code>{user ? JSON.stringify(user) : "(none)"}</code></div>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <button onClick={testMe}>Test /auth/me</button>
        <button onClick={() => (window.location.href = "/login")}>Go to /login</button>
        <button onClick={() => (window.location.href = "/dashboard")}>Go to /dashboard</button>
        <button onClick={clearSession}>Clear session</button>
      </div>
      <pre style={{ whiteSpace: "pre-wrap", background: "#f8fafc", padding: 12, border: "1px solid #e5e7eb", borderRadius: 8 }}>
        {out}
      </pre>
    </div>
  );
}
