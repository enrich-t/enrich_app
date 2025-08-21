"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE?.replace(/\/+$/, "") || "http://localhost:8000";

type DebugInfo = {
  loginStatus?: number;
  loginOk?: boolean;
  loginBodySnippet?: string;
  loginHeaders?: Array<[string, string]>;
  meStatus?: number;
  meOk?: boolean;
  meBodySnippet?: string;
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [debug, setDebug] = useState<DebugInfo>({});

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    setDebug({});

    try {
      // Wake backend (Render cold start)
      await fetch(`${API_BASE}/health`, { method: "GET" }).catch(() => {});

      // 1) LOGIN (include credentials so server can set cookies if it uses cookies)
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      const loginText = await res.text();
      let loginJson: any = {};
      try { loginJson = loginText ? JSON.parse(loginText) : {}; } catch {}

      const headers: Array<[string, string]> = [];
      res.headers.forEach((v, k) => headers.push([k, v]));

      const info: DebugInfo = {
        loginStatus: res.status,
        loginOk: res.ok,
        loginBodySnippet: (loginText || "").slice(0, 1200),
        loginHeaders: headers,
      };

      // Save visible debug immediately
      setDebug(info);

      if (!res.ok) {
        const msg = loginJson?.detail || loginJson?.message || loginText || `Login failed (${res.status})`;
        throw new Error(msg);
      }

      // 2) TOKEN MODE (if tokens present in JSON)
      const access =
        loginJson?.access_token ?? loginJson?.accessToken ?? loginJson?.token ?? null;
      const refresh =
        loginJson?.refresh_token ?? loginJson?.refreshToken ?? null;

      if (access) localStorage.setItem("access_token", String(access));
      if (refresh) localStorage.setItem("refresh_token", String(refresh));
      localStorage.setItem("AUTH_MODE", access ? "bearer" : "cookie");

      // 3) /auth/me using chosen mode
      const meHeaders: Record<string, string> = { "Content-Type": "application/json" };
      if (access) meHeaders["Authorization"] = `Bearer ${access}`;

      const meRes = await fetch(`${API_BASE}/auth/me`, {
        method: "GET",
        headers: meHeaders,
        credentials: access ? "omit" : "include",
      });

      const meText = await meRes.text();
      let meJson: any = {};
      try { meJson = meText ? JSON.parse(meText) : {}; } catch {}

      setDebug({
        ...info,
        meStatus: meRes.status,
        meOk: meRes.ok,
        meBodySnippet: (meText || "").slice(0, 1200),
      });

      if (!meRes.ok) {
        throw new Error(
          access
            ? "Login returned a token, but /auth/me failed."
            : "Login may be cookie-based, but /auth/me did not see the cookie."
        );
      }

      const businessId =
        loginJson?.business_id ??
        loginJson?.profile?.business_id ??
        meJson?.business_id ??
        "";

      if (businessId) localStorage.setItem("business_id", String(businessId));

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

        {/* Always-visible debug */}
        <div className="mt-6 text-xs whitespace-pre-wrap break-words bg-gray-50 border rounded-xl p-3">
          <div className="font-semibold mb-1">Debug</div>
          {JSON.stringify(debug, null, 2)}
          {"\n"}(Set-Cookie isn’t visible to JS; we’re showing everything the browser *can* see.)
        </div>
      </div>
    </main>
  );
}
