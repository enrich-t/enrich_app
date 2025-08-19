"use client";
import { useState } from "react";

type Candidate = { source: string; token: string };

export default function LoginPage() {
  const base = (process.env.NEXT_PUBLIC_API_BASE_URL || "https://enrich-backend-new.onrender.com").replace(/\/$/, "");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("(idle)");
  const [raw, setRaw] = useState("");

  function collectCandidates(data: any): Candidate[] {
    const c: Candidate[] = [];
    const add = (source: string, v: any) => {
      if (typeof v === "string" && v.length > 0) c.push({ source, token: v });
    };
    add("supabase_access_token", data?.supabase_access_token);
    add("access_token", data?.access_token);
    add("token", data?.token);
    add("session.access_token", data?.session?.access_token);
    add("raw.session.access_token", data?.raw?.session?.access_token);
    add("data.session.access_token", data?.data?.session?.access_token);
    // prefer JWT-looking tokens first
    c.sort((a, b) => (b.token.split(".").length - a.token.split(".").length));
    return c;
  }

  async function verifyToken(token: string): Promise<boolean> {
    try {
      const r = await fetch(`${base}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
      return r.ok;
    } catch {
      return false;
    }
  }

  async function onLogin() {
    setStatus("REQUESTING…");
    setRaw("");
    try {
      const res = await fetch(`${base}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const text = await res.text();
      setRaw(text || "(no body)");

      let data: any = null;
      try { data = text ? JSON.parse(text) : null; } catch {}

      if (!res.ok) {
        const msg = data?.detail?.message || data?.message || text || "Login failed";
        throw new Error(msg);
      }

      const candidates = collectCandidates(data || {});
      if (candidates.length === 0) throw new Error("No token returned from /auth/login");

      setStatus(`Trying ${candidates.length} token candidate(s)…`);
      let picked: Candidate | null = null;
      for (const cand of candidates) {
        const ok = await verifyToken(cand.token);
        if (ok) { picked = cand; break; }
      }
      if (!picked) throw new Error("Could not verify token with /auth/me");

      // store verified token + user
      localStorage.setItem("enrich_access", picked.token);
      localStorage.setItem("enrich_user", JSON.stringify({ email }));

      setStatus(`OK (stored: ${picked.source}). Redirecting…`);
      // hard redirect so any guards pick up auth
      window.location.href = "/dashboard";
    } catch (e: any) {
      setStatus(`ERROR: ${e?.message || String(e)}`);
    }
  }

  return (
    <div style={{ maxWidth: 520, margin: "60px auto", fontFamily: "Inter, system-ui, Arial" }}>
      <h2>Log in</h2>
      <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
        <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} type="email" required />
        <input placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} type="password" required />
        <button type="button" onClick={onLogin}>Log in</button>
      </div>

      <div style={{marginTop:24, padding:12, background:"#f6f6f6", borderRadius:8}}>
        <div style={{fontSize:12, opacity:0.8}}>API base: {base}</div>
        <div style={{fontSize:12, opacity:0.8}}>Status: {status}</div>
        <pre style={{whiteSpace:"pre-wrap"}}>{raw}</pre>
      </div>
    </div>
  );
}
