'use client';

import React, { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { extractBusinessId, extractToken, safeJson, setBusinessId, setToken } from '../../components/auth';
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
      if (!token) {
        console.warn('[login] No string token in response. Raw:', data);
        throw new Error('Login succeeded, but no token was returned.');
      }
      setToken(token);

      let bizId = extractBusinessId(data);
      if (!bizId) {
        // Try /auth/me with the token we just stored
        const meRes = await fetch('/api/auth/me', {
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        });
        const me = await safeJson(meRes);
        if (meRes.ok) {
          bizId = extractBusinessId(me);
        } else {
          console.warn('[login] /auth/me failed', meRes.status, me);
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
      <section style={styles.card} aria-label="Login">
        <h1 style={styles.h1}>Log in</h1>
        <form onSubmit={submit} style={styles.form}>
          <label style={styles.label}>
            <span style={styles.labelText}>Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              autoComplete="email"
              style={styles.input}
            />
          </label>
          <label style={styles.label}>
            <span style={styles.labelText}>Password</span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              style={styles.input}
            />
          </label>
          <button type="submit" disabled={loading} style={styles.primaryBtn} aria-busy={loading}>
            {loading ? 'Logging in…' : 'Log in'}
          </button>
        </form>
        <p style={styles.helper}>
          Don’t have an account?{' '}
          <a href="/signup" style={styles.link}>Create one</a>
        </p>
      </section>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  main: { minHeight: '100svh', display: 'grid', placeItems: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 420, background: 'var(--card)', border: '1px solid var(--card-bd)', borderRadius: 12, padding: 24 },
  h1: { margin: '0 0 14px', fontSize: 24, color: 'var(--fg)' },
  form: { display: 'grid', gap: 12 },
  label: { display: 'grid', gap: 6 },
  labelText: { color: 'var(--fg)', fontSize: 14, opacity: 0.9 },
  input: { color: 'var(--fg)', background: 'var(--input-bg)', border: '1px solid var(--input-bd)', borderRadius: 8, padding: '10px 12px' },
  primaryBtn: { padding: '10px 14px', borderRadius: 10, border: '1px solid #2a2a2a', background: 'linear-gradient(180deg,#1c1c1f,#121214)', color: '#fff' },
  link: { color: 'var(--link)' },
  helper: { marginTop: 12, opacity: 0.9 },
};
