'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '../../components/api';

const colors = {
  bg: '#0f1115',
  card: '#141821',
  border: '#252a34',
  text: '#e9eaf0',
  sub: '#a7adbb',
  brand: '#9b7bd1',
  danger: '#e57373',
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [pwd, setPwd] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    try {
      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password: pwd }),
      }, { noAuthRedirect: true }); // important: don't redirect the login page

      const bodyText = await res.text();
      let body: any = null;
      try { body = JSON.parse(bodyText); } catch {}

      if (!res.ok) {
        const msg =
          body?.detail?.message ||
          body?.message ||
          bodyText ||
          `${res.status} ${res.statusText}`;
        setErr(String(msg).slice(0, 500));
        setLoading(false);
        return;
      }

      // Expect { ok: true, token, profile? }
      const token = body?.token || body?.access_token || body?.data?.token;
      if (!token) {
        setErr('No token returned by server.');
        setLoading(false);
        return;
      }

      // Save token (and optional business_id from profile)
      try {
        localStorage.setItem('auth_token', token);
        const biz =
          body?.profile?.business_id ||
          body?.profile?.id ||
          body?.business_id ||
          body?.data?.business_id;
        if (biz) localStorage.setItem('business_id', String(biz));
      } catch {}

      router.replace('/dashboard');
    } catch (e: any) {
      setErr(String(e?.message || e));
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'grid',
      placeItems: 'center',
      background: colors.bg,
      color: colors.text,
      padding: 16
    }}>
      <div style={{
        width: '100%',
        maxWidth: 440,
        background: colors.card,
        border: `1px solid ${colors.border}`,
        borderRadius: 16,
        padding: 24,
        boxShadow: '0 8px 30px rgba(0,0,0,0.25)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <span style={{ color: colors.brand, fontSize: 22 }}>𝌆</span>
          <div style={{ fontWeight: 800, letterSpacing: 0.3 }}>Enrich</div>
        </div>

        <h1 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 800 }}>Sign in</h1>
        <div style={{ color: colors.sub, fontSize: 14, marginBottom: 16 }}>Access your dashboard</div>

        {err && (
          <div style={{
            background: '#2a1719',
            border: '1px solid #5a2b30',
            color: colors.danger,
            padding: '10px 12px',
            borderRadius: 10,
            fontSize: 13,
            marginBottom: 12
          }}>
            {err}
          </div>
        )}

        <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12 }}>
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 13, color: colors.sub }}>Email</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
              placeholder="you@company.com"
            />
          </label>

          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 13, color: colors.sub }}>Password</span>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              style={inputStyle}
              placeholder="••••••••"
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '10px 12px',
              borderRadius: 10,
              border: `1px solid ${colors.brand}`,
              background: loading ? '#6f58a8' : colors.brand,
              color: '#fff',
              fontWeight: 800,
              cursor: loading ? 'progress' : 'pointer'
            }}
          >
            {loading ? 'Logging in…' : 'Log in'}
          </button>
        </form>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '10px 12px',
  borderRadius: 10,
  border: '1px solid #2a2f3a',
  background: '#0f131a',
  color: '#e9eaf0',
  outline: 'none',
  fontSize: 14,
};
