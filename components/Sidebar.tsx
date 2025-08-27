'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const colors = {
  brand: '#9881b8',
  text: '#e9eaf0',
  border: '#252a34',
  sub: '#a7adbb',
  activeBg: '#2b2437',
};

type Item = { href: string; icon: string; label: string };

const NAV: Item[] = [
  { href: '/dashboard',  icon: '🏠', label: 'Overview' },
  { href: '/generate',   icon: '🧪', label: 'Report Generator' },
  { href: '/my-reports', icon: '📚', label: 'My Reports' },
  // renamed here ↓
  { href: '/ai-tokens',  icon: '💳', label: 'Memberships' },
  { href: '/settings',   icon: '⚙️', label: 'Settings' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontWeight: 800,
          letterSpacing: 0.3,
          marginBottom: 18,
        }}
      >
        <span style={{ color: colors.brand, fontSize: 22 }}>𝌆</span>
        <div>Dashboard</div>
      </div>

      <nav style={{ display: 'grid', gap: 8 }}>
        {NAV.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              style={{
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
              }}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

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
