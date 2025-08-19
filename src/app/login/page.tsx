"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const base = (process.env.NEXT_PUBLIC_API_BASE_URL || "https://enrich-backend-new.onrender.com").replace(/\/$/, "");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string>("(idle)");
  const [raw, setRaw] = useState<string>("");

  async function doLogin() {
    setStatus("CLICKED → REQUESTING…");
    setRaw("");
    try {
      const res = await fetch(`${base}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const text = await res.text();
      setStatus(`HTTP ${res.status}${res.ok ? " — OK" : ""}`);
      setRaw(text || "(no body)");

      let data: any = null;
      try { data = text ? JSON.parse(text) : null; } catch {}

      if (!res.ok) {
        const msg =
          data?.detail?.message ||
          data?.message ||
          (typeof data === "string" ? data : "") ||
          text ||
          "Login failed";
        throw new Error(msg);
      }

      const access = data?.access_token || data?.accessToken || data?.token;
      const user_id = data?.user_id || data?.userId || data?.user?.id;

      if (access) localStorage.setItem("enrich_access", access);
      if (user_id || email) localStorage.setItem("enrich_user", JSON.stringify({ user_id, email }));

      // Route then hard-redirect as a fallback
      router.push("/dashboard");
      setTimeout(() => { window.location.href = "/dashboard"; }, 300);
    } catch (e: any) {
      setStatus((s) => s + " — ERROR");
      setRaw((r) => (r ? r + "\n\n" : "") + (e?.message || String(e)));
    }
  }

  return (
    <div style={{ maxWidth: 520, margin: "60px auto", fontFamily: "Inter, system-ui, Arial" }}>
      <h2>Log in</h2>
      <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
        <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} type="email" required />
        <input placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} type="password" required />
        <button type="button" onClick={doLogin}>Log in</button>
      </div>

      <div style={{marginTop:24, padding:12, background:"#f6f6f6", borderRadius:8}}>
        <div style={{fontSize:12, opacity:0.8}}>API base: {base}</div>
        <div style={{fontSize:12, opacity:0.8}}>Status: {status}</div>
        <pre style={{whiteSpace:"pre-wrap"}}>{raw}</pre>
      </div>
    </div>
  );
}
