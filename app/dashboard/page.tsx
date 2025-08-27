'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '../../components/api';
import { getToken, getBusinessId } from '../../components/auth';

type ReportStatus = 'pending' | 'processing' | 'ready' | 'failed';
type Report = {
  id: string;
  report_type: string;
  status: ReportStatus;
  created_at: string;
  csv_url: string | null;
  json_url: string | null;
  pdf_url: string | null;
  export_link: string | null;
};

const ENV_BIZ =
  typeof process?.env?.NEXT_PUBLIC_BUSINESS_ID === 'string'
    ? (process.env.NEXT_PUBLIC_BUSINESS_ID as string)
    : '';

/* -------------------- helpers -------------------- */

function asStatus(v: any): ReportStatus {
  const s = String(v ?? '').toLowerCase();
  return (['pending', 'processing', 'ready', 'failed'] as ReportStatus[]).includes(
    s as ReportStatus
  )
    ? (s as ReportStatus)
    : 'ready';
}
function firstPresent<T = any>(obj: any, keys: string[], coerce?: (x: any) => T): T | null {
  for (const k of keys) {
    if (obj && obj[k] != null) return coerce ? coerce(obj[k]) : obj[k];
  }
  return null;
}
function normalizeArray(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.reports)) return payload.reports;
  return [];
}
function normalizeReports(payload: any): Report[] {
  const arr = normalizeArray(payload);
  return arr.map((r: any, i: number) => {
    const id =
      firstPresent<string>(r, ['id', 'report_id'], (x) => String(x)) ?? `tmp-${Date.now()}-${i}`;
    const report_type =
      firstPresent<string>(r, ['report_type', 'type', 'kind'], (x) => String(x)) ??
      'business_overview';
    const status = asStatus(
      firstPresent<string>(r, ['status', 'state', 'phase'], (x) => String(x)) ?? 'ready'
    );
    const createdISO = (() => {
      const raw = firstPresent<any>(r, [
        'created_at',
        'createdAt',
        'inserted_at',
        'created_on',
        'createdOn',
      ]);
      const d = raw ? new Date(raw) : new Date();
      return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
    })();
    const csv_url = firstPresent<string>(r, ['csv_url', 'csvUrl', 'canva_csv_url'], (x) => String(x));
    const json_url = firstPresent<string>(r, ['json_url', 'jsonUrl'], (x) => String(x));
    const pdf_url = firstPresent<string>(r, ['pdf_url', 'pdfUrl'], (x) => String(x));
    const export_link = firstPresent<string>(r, ['export_link', 'download_url', 'downloadUrl'], (x) => String(x));
    const pdf = pdf_url ?? export_link ?? null;

    return {
      id,
      report_type,
      status,
      created_at: createdISO,
      csv_url: csv_url ?? null,
      json_url: json_url ?? null,
      pdf_url: pdf,
      export_link: export_link ?? null,
    };
  });
}

async function fetchReports(businessId: string, signal?: AbortSignal): Promise<Report[]> {
  const res = await apiFetch(`/api/reports/list/${encodeURIComponent(String(businessId))}`, {
    method: 'GET',
    signal,
    cache: 'no-store',
  });
  const raw = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${raw}`);
  let json: any = [];
  try {
    json = JSON.parse(raw);
  } catch {}
  return normalizeReports(json);
}

/* -------------------- simple UI atoms -------------------- */

const colors = {
  bg: '#0f1115',
  card: '#141821',
  border: '#252a34',
  text: '#e9eaf0',
  sub: '#a7adbb',
  brand: '#9b7bd1', // lavender purple
  success: '#8bb26a',
  warn: '#e4c465',
  review: '#9a7ab8',
  badge: '#e2c24e',
};

function H1({ children }: { children: React.ReactNode }) {
  return <h1 style={{ fontSize: 30, fontWeight: 700, letterSpacing: 0.2, margin: '4px 0 6px' }}>{children}</h1>;
}
function Muted({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div style={{ color: colors.sub, fontSize: 14, ...(style || {}) }}>
      {children}
    </div>
  );
}
function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        background: colors.card,
        border: `1px solid ${colors.border}`,
        borderRadius: 16,
        padding: 20,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
function Badge({ children, tone = 'default' as 'default' | 'gold' | 'green' | 'purple' }) {
  const bg =
    tone === 'gold'
      ? '#f2e1a3'
      : tone === 'green'
      ? '#cfe7b9'
      : tone === 'purple'
      ? '#d8c8f4'
      : '#d9deea';
  const fg =
    tone === 'gold' ? '#7d5b00' : tone === 'green' ? '#3f5f2b' : tone === 'purple' ? '#4e3b7a' : '#1f2430';
  return (
    <span
      style={{
        background: bg,
        color: fg,
        padding: '3px 8px',
        borderRadius: 8,
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      {children}
    </span>
  );
}
function IconRefresh({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" style={{ display: 'block' }}>
      <path
        d="M16.26 7.16A6.5 6.5 0 1 0 17.5 10h-2a4.5 4.5 0 1 1-1.32-3.18l-2.18 2.18H17V4.5l-1.74 1.74z"
        fill={colors.sub}
      />
    </svg>
  );
}

/* -------------------- dropdown -------------------- */

function useClickAway<T extends HTMLElement>(onAway: () => void) {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) onAway();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onAway();
    }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [onAway]);
  return ref;
}

function Dropdown({
  button,
  children,
  align = 'left',
}: {
  button: React.ReactNode;
  children: React.ReactNode;
  align?: 'left' | 'right';
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useClickAway<HTMLDivElement>(() => setOpen(false));
  return (
    <div ref={wrapRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={secondaryBtn}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {button}
        <span style={{ marginLeft: 6, opacity: 0.8 }}>▾</span>
      </button>
      {open && (
        <div
          role="menu"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            [align]: 0,
            background: '#0f131a',
            border: `1px solid ${colors.border}`,
            borderRadius: 10,
            minWidth: 200,
            zIndex: 30,
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            overflow: 'hidden',
          } as React.CSSProperties}
        >
          {children}
        </div>
      )}
    </div>
  );
}

function MenuItem({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      role="menuitem"
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      style={{
        display: 'block',
        width: '100%',
        textAlign: 'left',
        padding: '10px 12px',
        border: 'none',
        background: 'transparent',
        color: disabled ? '#586074' : colors.text,
        cursor: disabled ? 'not-allowed' : 'pointer',
        borderBottom: `1px solid ${colors.border}`,
      }}
    >
      {children}
    </button>
  );
}

/* -------------------- Growth Stage -------------------- */

function GrowthStageCard({
  stage = 'Growing',
  progress = 65,
}: {
  stage?: string;
  progress?: number;
}) {
  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 18 }}>🌿</span>
        <h3 style={{ fontSize: 20, margin: 0, fontWeight: 700 }}>Growth Stage</h3>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', marginTop: 12, gap: 8 }}>
        <span style={{ fontSize: 24 }}>🌿</span>
        <div style={{ fontSize: 28, fontWeight: 800 }}>{stage}</div>
        <Badge tone="purple">Current Stage</Badge>
      </div>

      <Muted style={{ marginTop: 8 }}>
        This claim is backed by one example or piece of evidence.
      </Muted>

      <div style={{ marginTop: 18 }}>
        <div style={{ color: colors.sub, fontSize: 12, marginBottom: 6 }}>Stage Progress</div>
        <div style={{ height: 10, borderRadius: 6, background: '#ded9ea14', position: 'relative' }}>
          <div
            style={{
              width: `${Math.max(0, Math.min(100, progress))}%`,
              height: 10,
              borderRadius: 6,
              background: colors.brand,
            }}
          />
        </div>
        <div style={{ color: colors.sub, fontSize: 12, textAlign: 'right', marginTop: 4 }}>{progress}%</div>
      </div>

      <div style={{ marginTop: 20 }}>
        <div style={{ color: colors.text, fontWeight: 700, marginBottom: 10 }}>Growth Journey</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={journeyDot(false)}>🌱</div>
          <div style={{ height: 2, background: '#91a274', flex: 1 }} />
          <div style={journeyDot(true)}>🌿</div>
          <div style={{ height: 2, background: '#cfd3df', flex: 1 }} />
          <div style={journeyDot(false)}>🌸</div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.sub, fontSize: 12, marginTop: 6 }}>
          <div>Initiated</div>
          <div>Growing</div>
          <div>Enriched</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginTop: 22 }}>
        <div>
          <div style={{ color: colors.text, fontWeight: 700 }}>Key Metrics</div>
          <div style={{ marginTop: 8 }}>
            <div style={{ color: colors.sub, fontSize: 12 }}>Current Milestone</div>
            <div style={{ fontWeight: 700, marginTop: 2 }}>Build evidence base</div>
          </div>
        </div>
        <div>
          <div style={{ color: colors.text, fontWeight: 700, visibility: 'hidden' }}>.</div>
          <div style={{ marginTop: 8 }}>
            <div style={{ color: colors.sub, fontSize: 12 }}>Next Milestone</div>
            <div style={{ fontWeight: 700, marginTop: 2 }}>Complete documentation</div>
          </div>
        </div>
      </div>
    </Card>
  );
}
function journeyDot(active: boolean): React.CSSProperties {
  return {
    width: 40,
    height: 40,
    borderRadius: 20,
    border: `2px solid ${active ? colors.brand : '#cfd3df'}`,
    display: 'grid',
    placeItems: 'center',
    background: active ? '#3d2f5a' : 'transparent',
    color: active ? '#a683e6' : '#cfd3df',
    fontSize: 16,
  };
}

/* -------------------- Transparency Score -------------------- */

type Breakdown = { verified: number; estimated: number; needsReview: number; asOf?: string };

function toPercentages(b: Breakdown): Breakdown {
  const total = Math.max(1, (b.verified ?? 0) + (b.estimated ?? 0) + (b.needsReview ?? 0));
  return {
    verified: Math.round(((b.verified ?? 0) / total) * 100),
    estimated: Math.round(((b.estimated ?? 0) / total) * 100),
    needsReview: 100 - (Math.round(((b.verified ?? 0) / total) * 100) + Math.round(((b.estimated ?? 0) / total) * 100)),
    asOf: b.asOf,
  };
}

function TransparencyCard({ data }: { data: Breakdown }) {
  const [mode, setMode] = useState<'pie' | 'bar'>('pie');
  const p = toPercentages(data);

  const pieBg = `conic-gradient(
    ${colors.success} 0 ${p.verified}%,
    ${colors.warn} ${p.verified}% ${p.verified + p.estimated}%,
    ${colors.review} ${p.verified + p.estimated}% 100%
  )`;

  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18 }}>🛡️</span>
          <h3 style={{ fontSize: 20, margin: 0, fontWeight: 700 }}>Transparency Score</h3>
        </div>
        <div style={{ display: 'inline-flex', gap: 8 }}>
          <button onClick={() => setMode('pie')} style={modeBtn(mode === 'pie')}>Pie</button>
          <button onClick={() => setMode('bar')} style={modeBtn(mode === 'bar')}>Bar</button>
        </div>
      </div>
      <Muted style={{ marginTop: 6 }}>
        {data.asOf ? `Based on your most recent report from ${data.asOf}` : `Based on your most recent report`}
      </Muted>

      {mode === 'pie' ? (
        <div style={{ display: 'grid', placeItems: 'center', padding: '26px 0 12px' }}>
          <div
            style={{
              width: 220,
              height: 220,
              borderRadius: '50%',
              background: pieBg,
              border: `6px solid ${colors.card}`,
              boxShadow: `0 0 0 1px ${colors.border} inset`,
            }}
          />
        </div>
      ) : (
        <div style={{ paddingTop: 24 }}>
          <div style={{ height: 18, borderRadius: 9, overflow: 'hidden', display: 'flex', border: `1px solid ${colors.border}` }}>
            <div style={{ width: `${p.verified}%`, background: colors.success }} />
            <div style={{ width: `${p.estimated}%`, background: colors.warn }} />
            <div style={{ width: `${p.needsReview}%`, background: colors.review }} />
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 28, alignItems: 'center', marginTop: 16, color: colors.sub }}>
        <LegendDot c={colors.success} label={`Verified: ${p.verified}%`} />
        <LegendDot c={colors.warn} label={`Estimated: ${p.estimated}%`} />
        <LegendDot c={colors.review} label={`Needs Review: ${p.needsReview}%`} />
      </div>
    </Card>
  );
}
function modeBtn(active: boolean): React.CSSProperties {
  return {
    padding: '6px 10px',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 700,
    border: `1px solid ${active ? colors.brand : colors.border}`,
    background: active ? '#3d2f5a' : 'transparent',
    color: active ? '#e9dcff' : colors.sub,
    cursor: 'pointer',
  };
}
function LegendDot({ c, label }: { c: string; label: string }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <span style={{ width: 10, height: 10, borderRadius: 5, display: 'inline-block', background: c }} />
      <span style={{ fontSize: 13 }}>{label}</span>
    </div>
  );
}

/* -------------------- Recent Reports -------------------- */

function ReportsList({
  reports,
  onRefresh,
  onGenerate,
}: {
  reports: Report[];
  onRefresh: () => void;
  onGenerate: () => void;
}) {
  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18 }}>📄</span>
          <h3 style={{ fontSize: 20, margin: 0, fontWeight: 700 }}>Recent Reports</h3>
        </div>
        <div style={{ display: 'inline-flex', gap: 8 }}>
          <button onClick={onGenerate} style={primaryBtn}>Generate Report</button>
          <button onClick={onRefresh} title="Refresh" style={ghostBtn}><IconRefresh /></button>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 14 }}>
        {reports.length === 0 ? (
          <div style={{ color: colors.sub, fontSize: 14 }}>No reports yet. Generate your first report.</div>
        ) : (
          reports.map((r) => <ReportRow key={r.id} r={r} />)
        )}
      </div>
    </Card>
  );
}

function ReportRow({ r }: { r: Report }) {
  const created = new Date(r.created_at);
  const dt = created.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  const statusTone = r.status === 'ready' ? 'gold' : r.status === 'failed' ? 'purple' : 'default';

  const hasPDF = !!(r.pdf_url || r.export_link);
  const hasCSV = !!r.csv_url;
  const hasJSON = !!r.json_url;

  const open = (href?: string | null) => href && window.open(href, '_blank', 'noopener,noreferrer');

  const comingSoon = (what: string) => alert(`${what} preview is coming soon ✨`);

  return (
    <div
      style={{
        border: `1px solid ${colors.border}`,
        borderRadius: 14,
        padding: 14,
        display: 'grid',
        gridTemplateColumns: '1fr auto',
        alignItems: 'center',
        gap: 10,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <Badge>Report</Badge>
        <span style={{ color: colors.sub, fontSize: 14 }}>📅 {dt}</span>
        <span style={{ marginLeft: 'auto' }} />
      </div>

      <div>
        <Badge tone={statusTone as any}>{r.status}</Badge>
      </div>

      <div style={{ gridColumn: '1 / -1', display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 10 }}>
        {/* Download dropdown */}
        <Dropdown button={<>Download</>}>
          <MenuItem disabled={!hasPDF} onClick={() => open(r.pdf_url ?? r.export_link)}>⬇️ PDF</MenuItem>
          <MenuItem disabled={!hasCSV} onClick={() => open(r.csv_url)}>📊 CSV</MenuItem>
          <MenuItem disabled={!hasJSON} onClick={() => open(r.json_url)}>🧾 JSON</MenuItem>
        </Dropdown>

        {/* View as dropdown */}
        <Dropdown button={<>View as</>}>
          <MenuItem disabled={!hasPDF} onClick={() => open(r.pdf_url ?? r.export_link)}>🖨️ PDF</MenuItem>
          <MenuItem onClick={() => comingSoon('Facebook Post')}>📘 Facebook Post</MenuItem>
          <MenuItem onClick={() => comingSoon('Instagram Story')}>📸 Instagram Story</MenuItem>
          <MenuItem onClick={() => comingSoon('LinkedIn Card')}>💼 LinkedIn Card</MenuItem>
        </Dropdown>
      </div>
    </div>
  );
}

const primaryBtn: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: 10,
  border: `1px solid ${colors.brand}`,
  background: colors.brand,
  color: '#fff',
  fontWeight: 700,
  cursor: 'pointer',
};

const secondaryBtn: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: 10,
  border: `1px solid ${colors.border}`,
  background: '#ffffff10',
  color: colors.text,
  fontWeight: 700,
  textDecoration: 'none',
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

/* -------------------- Page -------------------- */

export default function DashboardPage() {
  return <DashboardContent />;
}

function DashboardContent() {
  const router = useRouter();

  const [businessId, setBusinessId] = useState<string>('');
  const [profileName, setProfileName] = useState<string>('Admin');
  const [growth, setGrowth] = useState<{ stage: string; progress: number }>({ stage: 'Growing', progress: 65 });
  const [transparency, setTransparency] = useState<Breakdown>({ verified: 40, estimated: 35, needsReview: 25, asOf: '' });
  const [reports, setReports] = useState<Report[]>([]);
  const [diag, setDiag] = useState<string>('');
  const [showDiag, setShowDiag] = useState<boolean>(false);

  // Auth guard
  useEffect(() => {
    const token = getToken();
    if (!token || typeof token !== 'string' || token.trim() === '') {
      router.replace('/login');
    }
  }, [router]);

  // Resolve businessId + profile
  useEffect(() => {
    if (ENV_BIZ) {
      setBusinessId(ENV_BIZ);
    } else {
      const fromLS = getBusinessId();
      if (fromLS) setBusinessId(fromLS);
    }
    (async () => {
      try {
        const me = await apiFetch('/api/auth/me');
        if (me.ok) {
          const json = await me.json().catch(() => null);
          const prof = json?.profile ?? json?.data ?? json ?? {};
          const name = prof?.business_name ?? prof?.businessName ?? 'Admin';
          setProfileName(name);
        }
      } catch {}
    })();
  }, []);

  // Load reports
  useEffect(() => {
    if (!businessId) return;
    const ac = new AbortController();
    fetchReports(businessId, ac.signal)
      .then((data) => {
        setReports(Array.isArray(data) ? data : []);
        const latest = (data ?? [])[0];
        try {
          // derive from content (optional)
          // @ts-ignore
          const content = latest?.content || null;
          if (content) {
            const t = content.transparency || content.score || {};
            const brk: Breakdown = {
              verified: Number(t.verified ?? 40),
              estimated: Number(t.estimated ?? 35),
              needsReview: Number(t.needs_review ?? t.needsReview ?? 25),
              asOf: content.generated_at || undefined,
            };
            setTransparency(brk);
            if (content.stage) {
              setGrowth({
                stage: String(content.stage.label ?? content.stage ?? 'Growing'),
                progress: Number(content.stage.progress ?? 65),
              });
            }
          }
        } catch {}
      })
      .catch((err) => console.error('[dashboard] list error', err));
    return () => ac.abort();
  }, [businessId]);

  const onRefresh = useMemo(
    () => async () => {
      if (!businessId) return;
      const data = await fetchReports(businessId);
      setReports(Array.isArray(data) ? data : []);
    },
    [businessId]
  );

  const onGenerate = useMemo(
    () => async () => {
      const token = getToken();
      if (!token) {
        router.replace('/login');
        return;
      }
      const payload: Record<string, any> = {
        business_id: String(businessId),
        report_type: 'business_overview',
        source: 'dashboard',
      };
      const res = await apiFetch('/api/reports/generate-business-overview', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const txt = await res.text();
      if (!res.ok) {
        alert(`Generate failed: ${res.status} ${res.statusText}\n${txt.slice(0, 300)}`);
        return;
      }
      await onRefresh();
    },
    [businessId, router, onRefresh]
  );

  const runDiagnostics = useMemo(
    () => async () => {
      const biz = businessId || '(none)';
      try {
        const me = await apiFetch('/api/auth/me');
        const meTxt = await me.text();
        const list = await apiFetch(`/api/reports/list/${encodeURIComponent(biz)}`);
        const listTxt = await list.text();
        const gen = await apiFetch('/api/reports/generate-business-overview', {
          method: 'POST',
          body: JSON.stringify({ business_id: String(biz), report_type: 'business_overview' }),
        });
        const genTxt = await gen.text();
        setDiag(
          [
            `Token present: ${!!getToken()} (len=${getToken()?.length || 0})`,
            `Business ID: ${biz}`,
            `GET /api/auth/me -> ${me.status} ${me.statusText}`,
            (meTxt || '').slice(0, 220),
            `GET /api/reports/list/${biz} -> ${list.status} ${list.statusText}`,
            (listTxt || '').slice(0, 220),
            `POST /api/reports/generate-business-overview -> ${gen.status} ${gen.statusText}`,
            (genTxt || '').slice(0, 220),
          ].join('\n')
        );
      } catch (e: any) {
        setDiag(`Diagnostics error: ${String(e?.message || e)}`);
      }
    },
    [businessId]
  );

  /* --------------- layout --------------- */

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', minHeight: '100vh', background: colors.bg, color: colors.text }}>
      {/* Sidebar */}
      <aside
        style={{
          borderRight: `1px solid ${colors.border}`,
          padding: '22px 14px',
          position: 'sticky',
          top: 0,
          height: '100dvh',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, letterSpacing: 0.3, marginBottom: 18 }}>
          <span style={{ color: colors.brand, fontSize: 22 }}>𝌆</span>
          <div>Dashboard</div>
        </div>

        <nav style={{ display: 'grid', gap: 8 }}>
          <NavItem active icon="🏠" label="Overview" />
          <NavItem icon="➕" label="Report Generator" onClick={onGenerate} />
          <NavItem icon="📁" label="My Reports" onClick={onRefresh} />
          <NavItem icon="🪙" label="AI Tokens" />
          <NavItem icon="⚙️" label="Settings" />
        </nav>
      </aside>

      {/* Main */}
      <main style={{ padding: '24px 26px', maxWidth: 1200, margin: '0 auto', width: '100%' }}>
        <div style={{ marginBottom: 14 }}>
          <H1>Welcome back, {profileName}</H1>
          <Muted>Here’s what’s happening with your business today.</Muted>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 18, alignItems: 'start' }}>
          <GrowthStageCard stage={growth.stage} progress={growth.progress} />
          <TransparencyCard data={transparency} />
        </div>

        <div style={{ marginTop: 18 }}>
          <ReportsList reports={reports} onRefresh={onRefresh} onGenerate={onGenerate} />
        </div>

        <div style={{ marginTop: 18 }}>
          <button onClick={() => (showDiag ? setShowDiag(false) : (runDiagnostics(), setShowDiag(true)))} style={ghostBtn}>
            {showDiag ? 'Hide Diagnostics' : 'Show Diagnostics'}
          </button>
          {showDiag && (
            <Card style={{ marginTop: 10 }}>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: 12.5 }}>{diag || 'Run to test endpoints.'}</pre>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}

function NavItem({
  active,
  icon,
  label,
  onClick,
}: {
  active?: boolean;
  icon: string;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
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
        cursor: 'pointer',
      }}
    >
      <span>{icon}</span>
      <span style={{ fontWeight: 700 }}>{label}</span>
    </button>
  );
}
