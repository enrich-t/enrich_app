"use client";

import { useState } from "react";
import { api } from "@/lib/api";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(formData: FormData) {
    setErr(null); setLoading(true);
    const body = Object.fromEntries(formData.entries());
    try {
      await api.login(body);
      window.location.href = "/dashboard";
    } catch (e:any) {
      setErr(e.message || "Login failed");
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen grid place-items-center p-6">
      <div className="card w-full max-w-md p-6 space-y-5">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Welcome back</h1>
          <p className="text-sm text-zinc-500">Sign in to your account</p>
        </div>

        {err && <div className="text-sm text-red-600">{err}</div>}

        <form action={onSubmit} className="space-y-3">
          <input className="w-full rounded-xl border border-zinc-300 px-3 py-2" name="email" type="email" placeholder="Email" required />
          <input className="w-full rounded-xl border border-zinc-300 px-3 py-2" name="password" type="password" placeholder="Password" required />
          <button className="btn w-full" disabled={loading} type="submit">
            {loading ? "Signing in…" : "Log in"}
          </button>
        </form>

        <p className="text-sm text-zinc-600">
          New here? <a className="underline" href="/signup">Create an account</a>
        </p>
      </div>
    </div>
  );
}
