"use client";

import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    try {
      const res = await fetch(`${apiBase}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || "Login failed");
      }
      const data = await res.json(); // expect { access_token, user: {...} } or similar
      const token = data.access_token || data.token || data.session?.access_token;
      if (!token) throw new Error("No token in login response");

      // set cookie in Next (httpOnly) via internal API
      const setCookie = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, user: data.user ?? null }),
      });
      if (!setCookie.ok) {
        const t = await setCookie.text();
        throw new Error(t || "Failed to set session");
      }
      window.location.href = "/dashboard";
    } catch (err: any) {
      setMsg(err?.message ?? "Login error");
    }
  }

  return (
    <div style={{ maxWidth: 380, margin: "10vh auto" }}>
      <h1 style={{ marginBottom: 12 }}>Sign in</h1>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <input
          type="email" placeholder="Email" value={email}
          onChange={(e)=>setEmail(e.target.value)} required
          style={{ padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
        />
        <input
          type="password" placeholder="Password" value={password}
          onChange={(e)=>setPassword(e.target.value)} required
          style={{ padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
        />
        <button
          type="submit"
          style={{ padding: 10, borderRadius: 10, border: 0, cursor: "pointer" }}
        >
          Continue
        </button>
      </form>
      {msg && <p style={{ color: "crimson", marginTop: 10 }}>{msg}</p>}
    </div>
  );
}
