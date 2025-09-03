'use client';

import React, { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ToastProvider, useToast } from '../../components/Toast';

export default function SignupPage() {
  return (
    <ToastProvider>
      <SignupContent />
    </ToastProvider>
  );
}

function SignupContent() {
  const { push } = useToast();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      // Keep the payload tiny; your backend can accept more fields later
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          // optional profile scaffold:
          business_name: businessName || undefined,
        }),
      });
      const data = await safeJson(res);
      if (!res.ok) {
        throw new Error(typeof data === 'string' ? data : data?.message || 'Signup failed');
      }
      push({ title: 'Account created', description: 'Please log in.' });
      router.replace('/login');
    } catch (err: any) {
      console.error(err);
      push({ title: 'Signup error', description: err?.message || 'Please try again.', tone: 'error' });
    } finally {
      setLoading(false);
    }
  }, [email, password, businessName, loading, push, router]);

  return (
    <main style={styles.main}>
      <section style={styles.card}>
        <h1 style={styles.h1}>Create account</h1>
        <form onSubmit={submit} style={styles.form}>
          <label style={styles.label}>
            <span>Business name (optional)</span>
            <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} style={styles.input} />
          </label>
          <label style={styles.label}>
            <span>Email</span>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} style={styles.input} autoComplete="email" />
          </label>
          <label style={styles.label}>
            <span>Password</span>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} style={styles.input} autoComplete="new-password" />
          </label>
          <button type="submit" disabled={loading} style={styles.primaryBtn} aria-busy={loading}>
            {loading ? 'Creatingâ€¦' : 'Sign up'}
          </button>
        </form>
        <p style={{ marginTop: 12, opacity: 0.8 }}>
          Already have an account?{' '}
          <a href="/login" style={styles.link}>Log in</a>
        </p>
      </section>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  main: { minHeight: '100svh', display: 'grid', placeItems: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 420, background: '#111213', border: '1px solid #2a2a2a', borderRadius: 12, padding: 20 },
  h1: { margin: '0 0 12px', fontSize: 24 },
  form: { display: 'grid', gap: 12 },
  label: { display: 'grid', gap: 6 } as React.CSSProperties,
  input: { padding: '10px 12px', borderRadius: 8, border: '1px solid #323232', background: 'transparent', color: 'inherit' },
  primaryBtn: { padding: '10px 14px', borderRadius: 10, border: '1px solid #2a2a2a', background: 'linear-gradient(180deg,#1c1c1f,#121214)', color: '#fff', cursor: 'pointer' },
  link: { color: '#7fb5ff' },
};

function safeJson(res: Response): Promise<any> {
  return (res as any).text?.().then(t => { try { return JSON.parse(t ?? ""); } catch { return t; } });
}

