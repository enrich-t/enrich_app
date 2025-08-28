'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

/** Dark palette aligned to dashboard */
const colors = {
  bg: '#0f1115',
  card: '#141821',
  surface: '#0f131a',
  border: '#252a34',
  text: '#e9eaf0',
  sub: '#a7adbb',
  brand: '#9b7bd1',
  brandBorder: '#b8a3ea',
  success: '#8bb26a',
};

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
  detail?: { ok?: boolean; code?: string; message?: string };
};

const COST_PER_REPORT = 1;

/* ---------------- Supabase-aware token helpers ---------------- */

function findSupabaseAuthKey(): string | null {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)!;
      if (k && /^sb-.*-auth-token$/.test(k)) return k;
    }
    return null;
  } catch {
    return null;
  }
}

function readSupabaseTokens():
  | { accessToken: string | null; refreshToken: string | null; key: string | null }
  | null {
  try {
    const key = findSupabaseAuthKey();
    if (!key) return { accessToken: null, refreshToken: null, key: null };
    const raw = localStorage.getItem(key);
    if (!raw) return { accessToken: null, refreshToken: null, key };
    const parsed = JSON.parse(raw);
    const accessToken = parsed?.currentSession?.access_token ?? parsed?.access_token ?? null;
    const refreshToken = parsed?.currentSession?.refresh_token ?? parsed?.refresh_token ?? null;
    return { accessToken, refreshToken, key };
  } catch {
    return { accessToken: null, refreshToken: null, key: null };
  }
}

function writeSupabaseAccessToken(newAccess: string) {
  try {
    const key = findSupabaseAuthKey();
    if (!key) return;
    const raw = localStorage.getItem(key);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed?.currentSession) parsed.currentSession.access_token = newAccess;
    else parsed.access_token = newAccess;
    localStorage.setItem(key, JSON.stringify(parsed));
  } catch {}
}

function findAnyAccessToken(): string | null {
  try {
    const candidates = ['apiToken', 'api_token', 'access_token', 'sb-access-token', 'token'];
    for (const k of candidates) {
      const v = localStorage.getItem(k);
      if (v && v.length > 10) return v;
    }
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)!;
      const val = localStorage.getItem(key);
      if (val && /[\w-]+\.[\w-]+\.[\w-]+/.test(val)) return val;
    }
    return null;
  } catch {
    return null;
  }
}

function setCommonAccessToken(newAccess: string) {
  try {
    localStorage.setItem('access_token', newAccess);
    localStorage.setItem('apiToken', newAccess);
    localStorage.setItem('sb-access-token', newAccess);
    writeSupabaseAccessToken(newAccess);
  } catch {}
}

function clearAuthLocally() {
  try {
    const supaKey = findSupabaseAuthKey();
    if (supaKey) localStorage.removeItem(supaKey);
    ['apiToken', 'api_token', 'access_token', 'sb-access-token', 'token'].forEach((k) =>
      localStorage.removeItem(k)
    );
    window.dispatchEvent(new CustomEvent('enrich:auth:signout'));
  } catch {}
}

function getBusinessId(): string | null {
  return process.env.NEXT_PUBLIC_BUSINESS_ID ?? null;
}

/* ---------------- toasts ---------------- */

function useToasts() {
  const [toasts, setToasts] = React.useState<
    { id: string; msg: string; variant: ToastVariant }[]
  >([]);

  const push = React.useCallback((msg: string, variant: ToastVariant = 'info') => {
    const id = crypto.randomUUID();
    setToasts((p) => [...p, { id, msg, variant }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 4500);
  }, []);

  const remove = React.useCallback((id: string) => {
    setToasts((p) => p.filter((t) => t.id !== id));
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

/* ---------------- credits ---------------- */

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
    if (typeof remaining === 'number') localStorage.setItem('ai_credits', String(remaining));
    window.dispatchEvent(new CustomEvent('enrich:credits:refresh', { detail: { remaining } }));
  } catch {}
}

/* ---------------- auth refresh + fetch ---------------- */

async function tryRefreshAccessToken(): Promise<string | null> {
  const supa = readSupabaseTokens();
  const refresh = supa?.refreshToken || null;
  if (!refresh) return null;

  const endpoints = [
    '/api/auth/refresh',
    '/api/auth/refresh-token',
    '/api/auth/refresh_access_token',
  ];

  for (const ep of endpoints) {
    try {
      const r = await fetch(ep, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refresh }),
      });
      if (!r.ok) continue;
      const j = await r.json();
      const newAccess: string | undefined =
        j?.access_token || j?.data?.access_token || j?.token;
      if (newAccess && newAccess.length > 20) {
        setCommonAccessToken(newAccess);
        return newAccess;
      }
    } catch {}
  }
  return null;
}

async function fetchWithAuth(input: string, init: RequestInit = {}): Promise<Response> {
  const adhoc = findAnyAccessToken();
  const supa = readSupabaseTokens();
  const accessToken = adhoc || supa?.accessToken || null;

  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string>),
    'Content-Type': 'application/json',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  };

  let res = await fetch(input, { ...init, headers });
  if (res.status !== 401) return res;

  try {
    const clone = res.clone();
    const data = await clone.json().catch(() => null);
    if (data?.detail?.code !== 'INVALID_TOKEN') return res;
  } catch {}

  const refreshed = await tryRefreshAccessToken();
  if (!refreshed) return res;

  const retryHeaders = {
    ...(init.headers as Record<string, string>),
    'Content-Type': 'application/json',
    Authorization: `Bearer ${refreshed}`,
  };
  return fetch(input, { ...init, headers: retryHeaders });
}

/* ---------------- report registry ---------------- */

type ReportTypeId = 'business_overview' | 'local_impact' | 'energy_resources';
type ReportType = {
  id: ReportTypeId;
  title: string;
  description: string;
  metrics: string[];
  icon: React.ReactNode;
  badge?: string;
  accent: string;
  endpoint?: string;
  enabled: boolean;
  template?: { embedSrc: string; viewUrl: string; templateId?: string };
};

/** Canva embed data for Business Overview */
const CANVA_BUSINESS_OVERVIEW = {
  embedSrc:
    'https://www.canva.com/design/DAGs_hzrmK4/fCjSsXKE_u9y2P47Vv3w5Q/view?embed',
  viewUrl:
    'https://www.canva.com/design/DAGs_hzrmK4/fCjSsXKE_u9y2P47Vv3w5Q/view?utm_content=DAGs_hzrmK4&utm_campaign=designshare&utm_medium=embeds&utm_source=link',
  templateId: 'DAGs_hzrmK4',
};

const REPORT_TYPES: ReportType[] = [
  {
    id: 'business_overview',
    title: 'Business Overview',
    description: 'Comprehensive analysis of your business performance and key metrics',
    metrics: ['Revenue Growth', 'Market Share', 'Operational Efficiency'],
    icon: <span style={{ fontSize: 20 }}>📊</span>,
    badge: '2 days ago',
    accent: '#2a2343',
    endpoint: '/api/reports/generate-business-overview',
    enabled: true,
    template: CANVA_BUSINESS_OVERVIEW,
  },
  {
    id: 'local_impact',
    title: 'Local Impact',
    description: 'Community engagement and local market influence assessment',
    metrics: ['Community Reach', 'Local Partnerships', 'Regional Growth'],
    icon: <span style={{ fontSize: 20 }}>🌐</span>,
    badge: '1 week ago',
    accent: '#1f3726',
    enabled: false,
  },
  {
    id: 'energy_resources',
    title: 'Energy & Resources',
    description: 'Sustainability metrics and resource utilization analysis',
    metrics: ['Energy Efficiency', 'Carbon Footprint', 'Resource Usage'],
    icon: <span style={{ fontSize: 20 }}>⚡</span>,
    badge: '3 days ago',
    accent: '#3a2f19',
    enabled: false,
  },
];

/* ---------------- page ---------------- */

export default function GeneratePage() {
  const router = useRouter();
  const { push, ToastView } = useToasts();

  const [loadingId, setLoadingId] = React.useState<ReportTypeId | 'custom' | null>(null);
  const [credits, setCredits] = React.useState<number | null>(null);
  const [lastReportId, setLastReportId] = React.useState<string | null>(null);
  const businessId = React.useMemo(getBusinessId, []);

  const [templatePreview, setTemplatePreview] = React.useState<{
    open: boolean;
    title?: string;
    embedSrc?: string;
    viewUrl?: string;
  }>({ open: false });

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
    const token = findAnyAccessToken() || readSupabaseTokens()?.accessToken || null;
    fetchCredits(token).then((v) => {
      if (v !== null) {
        setCredits(v);
        writeCreditsEverywhere(v);
      } else {
        const raw = localStorage.getItem('ai_credits');
        if (raw && !Number.isNaN(Number(raw))) setCredits(Number(raw));
      }
    });
  }, []);

  const notEnoughCredits = credits !== null && credits < COST_PER_REPORT;

  async function handleGenerate(typeId: ReportTypeId) {
    if (!businessId) return push('NEXT_PUBLIC_BUSINESS_ID not set.', 'error');

    const def = REPORT_TYPES.find((r) => r.id === typeId)!;
    if (!def.enabled || !def.endpoint) return push(`${def.title} is coming soon.`, 'info');
    if (notEnoughCredits) return push('Not enough AI credits. Please upgrade or add credits.', 'error');

    setLoadingId(typeId);
    try {
      const body: any = { business_id: businessId };
      // Pass template metadata (backend can ignore safely if not used)
      if (def.template) {
        body.template = {
          id: def.template.templateId,
          embed_url: def.template.embedSrc,
          view_url: def.template.viewUrl,
        };
      }

      const res = await fetchWithAuth(def.endpoint, {
        method: 'POST',
        body: JSON.stringify(body),
      });

      if (res.status === 401) {
        clearAuthLocally();
        push('Session expired. Please sign in again.', 'error');
        setTimeout(() => router.push('/login'), 400);
        return;
      }

      if (!res.ok) throw new Error((await res.text()) || 'Generation failed');

      const data = (await res.json()) as GenerateResponse;
      if (data?.success === false) throw new Error(data?.message || 'Generation failed');

      const newReportId = data?.report_id || (data as any)?.data?.report_id || null;
      setLastReportId(newReportId ?? null);

      const token = findAnyAccessToken() || readSupabaseTokens()?.accessToken || null;
      const fresh = await fetchCredits(token);
      if (fresh !== null) {
        setCredits(fresh);
        writeCreditsEverywhere(fresh);
      } else if (typeof data?.remaining_ai_credits === 'number') {
        setCredits(data.remaining_ai_credits);
        writeCreditsEverywhere(data.remaining_ai_credits);
      } else if (typeof data?.ai_credits?.remaining === 'number') {
        setCredits(data.ai_credits.remaining!);
        writeCreditsEverywhere(data.ai_credits.remaining!);
      } else if (credits !== null) {
        const optimistic = Math.max(0, credits - 1);
        setCredits(optimistic);
        writeCreditsEverywhere(optimistic);
      }

      push(`${def.title} generated. Redirecting to My Reports…`, 'success');
      setTimeout(() => {
        if (newReportId) router.push(`/my-reports?new=${encodeURIComponent(newReportId)}`);
        else router.push('/my-reports');
      }, 900);
    } catch (e: any) {
      push(
        typeof e?.message === 'string'
          ? e.message
          : `Something went wrong generating ${def.title}.`,
        'error'
      );
    } finally {
      setLoadingId(null);
    }
  }

  async function handleCustomGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!businessId) return push('NEXT_PUBLIC_BUSINESS_ID not set.', 'error');
    if (notEnoughCredits) return push('Not enough AI credits. Please upgrade or add credits.', 'error');

    setLoadingId('custom');
    try {
      const res = await fetchWithAuth('/api/reports/generate-business-overview', {
        method: 'POST',
        body: JSON.stringify({
          business_id: businessId,
          custom: { ...builder },
          // Also pass the same template meta for consistency
          template: CANVA_BUSINESS_OVERVIEW,
        }),
      });

      if (res.status === 401) {
        clearAuthLocally();
        push('Session expired. Please sign in again.', 'error');
        setTimeout(() => router.push('/login'), 400);
        return;
      }

      if (!res.ok) throw new Error((await res.text()) || 'Generation failed');
      const data = (await res.json()) as GenerateResponse;
      if (data?.success === false) throw new Error(data?.message || 'Generation failed');

      const newReportId = data?.report_id || (data as any)?.data?.report_id || null;
      setLastReportId(newReportId ?? null);

      const token = findAnyAccessToken() || readSupabaseTokens()?.accessToken || null;
      const fresh = await fetchCredits(token);
      if (fresh !== null) {
        setCredits(fresh);
        writeCreditsEverywhere(fresh);
      } else if (credits !== null) {
        const optimistic = Math.max(0, credits - 1);
        setCredits(optimistic);
        writeCreditsEverywhere(optimistic);
      }

      push('Custom report generated. Redirecting to My Reports…', 'success');
      setTimeout(() => router.push('/my-reports'), 900);
    } catch (e: any) {
      push(
        typeof e?.message === 'string' ? e.message : 'Custom report generation failed.',
        'error'
      );
    } finally {
      setLoadingId(null);
    }
  }

  /* ---------------- render ---------------- */

  return (
    <div style={styles.page}>
      <div style={styles.headerBlock}>
        <h1 style={styles.title}>Generate Report</h1>
        <p style={styles.subtitle}>Create comprehensive reports with AI-powered insights and analysis</p>
      </div>

      {/* Popular Reports */}
      <SectionHeader icon="📄" label="Popular Reports" />
      <div style={styles.cardGrid3}>
        {REPORT_TYPES.map((r) => (
          <ReportCard
            key={r.id}
            def={r}
            loading={loadingId === r.id}
            disabled={!!loadingId || !businessId || (credits !== null && credits < COST_PER_REPORT) || !r.enabled}
            onGenerate={() => handleGenerate(r.id)}
            onPreviewTemplate={
              r.template
                ? () =>
                    setTemplatePreview({
                      open: true,
                      title: r.title,
                      embedSrc: r.template!.embedSrc,
                      viewUrl: r.template!.viewUrl,
                    })
                : undefined
            }
            credits={credits}
            businessId={businessId}
          />
        ))}
      </div>

      {/* Trends + Industry Updates */}
      <div style={styles.grid2}>
        <div style={styles.panel}>
          <SectionHeaderInline icon="📈" label="Trending Topics" />
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
                <Badge tone="neutral">{t.tag}</Badge>
                <span style={styles.trendDelta}>{t.delta}</span>
              </li>
            ))}
          </ul>
        </div>

        <div style={styles.panel}>
          <SectionHeaderInline icon="🌿" label="Industry Updates" />
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
              <span
                style={{
                  ...styles.statusDot,
                  ...(s.tone === 'critical'
                    ? { background: '#ef4444' }
                    : s.tone === 'warning'
                    ? { background: '#f59e0b' }
                    : { background: '#10b981' }),
                }}
              />
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
      <div style={styles.panel}>
        <SectionHeaderInline icon="⚙️" label="Report Builder" />
        <form onSubmit={handleCustomGenerate}>
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
              onAdd={(v) => v && setBuilder((s) => ({ ...s, topics: [...s.topics, v] }))}
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
                disabled={!!loadingId}
              >
                Save as Template
              </button>
              <button
                type="submit"
                style={{ ...styles.button, ...(loadingId ? styles.buttonDisabled : styles.primaryBtn) }}
                disabled={!!loadingId || !businessId || (credits !== null && credits < COST_PER_REPORT)}
              >
                {loadingId === 'custom' ? 'Generating…' : 'Generate Report'}
              </button>
            </div>
          </div>

          <div style={{ marginTop: 8, fontSize: 12, color: colors.sub }}>
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

      {/* Template Preview Modal */}
      {templatePreview.open && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setTemplatePreview({ open: false })}
          style={styles.modalOverlay}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={styles.modalContent}
          >
            <div style={styles.modalHeader}>
              <div style={{ fontWeight: 800 }}>{templatePreview.title} — Template Preview</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {templatePreview.viewUrl ? (
                  <a href={templatePreview.viewUrl} target="_blank" rel="noreferrer" style={styles.link}>
                    Open in Canva ↗
                  </a>
                ) : null}
                <button
                  onClick={() => setTemplatePreview({ open: false })}
                  style={{ ...styles.button, ...styles.secondaryBtn, padding: '6px 10px' }}
                >
                  Close
                </button>
              </div>
            </div>

            {/* Canva embed with the same ratio block you provided */}
            <div style={styles.embedWrap}>
              <iframe
                loading="lazy"
                title="Business Overview Template"
                style={styles.embedIframe}
                src={templatePreview.embedSrc}
                allow="fullscreen"
              />
            </div>
          </div>
        </div>
      )}

      {ToastView}
    </div>
  );
}

/* ---------------- small components ---------------- */

function SectionHeader({ icon, label }: { icon: string; label: string }) {
  return (
    <div style={styles.sectionHeader}>
      <span style={{ fontSize: 18, lineHeight: 1 }}>{icon}</span>
      <span style={styles.sectionTitle}>{label}</span>
    </div>
  );
}
function SectionHeaderInline({ icon, label }: { icon: string; label: string }) {
  return (
    <div style={styles.sectionHeaderInline}>
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
  const base: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 8px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
    border: '1px solid',
  };
  return (
    <span
      style={{
        ...base,
        ...(tone === 'brand'
          ? { background: '#2a2343', color: colors.text, borderColor: colors.brandBorder }
          : { background: '#1a1f29', color: colors.sub, borderColor: colors.border }),
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
  onPreviewTemplate,
  credits,
  businessId,
}: {
  def: ReportType;
  loading: boolean;
  disabled: boolean;
  onGenerate: () => void;
  onPreviewTemplate?: () => void;
  credits: number | null;
  businessId: string | null;
}) {
  return (
    <div style={styles.cardOuter}>
      <div style={styles.cardInner}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ ...styles.iconWrap, background: def.accent }}>{def.icon}</div>
          {def.badge ? <Badge tone="neutral">{def.badge}</Badge> : null}
        </div>
        <div>
          <div style={styles.cardTitle}>{def.title}</div>
          <div style={styles.cardDesc}>{def.description}</div>
        </div>
        <div>
          <div style={styles.keyMetrics}>Key Metrics:</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {def.metrics.map((m) => (
              <span key={m} style={styles.metricChip}>
                {m}
              </span>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gap: 8, marginTop: 4 }}>
          <button
            onClick={onGenerate}
            disabled={disabled}
            style={{
              ...styles.button,
              ...(disabled ? styles.buttonDisabled : styles.hollowBrandBtn),
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

          {onPreviewTemplate ? (
            <button
              type="button"
              onClick={onPreviewTemplate}
              style={{ ...styles.button, ...styles.secondaryBtn, width: '100%' }}
            >
              Preview Template
            </button>
          ) : null}
        </div>
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

/* ---------------- styles ---------------- */

const styles: Record<string, React.CSSProperties> = {
  page: {
    maxWidth: 1100,
    margin: '24px auto 80px',
    padding: '0 16px',
    color: colors.text,
    background: colors.bg,
    borderRadius: 16,
  },
  headerBlock: { marginBottom: 8 },
  title: { fontSize: 28, fontWeight: 700, margin: 0, color: colors.text },
  subtitle: { margin: '6px 0 16px', color: colors.sub },

  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginTop: 18,
    marginBottom: 12,
    color: colors.text,
  },
  sectionHeaderInline: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
    color: colors.text,
  },
  sectionTitle: { fontSize: 16, fontWeight: 700 },

  cardGrid3: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 16,
    marginBottom: 16,
  },
  cardOuter: {
    border: `1px solid ${colors.border}`,
    borderRadius: 16,
    background: colors.card,
    boxShadow: '0 10px 18px rgba(0,0,0,0.25)',
  },
  cardInner: { padding: 16, display: 'grid', gap: 12 },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: colors.text,
  },
  cardTitle: { fontSize: 16, fontWeight: 700, color: colors.text },
  cardDesc: { color: colors.sub, fontSize: 14 },
  keyMetrics: { fontSize: 13, fontWeight: 700, marginBottom: 6, color: colors.text },
  metricChip: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 8px',
    borderRadius: 999,
    background: colors.surface,
    border: `1px solid ${colors.border}`,
    fontSize: 12,
    color: colors.text,
  },

  grid2: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 16,
    marginTop: 8,
    marginBottom: 16,
  },
  panel: {
    border: `1px solid ${colors.border}`,
    borderRadius: 16,
    background: colors.card,
    padding: 16,
    boxShadow: '0 10px 18px rgba(0,0,0,0.25)',
  },

  trendRow: {
    display: 'grid',
    gridTemplateColumns: '16px 1fr auto auto',
    alignItems: 'center',
    gap: 10,
    padding: '10px 0',
    borderBottom: `1px solid ${colors.border}`,
  },
  trendDot: { width: 8, height: 8, background: colors.brand, borderRadius: 999 },
  trendName: { fontWeight: 700, color: colors.text },
  trendDelta: { color: '#86efac', fontWeight: 800 },

  updateItem: {
    display: 'flex',
    gap: 12,
    alignItems: 'flex-start',
    padding: 10,
    border: `1px solid ${colors.border}`,
    borderRadius: 12,
    background: colors.surface,
  },
  updateBar: { width: 4, borderRadius: 6, background: '#10b981' },
  updateTitle: { fontWeight: 800, color: colors.text },
  updateMeta: {
    marginTop: 4,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    color: colors.sub,
  },

  suggestRow: {
    display: 'grid',
    gridTemplateColumns: '20px 1fr auto auto',
    alignItems: 'center',
    gap: 12,
    padding: '10px 0',
    borderBottom: `1px solid ${colors.border}`,
  },
  statusDot: { width: 10, height: 10, borderRadius: 999 },
  suggestTitle: { fontWeight: 800, color: colors.text },
  suggestHint: { color: colors.sub, fontSize: 13 },
  suggestMeta: { color: colors.sub, fontSize: 12, marginRight: 8 },

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
  label: { fontSize: 12, color: colors.sub },
  select: {
    padding: '10px 12px',
    borderRadius: 10,
    border: `1px solid ${colors.border}`,
    background: colors.surface,
    color: colors.text,
    fontSize: 14,
  },
  input: {
    padding: '10px 12px',
    borderRadius: 10,
    border: `1px solid ${colors.border}`,
    background: colors.surface,
    color: colors.text,
    fontSize: 14,
    width: '100%',
  },
  textarea: {
    padding: '10px 12px',
    borderRadius: 10,
    border: `1px solid ${colors.border}`,
    background: colors.surface,
    color: colors.text,
    fontSize: 14,
    width: '100%',
    resize: 'vertical',
  },
  checkboxRow: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: 12,
    borderRadius: 12,
    border: `1px solid ${colors.border}`,
    background: colors.surface,
    userSelect: 'none',
  },

  topicChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 8px',
    borderRadius: 999,
    border: `1px solid ${colors.border}`,
    background: '#1a1f29',
    fontSize: 12,
    color: colors.text,
  },
  chipX: {
    border: 'none',
    background: 'transparent',
    fontSize: 16,
    lineHeight: 1,
    cursor: 'pointer',
    color: colors.sub,
  },

  formFooter: {
    marginTop: 8,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    color: colors.sub,
  },
  genTime: { color: colors.sub, fontSize: 12 },

  code: {
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    background: colors.surface,
    border: `1px solid ${colors.border}`,
    color: colors.text,
    borderRadius: 6,
    padding: '2px 6px',
    fontSize: 12,
  },
  link: { color: '#a5b4fc', textDecoration: 'none' },

  button: {
    appearance: 'none',
    border: '1px solid transparent',
    borderRadius: 10,
    padding: '10px 14px',
    fontWeight: 800,
    fontSize: 14,
    cursor: 'pointer',
    transition: 'transform .06s ease, opacity .2s ease, background .2s ease',
    userSelect: 'none',
  },
  primaryBtn: { background: colors.brand, color: '#0f0f17' },
  secondaryBtn: { background: colors.surface, color: colors.text, borderColor: colors.border },
  hollowBrandBtn: { background: 'transparent', color: colors.text, borderColor: colors.brandBorder },
  buttonDisabled: { opacity: 0.6, cursor: 'not-allowed', background: '#3b3f4b', color: '#c9ceda' },

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
    boxShadow: '0 10px 18px rgba(0,0,0,0.25)',
    border: `1px solid ${colors.border}`,
    fontSize: 14,
    background: colors.card,
    color: colors.text,
  },
  toastSuccess: { outline: `2px solid ${colors.success}33` },
  toastError: { outline: '2px solid #ef444433' },
  toastInfo: { outline: `2px solid ${colors.brand}33` },
  toastCloseBtn: {
    border: 'none',
    background: 'transparent',
    fontSize: 18,
    lineHeight: 1,
    cursor: 'pointer',
    color: colors.sub,
    padding: 0,
    marginLeft: 'auto',
  },

  /* Modal */
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.55)',
    display: 'grid',
    placeItems: 'center',
    zIndex: 1100,
    padding: 16,
  },
  modalContent: {
    width: 'min(980px, 100%)',
    background: colors.card,
    border: `1px solid ${colors.border}`,
    borderRadius: 14,
    boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
    padding: 16,
    color: colors.text,
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  embedWrap: {
    position: 'relative',
    width: '100%',
    height: 0,
    paddingTop: '129.4118%', // same ratio as provided
    boxShadow: '0 2px 8px 0 rgba(63,69,81,0.16)',
    overflow: 'hidden',
    borderRadius: 8,
  },
  embedIframe: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    top: 0,
    left: 0,
    border: 'none',
  },
};
