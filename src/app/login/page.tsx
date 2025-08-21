"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

type LoginResponse = {
  access_token?: string;
  refresh_token?: string;
  business_id?: string;
  // Optional: some backends return profile inline
  profile?: {
    id: string;
    business_id?: string;
    business_name?: string;
  };
  message?: string;
  detail?: string;
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
      // 1) Login
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Most FastAPI JWT setups don’t require cookies; tokens come in JSON
        credentials: "omit",
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const msg = await safeErrorText(res);
        throw new Error(msg || `Login failed (${res.status})`);
      }

      const data = (await res.json()) as LoginResponse;

      const access = data.access_token;
      const refresh = data.refresh_token;

      if (!access || !refresh) {
        throw new Error("Login succeeded but tokens were not returned.");
      }

      // Persist tokens
      localStorage.setItem("access_token", access);
      localStorage.setItem("refresh_token", refresh);

      // 2) Figure out business_id
      let businessId = data.business_id || data.profile?.business_id || "";

      if (!businessId) {
        // Fallback: call /auth/me
        const meRes = await fetch(`${API_BASE}/auth/me`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${access}`,
          },
          credentials: "omit",
        });

        if (meRes.ok) {
          const me = await meRes.json();
          businessId = me?.business_id || "";
        }
      }

      if (businessId) {
        localStorage.setItem("business_id", businessId);
      }

      // 3) Redirect to dashboard
      router.replace("/dashboard");
    } catch (e: any) {
      setErr(e?.message || "Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-2">Sign in</h1>
      <p className="text-gray-600 mb-6">Use your Enrich account to continue.</p>

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
        Forgot your password?{" "}
        <a href="/reset" className="underline">
          Reset it
        </a>
      </p>
    </main>
  );
}

async function safeErrorText(res: Response) {
  try {
    const t = await res.text();
    try {
      const j = JSON.parse(t);
      return j?.detail || j?.message || t;
    } catch {
      return t;
    }
  } catch {
    return null;
  }
}
