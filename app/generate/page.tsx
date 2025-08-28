'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

/**
 * Generate Report (Business Overview)
 * - Calls POST /api/reports/generate-business-overview
 * - Uses localStorage token (no API route changes)
 * - Business ID from NEXT_PUBLIC_BUSINESS_ID
 * - Inline styles (Tailwind later)
 * - Simple toast system (no external deps)
 * - Soft-credits sync:
 *    1) Try GET /api/ai-credits
 *    2) Fall back to response.remaining_ai_credits or response.ai_credits?.remaining
 *    3) Update localStorage('ai_credits') + dispatch 'enrich:credits:refresh'
 */

type GenerateResponse = {
  success?: boolean;
  message?: string;
  report_id?: string;
  csv_url?: string | null;
  json_url?: string | null;
  pdf_url?: string | null;
  ai_logic_summary?: string | null;
  // common patterns we might see from the backend:
  remaining_ai_credits?: number;
  ai_credits?: { remaining?: number };
};

const COST_PER_REPORT = 1; // visual only; backend should do the real deduction

function findTokenFromLocalStorage(): string | null {
  try {
    // Most likely keys first:
    const candidates = [
      'apiToken',
      'api_token',
      'access_token',
      'sb-access-token',
      'token',
    ];
    for (const k of candidates) {
      const v = localStorage.getItem(k);
      if (v && v.length > 10) return v;
    }
    // Fallback: sniff any key that looks like a token
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      const val = localStorage.getItem(key);
      if (val && /[\w-]+\.[\w-]+\.[\w-]+/.test(val)) {
        return val; // looks like a JWT
      }
    }
    return null;
  } catch {
    return null;
  }
}

function getBusinessId(): string | null {
  return process.env.NEXT_PUBLIC_BUSINESS_ID ?? null;
}

type ToastVariant = 'success' | 'error' | 'info';

function useToasts() {
  const [toasts, setToasts] = React.useState<
    { id: string; msg: string; variant: ToastVariant }[]
  >([]);

  const push = React.useCallback((msg: string, variant: ToastVariant = 'info') => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, msg, variant }]);
    // Auto dismiss after 4.5s
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const remove = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const ToastView = React.useMemo(
    () => (
      <div style={styles.toastWrap} aria-live="polite" aria-atomic="true">
        {toasts.map((t) => (
          <div
            key={t.id}
            style={{
              ...styles.toast,
              ...(t.variant === 'success'
                ? styles.toastSuccess
                : t.variant === 'error'
                ? styles.toastError
                : styles.toastInfo),
            }}
            role="status"
          >
            <span>{t.msg}</span>
            <button
              onClick={() => remove(t.id)}
              style={styles.toastCloseBtn}
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    ),
    [toasts, remove]
  );

  return { push, ToastView };
}

async function fetchCredits(token?: string | null): Promise<number | null> {
  try {
    const res = await fetch('/api/ai-credits', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = await res.json();
    // Accept a few shapes: {remaining: number} or {ai_credits: {remaining}} etc.
    if (typeof data?.remaining === 'number') return data.remaining;
    if (typeof data?.ai_credits?.remaining === 'number') return data.ai_credits.remaining;
    if (typeof data?.credits?.remaining === 'number') return data.credits.remaining;
    return null;
  } catch {
    return null;
  }
}

function writeCreditsEverywhere(remaining: number | null) {
  try {
    if (typeof remaining === 'number') {
      localStorage.setItem('ai_credits', String(remaining));
    }
    // Let Sidebar / Memberships listen and refresh
    window.dispatchEvent(
      new CustomEvent('enrich:credits:refresh', {
        detail: { remaining },
      })
    );
  } catch {
    // ignore
  }
}

export default function GeneratePage() {
  const router = useRouter();
  const { push, ToastView } = useToasts();

  const [loading, setLoading] = React.useState(false);
  const [credits, setCredits] = React.useState<number | null>(null);
  const [lastReportId, setLastReportId] = React.useState<string | null>(null);

  const businessId = React.useMemo(getBusinessId, []);

  React.useEffect(() => {
    // On mount, try to hydrate credits (from API, then localStorage fallback)
    const token = findTokenFromLocalStorage();
    fetchCredits(token).then((val) => {
      if (val !== null) {
        setCredits(val);
        writeCreditsEverywhere(val);
      } else {
        // fallback to localStorage
        const raw = localStorage.getItem('ai_credits');
        if (raw && !Number.isNaN(Number(raw))) {
          setCredits(Number(raw));
        }
      }
    });
  }, []);

  async function handleGenerate() {
    const token = findTokenFromLocalStorage();
    if (!token) {
      push('Not signed in. Please log in to generate a report.', 'error');
      return;
    }
    if (!businessId) {
      push('Business ID is not set. Please configure NEXT_PUBLIC_BUSINESS_ID.', 'error');
      return;
    }
    if (credits !== null && credits < COST_PER_REPORT) {
      push('Not enough AI credits. Please upgrade or add credits.', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/reports/generate-business-overview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`, // proxied via /api rewrite
        },
        body: JSON.stringify({
          business_id: businessId,
          // Room for optional UI flags later without API changes:
          // e.g. { priority: 'normal' }
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Generation failed');
      }

      const data = (await res.json()) as GenerateResponse;

      if (data?.success === false) {
        throw new Error(data?.message || 'Generation failed');
      }

      const newReportId =
        data?.report_id ||
        // if backend returns IDs nested under something else, try to infer:
        (data as any)?.data?.report_id ||
        null;

      setLastReportId(newReportId);

      // Try to refresh credits from API first
      const fresh = await fetchCredits(token);

      if (fresh !== null) {
        setCredits(fresh);
        writeCreditsEverywhere(fresh);
      } else {
        // Fall back to reading from response if present; else optimistic decrease
        const fromResponse =
          typeof data?.remaining_ai_credits === 'number'
            ? data.remaining_ai_credits
            : typeof data?.ai_credits?.remaining === 'number'
            ? data.ai_credits.remaining!
            : null;

        if (fromResponse !== null) {
          setCredits(fromResponse);
          writeCreditsEverywhere(fromResponse);
        } else if (credits !== null) {
          const optimistic = Math.max(0, credits - COST_PER_REPORT);
          setCredits(optimistic);
          writeCreditsEverywhere(optimistic);
        }
      }

      push('Report generated successfully. Redirecting to My Reports…', 'success');

      // small delay so the toast is visible
      setTimeout(() => {
        if (newReportId) {
          router.push(`/my-reports?new=${encodeURIComponent(newReportId)}`);
        } else {
          router.push('/my-reports');
        }
      }, 900);
    } catch (err: any) {
      const msg =
        typeof err?.message === 'string' && err.message.length < 300
          ? err.message
          : 'Something went wrong while generating the report.';
      push(msg, 'error');
    } finally {
      setLoading(false);
    }
  }

  const disabled =
    loading || !businessId || (credits !== null && credits < COST_PER_REPORT);

  return (
    <div style={styles.page}>
      {ToastView}

      <div style={styles.headerRow}>
        <h1 style={styles.title}>Generate Report</h1>
        <div style={styles.creditPill} title="AI credits remaining">
          <span style={{ fontWeight: 600 }}>AI Credits:</span>{' '}
          {credits === null ? '—' : credits}
        </div>
      </div>

      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <div>
            <h2 style={styles.cardTitle}>Responsible Business Overview</h2>
            <p style={styles.cardSub}>
              Cost: {COST_PER_REPORT} AI credit • Business ID:{' '}
              <code style={styles.code}>{businessId ?? 'not-set'}</code>
            </p>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={() => {
                // quick manual refresh of credits
                const token = findTokenFromLocalStorage();
                setLoading(true);
                fetchCredits(token)
                  .then((v) => {
                    if (v !== null) {
                      setCredits(v);
                      writeCreditsEverywhere(v);
                      push('Credits refreshed.', 'info');
                    } else {
                      push('Could not refresh credits.', 'error');
                    }
                  })
                  .finally(() => setLoading(false));
              }}
              style={{ ...styles.button, ...styles.secondaryBtn }}
              disabled={loading}
            >
              {loading ? 'Refreshing…' : 'Refresh Credits'}
            </button>

            <button
              onClick={handleGenerate}
              style={{
                ...styles.button,
                ...(disabled ? styles.buttonDisabled : styles.primaryBtn),
              }}
              disabled={disabled}
            >
              {loading ? 'Generating…' : 'Generate Report'}
            </button>
          </div>
        </div>

        <div style={styles.divider} />

        <div style={styles.bodyRow}>
          <div style={styles.helpCol}>
            <h3 style={styles.helpTitle}>What you’ll get</h3>
            <ul style={styles.ul}>
              <li>1–3 page overview (CSV/JSON/PDF links in My Reports)</li>
              <li>Transparency score + section confidence labels</li>
              <li>Seedling/Growing/Enriched icon logic</li>
              <li>Local & global impact highlights</li>
            </ul>
          </div>

          <div style={styles.metaCol}>
            <div style={styles.metaBox}>
              <div style={styles.metaRow}>
                <span style={styles.metaLabel}>Last Report ID:</span>
                <span style={styles.metaValue}>
                  {lastReportId ? (
                    <a
                      href={`/my-reports?new=${encodeURIComponent(lastReportId)}`}
                      style={styles.link}
                    >
                      {lastReportId}
                    </a>
                  ) : (
                    '—'
                  )}
                </span>
              </div>
              <div style={styles.metaRow}>
                <span style={styles.metaLabel}>Status:</span>
                <span style={styles.metaValue}>
                  {loading ? 'Generating…' : 'Idle'}
                </span>
              </div>
              <div style={styles.metaRow}>
                <span style={styles.metaLabel}>Business:</span>
                <span style={styles.metaValue}>
                  {businessId ?? 'not-set'}
                </span>
              </div>
            </div>

            <div style={{ marginTop: 12, fontSize: 12, color: '#6b7280' }}>
              Note: Credits and report links are synced to your dashboard. If you
              don’t see an update immediately, use “Refresh Credits” or check{' '}
              <a href="/my-reports" style={styles.link}>My Reports</a>.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Inline styles (simple, consistent; Tailwind later) */
const styles: Record<string, React.CSSProperties> = {
  page: {
    maxWidth: 1000,
    margin: '24px auto',
    padding: '0 16px 80px',
  },
  headerRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    margin: 0,
  },
  creditPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 12px',
    borderRadius: 999,
    background: '#f3f4f6',
    border: '1px solid #e5e7eb',
    fontSize: 14,
  },
  card: {
    background: '#fff',
    borderRadius: 16,
    border: '1px solid #e5e7eb',
    boxShadow:
      '0 1px 1px rgba(0,0,0,0.03), 0 10px 16px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.04)',
  },
  cardHeader: {
    padding: 16,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 700,
    margin: 0,
  },
  cardSub: {
    margin: '6px 0 0 0',
    color: '#6b7280',
    fontSize: 13,
  },
  divider: {
    height: 1,
    background: '#f1f5f9',
  },
  bodyRow: {
    padding: 16,
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 16,
  },
  helpCol: {
    borderRight: '1px dashed #e5e7eb',
    paddingRight: 12,
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: 700,
    margin: '0 0 8px 0',
  },
  ul: {
    margin: 0,
    paddingLeft: 18,
    color: '#374151',
    lineHeight: 1.6,
    fontSize: 14,
  },
  metaCol: {
    paddingLeft: 12,
  },
  metaBox: {
    border: '1px solid #e5e7eb',
    borderRadius: 12,
    padding: 12,
    background: '#fafafa',
  },
  metaRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
    padding: '6px 0',
    fontSize: 14,
  },
  metaLabel: {
    color: '#6b7280',
  },
  metaValue: {
    fontWeight: 600,
  },
  code: {
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    background: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: 6,
    padding: '2px 6px',
    fontSize: 12,
  },
  button: {
    appearance: 'none',
    border: '1px solid transparent',
    borderRadius: 10,
    padding: '10px 14px',
    fontWeight: 700,
    fontSize: 14,
    cursor: 'pointer',
    transition: 'transform 0.06s ease, opacity 0.2s ease, background 0.2s ease',
    userSelect: 'none' as const,
  },
  primaryBtn: {
    background: '#111827',
    color: '#fff',
  },
  secondaryBtn: {
    background: '#f3f4f6',
    color: '#111827',
    borderColor: '#e5e7eb',
  },
  buttonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
    background: '#9ca3af',
    color: '#fff',
  },
  link: {
    color: '#2563eb',
    textDecoration: 'none',
  },
  toastWrap: {
    position: 'fixed',
    right: 16,
    top: 16,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 8,
    zIndex: 1000,
  },
  toast: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    borderRadius: 10,
    padding: '10px 12px',
    minWidth: 260,
    maxWidth: 420,
    boxShadow:
      '0 1px 1px rgba(0,0,0,0.03), 0 10px 16px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.06)',
    border: '1px solid #e5e7eb',
    fontSize: 14,
  },
  toastSuccess: {
    background: '#ecfdf5',
    borderColor: '#86efac',
  },
  toastError: {
    background: '#fef2f2',
    borderColor: '#fecaca',
  },
  toastInfo: {
    background: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  toastCloseBtn: {
    border: 'none',
    background: 'transparent',
    fontSize: 18,
    lineHeight: 1,
    cursor: 'pointer',
    color: '#6b7280',
    padding: 0,
    marginLeft: 'auto',
  },
};
