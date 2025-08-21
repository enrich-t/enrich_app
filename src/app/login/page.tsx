"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE?.replace(/\/+$/, "") || "http://localhost:8000";

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
      // Wake backend (Render cold start)
      await fetch(`${API_BASE}/health`, { method: "GET" }).catch(() => {});

      // 1) Login — send credentials so server can set HttpOnly cookies
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // IMPORTANT for cookie-based auth
        body: JSON.stringify({ email, password }),
      });

      const raw = await res.text();
      let data: any = {};
      try { data = raw ? JSON.parse(raw) : {}; } catch {}

      if (!res.ok) {
        const msg = data?.detail || data?.message || raw || `Login failed (${res.status})`;
        throw new Error(msg);
      }

      // 2) Token mode (optional)
      const access =
        data?.access_token ?? data?.accessToken ?? data?.token ?? null;
      const refresh = data?.refresh_token ?? data?.refreshToken ?? null;

      if (access) localStorage.setItem("access_token", String(access));
      if (refresh) localStorage.setItem("refresh_token", String(refresh));

      // 3) Decide auth mode
      const mode = access ? "bearer" : "cookie";
      localStorage.setItem("AUTH_MODE", mode);

      // 4) Resolve business_id
      let businessId =
        data?.business_id ?? data?.profile?.business_id ?? "";

      // Try /auth/me using the chosen mode
      if (!businessId) {
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (mode === "bearer" && access) headers["Authorization"] = `Bearer ${access}`;

        const meRes = await fetch(`${API_BASE}/auth/me`, {
          method: "GET",
          headers,
          credentials: mode === "cookie" ? "include" : "omit",
        });

        if (meRes.ok) {
          const me = await meRes.json().catch(() => ({}));
          businessId = me?.business_id || "";
        }
      }

      if (businessId) localStorage.setItem("business_id", String(businessId));

      // 5) Go to dashboard
      router.replace("/dashboard");
    } catch (e: any) {
      const msg =
        typeof e?.message === "string" && e.message.toLowerCase().includes("failed to fetch")
          ? "Network error: unable to reach the backend. Try again shortly."
          : e?.message || "Unexpected error. Please try again.";
      setErr(msg);
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

        {err && (
          <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3 text-red-800">
            {err}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border px-3 py-2 outline-none"
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border px-3 py-2 outline-none"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-black text-white py-2.5 hover:opacity-90 disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="text-sm text-gray-600 mt-4">
          Forgot your password? <a className="underline" href="/reset">Reset it</a>
        </p>

        <p className="text-[11px] text-gray-400 mt-4">API: {API_BASE}</p>
      </div>
    </main>
  );
}
