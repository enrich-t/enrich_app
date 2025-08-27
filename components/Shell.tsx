'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';

const colors = {
  bg: '#0f1115',
  text: '#e9eaf0',
  border: '#252a34',
};

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '/';

  // Hide the sidebar on the login page
  const hideSidebar = pathname.startsWith('/login');

  if (hideSidebar) {
    return (
      <div style={{ minHeight: '100vh', background: colors.bg, color: colors.text }}>
        {children}
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '240px 1fr',
        minHeight: '100vh',
        background: colors.bg,
        color: colors.text,
      }}
    >
      <aside
        style={{
          borderRight: `1px solid ${colors.border}`,
          padding: '22px 14px',
          position: 'sticky',
          top: 0,
          height: '100dvh',
        }}
      >
        <Sidebar />
      </aside>

      <main style={{ padding: '24px 26px', maxWidth: 1200, margin: '0 auto', width: '100%' }}>
        {children}
      </main>
    </div>
  );
}
