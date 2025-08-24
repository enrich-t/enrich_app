'use client';

import React, { useCallback, useState } from 'react';
import { useToast } from './Toast';

type Props = {
  onGenerate: () => Promise<any>;
  onDone?: () => Promise<any> | void;
};

export default function GenerateReportButton({ onGenerate, onDone }: Props) {
  const { push } = useToast();
  const [loading, setLoading] = useState(false);

  const handleClick = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    try {
      await onGenerate();
      push({ title: 'Report requested', description: 'We’ll refresh your list shortly.' });
      await onDone?.();
    } catch (err: any) {
      console.error(err);
      push({
        title: 'Generation failed',
        description: err?.message || 'Please try again.',
        tone: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [loading, onGenerate, onDone, push]);

  return (
    <button
      onClick={handleClick}
      style={{
        padding: '10px 14px',
        borderRadius: 10,
        border: '1px solid #2a2a2a',
        background: loading ? '#1a1a1a' : 'linear-gradient(180deg,#1c1c1f,#121214)',
        color: '#fff',
        cursor: loading ? 'not-allowed' : 'pointer',
        minWidth: 160,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
      }}
      disabled={loading}
      aria-disabled={loading}
      aria-busy={loading}
    >
      {loading && <Spinner />}
      {loading ? 'Generating…' : 'Generate Report'}
    </button>
  );
}

function Spinner() {
  return (
    <span
      aria-hidden
      style={{
        width: 14,
        height: 14,
        borderRadius: '50%',
        border: '2px solid #ffffff40',
        borderTopColor: '#fff',
        display: 'inline-block',
        animation: 'spin 0.9s linear infinite',
      }}
    />
  );
}

// Inject keyframes once on client
if (typeof document !== 'undefined') {
  const id = 'gen-btn-spin-keyframes';
  if (!document.getElementById(id)) {
    const style = document.createElement('style');
    style.id = id;
    style.textContent = `
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
  }
}
