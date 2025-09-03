'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '//supabaseClient';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false); const [err, setErr] = useState<string|null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setErr(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false); if (error) return setErr(error.message); router.replace('/');
  };
  return (
    <main className="min-h-screen flex items-center justify-center bg-[#FAFAFB]">
      <div className="w-full max-w-md rounded-2xl shadow-lg bg-white p-8 border border-[#EFEFF3]">
        <div className="mb-6 text-center">
          <div className="text-2xl font-semibold text-[#1F2440]">Welcome back</div>
          <div className="text-sm text-[#7A7F9A]">Sign in to continue</div>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <label className="block">
            <span className="text-sm text-[#4F5573]">Email</span>
            <input type="email" required value={email} onChange={e=>setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-[#E4E6EE] px-4 py-3 outline-none focus:border-[#7A5AF8]" placeholder="you@company.com" />
          </label>
          <label className="block">
            <span className="text-sm text-[#4F5573]">Password</span>
            <input type="password" required value={password} onChange={e=>setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-[#E4E6EE] px-4 py-3 outline-none focus:border-[#7A5AF8]" placeholder="••••••••" />
          </label>
          {err && <div className="text-sm text-red-600">{err}</div>}
          <button type="submit" disabled={loading}
            className="w-full rounded-xl py-3 font-medium bg-[#7A5AF8] text-white hover:opacity-95 disabled:opacity-60 transition">
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
          <div className="text-right">
            <Link href="/auth/forgot" className="text-sm text-[#7A5AF8] hover:underline">Forgot password?</Link>
          </div>
        </form>
        <div className="mt-6 text-center text-sm text-[#7A7F9A]">
          Don’t have an account? <Link href="/auth/signup" className="text-[#7A5AF8] hover:underline">Create one</Link>
        </div>
      </div>
    </main>
  );
}
