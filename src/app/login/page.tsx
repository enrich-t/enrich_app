"use client";
import { useState } from "react";

export default function LoginPage() {
  const base =
    (process.env.NEXT_PUBLIC_API_BASE_URL || "https://enrich-backend-new.onrender.com").replace(/\/$/, "");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch(`${base}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const text = await res.text();
      let data: any = null;
      try { data = text ? JSON.parse(text) : null; } catch {}

      if (!res.ok) {
        const msg = data?.detail?.message || data?.message || text || "Login failed";
        throw new Error(msg);
      }

      const access =
        data?.access_token || data?.accessToken || data?.token;
      const user_id =
        data?.user_id || data?.userId || data?.user?.id;

      if (access) localStorage.setItem("enrich_access", access);
      if (user_id || email) localStorage.setItem("enrich_user", JSON.stringify({ user_id, email }));

      // Hard reload to ensure layouts pick up auth state
      window.location.href = "/dashboard";
    } catch (e: any) {
      setErr(e?.message || "Login failed");
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: "60px auto", fontFamily: "Inter, system-ui, Arial" }}>
      <h2>Log in</h2>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12, marginTop: 16 }}>
        <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} type="email" required />
        <input placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} type="password" required />
        <button type="submit" disabled={loading}>{loading ? "Logging in…" : "Log in"}</button>
        {err && <div style={{ color: "crimson" }}>{err}</div>}
      </form>
      <p style={{ marginTop: 12, fontSize: 12, opacity: 0.7 }}>
        API: {base}
      </p>
    </div>
  );
}
