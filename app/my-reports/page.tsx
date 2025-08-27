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

type SocialMode = 'pdf' | 'facebook' | 'instagram' | 'linkedin';

const ENV_BIZ =
  typeof process?.env?.NEXT_PUBLIC_BUSINESS_ID === 'string'
    ? (process.env.NEXT_PUBLIC_BUSINESS_ID as string)
    : '';

/* -------------------- palette -------------------- */

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

/* -------------------- tiny atoms -------------------- */

function H1({ children }: { children: React.ReactNode }) {
  return <h1 style={{ fontSize: 30, fontWeight: 800, margin: '0 0 8px' }}>{children}</h1>;
}
function Muted({ children }: { children: React.ReactNode }) {
  return <div style={{ color: colors.sub, fontSize: 14 }}>{children}</div>;
}
function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        background: colors.card,
        border: `1px solid ${colors.border}`,
        borderRadius: 16,
        padding: 16,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
function Badge({
  children,
  tone = 'default' as 'default' | 'gold' | 'purple' | 'gray',
}: {
  children: React.ReactNode;
  tone?: 'default' | 'gold' | 'purple' | 'gray';
}) {
  const m: Record<string, { bg: string; fg: string }> = {
    default: { bg: '#d9deea', fg: '#1f2430' },
    gold: { bg: '#f2e1a3', fg: '#7d5b00' },
    purple: { bg: '#d8c8f4', fg: '#4e3b7a' },
    gray: { bg: '#2a2f3a', fg: '#aab2c5' },
  };
  const { bg, fg } = m[tone] ?? m.default;
  return (
    <span
      style={{
        background: bg,
        color: fg,
        padding: '3px 8px',
        borderRadius: 8,
        fontSize: 12,
        fontWeight: 700,
      }}
    >
      {children}
    </span>
  );
}

const inputCss: React.CSSProperties = {
  padding: '8px 10px',
  borderRadius: 10,
  border: '1px solid #2a2f3a',
  background: '#0f131a',
  color: colors.text,
  outline: 'none',
  fontSize: 14,
};

const btn = {
  primary: {
    padding: '8px 12px',
    borderRadius: 10,
    border: `1px solid ${colors.brand}`,
    background: colors.brand,
    color: '#fff',
    fontWeight: 800,
    cursor: 'pointer',
  } as React.CSSProperties,
  secondary: {
    padding: '8px 12px',
    borderRadius: 10,
    border: `1px solid ${colors.border}`,
    background: '#ffffff10',
    color: colors.text,
    fontWeight: 700,
    textDecoration: 'none',
    cursor: 'pointer',
  } as React.CSSProperties,
  ghost: {
    padding: '8px 10px',
    borderRadius: 10,
    border: `1px solid ${colors.border}`,
    background: 'transparent',
    color: colors.sub,
    fontWeight: 700,
    cursor: 'pointer',
  } as React.CSSProperties,
};

/* -------------------- utils / normalizers -------------------- */

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
    const status = asStatus(firstPresent<string>(r, ['status', 'state', 'phase'], (x) => String(x)));
    const createdISO = (() => {
      const raw = firstPresent<any>(r, ['created_at', 'createdAt', 'inserted_at']);
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
      status: status ?? 'ready',
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
  try {
    if (r.json_url) {
      const res = await apiFetch(r.json_url, {}, { noAuthRedirect: true });
      const txt = await res.text();
      return res.ok ? JSON.parse(txt) : null;
    } else {
      const res = await apiFetch(`/api/reports/${encodeURIComponent(r.id)}`);
      const txt = await res.text();
      if (!res.ok) return null;
      const data = JSON.parse(txt);
      return data?.report?.content ?? null;
    }
  } catch { return null; }
}

/* -------------------- dropdown + modal -------------------- */

function useClickAway<T extends HTMLElement>(onAway: () => void) {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) onAway();
    }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onAway(); }
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
}: { button: React.ReactNode; children: React.ReactNode; align?: 'left' | 'right' }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useClickAway<HTMLDivElement>(() => setOpen(false));
  return (
    <div ref={wrapRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button onClick={() => setOpen((v) => !v)} style={btn.secondary} aria-expanded={open} aria-haspopup="menu">
        {button}<span style={{ marginLeft: 6, opacity: 0.8 }}>▾</span>
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
}: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) {
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

function Modal({
  open, onClose, children, title, width = 980, height = 720,
}: {
  open: boolean; onClose: () => void; children: React.ReactNode; title?: string; width?: number; height?: number;
}) {
  const ref = useClickAway<HTMLDivElement>(onClose);
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000,
        display: 'grid', placeItems: 'center', padding: 16,
      }}
    >
      <div
        ref={ref}
        style={{
          width, maxWidth: '100%', height, maxHeight: '100%',
          background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 14,
          boxShadow: '0 10px 40px rgba(0,0,0,0.45)',
          display: 'grid', gridTemplateRows: 'auto 1fr', overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', padding: '10px 12px', borderBottom: `1px solid ${colors.border}`, justifyContent: 'space-between' }}>
          <div style={{ fontWeight: 800 }}>{title ?? 'Preview'}</div>
          <button onClick={onClose} style={btn.ghost} aria-label="Close">Close</button>
        </div>
        <div style={{ overflow: 'auto', background: '#0e1117' }}>{children}</div>
      </div>
    </div>
  );
}
function PdfPreview({ url }: { url: string }) {
  return <iframe src={url} style={{ width: '100%', height: '100%', border: 'none', background: '#1a1f29' }} title="PDF Preview" />;
}

/* -------------------- social preview blocks -------------------- */

function pickTitle(c: any): string {
  if (!c) return 'Business Overview';
  return c.title || c.name || 'Business Overview';
}
function pickSummary(c: any): string {
  if (!c) return 'Auto-generated overview.';
  const s = c.summary || c.description || (Array.isArray(c.sections) && c.sections.length ? c.sections[0].body : '');
  return String(s || 'Auto-generated overview.');
}
function FacebookPreview({ content }: { content: any }) {
  return (
    <div style={{ display: 'grid', placeItems: 'center', padding: 20 }}>
      <div style={{ width: 1000, height: 525, background: '#1b2330', border: `1px solid ${colors.border}`, borderRadius: 16, overflow: 'hidden', display: 'grid', gridTemplateRows: '1fr auto', boxShadow: '0 10px 30px rgba(0,0,0,0.45)' }}>
        <div style={{ padding: 24 }}>
          <div style={{ fontSize: 26, fontWeight: 900, marginBottom: 10 }}>{pickTitle(content)}</div>
          <div style={{ color: colors.sub, fontSize: 16, lineHeight: 1.45, maxWidth: 820 }}>{pickSummary(content)}</div>
        </div>
        <div style={{ padding: 16, borderTop: `1px solid ${colors.border}`, display: 'flex', gap: 10 }}>
          <span style={{ background: colors.brand, color: '#fff', padding: '8px 12px', borderRadius: 10, fontWeight: 800 }}>Enrich</span>
          <span style={{ color: colors.sub, fontSize: 14 }}>Generated report • {new Date().toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );
}
function InstagramStoryPreview({ content }: { content: any }) {
  const W = 360, H = 640;
  return (
    <div style={{ display: 'grid', placeItems: 'center', padding: 20 }}>
      <div style={{ width: W, height: H, background: 'linear-gradient(160deg,#1a1630,#2b1f4a 60%,#0f0f1b)', borderRadius: 24, border: `1px solid ${colors.border}`, overflow: 'hidden', position: 'relative', boxShadow: '0 10px 30px rgba(0,0,0,0.45)', color: '#fff' }}>
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
      <div style={{ width: 900, height: 480, background: '#0d1117', border: `1px solid ${colors.border}`, borderRadius: 16, overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.45)', display: 'grid', gridTemplateColumns: '2fr 1.1fr' }}>
        <div style={{ padding: 24 }}>
          <div style={{ fontSize: 24, fontWeight: 900, marginBottom: 10 }}>{pickTitle(content)}</div>
          <div style={{ color: colors.sub, fontSize: 15, lineHeight: 1.5, maxWidth: 560 }}>{pickSummary(content)}</div>
          <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
            <span style={{ background: '#2b3750', color: '#cfe2ff', padding: '6px 10px', borderRadius: 8, fontWeight: 800 }}>Compliance</span>
            <span style={{ background: '#343a40', color: '#f1f3f5', padding: '6px 10px', borderRadius: 8, fontWeight: 800 }}>Transparency</span>
          </div>
        </div>
        <div style={{ background: 'linear-gradient(160deg,#2d1f49,#162337)', position: 'relative' }}>
          <div style={{ position: 'absolute', inset: 14, borderRadius: 12, border: '1px dashed #53617c' }}>
            <div style={{ position: 'absolute', bottom: 12, right: 12, color: '#b1c5ff', fontWeight: 800 }}>Enrich</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------- page -------------------- */

export default function MyReportsPage() {
  const router = useRouter();

  // auth + business
  const [businessId, setBusinessId] = useState<string>('');
  useEffect(() => {
    const t = getToken();
    if (!t) router.replace('/login');
  }, [router]);
  useEffect(() => {
    if (ENV_BIZ) setBusinessId(ENV_BIZ);
    else {
      const b = getBusinessId();
      if (b) setBusinessId(b);
    }
  }, []);

  // data
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  useEffect(() => {
    if (!businessId) return;
    const ac = new AbortController();
    setLoading(true);
    fetchReports(businessId, ac.signal)
      .then((r) => setReports(r))
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, [businessId]);

  // filters
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'all' | ReportStatus>('all');
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    const fromTs = from ? new Date(from).getTime() : -Infinity;
    const toTs = to ? new Date(to).getTime() : Infinity;
    return reports.filter((r) => {
      const okQ = !ql || r.report_type.toLowerCase().includes(ql) || r.id.toLowerCase().includes(ql);
      const ts = new Date(r.created_at).getTime();
      const okDate = ts >= fromTs && ts <= toTs;
      const okStatus = status === 'all' || r.status === status;
      return okQ && okDate && okStatus;
    });
  }, [reports, q, from, to, status]);

  // pagination
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [totalPages, page]);
  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize);

  // preview modal
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState<SocialMode>('pdf');
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [previewContent, setPreviewContent] = useState<any>(null);
  const [previewTitle, setPreviewTitle] = useState<string>('Preview');

  const openPreview = useMemo(
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
        if (!url) { alert('No PDF available for this report.'); return; }
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

  const refresh = useMemo(
    () => async () => {
      if (!businessId) return;
      setLoading(true);
      try {
        const r = await fetchReports(businessId);
        setReports(r);
      } finally {
        setLoading(false);
      }
    },
    [businessId]
  );

  const statusTone = (s: ReportStatus) =>
    s === 'ready' ? 'gold' : s === 'failed' ? 'purple' : 'gray';

  const download = (href?: string | null) => { if (href) window.location.href = href; };

  /* --------------- render --------------- */

  return (
    <div style={{ minHeight: '100vh', background: colors.bg, color: colors.text }}>
      <main style={{ padding: '24px 26px', maxWidth: 1200, margin: '0 auto', width: '100%' }}>
        <H1>My Reports</H1>
        <Muted>Browse, filter, preview, and download previously generated reports.</Muted>

        {/* Filters */}
        <Card style={{ marginTop: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px 160px 140px auto', gap: 10 }}>
            <input
              placeholder="Search by type or ID…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={inputCss}
            />
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              style={inputCss}
              aria-label="From date"
            />
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              style={inputCss}
              aria-label="To date"
            />
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              style={{ ...inputCss, background: '#0f131a' }}
            >
              <option value="all">All statuses</option>
              <option value="ready">Ready</option>
              <option value="processing">Processing</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={refresh} style={btn.ghost}>Refresh</button>
              <button
                onClick={() => {
                  setQ(''); setFrom(''); setTo(''); setStatus('all');
                }}
                style={btn.ghost}
              >
                Clear
              </button>
            </div>
          </div>
        </Card>

        {/* Table */}
        <Card style={{ marginTop: 12 }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 860 }}>
              <thead>
                <tr style={{ textAlign: 'left', color: colors.sub }}>
                  <th style={th}>Created</th>
                  <th style={th}>Type</th>
                  <th style={th}>Status</th>
                  <th style={th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={4} style={{ padding: 14, color: colors.sub }}>Loading…</td></tr>
                )}
                {!loading && pageItems.length === 0 && (
                  <tr><td colSpan={4} style={{ padding: 14, color: colors.sub }}>No reports match your filters.</td></tr>
                )}
                {!loading && pageItems.map((r) => {
                  const created = new Date(r.created_at);
                  const createdStr = created.toLocaleString();
                  const hasPDF = !!(r.pdf_url || r.export_link);
                  const hasCSV = !!r.csv_url;
                  const hasJSON = !!r.json_url;
                  return (
                    <tr key={r.id} style={{ borderTop: `1px solid ${colors.border}` }}>
                      <td style={td}>{createdStr}</td>
                      <td style={td}>{r.report_type || 'business_overview'}</td>
                      <td style={td}><Badge tone={statusTone(r.status)}>{r.status}</Badge></td>
                      <td style={td}>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {/* View as */}
                          <Dropdown button={<>View as</>}>
                            <MenuItem disabled={!hasPDF} onClick={() => openPreview(r, 'pdf')}>🖨️ PDF</MenuItem>
                            <MenuItem onClick={() => openPreview(r, 'facebook')}>📘 Facebook Post</MenuItem>
                            <MenuItem onClick={() => openPreview(r, 'instagram')}>📸 Instagram Story</MenuItem>
                            <MenuItem onClick={() => openPreview(r, 'linkedin')}>💼 LinkedIn Card</MenuItem>
                          </Dropdown>

                          {/* Download */}
                          <Dropdown button={<>Download</>}>
                            <MenuItem disabled={!hasPDF} onClick={() => download(r.pdf_url ?? r.export_link)}>⬇️ PDF</MenuItem>
                            <MenuItem disabled={!hasCSV} onClick={() => download(r.csv_url)}>📊 CSV</MenuItem>
                            <MenuItem disabled={!hasJSON} onClick={() => download(r.json_url)}>🧾 JSON</MenuItem>
                          </Dropdown>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
            <div style={{ color: colors.sub, fontSize: 13 }}>
              Showing {(page - 1) * pageSize + 1}–{Math.min(filtered.length, page * pageSize)} of {filtered.length}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} style={{ ...btn.ghost, opacity: page <= 1 ? 0.5 : 1 }}>
                ◀ Prev
              </button>
              <div style={{ padding: '8px 10px', border: `1px solid ${colors.border}`, borderRadius: 10 }}>
                Page {page} / {totalPages}
              </div>
              <button disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} style={{ ...btn.ghost, opacity: page >= totalPages ? 0.5 : 1 }}>
                Next ▶
              </button>
            </div>
          </div>
        </Card>
      </main>

      {/* Preview modal */}
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
    </div>
  );
}

const th: React.CSSProperties = { padding: '10px 10px', fontWeight: 700, borderBottom: `1px solid ${colors.border}` };
const td: React.CSSProperties = { padding: '12px 10px' };
