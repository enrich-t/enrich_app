'use client';

import React from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main style={styles.main}>
      <section style={styles.card}>
        <h1 style={{ marginTop: 0 }}>Something went wrong</h1>
        <p style={{ opacity: 0.9, whiteSpace: 'pre-wrap' }}>
          {(error?.message || 'A client-side error occurred.')}
        </p>
        <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
          <button onClick={() => reset()} style={styles.btn}>Try again</button>
          <a href="/login" style={{ ...styles.btn, textDecoration: 'none', display: 'inline-block' }}>Go to Login</a>
        </div>
      </section>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  main: { minHeight: '100svh', display: 'grid', placeItems: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 560, background: 'var(--card)', border: '1px solid var(--card-bd)', borderRadius: 12, padding: 20 },
  btn: { padding: '10px 14px', borderRadius: 10, border: '1px solid #2a2a2a', background: 'linear-gradient(180deg,#1c1c1f,#121214)', color: '#fff' },
};
