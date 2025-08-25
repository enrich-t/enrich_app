'use client';

import React, { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BUSINESS_ID_KEY, extractBusinessId, extractToken, safeJson, setBusinessId, setToken } from '../../components/auth';
import { ToastProvider, useToast } from '../../components/Toast';

export default function LoginPage() {
  return (
    <ToastProvider>
      <LoginContent />
    </ToastProvider>
  );
}

function LoginContent() {
  const { push } = useToast();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await safeJson(res);
      if (!res.ok) {
        throw new Error(typeof data === 'string' ? data : data?.message || 'Login failed');
      }
      const token = extractToken(data);
      if (token) setToken(token);

      let bizId = extractBusinessId(data);
      if (!bizId && token) {
        const meRes = await fetch('/api/auth/me', { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } });
        const me = await safeJson(meRes);
        if (meRes.ok) {
          bizId = me?.business_id || me?.data?.business_id || me?.profile?.business_id || null;
        }
      }
      if (bizId) setBusinessId(bizId);

      push({ title: 'Welcome back', description: 'Logged in successfully.' });
      router.replace('/dashboard');
    } catch (err: any) {
      console.error(err);
      push({ title: 'Login error', description: err?.message || 'Please try again.', tone: 'error' });
    } finally {
      setLoading(false);
    }
  }, [email, password, loading, push, router]);

  return (
    <main style={styles.main}>
      <section style={styles.card}>
        <h1 style={styles.h1}>Log in</h1>
        <form onSubmit={submit} style={styles.form}>
          <label style={styles.label}>
            <span style={styles.labelText}>Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              autoComplete="email"
              placeholder="you@company.com"
            />
          </label>
          <label style={styles.label}>
            <span style={styles.labelText}>Password</span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              autoComplete="current-password"
              placeholder="••••••••"
            />
          </label>
          <button type="submit" disabled={loading} style={styles.primaryBtn} aria-busy={loading}>
            {loading ? 'Logging in…' : 'Log in'}
          </button>
        </form>
        <p style={{ marginTop: 12, opacity: 0.9 }}>
          Don’t have an account?{' '}
          <a href="/signup" style={styles.link}>Create one</a>
        </p>
      </section>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  main: { minHeight: '100svh', display: 'grid', placeItems: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 420, background: 'var(--card)', border: '1px solid var(--card-bd)', borderRadius: 12, padding: 20 },
  h1: { margin: '0 0 12px', fontSize: 24 },
  form: { display: 'grid', gap: 12 },
  label: { display: 'grid', gap: 6 } as React.CSSProperties,
  labelText: { color: 'var(--fg)' },
  input: {
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid #323232',
    background: 'transparent',
    color: 'var(--fg)',
  },
  primaryBtn: { padding: '10px 14px', borderRadius: 10, border: '1px solid #2a2a2a', background: 'linear-gradient(180deg,#1c1c1f,#121214)', color: '#fff' },
  link: { color: 'var(--link)' },
};
