'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '../../components/api';
import { getBusinessId, getToken } from '../../components/auth';

const brand = {
  primary: '#9881b8',   // figma
  secondary: '#e5c564', // figma
  third: '#aec483',     // figma
  bg: '#0f1115',
  text: '#0c0c0c',      // light section titles in hero
  darkText: '#1a1a1a',
  uiText: '#e9eaf0',    // dashboard text
  muted: '#a7adbb',
  card: '#141821',
  surface: '#fbfbfd',
  border: '#252a34',
};

type Balance = {
  plan: 'Free' | 'Grow' | 'Thrive';
  total: number;      // plan monthly allotment
  remaining: number;  // remaining this period
};

type Plan = {
  id: 'free' | 'grow' | 'thrive';
  name: string;
  price: string;
  credits: number;
  features: string[];
  cta: string;
  badge?: 'Most Popular';
  tone: 'primary' | 'secondary' | 'third';
};

const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Start',
    price: 'Free',
    credits: 5,
    features: [
      '5 AI credits per month',
      'Basic reporting tools',
      'Community support',
      'Getting started resources',
    ],
    cta: 'Start Free',
    tone: 'third',
  },
  {
    id: 'grow',
    name: 'Grow',
    price: '$29 / month',
    credits: 30,
    features: [
      '30 AI credits per month',
      'Social media exports',
      'Progress tracking',
      'Community engagement tools',
      'Priority support',
    ],
    cta: 'Grow With Us',
    tone: 'primary',
    badge: 'Most Popular',
  },
  {
    id: 'thrive',
    name: 'Thrive',
    price: '$49 / month',
    credits: 100,
    features: [
      '100 AI credits per month',
      'Advanced reporting suite',
      'Leadership showcasing tools',
      'Comprehensive analytics',
      'Dedicated support',
      'Custom integrations',
    ],
    cta: 'Thrive With Enrich',
    tone: 'secondary',
  },
];

const TopUps = [
  { qty: 10, price: '$10', per: '$1.00', badge: '' },
  { qty: 25, price: '$20', per: '$0.80', badge: 'Best Value' },
];

/* -------------------- tiny atoms -------------------- */

function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        background: brand.card,
        border: `1px solid ${brand.border}`,
        borderRadius: 16,
        padding: 18,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function H1({ children }: { children: React.ReactNode }) {
  return (
    <h1 style={{ margin: 0, fontSize: 32, fontWeight: 900, color: brand.uiText }}>
      {children}
    </h1>
  );
}

function Muted({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ color: brand.muted, ...(style || {}) }}>{children}</div>
  );
}

const btn = {
  solid: (c: string): React.CSSProperties => ({
    padding: '10px 16px',
    borderRadius: 12,
    border: `1px solid ${c}`,
    background: c,
    color: '#fff',
    fontWeight: 900,
    cursor: 'pointer',
  }),
  outline: (c: string): React.CSSProperties => ({
    padding: '10px 16px',
    borderRadius: 12,
    border: `1px solid ${c}`,
    background: 'transparent',
    color: c,
    fontWeight: 900,
    cursor: 'pointer',
  }),
  ghost: {
    padding: '10px 16px',
    borderRadius: 12,
    border: `1px solid ${brand.border}`,
    background: 'transparent',
    color: brand.uiText,
    fontWeight: 800,
    cursor: 'pointer',
  } as React.CSSProperties,
};

/* -------------------- helpers -------------------- */

function toneColor(t: Plan['tone']) {
  return t === 'primary' ? brand.primary : t === 'secondary' ? brand.secondary : brand.third;
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

/* -------------------- page -------------------- */

export default function AiTokensPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null);

  const [balance, setBalance] = useState<Balance>({ plan: 'Grow', total: 30, remaining: 12 });

  // auth guard
  useEffect(() => {
    const t = getToken();
    if (!t || !t.trim()) router.replace('/login');
  }, [router]);

  // load real numbers (safe to keep if your backend isn’t ready)
  const load = useMemo(
    () => async () => {
      try {
        const r = await apiFetch('/api/tokens/balance', { method: 'GET', cache: 'no-store' });
        const txt = await r.text();
        let j: any = null;
        try { j = JSON.parse(txt); } catch {}
        if (!r.ok) return; // keep defaults quietly
        const data = j?.data ?? j ?? {};
        const remaining = Number(data.credits_remaining ?? 12);
        const total = Number(data.credits_total ?? 30);
        const planName = String(data.plan_name ?? 'Grow');
        setBalance({ plan: (['Free','Grow','Thrive'] as const).includes(planName as any) ? (planName as any) : 'Grow', total, remaining });
      } catch { /* noop */ }
    },
    []
  );

  useEffect(() => { load(); }, [load]);

  const percentUsed = balance.total > 0 ? ((balance.total - balance.remaining) / balance.total) * 100 : 0;
  const pct = clamp(Math.round(percentUsed), 0, 100);

  async function topUp(qty: number) {
    setBusy(true); setToast(null);
    try {
      const r = await apiFetch('/api/tokens/topup', {
        method: 'POST',
        body: JSON.stringify({ amount: qty, business_id: getBusinessId() || process.env.NEXT_PUBLIC_BUSINESS_ID }),
      });
      const ok = r.ok;
      setToast({ kind: ok ? 'ok' : 'err', msg: ok ? `Added ${qty} credits.` : `Top-up failed (${r.status})` });
      if (ok) await load();
    } catch (e: any) {
      setToast({ kind: 'err', msg: e?.message || 'Network error' });
    } finally {
      setBusy(false);
    }
  }

  async function changePlan(planId: Plan['id']) {
    setBusy(true); setToast(null);
    try {
      const r = await apiFetch('/api/tokens/plan', {
        method: 'POST',
        body: JSON.stringify({ plan_id: planId, business_id: getBusinessId() || process.env.NEXT_PUBLIC_BUSINESS_ID }),
      });
      const ok = r.ok;
      setToast({ kind: ok ? 'ok' : 'err', msg: ok ? `Plan updated to ${planId}.` : `Plan change failed (${r.status})` });
      if (ok) await load();
    } catch (e: any) {
      setToast({ kind: 'err', msg: e?.message || 'Network error' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ color: brand.uiText }}>
      {/* Current Plan card (gradient, meter, actions) */}
      <Card style={{
        background: 'linear-gradient(180deg,#ffffff06,#ffffff03)',
        borderColor: '#ffffff12',
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: 18, color: '#fff' }}>Current Plan:</div>
              <span style={{
                background: '#d8c8f4', color: '#4f3c7a',
                padding: '4px 10px', borderRadius: 999, fontWeight: 800, fontSize: 12
              }}>
                {balance.plan}
              </span>
            </div>

            <div style={{ marginTop: 14, color: brand.muted }}>
              <span>Credits Remaining: </span>
              <span style={{ fontSize: 28, fontWeight: 900, color: '#fff' }}>{balance.remaining}</span>
              <span> of {balance.total}</span>
            </div>

            {/* meter */}
            <div style={{ marginTop: 12 }}>
              <div style={{ height: 10, borderRadius: 6, background: '#dfe2ea32', position: 'relative' }}>
                <div
                  style={{
                    width: `${100 - pct}%`,
                    height: 10,
                    borderRadius: 6,
                    background: '#dfe2ea32',
                    position: 'absolute',
                    right: 0,
                    top: 0,
                  }}
                />
                <div
                  style={{
                    width: `${100 - pct}%`,
                    height: 10,
                    borderRadius: 6,
                    background: 'transparent',
                  }}
                />
                <div
                  style={{
                    width: `${clamp(100 - (100 - pct), 0, 100)}%`,
                    height: 10,
                    borderRadius: 6,
                    background: `linear-gradient(90deg, ${brand.primary}, ${brand.secondary})`,
                  }}
                />
              </div>
            </div>

            {/* helper note */}
            <div
              style={{
                marginTop: 16,
                background: '#eef5e8',
                border: '1px solid #d6e7c9',
                color: '#314323',
                borderRadius: 12,
                padding: '12px 14px',
                maxWidth: 780,
              }}
            >
              <b>Need more?</b> When you&apos;re ready, switch to <span style={{ color: '#6b5aa0', fontWeight: 900 }}>Thrive</span> to share more impact stories.
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              style={btn.outline(brand.primary)}
              onClick={() => document.getElementById('topups')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              disabled={busy}
            >
              Top-Up Credits
            </button>
            <button
              style={btn.solid(brand.secondary)}
              onClick={() => changePlan('thrive')}
              disabled={busy}
            >
              Upgrade Plan
            </button>
          </div>
        </div>
      </Card>

      {/* Hero (headline + CTAs) */}
      <div style={{
        background: '#ffffff',
        color: brand.text,
        borderRadius: 18,
        padding: 28,
        border: '1px solid #eee',
        marginTop: 18,
      }}>
        <div style={{
          display: 'inline-flex',
          gap: 8,
          alignItems: 'center',
          padding: '6px 12px',
          borderRadius: 999,
          border: '1px solid #e8f1df',
          background: '#f6fbef',
          color: '#597346',
          fontWeight: 800,
        }}>
          🌿 Responsible Growth Platform
        </div>

        <h2 style={{
          margin: '14px 0 8px',
          fontSize: 44,
          color: '#7f69a6',
          fontWeight: 900,
          letterSpacing: 0.2,
        }}>
          Track Your Impact, Your Way
        </h2>

        <div style={{ color: '#6c7280', maxWidth: 960, fontSize: 18 }}>
          Whether you&apos;re just starting out or ready to lead the way, Enrich helps you grow responsibly.
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 18 }}>
          <button style={btn.solid(brand.primary)} onClick={() => changePlan('free')} disabled={busy}>
            Start Free →
          </button>
          <button
            style={btn.outline(brand.secondary)}
            onClick={() => document.getElementById('plans')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          >
            View Plans
          </button>
        </div>
      </div>

      {/* Plans */}
      <div id="plans" style={{ marginTop: 28 }}>
        <H1>Plans</H1>
        <Muted style={{ marginTop: 6 }}>Choose the plan that fits your impact journey</Muted>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 16,
            marginTop: 16,
          }}
        >
          {PLANS.map((p) => {
            const c = toneColor(p.tone);
            const isGrow = p.id === 'grow';
            return (
              <div
                key={p.id}
                style={{
                  background: '#ffffff',
                  borderRadius: 16,
                  border: `2px solid ${isGrow ? c : '#eee'}`,
                  boxShadow: isGrow ? '0 12px 40px rgba(152,129,184,0.15)' : 'none',
                  padding: 22,
                }}
              >
                {p.badge && (
                  <div style={{ display: 'grid', placeItems: 'center', marginTop: -30, marginBottom: 10 }}>
                    <span style={{
                      background: '#f6f0ff',
                      border: `1px solid ${c}55`,
                      color: '#6b5aa0',
                      padding: '6px 12px',
                      borderRadius: 999,
                      fontSize: 12,
                      fontWeight: 900,
                    }}>{p.badge}</span>
                  </div>
                )}
                <div style={{ color: '#7f69a6', fontWeight: 900, textAlign: 'center', marginBottom: 8 }}>{p.name}</div>
                <div style={{ fontSize: 34, fontWeight: 900, textAlign: 'center' }}>{p.price}</div>
                <div style={{ color: '#83a06b', fontWeight: 900, textAlign: 'center', marginTop: 4 }}>
                  {p.credits} credits
                </div>

                <ul style={{ marginTop: 14, marginBottom: 16, paddingLeft: 18, color: '#5a5f6a' }}>
                  {p.features.map((f) => (
                    <li key={f} style={{ marginBottom: 8 }}>{f}</li>
                  ))}
                </ul>

                <button
                  style={{ ...btn.solid(c), width: '100%' }}
                  onClick={() => changePlan(p.id)}
                  disabled={busy}
                >
                  {p.cta}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top-Ups */}
      <div id="topups" style={{ marginTop: 28 }}>
        <h2 style={{ margin: 0, fontSize: 28, fontWeight: 900, color: '#7f69a6' }}>Top-Up Credits</h2>
        <div style={{ color: '#6c7280', marginTop: 6 }}>
          Need more credits? Purchase additional credits anytime
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 16,
            marginTop: 16,
          }}
        >
          {TopUps.map((t, i) => {
            const isBest = !!t.badge;
            return (
              <div
                key={i}
                style={{
                  background: '#ffffff',
                  borderRadius: 16,
                  border: `2px solid ${isBest ? brand.secondary : '#eee'}`,
                  padding: 22,
                  position: 'relative',
                  boxShadow: isBest ? '0 12px 40px rgba(229,197,100,0.18)' : 'none',
                }}
              >
                {isBest && (
                  <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', top: -12 }}>
                    <span style={{
                      background: '#fff8e1',
                      border: `1px solid ${brand.secondary}`,
                      color: '#7d6424',
                      padding: '4px 10px',
                      borderRadius: 999,
                      fontSize: 12,
                      fontWeight: 900,
                    }}>
                      {t.badge}
                    </span>
                  </div>
                )}
                <div style={{ color: '#7f69a6', fontWeight: 900, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 20 }}>＋</span> {t.qty} Credits
                </div>
                <div style={{ fontSize: 34, fontWeight: 900, marginTop: 6 }}>{t.price}</div>
                <div style={{ color: '#6c7280', marginTop: 2 }}>{t.per} per credit</div>

                <button
                  style={{ ...btn.solid(brand.third), width: '100%', marginTop: 12 }}
                  onClick={() => topUp(t.qty)}
                  disabled={busy}
                >
                  Top-Up Credits
                </button>
              </div>
            );
          })}
        </div>

        <div style={{ textAlign: 'center', color: '#6c7280', marginTop: 18 }}>
          Credits never expire and can be used across all features
        </div>
      </div>

      {/* How Credits Work */}
      <div style={{ marginTop: 28 }}>
        <h2 style={{ margin: 0, fontSize: 28, fontWeight: 900, color: '#7f69a6' }}>How Credits Work</h2>
        <div style={{ color: '#6c7280', marginTop: 6 }}>
          Transparent pricing for every action. Use credits across all features with no hidden fees.
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 16,
            marginTop: 16,
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 16,
              border: '1px solid #eee',
              padding: 18,
              display: 'grid',
              gap: 8,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: '#efe9fb', color: '#7f69a6',
                display: 'grid', placeItems: 'center', fontSize: 20,
              }}>📷</div>
              <div style={{ fontWeight: 900 }}>Snapshot / Social Export</div>
              <span style={{
                marginLeft: 'auto',
                background: '#fff2c2',
                border: `1px solid ${brand.secondary}`,
                color: '#7d6424',
                padding: '4px 10px',
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 900,
              }}>3 credits</span>
            </div>
            <div style={{ color: '#6c7280' }}>
              Generate shareable content for social media and quick reports
            </div>
          </div>

          <div
            style={{
              background: '#ffffff',
              borderRadius: 16,
              border: '1px solid #eee',
              padding: 18,
              display: 'grid',
              gap: 8,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: '#efe9fb', color: '#7f69a6',
                display: 'grid', placeItems: 'center', fontSize: 20,
              }}>📄</div>
              <div style={{ fontWeight: 900 }}>Full Business Overview Report</div>
              <span style={{
                marginLeft: 'auto',
                background: '#fff2c2',
                border: `1px solid ${brand.secondary}`,
                color: '#7d6424',
                padding: '4px 10px',
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 900,
              }}>5 credits</span>
            </div>
            <div style={{ color: '#6c7280' }}>
              Comprehensive business analysis and detailed impact reporting
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: 18,
            background: 'linear-gradient(180deg,#faf5ff,#f9fbf2)',
            border: '1px solid #eee',
            borderRadius: 16,
            padding: 18,
            color: '#6c7280',
          }}
        >
          <div style={{ fontWeight: 900, color: '#7f69a6', marginBottom: 8 }}>⚡ Pro Tips</div>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            <li>Credits roll over month to month — they never expire</li>
            <li>Start with social exports to test the platform before full reports</li>
            <li>Upgrade plans include bonus credits for better value</li>
          </ul>
        </div>
      </div>

      {/* footer */}
      <div style={{ color: '#6c7280', textAlign: 'center', marginTop: 28 }}>
        Built for responsible tourism businesses who want to track their impact authentically.
        <br />
        Questions about credits or plans?{' '}
        <a href="#" style={{ color: '#7f69a6', fontWeight: 900 }}>Contact our support team</a>
      </div>

      {/* toast */}
      {toast && (
        <div
          role="status"
          style={{
            position: 'fixed',
            right: 16,
            bottom: 16,
            background: toast.kind === 'ok' ? '#1e3a26' : '#3a1c1c',
            border: `1px solid ${toast.kind === 'ok' ? '#2f6a3b' : '#764343'}`,
            color: '#fff',
            padding: '10px 12px',
            borderRadius: 10,
            maxWidth: 520,
            boxShadow: '0 6px 20px rgba(0,0,0,0.4)',
            zIndex: 1000,
          }}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}
