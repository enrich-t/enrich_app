'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { apiFetch } from './api';
import { getToken } from './auth';

const colors = {
  brand: '#9881b8',
  text: '#e9eaf0',
  border: '#252a34',
  sub: '#a7adbb',
  activeBg: '#2b2437',
};

type Profile = {
  business_name?: string;
  industry?: string;
  brand_primary_color?: string;
  brand_secondary_color?: string;
  logo_url?: string;
  // Some backends might include credits here, but we’ll also fetch balance:
  credits_remaining?: number;
};

type Balance = {
  credits_total?: number;
  credits_used?: number;
  credits_remaining?: number;
  plan_name?: string;
};

type Item = { href: string; icon: string; label: string };

const NAV: Item[] = [
  { href: '/dashboard',  icon: '🏠', label: 'Overview' },
  { href: '/generate',   icon: '🧪', label: 'Report Generator' },
  { href: '/my-reports', icon: '📚', label: 'My Reports' },
  { href: '/ai-tokens',  icon: '💳', label: 'Memberships' },
  { href: '/settings',   icon: '⚙️', label: 'Settings' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [credits, setCredits] = useState<number | null>(null);

  useEffect(() => {
    const load = async () => {
      const t = getToken();
      if (!t) return;

      // 1) Profile
      try {
        const r = await apiFetch('/api/auth/me', { method: 'GET', cache: 'no-store' });
        const txt = await r.text();
        let j: any = null;
        try { j = JSON.parse(txt); } catch {}
        if (r.ok) setProfile(j?.profile || {});
        if (j?.profile?.credits_remaining != null) {
          setCredits(Number(j.profile.credits_remaining));
        }
      } catch { /* ignore */ }

      // 2) Balance (authoritative for credits)
      try {
        const r = await apiFetch('/api/tokens/balance', { method: 'GET', cache: 'no-store' });
        const txt = await r.text();
        let j: Balance | any = null;
        try { j = JSON.parse(txt); } catch {}
        const data = (j?.data ?? j) as Balance;
        if (data && data.credits_remaining != null) {
          setCredits(Number(data.credits_remaining));
        }
      } catch { /* ignore */ }
    };

    load();
  }, []);

  const activeLinkStyle = (active: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    textAlign: 'left',
    padding: '10px 12px',
    borderRadius: 12,
    border: `1px solid ${colors.border}`,
    background: active ? colors.activeBg : 'transparent',
    color: active ? '#fff' : colors.text,
    fontWeight: 700,
    textDecoration: 'none',
    cursor: 'pointer',
  });

  return (
    <>
      {/* Header with business info (clickable to /profile) */}
      <Link href="/profile" style={{ textDecoration: 'none', color: 'inherit' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px',
            borderRadius: 12,
            border: `1px solid ${colors.border}`,
            marginBottom: 18,
            cursor: 'pointer',
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: profile?.brand_primary_color || colors.brand,
              display: 'grid',
              placeItems: 'center',
              color: '#fff',
              fontWeight: 900,
              fontSize: 18,
              overflow: 'hidden',
            }}
          >
            {profile?.logo_url ? (
              <img
                src={profile.logo_url}
                alt="logo"
                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 12 }}
              />
            ) : (
              (profile?.business_name?.[0] || '🏢')
            )}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 900, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {profile?.business_name || 'Your Business'}
            </div>
            <div style={{ color: colors.sub, fontSize: 12 }}>
              {profile?.industry || 'Industry'}
            </div>
            <div style={{ marginTop: 4, fontSize: 12, fontWeight: 700, color: colors.text }}>
              AI Credits: {credits != null ? credits : '—'}
            </div>
          </div>
        </div>
      </Link>

      {/* Nav */}
      <nav style={{ display: 'grid', gap: 8 }}>
        {NAV.map(({ href, icon, label }) => {
          const active = pathname === href;
          return (
            <Link key={href} href={href} aria-current={active ? 'page' : undefined} style={activeLinkStyle(active)}>
              <span>{icon}</span>
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div style={{ marginTop: 18 }}>
        <button
          onClick={() => {
            try {
              localStorage.removeItem('auth_token');
              localStorage.removeItem('business_id');
            } catch {}
            window.location.href = '/login';
          }}
          style={{
            padding: '8px 10px',
            borderRadius: 10,
            border: `1px solid ${colors.border}`,
            background: 'transparent',
            color: colors.sub,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Log out
        </button>
      </div>
    </>
  );
}
