"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const base = useMemo(
    () => (process.env.NEXT_PUBLIC_API_BASE_URL || "https://enrich-backend-new.onrender.com").replace(/\/$/, ""),
    []
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
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
        throw new Error(
          data?.detail?.message || data?.message || text || "Login failed"
        );
      }

      const token =
        data?.access_token ||
        data?.token ||
        data?.jwt ||
        data?.session?.access_token ||
        data?.data?.access_token;

      if (!token) throw new Error("No access token in response");

      const user = data?.user || data?.profile || { email, user_id: data?.user_id };

      // Save exactly what the dashboard expects:
      localStorage.setItem("enrich_access", token);
      localStorage.setItem(
        "enrich_user",
        JSON.stringify({
          email: user?.email || email,
          user_id: user?.id || user?.user_id || data?.user_id,
        })
      );

      // Navigate to dashboard (soft + hard fallback)
      try { router.replace("/dashboard"); } catch {}
      setTimeout(() => { if (window.location.pathname !== "/dashboard") window.location.href = "/dashboard"; }, 150);
    } catch (e: any) {
      setErr(e?.message || "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ fontFamily: "Inter, system-ui, Arial", maxWidth: 420, margin: "48px auto", padding: "0 16px" }}>
      <h2 style={{ marginBottom: 12 }}>Log in</h2>
      <div style={{ marginBottom: 8, fontSize: 12, opacity: 0.6 }}>API base: {base}</div>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 10 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span>Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
          />
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            border: "1px solid #0f172a",
            background: "#0f172a",
            color: "#fff",
            fontWeight: 700,
            cursor: "pointer",
            opacity: busy ? 0.7 : 1,
          }}
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
        {err && <div style={{ color: "crimson" }}>{err}</div>}
      </form>
      <div style={{ marginTop: 12, fontSize: 12, opacity: 0.7 }}>
        After success, we save <code>enrich_access</code> and <code>enrich_user</code> to <code>localStorage</code> and go to <code>/dashboard</code>.
      </div>
    </div>
  );
}
