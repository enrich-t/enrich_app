'use client';

import React from 'react';
import Link from 'next/link';

const colors = {
  brand: '#9881b8', // use your primary color for accents
  text: '#e9eaf0',
  border: '#252a34',
  sub: '#a7adbb',
};

const navBtn: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  width: '100%',
  textAlign: 'left',
  padding: '10px 12px',
  borderRadius: 12,
  border: `1px solid ${colors.border}`,
  background: 'transparent',
  color: colors.text,
  fontWeight: 700,
  textDecoration: 'none',
  cursor: 'pointer',
};

function NavLink({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <Link href={href} style={navBtn}>
      <span>{icon}</span>
      <span>{label}</span>
    </Link>
  );
}

export default function Sidebar() {
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
        <NavLink href="/dashboard" icon="🏠" label="Overview" />
        <NavLink href="/generate" icon="➕" label="Report Generator" />
        <NavLink href="/my-reports" icon="📚" label="My Reports" />
        <NavLink href="#" icon="🪙" label="AI Tokens" />
        <NavLink href="#" icon="⚙️" label="Settings" />
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
