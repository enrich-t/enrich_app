'use client';

import React from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const msg = (error?.message && String(error.message)) || 'A client-side error occurred.';
  const stack = (error?.stack && String(error.stack)) || '';

  return (
    <main style={styles.main}>
      <section style={styles.card}>
        <h1 style={{ marginTop: 0 }}>Something went wrong</h1>
        <p style={{ opacity: 0.95, whiteSpace: 'pre-wrap' }}>{msg}</p>
        {stack && (
          <pre style={styles.pre}>
            {stack}
          </pre>
        )}
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
  card: { width: '100%', maxWidth: 720, background: 'var(--card)', border: '1px solid var(--card-bd)', borderRadius: 12, padding: 20 },
  btn: { padding: '10px 14px', borderRadius: 10, border: '1px solid #2a2a2a', background: 'linear-gradient(180deg,#1c1c1f,#121214)', color: '#fff' },
  pre: {
    marginTop: 8,
    padding: 12,
    borderRadius: 8,
    background: '#0b0c0e',
    border: '1px solid #22252a',
    maxHeight: 320,
    overflow: 'auto',
    fontSize: 12.5,
  },
};
