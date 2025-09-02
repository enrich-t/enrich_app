'use client';

import { ReportsList } from "../../components/reports/ReportsList";
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '../../lib/api';

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

type SocialMode = 'pdf' | 'facebook' | 'instagram' | 'linkedin';

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
  try { json = JSON.parse(raw); } catch {}
  return normalizeReports(json);
}

async function fetchReportContent(r: Report): Promise<any | null> {
  // Prefer the JSON url if available; else hit the backend by id to get content
  try {
    if (r.json_url) {
      const res = await apiFetch(r.json_url, {}, { noAuthRedirect: true }); // may be public
      const txt = await res.text();
      return res.ok ? JSON.parse(txt) : null;
    } else {
      const res = await apiFetch(`/api/reports/${encodeURIComponent(r.id)}`);
      const txt = await res.text();
      if (!res.ok) return null;
      const data = JSON.parse(txt);
      return data?.report?.content ?? null;
    }
  } catch {
    return null;
  }
}

/* -------------------- simple UI atoms -------------------- */

const colors = {
  bg: '#0f1115',
  card: '#141821',
  border: '#252a34',
  text: '#e9eaf0',
  sub: '#a7adbb',
  brand: '#9b7bd1',
  success: '#8bb26a',
  warn: '#e4c465',
  review: '#9a7ab8',
};

function H1({ children }: { children: React.ReactNode }) {
  return <h1 style={{ fontSize: 30, fontWeight: 700, letterSpacing: 0.2, margin: '4px 0 6px' }}>{children}</h1>;
}
function Muted({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ color: colors.sub, fontSize: 14, ...(style || {}) }}>{children}</div>;
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
        <span style={{ marginLeft: 6, opacity: 0.8 }}>â–¾</span>
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
            minWidth: 220,
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

/* -------------------- Modal + Previews -------------------- */

function Modal({
  open,
  onClose,
  children,
  width = 920,
  height = 640,
  title,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  width?: number;
  height?: number;
  title?: string;
}) {
  const ref = useClickAway<HTMLDivElement>(onClose);
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.55)',
        zIndex: 1000,
        display: 'grid',
        placeItems: 'center',
        padding: 16,
      }}
    >
      <div
        ref={ref}
        style={{
          width,
          maxWidth: '100%',
          height,
          maxHeight: '100%',
          background: colors.card,
          border: `1px solid ${colors.border}`,
          borderRadius: 14,
          boxShadow: '0 10px 40px rgba(0,0,0,0.45)',
          display: 'grid',
          gridTemplateRows: 'auto 1fr',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '10px 12px',
            borderBottom: `1px solid ${colors.border}`,
            justifyContent: 'space-between',
          }}
        >
          <div style={{ fontWeight: 800 }}>{title ?? 'Preview'}</div>
          <button onClick={onClose} style={ghostBtn} aria-label="Close">Close</button>
        </div>
        <div style={{ overflow: 'auto', background: '#0e1117' }}>{children}</div>
      </div>
    </div>
  );
}

function PdfPreview({ url }: { url: string }) {
  return (
    <iframe
      src={url}
      style={{ width: '100%', height: '100%', border: 'none', background: '#1a1f29' }}
      title="PDF Preview"
    />
  );
}

function pickTitle(c: any): string {
  if (!c) return 'Business Overview';
  return c.title || c.name || 'Business Overview';
}
function pickSummary(c: any): string {
  if (!c) return 'Auto-generated overview.';
  const s =
    c.summary ||
    c.description ||
    (Array.isArray(c.sections) && c.sections.length ? c.sections[0].body : '') ||
    '';
  return String(s || 'Auto-generated overview.');
}

function FacebookPreview({ content }: { content: any }) {
  return (
    <div style={{ display: 'grid', placeItems: 'center', padding: 20 }}>
      <div
        style={{
          width: 1000,
          height: 525,
          background: '#1b2330',
          border: `1px solid ${colors.border}`,
          borderRadius: 16,
          overflow: 'hidden',
          display: 'grid',
          gridTemplateRows: '1fr auto',
          boxShadow: '0 10px 30px rgba(0,0,0,0.45)',
        }}
      >
        <div style={{ padding: 24 }}>
          <div style={{ fontSize: 26, fontWeight: 900, marginBottom: 10 }}>{pickTitle(content)}</div>
          <div style={{ color: colors.sub, fontSize: 16, lineHeight: 1.45, maxWidth: 820 }}>
            {pickSummary(content)}
          </div>
        </div>
        <div style={{ padding: 16, borderTop: `1px solid ${colors.border}`, display: 'flex', gap: 10 }}>
          <span style={{ background: colors.brand, color: '#fff', padding: '8px 12px', borderRadius: 10, fontWeight: 800 }}>Enrich</span>
          <span style={{ color: colors.sub, fontSize: 14 }}>Generated report â€¢ {new Date().toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );
}

function InstagramStoryPreview({ content }: { content: any }) {
  const W = 360, H = 640;
  return (
    <div style={{ display: 'grid', placeItems: 'center', padding: 20 }}>
      <div
        style={{
          width: W,
          height: H,
          background: 'linear-gradient(160deg,#1a1630,#2b1f4a 60%,#0f0f1b)',
          borderRadius: 24,
          border: `1px solid ${colors.border}`,
          overflow: 'hidden',
          position: 'relative',
          boxShadow: '0 10px 30px rgba(0,0,0,0.45)',
          color: '#fff',
        }}
      >
        <div style={{ position: 'absolute', inset: 0, padding: 18, display: 'grid', gridTemplateRows: 'auto 1fr auto', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 900, letterSpacing: 0.4 }}>Enrich</div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>{new Date().toLocaleDateString()}</div>
          </div>
          <div>
            <div style={{ fontWeight: 900, fontSize: 22, lineHeight: 1.15, marginBottom: 10 }}>{pickTitle(content)}</div>
            <div style={{ fontSize: 13.5, lineHeight: 1.45, color: '#e6dbff' }}>{pickSummary(content)}</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ background: '#9b7bd1', color: '#fff', padding: '8px 12px', borderRadius: 12, fontWeight: 800, fontSize: 12 }}>Learn More</div>
            <div style={{ border: '1px solid #8b76c8', color: '#e6dbff', padding: '8px 12px', borderRadius: 12, fontWeight: 800, fontSize: 12 }}>View Report</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LinkedInCardPreview({ content }: { content: any }) {
  return (
    <div style={{ display: 'grid', placeItems: 'center', padding: 20 }}>
      <div
        style={{
          width: 900,
          height: 480,
          background: '#0d1117',
          border: `1px solid ${colors.border}`,
          borderRadius: 16,
          overflow: 'hidden',
          boxShadow: '0 10px 30px rgba(0,0,0,0.45)',
          display: 'grid',
          gridTemplateColumns: '2fr 1.1fr',
        }}
      >
        <div style={{ padding: 24 }}>
          <div style={{ fontSize: 24, fontWeight: 900, marginBottom: 10 }}>{pickTitle(content)}</div>
          <div style={{ color: colors.sub, fontSize: 15, lineHeight: 1.5, maxWidth: 560 }}>{pickSummary(content)}</div>
          <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
            <span style={{ background: '#2b3750', color: '#cfe2ff', padding: '6px 10px', borderRadius: 8, fontWeight: 800 }}>Compliance</span>
            <span style={{ background: '#343a40', color: '#f1f3f5', padding: '6px 10px', borderRadius: 8, fontWeight: 800 }}>Transparency</span>
          </div>
        </div>
        <div style={{ background: 'linear-gradient(160deg,#2d1f49,#162337)', position: 'relative' }}>
          <div style={{
            position: 'absolute', inset: 14, borderRadius: 12,
            border: '1px dashed #53617c'
          }}>
            <div style={{ position: 'absolute', bottom: 12, right: 12, color: '#b1c5ff', fontWeight: 800 }}>Enrich</div>
          </div>
        </div>
      </div>
    </div>
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
        <span style={{ fontSize: 18 }}>ðŸŒ¿</span>
        <h3 style={{ fontSize: 20, margin: 0, fontWeight: 700 }}>Growth Stage</h3>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', marginTop: 12, gap: 8 }}>
        <span style={{ fontSize: 24 }}>ðŸŒ¿</span>
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
          <div style={journeyDot(false)}>ðŸŒ±</div>
          <div style={{ height: 2, background: '#91a274', flex: 1 }} />
          <div style={journeyDot(true)}>ðŸŒ¿</div>
          <div style={{ height: 2, background: '#cfd3df', flex: 1 }} />
          <div style={journeyDot(false)}>ðŸŒ¸</div>
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
          <span style={{ fontSize: 18 }}>ðŸ›¡ï¸</span>
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
  onOpenPreview,
}: {
  reports: Report[];
  onRefresh: () => void;
  onGenerate: () => void;
  onOpenPreview: (r: Report, mode: SocialMode) => void;
}) {
  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18 }}>ðŸ“„</span>
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
          reports.map((r) => <ReportRow key={r.id} r={r} onOpenPreview={onOpenPreview} />)
        )}
      </div>
    </Card>
  );
}

function ReportRow({ r, onOpenPreview }: { r: Report; onOpenPreview: (r: Report, mode: SocialMode) => void }) {
  const created = new Date(r.created_at);
  const dt = created.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  const statusTone = r.status === 'ready' ? 'gold' : r.status === 'failed' ? 'purple' : 'default';

  const hasPDF = !!(r.pdf_url || r.export_link);
  const hasCSV = !!r.csv_url;
  const hasJSON = !!r.json_url;

  const download = (href?: string | null) => {
    if (!href) return;
    window.location.href = href;
  };

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
        <span style={{ color: colors.sub, fontSize: 14 }}>ðŸ“… {dt}</span>
        <span style={{ marginLeft: 'auto' }} />
      </div>

      <div>
        <Badge tone={statusTone as any}>{r.status}</Badge>
      </div>

      <div style={{ gridColumn: '1 / -1', display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 10 }}>
        <Dropdown button={<>Download</>}>
          <MenuItem disabled={!hasPDF} onClick={() => download(r.pdf_url ?? r.export_link)}>â¬‡ï¸ PDF</MenuItem>
          <MenuItem disabled={!hasCSV} onClick={() => download(r.csv_url)}>ðŸ“Š CSV</MenuItem>
          <MenuItem disabled={!hasJSON} onClick={() => download(r.json_url)}>ðŸ§¾ JSON</MenuItem>
        </Dropdown>

        <Dropdown button={<>View as</>}>
          <MenuItem disabled={!hasPDF} onClick={() => onOpenPreview(r, 'pdf')}>ðŸ–¨ï¸ PDF</MenuItem>
          <MenuItem onClick={() => onOpenPreview(r, 'facebook')}>ðŸ“˜ Facebook Post</MenuItem>
          <MenuItem onClick={() => onOpenPreview(r, 'instagram')}>ðŸ“¸ Instagram Story</MenuItem>
          <MenuItem onClick={() => onOpenPreview(r, 'linkedin')}>ðŸ’¼ LinkedIn Card</MenuItem>
        </Dropdown>
      </div>
    </div>
  );
}

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

  // Preview modal state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState<SocialMode>('pdf');
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [previewContent, setPreviewContent] = useState<any>(null);
  const [previewTitle, setPreviewTitle] = useState<string>('Preview');

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

  const onOpenPreview = useMemo(
    () => async (r: Report, mode: SocialMode) => {
      setPreviewMode(mode);
      setPreviewTitle(
        mode === 'pdf'
          ? 'PDF Preview'
          : mode === 'facebook'
          ? 'Facebook Post Preview'
          : mode === 'instagram'
          ? 'Instagram Story Preview'
          : 'LinkedIn Card Preview'
      );

      if (mode === 'pdf') {
        const url = r.pdf_url ?? r.export_link;
        if (!url) { alert('No PDF available for this report yet.'); return; }
        setPreviewUrl(url);
        setPreviewContent(null);
        setPreviewOpen(true);
        return;
      }

      const content = await fetchReportContent(r);
      if (!content) { alert('No JSON content available yet for this report.'); return; }
      setPreviewContent(content);
      setPreviewUrl('');
      setPreviewOpen(true);
    },
    []
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

  /* --------------- content only (Shell supplies layout) --------------- */

  return (
    <>
      <div style={{ marginBottom: 14 }}>
        <H1>Welcome back, {profileName}</H1>
        <Muted>Hereâ€™s whatâ€™s happening with your business today.</Muted>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 18, alignItems: 'start' }}>
        <GrowthStageCard stage={growth.stage} progress={growth.progress} />
        <TransparencyCard data={transparency} />
      </div>

      <div style={{ marginTop: 18 }}>
        <ReportsList reports={reports} onRefresh={onRefresh} onGenerate={onGenerate} onOpenPreview={onOpenPreview} />
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

      <Modal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title={previewTitle}
        width={previewMode === 'instagram' ? 420 : 980}
        height={previewMode === 'instagram' ? 780 : 720}
      >
        {previewMode === 'pdf' && previewUrl && <PdfPreview url={previewUrl} />}
        {previewMode === 'facebook' && <FacebookPreview content={previewContent} />}
        {previewMode === 'instagram' && <InstagramStoryPreview content={previewContent} />}
        {previewMode === 'linkedin' && <LinkedInCardPreview content={previewContent} />}
      </Modal>
    </>
  );
}




