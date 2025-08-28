'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

/**
 * Generate Report Hub (Figma layout)
 * - Sections:
 *   1) Popular Reports (3 cards)
 *   2) Trending Topics / Industry Updates (2-col)
 *   3) Suggested Updates list
 *   4) Custom Report Builder
 *
 * - Logic:
 *   - Token from localStorage
 *   - Business ID from NEXT_PUBLIC_BUSINESS_ID
 *   - Toasts, loading states, disabled buttons
 *   - AI credits soft-sync (GET /api/ai-credits when available)
 *   - Dispatch 'enrich:credits:refresh' after changes
 *   - Business Overview wired to POST /api/reports/generate-business-overview
 *   - Other types scaffolded (show "coming soon" toast until backend is ready)
 */

type ToastVariant = 'success' | 'error' | 'info';
type GenerateResponse = {
  success?: boolean;
  message?: string;
  report_id?: string;
  csv_url?: string | null;
  json_url?: string | null;
  pdf_url?: string | null;
  ai_logic_summary?: string | null;
  remaining_ai_credits?: number;
  ai_credits?: { remaining?: number };
};

const COST_PER_REPORT = 1; // visual only; backend should enforce real deduction

/** ---------- tokens / env ---------- */
function findTokenFromLocalStorage(): string | null {
  try {
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
    // fallback: any JWT-looking value
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      const val = localStorage.getItem(key);
      if (val && /[\w-]+\.[\w-]+\.[\w-]+/.test(val)) return val;
    }
    return null;
  } catch {
    return null;
  }
}

function getBusinessId(): string | null {
  return process.env.NEXT_PUBLIC_BUSINESS_ID ?? null;
}

/** ---------- toasts ---------- */
function useToasts() {
  const [toasts, setToasts] = React.useState<
    { id: string; msg: string; variant: ToastVariant }[]
  >([]);

  const push = React.useCallback((msg: string, variant: ToastVariant = 'info') => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, msg, variant }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4500);
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

/** ---------- credits ---------- */
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
    window.dispatchEvent(
      new CustomEvent('enrich:credits:refresh', { detail: { remaining } })
    );
  } catch {
    // ignore
  }
}

/** ---------- report registry ---------- */
type ReportTypeId = 'business_overview' | 'local_impact' | 'energy_resources';

type ReportType = {
  id: ReportTypeId;
  title: string;
  description: string;
  metrics: string[];
  icon: React.ReactNode;
  badge?: string; // e.g., "2 days ago"
  accent: string; // hex for small icon bg
  endpoint?: string; // only BO wired today
  enabled: boolean;
};

const REPORT_TYPES: ReportType[] = [
  {
    id: 'business_overview',
    title: 'Business Overview',
    description: 'Comprehensive analysis of your business performance and key metrics',
    metrics: ['Revenue Growth', 'Market Share', 'Operational Efficiency'],
    icon: <span style={{ fontSize: 22 }}>📊</span>,
    badge: '2 days ago',
    accent: '#ede9fe', // light purple
    endpoint: '/api/reports/generate-business-overview',
    enabled: true,
  },
  {
    id: 'local_impact',
    title: 'Local Impact',
    description:
      'Community engagement and local market influence assessment',
    metrics: ['Community Reach', 'Local Partnerships', 'Regional Growth'],
    icon: <span style={{ fontSize: 22 }}>🌐</span>,
    badge: '1 week ago',
    accent: '#e2f7e1', // light green
    enabled: false, // scaffold
  },
  {
    id: 'energy_resources',
    title: 'Energy & Resources',
    description:
      'Sustainability metrics and resource utilization analysis',
    metrics: ['Energy Efficiency', 'Carbon Footprint', 'Resource Usage'],
    icon: <span style={{ fontSize: 22 }}>⚡</span>,
    badge: '3 days ago',
    accent: '#fef3c7', // light amber
    enabled: false, // scaffold
  },
];

/** ---------- page ---------- */
export default function GeneratePage() {
  const router = useRouter();
  const { push, ToastView } = useToasts();

  const [loadingId, setLoadingId] = React.useState<ReportTypeId | 'custom' | null>(
    null
  );
  const [credits, setCredits] = React.useState<number | null>(null);
  const [lastReportId, setLastReportId] = React.useState<string | null>(null);

  const businessId = React.useMemo(getBusinessId, []);

  // Custom builder form state (non-blocking; backend can ignore for now)
  const [builder, setBuilder] = React.useState({
    type: '' as '' | ReportTypeId,
    period: '',
    topics: [] as string[],
    format: '',
    includeVisuals: true,
    addContextualQs: false,
    requirements: '',
    title: '',
  });

  React.useEffect(() => {
    const token = findTokenFromLocalStorage();
    fetchCredits(token).then((val) => {
      if (val !== null) {
        setCredits(val);
        writeCreditsEverywhere(val);
      } else {
        const raw = localStorage.getItem('ai_credits');
        if (raw && !Number.isNaN(Number(raw))) setCredits(Number(raw));
      }
    });
  }, []);

  const notEnoughCredits =
    credits !== null && credits < COST_PER_REPORT;

  async function handleGenerate(typeId: ReportTypeId) {
    const token = findTokenFromLocalStorage();
    if (!token) return push('Not signed in. Please log in.', 'error');
    if (!businessId) return push('NEXT_PUBLIC_BUSINESS_ID not set.', 'error');

    const def = REPORT_TYPES.find((r) => r.id === typeId);
    if (!def) return;
    if (!def.enabled || !def.endpoint) {
      return push(`${def.title} is coming soon.`, 'info');
    }
    if (notEnoughCredits) {
      return push('Not enough AI credits. Please upgrade or add credits.', 'error');
    }

    setLoadingId(typeId);
    try {
      const res = await fetch(def.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ business_id: businessId }),
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
        data?.report_id || (data as any)?.data?.report_id || null;
      setLastReportId(newReportId ?? null);

      const fresh = await fetchCredits(token);
      if (fresh !== null) {
        setCredits(fresh);
        writeCreditsEverywhere(fresh);
      } else {
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

      push(`${def.title} generated. Redirecting to My Reports…`, 'success');
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
          : `Something went wrong generating ${def.title}.`;
      push(msg, 'error');
    } finally {
      setLoadingId(null);
    }
  }

  async function handleCustomGenerate(e: React.FormEvent) {
    e.preventDefault();
    const token = findTokenFromLocalStorage();
    if (!token) return push('Not signed in. Please log in.', 'error');
    if (!businessId) return push('NEXT_PUBLIC_BUSINESS_ID not set.', 'error');
    if (notEnoughCredits) {
      return push('Not enough AI credits. Please upgrade or add credits.', 'error');
    }

    // For now, post to Business Overview endpoint with extra fields.
    // Backend can ignore them safely until you add support.
    setLoadingId('custom');
    try {
      const res = await fetch('/api/reports/generate-business-overview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          business_id: businessId,
          custom: {
            type: builder.type,
            period: builder.period,
            topics: builder.topics,
            format: builder.format,
            includeVisuals: builder.includeVisuals,
            addContextualQs: builder.addContextualQs,
            requirements: builder.requirements,
            title: builder.title,
          },
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
        data?.report_id || (data as any)?.data?.report_id || null;
      setLastReportId(newReportId ?? null);

      const fresh = await fetchCredits(token);
      if (fresh !== null) {
        setCredits(fresh);
        writeCreditsEverywhere(fresh);
      } else if (credits !== null) {
        const optimistic = Math.max(0, credits - COST_PER_REPORT);
        setCredits(optimistic);
        writeCreditsEverywhere(optimistic);
      }

      push('Custom report generated. Redirecting to My Reports…', 'success');
      setTimeout(() => router.push('/my-reports'), 900);
    } catch (err: any) {
      const msg =
        typeof err?.message === 'string' && err.message.length < 300
          ? err.message
          : 'Something went wrong while generating the custom report.';
      push(msg, 'error');
    } finally {
      setLoadingId(null);
    }
  }

  /** ---------- render ---------- */
  return (
    <div style={styles.page}>
      {ToastView}

      {/* Header */}
      <div style={styles.headerBlock}>
        <h1 style={styles.title}>Generate Report</h1>
        <p style={styles.subtitle}>
          Create comprehensive reports with AI-powered insights and analysis
        </p>
      </div>

      {/* Popular Reports */}
      <SectionHeader icon="📄" label="Popular Reports" />
      <div style={styles.cardGrid3}>
        {REPORT_TYPES.map((r) => (
          <ReportCard
            key={r.id}
            def={r}
            credits={credits}
            businessId={businessId}
            loading={loadingId === r.id}
            disabled={
              loadingId !== null ||
              !businessId ||
              notEnoughCredits ||
              !r.enabled
            }
            onGenerate={() => handleGenerate(r.id)}
          />
        ))}
      </div>

      {/* Trends + Industry Updates */}
      <div style={styles.grid2}>
        <div style={styles.panel}>
          <SectionHeader icon="📈" label="Trending Topics" />
          <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
            {[
              { name: 'AI Integration', tag: 'Hot', delta: '+24%' },
              { name: 'Supply Chain Resilience', tag: 'Rising', delta: '+18%' },
              { name: 'Sustainability Reporting', tag: 'Trending', delta: '+15%' },
              { name: 'Digital Transformation', tag: 'Popular', delta: '+12%' },
              { name: 'ESG Compliance', tag: 'Growing', delta: '+9%' },
            ].map((t) => (
              <li key={t.name} style={styles.trendRow}>
                <span style={styles.trendDot} />
                <span style={styles.trendName}>{t.name}</span>
                <Badge>{t.tag}</Badge>
                <span style={styles.trendDelta}>{t.delta}</span>
              </li>
            ))}
          </ul>
        </div>

        <div style={styles.panel}>
          <SectionHeader icon="🌿" label="Industry Updates" />
          <div style={{ display: 'grid', gap: 12 }}>
            {[
              { title: 'New ESG Disclosure Requirements', tag: 'Regulatory', time: '2 hours ago' },
              { title: 'AI Ethics Guidelines Released', tag: 'Technology', time: '1 day ago' },
              { title: 'Global Supply Chain Index Update', tag: 'Market Data', time: '3 days ago' },
            ].map((i) => (
              <div key={i.title} style={styles.updateItem}>
                <div style={styles.updateBar} />
                <div style={{ flex: 1 }}>
                  <div style={styles.updateTitle}>{i.title}</div>
                  <div style={styles.updateMeta}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <span>🕒</span>
                      <span>{i.time}</span>
                    </span>
                    <Badge tone="neutral">{i.tag}</Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Suggested Updates */}
      <SectionHeader icon="🗓️" label="Suggested Updates" />
      <div style={styles.panel}>
        <div style={{ display: 'grid', gap: 8 }}>
          {[
            { title: 'Q3 Financial Performance Report', hint: 'Quarterly deadline approaching', ago: '45 days ago', tone: 'critical' as const },
            { title: 'Customer Satisfaction Analysis', hint: 'New survey data available', ago: '32 days ago', tone: 'warning' as const },
            { title: 'Market Competitive Analysis', hint: 'Industry shifts detected', ago: '28 days ago', tone: 'success' as const },
          ].map((s) => (
            <div key={s.title} style={styles.suggestRow}>
              <span style={{ ...styles.statusDot, ...(s.tone === 'critical'
                    ? { background: '#ef4444' }
                    : s.tone === 'warning'
                    ? { background: '#f59e0b' }
                    : { background: '#10b981' }) }} />
              <div style={{ flex: 1 }}>
                <div style={styles.suggestTitle}>{s.title}</div>
                <div style={styles.suggestHint}>{s.hint}</div>
              </div>
              <div style={styles.suggestMeta}>{s.ago}</div>
              <button
                style={{ ...styles.button, ...styles.secondaryBtn }}
                onClick={() => push('Update action is coming soon.', 'info')}
              >
                Update
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Report Builder */}
      <SectionHeader icon="⚙️" label="Report Builder" />
      <form onSubmit={handleCustomGenerate} style={styles.panel}>
        <div style={styles.formRow4}>
          <SelectField
            label="Report Type"
            placeholder="Select report type"
            value={builder.type}
            onChange={(v) => setBuilder((s) => ({ ...s, type: v as ReportTypeId }))}
            options={[
              { label: 'Business Overview', value: 'business_overview' },
              { label: 'Local Impact', value: 'local_impact' },
              { label: 'Energy & Resources', value: 'energy_resources' },
            ]}
          />
          <SelectField
            label="Time Period"
            placeholder="Select period"
            value={builder.period}
            onChange={(v) => setBuilder((s) => ({ ...s, period: v }))}
            options={[
              { label: 'Last 30 days', value: '30d' },
              { label: 'Last quarter', value: 'qtr' },
              { label: 'Year to date', value: 'ytd' },
              { label: 'Last 12 months', value: '12m' },
            ]}
          />
          <MultiInputField
            label="Focus Topics"
            placeholder="Type and press Enter"
            values={builder.topics}
            onAdd={(v) =>
              v && setBuilder((s) => ({ ...s, topics: [...s.topics, v] }))
            }
            onRemove={(v) =>
              setBuilder((s) => ({ ...s, topics: s.topics.filter((t) => t !== v) }))
            }
          />
          <SelectField
            label="Output Format"
            placeholder="Select format"
            value={builder.format}
            onChange={(v) => setBuilder((s) => ({ ...s, format: v }))}
            options={[
              { label: 'PDF + CSV + JSON', value: 'all' },
              { label: 'PDF only', value: 'pdf' },
              { label: 'CSV only', value: 'csv' },
              { label: 'JSON only', value: 'json' },
            ]}
          />
        </div>

        <div style={styles.formRow2}>
          <CheckboxField
            label="Include charts, graphs, and visual analytics"
            checked={builder.includeVisuals}
            onChange={(c) => setBuilder((s) => ({ ...s, includeVisuals: c }))}
            icon="🖼️"
          />
          <CheckboxField
            label="Add contextual questions and AI insights"
            checked={builder.addContextualQs}
            onChange={(c) => setBuilder((s) => ({ ...s, addContextualQs: c }))}
            icon="💬"
          />
        </div>

        <div style={{ display: 'grid', gap: 12 }}>
          <TextAreaField
            label="Custom Requirements"
            placeholder="Describe any specific requirements, focus areas, or questions you'd like the report to address..."
            value={builder.requirements}
            onChange={(v) => setBuilder((s) => ({ ...s, requirements: v }))}
          />
          <InputField
            label="Report Title"
            placeholder="Enter a custom title for your report"
            value={builder.title}
            onChange={(v) => setBuilder((s) => ({ ...s, title: v }))}
          />
        </div>

        <div style={styles.formFooter}>
          <span style={styles.genTime}>Estimated generation time: 2–5 minutes</span>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              type="button"
              style={{ ...styles.button, ...styles.secondaryBtn }}
              onClick={() => push('Templates are coming soon.', 'info')}
              disabled={loadingId !== null}
            >
              Save as Template
            </button>
            <button
              type="submit"
              style={{
                ...styles.button,
                ...(loadingId ? styles.buttonDisabled : styles.primaryBtn),
              }}
              disabled={loadingId !== null || !businessId || notEnoughCredits}
            >
              {loadingId === 'custom' ? 'Generating…' : 'Generate Report'}
            </button>
          </div>
        </div>

        {/* Context line */}
        <div style={{ marginTop: 8, fontSize: 12, color: '#6b7280' }}>
          Business ID: <code style={styles.code}>{businessId ?? 'not-set'}</code> • AI Credits:{' '}
          {credits === null ? '—' : credits}
          {lastReportId ? (
            <>
              {' '}• Last Report:{' '}
              <a href={`/my-reports?new=${encodeURIComponent(lastReportId)}`} style={styles.link}>
                {lastReportId}
              </a>
            </>
          ) : null}
        </div>
      </form>
    </div>
  );
}

/** ---------- little building blocks ---------- */
function SectionHeader({ icon, label }: { icon: string; label: string }) {
  return (
    <div style={styles.sectionHeader}>
      <span style={{ fontSize: 18, lineHeight: 1 }}>{icon}</span>
      <span style={styles.sectionTitle}>{label}</span>
    </div>
  );
}

function Badge({
  children,
  tone = 'brand',
}: {
  children: React.ReactNode;
  tone?: 'brand' | 'neutral';
}) {
  const base = {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 8px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 600,
    border: '1px solid',
  } as React.CSSProperties;

  return (
    <span
      style={{
        ...base,
        ...(tone === 'brand'
          ? { background: '#f5f3ff', color: '#5b21b6', borderColor: '#ddd6fe' }
          : { background: '#f3f4f6', color: '#374151', borderColor: '#e5e7eb' }),
      }}
    >
      {children}
    </span>
  );
}

function ReportCard({
  def,
  loading,
  disabled,
  onGenerate,
  credits,
  businessId,
}: {
  def: ReportType;
  loading: boolean;
  disabled: boolean;
  onGenerate: () => void;
  credits: number | null;
  businessId: string | null;
}) {
  return (
    <div style={styles.cardOuter}>
      <div style={styles.cardInner}>
        {/* icon + badge */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ ...styles.iconWrap, background: def.accent }}>{def.icon}</div>
          {def.badge ? <Badge tone="neutral">{def.badge}</Badge> : null}
        </div>

        {/* title + desc */}
        <div>
          <div style={styles.cardTitle}>{def.title}</div>
          <div style={styles.cardDesc}>{def.description}</div>
        </div>

        {/* metrics */}
        <div>
          <div style={styles.keyMetrics}>Key Metrics:</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {def.metrics.map((m) => (
              <span key={m} style={styles.metricChip}>{m}</span>
            ))}
          </div>
        </div>

        {/* action */}
        <button
          onClick={onGenerate}
          disabled={disabled}
          style={{
            ...styles.button,
            ...(disabled ? styles.buttonDisabled : styles.hollowBrandBtn),
            marginTop: 8,
            width: '100%',
          }}
          title={
            !def.enabled
              ? 'Coming soon'
              : !businessId
              ? 'Business ID not set'
              : credits !== null && credits < COST_PER_REPORT
              ? 'Not enough credits'
              : ''
          }
        >
          {loading ? 'Generating…' : 'Generate Report →'}
        </button>
      </div>
    </div>
  );
}

function SelectField(props: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  options: { label: string; value: string }[];
}) {
  return (
    <div style={styles.field}>
      <label style={styles.label}>{props.label}</label>
      <select
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        style={styles.select}
      >
        <option value="" disabled>
          {props.placeholder}
        </option>
        {props.options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function InputField(props: {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div style={styles.field}>
      <label style={styles.label}>{props.label}</label>
      <input
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        placeholder={props.placeholder}
        style={styles.input}
      />
    </div>
  );
}

function TextAreaField(props: {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div style={styles.field}>
      <label style={styles.label}>{props.label}</label>
      <textarea
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        placeholder={props.placeholder}
        rows={4}
        style={styles.textarea}
      />
    </div>
  );
}

function CheckboxField(props: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  icon?: string;
}) {
  return (
    <label style={styles.checkboxRow}>
      <input
        type="checkbox"
        checked={props.checked}
        onChange={(e) => props.onChange(e.target.checked)}
        style={{ marginRight: 8 }}
      />
      {props.icon ? <span style={{ marginRight: 8 }}>{props.icon}</span> : null}
      <span>{props.label}</span>
    </label>
  );
}

function MultiInputField(props: {
  label: string;
  placeholder: string;
  values: string[];
  onAdd: (v: string) => void;
  onRemove: (v: string) => void;
}) {
  const [val, setVal] = React.useState('');
  return (
    <div style={styles.field}>
      <label style={styles.label}>{props.label}</label>
      <div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
          {props.values.map((v) => (
            <span key={v} style={styles.topicChip}>
              {v}
              <button
                type="button"
                onClick={() => props.onRemove(v)}
                style={styles.chipX}
                aria-label={`Remove ${v}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <input
          value={val}
          onChange={(e) => setVal(e.target.value)}
          placeholder={props.placeholder}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              const t = val.trim();
              if (t) props.onAdd(t);
              setVal('');
            }
          }}
          style={styles.input}
        />
      </div>
    </div>
  );
}

/** ---------- styles ---------- */
const styles: Record<string, React.CSSProperties> = {
  page: {
    maxWidth: 1100,
    margin: '24px auto 80px',
    padding: '0 16px',
  },
  headerBlock: { marginBottom: 8 },
  title: { fontSize: 28, fontWeight: 700, margin: 0 },
  subtitle: { margin: '6px 0 16px', color: '#6b7280' },

  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginTop: 18,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: 700 },

  cardGrid3: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 16,
    marginBottom: 16,
  },
  cardOuter: {
    border: '1px solid #e5e7eb',
    borderRadius: 16,
    background: '#fff',
    boxShadow:
      '0 1px 1px rgba(0,0,0,0.03), 0 10px 16px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.04)',
  },
  cardInner: {
    padding: 16,
    display: 'grid',
    gap: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { fontSize: 16, fontWeight: 700 },
  cardDesc: { color: '#6b7280', fontSize: 14 },
  keyMetrics: { fontSize: 13, fontWeight: 600, marginBottom: 6 },
  metricChip: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 8px',
    borderRadius: 999,
    background: '#f3f4f6',
    border: '1px solid #e5e7eb',
    fontSize: 12,
  },
  hollowBrandBtn: {
    background: '#fff',
    color: '#6d28d9',
    borderColor: '#c4b5fd',
  },

  grid2: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 16,
    marginTop: 8,
    marginBottom: 16,
  },
  panel: {
    border: '1px solid #e5e7eb',
    borderRadius: 16,
    background: '#fff',
    padding: 16,
    boxShadow:
      '0 1px 1px rgba(0,0,0,0.03), 0 10px 16px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.04)',
  },

  trendRow: {
    display: 'grid',
    gridTemplateColumns: '16px 1fr auto auto',
    alignItems: 'center',
    gap: 10,
    padding: '10px 0',
    borderBottom: '1px solid #f3f4f6',
  },
  trendDot: {
    width: 8,
    height: 8,
    background: '#7c3aed',
    borderRadius: 999,
  },
  trendName: { fontWeight: 600 },
  trendDelta: { color: '#16a34a', fontWeight: 700 },

  updateItem: {
    display: 'flex',
    gap: 12,
    alignItems: 'flex-start',
    padding: 10,
    border: '1px solid #f1f5f9',
    borderRadius: 12,
    background: '#fafafa',
  },
  updateBar: { width: 4, borderRadius: 6, background: '#10b981' },
  updateTitle: { fontWeight: 700 },
  updateMeta: {
    marginTop: 4,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  // Suggested Updates
  suggestRow: {
    display: 'grid',
    gridTemplateColumns: '20px 1fr auto auto',
    alignItems: 'center',
    gap: 12,
    padding: '10px 0',
    borderBottom: '1px solid #f3f4f6',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  suggestTitle: { fontWeight: 700 },
  suggestHint: { color: '#6b7280', fontSize: 13 },
  suggestMeta: { color: '#6b7280', fontSize: 12, marginRight: 8 },

  // Builder
  formRow4: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 12,
    marginBottom: 12,
  },
  formRow2: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12,
    marginBottom: 12,
  },
  field: { display: 'grid', gap: 6 },
  label: { fontSize: 12, color: '#6b7280' },
  select: {
    padding: '10px 12px',
    borderRadius: 10,
    border: '1px solid #e5e7eb',
    background: '#fff',
    fontSize: 14,
  },
  input: {
    padding: '10px 12px',
    borderRadius: 10,
    border: '1px solid #e5e7eb',
    background: '#fff',
    fontSize: 14,
    width: '100%',
  },
  textarea: {
    padding: '10px 12px',
    borderRadius: 10,
    border: '1px solid #e5e7eb',
    background: '#fff',
    fontSize: 14,
    width: '100%',
    resize: 'vertical' as const,
  },
  checkboxRow: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: 12,
    borderRadius: 12,
    border: '1px solid #e5e7eb',
    background: '#fafafa',
    userSelect: 'none' as const,
  },
  topicChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 8px',
    borderRadius: 999,
    border: '1px solid #e5e7eb',
    background: '#f3f4f6',
    fontSize: 12,
  },
  chipX: {
    border: 'none',
    background: 'transparent',
    fontSize: 16,
    lineHeight: 1,
    cursor: 'pointer',
    color: '#6b7280',
  },
  formFooter: {
    marginTop: 8,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  genTime: { color: '#6b7280', fontSize: 12 },

  // Shared
  code: {
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    background: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: 6,
    padding: '2px 6px',
    fontSize: 12,
  },
  link: { color: '#2563eb', textDecoration: 'none' },

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
  primaryBtn: { background: '#6d28d9', color: '#fff' },
  secondaryBtn: { background: '#f3f4f6', color: '#111827', borderColor: '#e5e7eb' },
  buttonDisabled: { opacity: 0.6, cursor: 'not-allowed', background: '#9ca3af', color: '#fff' },

  // toasts
  toastWrap: {
    position: 'fixed',
    right: 16,
    top: 16,
    display: 'flex',
    flexDirection: 'column',
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
  toastSuccess: { background: '#ecfdf5', borderColor: '#86efac' },
  toastError: { background: '#fef2f2', borderColor: '#fecaca' },
  toastInfo: { background: '#eff6ff', borderColor: '#bfdbfe' },
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
