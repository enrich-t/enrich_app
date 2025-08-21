"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    try {
      // Call our same-origin proxy (sets HttpOnly cookies on this domain)
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || `Login failed (${res.status})`);
      }

      // Confirm session by calling our proxy /api/auth/me
      const me = await fetch("/api/auth/me", { credentials: "include" });
      if (!me.ok) {
        const t = await me.text().catch(() => "");
        throw new Error(t || "Login succeeded but /me failed.");
      }

      // Store business_id (optional; convenient for dashboard)
      try {
        const j = await me.json();
        if (j?.business_id) localStorage.setItem("business_id", String(j.business_id));
      } catch {}

      router.replace("/dashboard");
    } catch (e: any) {
      setErr(e?.message || "Login error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-[80vh] grid place-items-center p-4">
      <div className="w-full max-w-md rounded-2xl border p-6 shadow-sm bg-white">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">Sign in</h1>
          <p className="text-gray-600 mt-1">Use your Enrich account to access your dashboard.</p>
        </div>

        {err && <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3 text-red-800">{err}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-1">Email</label>
            <input className="w-full rounded-xl border px-3 py-2" type="email" required
              value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
          </div>
          <div>
            <label className="block text-sm mb-1">Password</label>
            <input className="w-full rounded-xl border px-3 py-2" type="password" required
              value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full rounded-xl bg-black text-white py-2.5 hover:opacity-90 disabled:opacity-60">
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="text-sm text-gray-600 mt-4">Forgot your password? <a className="underline" href="/reset">Reset it</a></p>
      </div>
    </main>
  );
}
