'use client';

import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

type ToastTone = 'default' | 'success' | 'error';
type ToastItem = {
  id: string;
  title: string;
  description?: string;
  tone?: ToastTone;
  ttlMs?: number;
};

type ToastContextValue = {
  push: (t: Omit<ToastItem, 'id'>) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const push = useCallback((t: Omit<ToastItem, 'id'>) => {
    idRef.current += 1;
    const item: ToastItem = {
      id: `t-${idRef.current}`,
      ttlMs: t.ttlMs ?? 4200,
      tone: t.tone ?? 'success',
      ...t,
    };
    setToasts((prev) => [...prev, item]);

    // auto-remove
    const timer = setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== item.id));
    }, item.ttlMs);
    return () => clearTimeout(timer);
  }, []);

  const value = useMemo<ToastContextValue>(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toaster toasts={toasts} onClose={(id) => setToasts((x) => x.filter((t) => t.id !== id))} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

function Toaster({ toasts, onClose }: { toasts: ToastItem[]; onClose: (id: string) => void }) {
  return (
    <div style={styles.wrap} aria-live="polite" aria-atomic>
      {toasts.map((t) => (
        <div key={t.id} style={{ ...styles.toast, ...toneStyles(t.tone ?? 'default') }}>
          <div style={styles.toastHeader}>
            <strong>{t.title}</strong>
            <button onClick={() => onClose(t.id)} style={styles.xBtn} aria-label="Dismiss">×</button>
          </div>
          {t.description && <div style={styles.toastBody}>{t.description}</div>}
        </div>
      ))}
    </div>
  );
}

function toneStyles(tone: ToastTone): React.CSSProperties {
  switch (tone) {
    case 'success':
      return { borderLeft: '3px solid #10b981' };
    case 'error':
      return { borderLeft: '3px solid #ef4444' };
    default:
      return { borderLeft: '3px solid #3b82f6' };
  }
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    position: 'fixed',
    right: 16,
    bottom: 16,
    display: 'grid',
    gap: 12,
    zIndex: 9999,
    maxWidth: 360,
  },
  toast: {
    background: 'rgba(12,12,14,0.96)',
    color: '#fff',
    border: '1px solid #2a2a2a',
    borderRadius: 12,
    padding: 12,
    boxShadow: '0 6px 30px rgba(0,0,0,0.4)',
  },
  toastHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 6,
  },
  toastBody: {
    opacity: 0.9,
  },
  xBtn: {
    background: 'transparent',
    border: 'none',
    color: '#bbb',
    fontSize: 18,
    lineHeight: 1,
    cursor: 'pointer',
  },
};
