'use client';

import React, { useCallback } from 'react';
import { useRouter } from 'next/navigation';

export default function AppHeader() {
  const router = useRouter();
  const onLogout = useCallback(() => {
    router.replace('/login');
  }, [router]);

  return (
    <header style={styles.header}>
      <div style={{ fontWeight: 700 }}>Enrich</div>
      <button onClick={onLogout} style={styles.btn} aria-label="Log out">
        Log out
      </button>
    </header>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 24px',
    borderBottom: '1px solid #222',
    background: 'var(--nav-bg, #0c0d0e)',
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  btn: {
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid #333',
    background: 'transparent',
    color: 'inherit',
    cursor: 'pointer',
  },
};
