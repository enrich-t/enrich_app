"use client";

import { useState } from "react";
import { api } from "@/lib/api";

export default function SignupPage() {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(formData: FormData) {
    setErr(null); setLoading(true);
    const body = Object.fromEntries(formData.entries());
    try {
      await api.signup(body);
      window.location.href = "/dashboard";
    } catch (e:any) {
      setErr(e.message || "Signup failed");
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen grid place-items-center p-6">
      <div className="card w-full max-w-md p-6 space-y-5">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Create your account</h1>
          <p className="text-sm text-zinc-500">It’s fast and free to start.</p>
        </div>

        {err && <div className="text-sm text-red-600">{err}</div>}

        <form action={onSubmit} className="space-y-3">
          <input className="w-full rounded-xl border border-zinc-300 px-3 py-2" name="email" type="email" placeholder="Email" required />
          <input className="w-full rounded-xl border border-zinc-300 px-3 py-2" name="password" type="password" placeholder="Password" required />
          <input className="w-full rounded-xl border border-zinc-300 px-3 py-2" name="business_name" placeholder="Business name (optional)" />
          <div className="grid grid-cols-2 gap-3">
            <input className="rounded-xl border border-zinc-300 px-3 py-2" name="brand_primary_colour" defaultValue="#6a2e3e" />
            <input className="rounded-xl border border-zinc-300 px-3 py-2" name="brand_secondary_colour" defaultValue="#faf6d0" />
          </div>
          <button className="btn w-full" disabled={loading} type="submit">
            {loading ? "Creating…" : "Create account"}
          </button>
        </form>

        <p className="text-sm text-zinc-600">
          Already have an account? <a className="underline" href="/login">Log in</a>
        </p>
      </div>
    </div>
  );
}
