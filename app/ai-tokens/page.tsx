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
  uiText: '#e9eaf0',
  muted: '#a7adbb',
  card: '#141821',
  border: '#252a34',
};

type Balance = {
  plan: 'Free' | 'Grow' | 'Thrive';
  total: number;
  remaining: number;
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

const TOPUPS = [
  { qty: 10, price: '$10', per: '$1.00', badge: '' },
  { qty: 25, price: '$20', per: '$0.80', badge: 'Best Value' },
];

/* -------------------- atoms -------------------- */

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
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
  return <h1 style={{ margin: 0, fontSize: 32, fontWeight: 900, color: brand.uiText }}>{children}</h1>;
}
function Muted({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ color: brand.muted, ...(style || {}) }}>{children}</div>;
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

  // load real numbers (quietly keeps defaults if not ready)
  const load = useMemo(
    () => async () => {
      try {
        const r = await apiFetch('/api/tokens/balance', { method: 'GET', cache: 'no-store' });
        const txt = await r.text();
        let j: any = null;
        try { j = JSON.parse(txt); } catch {}
        if (!r.ok) return;
        const data = j?.data ?? j ?? {};
        const remaining = Number(data.credits_remaining ?? 12);
        const total = Number(data.credits_total ?? 30);
        const planName = String(data.plan_name ?? 'Grow');
        const norm = (['Free', 'Grow', 'Thrive'] as const).includes(planName as any) ? (planName as any) : 'Grow';
        setBalance({ plan: norm, total, remaining });
      } catch {}
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
      {/* Current Plan (dark card, consistent with dashboard) */}
      <Card style={{ borderColor: '#ffffff12' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: 18 }}>Current Plan:</div>
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
              <div style={{ height: 10, borderRadius: 6, background: '#dfe2ea32', position: 'relative', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${clamp(100 - (100 - pct), 0, 100)}%`,
                    height: '100%',
                    background: `linear-gradient(90deg, ${brand.primary}, ${brand.secondary})`,
                  }}
                />
              </div>
            </div>

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
              <b>Need more?</b> When you&apos;re ready, switch to <span style={{ color: '#cdb7ff', fontWeight: 900 }}>Thrive</span> to share more impact stories.
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              style={btn.outline(brand.primary)}
              onClick={() => document.getElementById('plans')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              disabled={busy}
            >
              View Plans
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

      {/* Light HERO only */}
      <div
        style={{
          background: '#ffffff',
          color: '#1a1a1a',
          borderRadius: 18,
          padding: 28,
          border: '1px solid #eee',
          marginTop: 18,
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            gap: 8,
            alignItems: 'center',
            padding: '6px 12px',
            borderRadius: 999,
            border: '1px solid #e8f1df',
            background: '#f6fbef',
            color: '#597346',
            fontWeight: 800,
          }}
        >
          ðŸŒ¿ Responsible Growth Platform
        </div>

        <h2
          style={{
            margin: '14px 0 8px',
            fontSize: 40,
            color: '#7f69a6',
            fontWeight: 900,
            letterSpacing: 0.2,
          }}
        >
          Track Your Impact, Your Way
        </h2>

        <div style={{ color: '#6c7280', maxWidth: 960, fontSize: 18 }}>
          Whether you&apos;re just starting out or ready to lead the way, Enrich helps you grow responsibly.
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 18 }}>
          <button style={btn.solid(brand.primary)} onClick={() => changePlan('free')} disabled={busy}>
            Start Free â†’
          </button>
          <button
            style={btn.outline(brand.secondary)}
            onClick={() => document.getElementById('plans')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          >
            View Plans
          </button>
        </div>
      </div>

      {/* Plans (dark tiles) */}
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
              <Card key={p.id} style={{ borderWidth: 2, borderColor: isGrow ? c : brand.border }}>
                {p.badge && (
                  <div style={{ display: 'grid', placeItems: 'center', marginTop: -6, marginBottom: 6 }}>
                    <span
                      style={{
                        background: '#2a2435',
                        border: `1px solid ${c}`,
                        color: '#e8dbff',
                        padding: '6px 12px',
                        borderRadius: 999,
                        fontSize: 12,
                        fontWeight: 900,
                      }}
                    >
                      {p.badge}
                    </span>
                  </div>
                )}
                <div style={{ color: brand.primary, fontWeight: 900, textAlign: 'center', marginBottom: 8 }}>
                  {p.name}
                </div>
                <div style={{ fontSize: 30, fontWeight: 900, textAlign: 'center', color: brand.uiText }}>{p.price}</div>
                <div style={{ color: brand.third, fontWeight: 900, textAlign: 'center', marginTop: 4 }}>
                  {p.credits} credits
                </div>

                <ul style={{ marginTop: 14, marginBottom: 16, paddingLeft: 18, color: brand.muted }}>
                  {p.features.map((f) => (
                    <li key={f} style={{ marginBottom: 8 }}>{f}</li>
                  ))}
                </ul>

                <button style={{ ...btn.solid(c), width: '100%' }} onClick={() => changePlan(p.id)} disabled={busy}>
                  {p.cta}
                </button>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Top-Ups (dark tiles) */}
      <div id="topups" style={{ marginTop: 28 }}>
        <h2 style={{ margin: 0, fontSize: 28, fontWeight: 900, color: brand.uiText }}>Top-Up Credits</h2>
        <Muted style={{ marginTop: 6 }}>Need more credits? Purchase additional credits anytime</Muted>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 16,
            marginTop: 16,
          }}
        >
          {TOPUPS.map((t, i) => {
            const isBest = !!t.badge;
            return (
              <Card
                key={i}
                style={{
                  borderWidth: 2,
                  borderColor: isBest ? brand.secondary : brand.border,
                  position: 'relative',
                  boxShadow: isBest ? '0 12px 40px rgba(229,197,100,0.10)' : 'none',
                }}
              >
                {isBest && (
                  <div style={{ position: 'absolute', left: 14, top: 14 }}>
                    <span
                      style={{
                        background: '#2a281e',
                        border: `1px solid ${brand.secondary}`,
                        color: '#f3e2a4',
                        padding: '4px 10px',
                        borderRadius: 999,
                        fontSize: 12,
                        fontWeight: 900,
                      }}
                    >
                      {t.badge}
                    </span>
                  </div>
                )}
                <div style={{ color: brand.primary, fontWeight: 900, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 20 }}>ï¼‹</span> {t.qty} Credits
                </div>
                <div style={{ fontSize: 30, fontWeight: 900, marginTop: 6, color: brand.uiText }}>{t.price}</div>
                <div style={{ color: brand.muted, marginTop: 2 }}>{t.per} per credit</div>

                <button
                  style={{ ...btn.solid(brand.third), width: '100%', marginTop: 12 }}
                  onClick={() => topUp(t.qty)}
                  disabled={busy}
                >
                  Top-Up Credits
                </button>
              </Card>
            );
          })}
        </div>

        <div style={{ textAlign: 'center', color: brand.muted, marginTop: 18 }}>
          Credits never expire and can be used across all features
        </div>
      </div>

      {/* How Credits Work (dark tiles) */}
      <div style={{ marginTop: 28 }}>
        <h2 style={{ margin: 0, fontSize: 28, fontWeight: 900, color: brand.uiText }}>How Credits Work</h2>
        <Muted style={{ marginTop: 6 }}>
          Transparent pricing for every action. Use credits across all features with no hidden fees.
        </Muted>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 16,
            marginTop: 16,
          }}
        >
          <Card style={{ display: 'grid', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: '#2b2437',
                  color: brand.primary,
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 20,
                }}
              >
                ðŸ“·
              </div>
              <div style={{ fontWeight: 900 }}>Snapshot / Social Export</div>
              <span
                style={{
                  marginLeft: 'auto',
                  background: '#332c1a',
                  border: `1px solid ${brand.secondary}`,
                  color: '#f3e2a4',
                  padding: '4px 10px',
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 900,
                }}
              >
                3 credits
              </span>
            </div>
            <div style={{ color: brand.muted }}>
              Generate shareable content for social media and quick reports
            </div>
          </Card>

          <Card style={{ display: 'grid', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: '#2b2437',
                  color: brand.primary,
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 20,
                }}
              >
                ðŸ“„
              </div>
              <div style={{ fontWeight: 900 }}>Full Business Overview Report</div>
              <span
                style={{
                  marginLeft: 'auto',
                  background: '#332c1a',
                  border: `1px solid ${brand.secondary}`,
                  color: '#f3e2a4',
                  padding: '4px 10px',
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 900,
                }}
              >
                5 credits
              </span>
            </div>
            <div style={{ color: brand.muted }}>
              Comprehensive business analysis and detailed impact reporting
            </div>
          </Card>
        </div>

        <Card
          style={{
            marginTop: 18,
            background: 'linear-gradient(180deg,#1a1526,#151b1a)',
            borderColor: '#34284c',
          }}
        >
          <div style={{ fontWeight: 900, color: brand.primary, marginBottom: 8 }}>âš¡ Pro Tips</div>
          <ul style={{ margin: 0, paddingLeft: 18, color: brand.muted }}>
            <li>Credits roll over month to month â€” they never expire</li>
            <li>Start with social exports to test the platform before full reports</li>
            <li>Upgrade plans include bonus credits for better value</li>
          </ul>
        </Card>
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

