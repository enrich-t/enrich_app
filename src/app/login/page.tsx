"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

type LoginResponse = {
  access_token?: string;
  refresh_token?: string;
  business_id?: string;
  profile?: { business_id?: string; business_name?: string };
  detail?: string;
  message?: string;
};

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
      // 0) Wake backend quickly (Render cold start)
      await fetch(`${API_BASE}/health`, { method: "GET" }).catch(() => {});

      // 1) Login
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "omit",
        body: JSON.stringify({ email, password }),
      });

      // Bubble clear, readable error
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        try {
          const j = JSON.parse(txt || "{}");
          throw new Error(j.detail || j.message || `Login failed (${res.status})`);
        } catch {
          throw new Error(txt || `Login failed (${res.status})`);
        }
      }

      const data = (await res.json()) as LoginResponse;
      const access = data.access_token;
      const refresh = data.refresh_token;
      if (!access || !refresh) throw new Error("Tokens missing from response.");

      localStorage.setItem("access_token", access);
      localStorage.setItem("refresh_token", refresh);

      // 2) Resolve business_id
      let businessId = data.business_id || data.profile?.business_id || "";
      if (!businessId) {
        const meRes = await fetch(`${API_BASE}/auth/me`, {
          method: "GET",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${access}` },
          credentials: "omit",
        });
        if (meRes.ok) {
          const me = await meRes.json();
          businessId = me?.business_id || "";
        }
      }
      if (businessId) localStorage.setItem("business_id", businessId);

      router.replace("/dashboard");
    } catch (e: any) {
      // Normalize common network/CORS “Failed to fetch” into a friendly message
      const msg =
        typeof e?.message === "string" && e.message.toLowerCase().includes("failed to fetch")
          ? "Network error: unable to reach the backend. Try again in a moment."
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
          <p className="text-gray-600 mt-1">
            Use your Enrich account to access your dashboard.
          </p>
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
          Forgot your password? <a href="/reset" className="underline">Reset it</a>
        </p>

        <p className="text-[11px] text-gray-400 mt-4">
          {/* Dev-only breadcrumb—remove later if you want */}
          API: {API_BASE}
        </p>
      </div>
    </main>
  );
}
