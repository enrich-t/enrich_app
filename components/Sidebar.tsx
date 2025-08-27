'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { apiFetch } from './api';
import { getBusinessId, getToken } from './auth';

const colors = {
  brand: '#9b7bd1',
  text: '#e9eaf0',
  border: '#252a34',
  sub: '#a7adbb',
};

const ghostBtn: React.CSSProperties = {
  padding: '8px 10px',
  borderRadius: 10,
  border: `1px solid ${colors.border}`,
  background: 'transparent',
  color: colors.sub,
  fontWeight: 700,
  cursor: 'pointer',
};

function NavItem({
  href,
  icon,
  label,
  onClick,
  active,
}: {
  href?: string;
  icon: string;
  label: string;
  onClick?: () => void;
  active?: boolean;
}) {
  const classStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    textAlign: 'left',
    padding: '10px 12px',
    borderRadius: 12,
    border: `1px solid ${active ? colors.brand : colors.border}`,
    background: active ? '#3d2f5a' : 'transparent',
    color: active ? '#efe7ff' : colors.text,
    fontWeight: 700,
    textDecoration: 'none',
    cursor: 'pointer',
  };

  if (href) {
    return (
      <Link href={href} style={classStyles}>
        <span>{icon}</span>
        <span>{label}</span>
      </Link>
    );
  }
  return (
    <button onClick={onClick} style={classStyles}>
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

export default function Sidebar() {
  const onGenerate = useMemo(
    () => async () => {
      const token = getToken();
      if (!token) {
        window.location.href = '/login';
        return;
      }
      const biz = getBusinessId();
      const payload: Record<string, any> = {
        business_id: String(biz || ''),
        report_type: 'business_overview',
        source: 'sidebar',
      };
      try {
        const res = await apiFetch('/api/reports/generate-business-overview', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const txt = await res.text();
          alert(`Generate failed: ${res.status} ${res.statusText}\n${txt.slice(0, 300)}`);
          return;
        }
        // After generating, send user to My Reports to see it
        window.location.href = '/my-reports';
      } catch (e: any) {
        alert(`Generate error: ${e?.message || e}`);
      }
    },
    []
  );

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
        <NavItem href="/dashboard" icon="🏠" label="Overview" />
        <NavItem icon="➕" label="Generate Report" onClick={onGenerate} />
        <NavItem href="/my-reports" icon="📚" label="My Reports" />
        <NavItem href="#" icon="🪙" label="AI Tokens" />
        <NavItem href="#" icon="⚙️" label="Settings" />
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
          style={ghostBtn}
        >
          Log out
        </button>
      </div>
    </>
  );
}
