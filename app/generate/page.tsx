'use client';

import React, { useEffect, useMemo, useState } from 'react';

// ------- brand palette (matches your figma) -------
const brand = {
  primary: '#9881b8',
  secondary: '#e5c564',
  third: '#aec483',
  text: '#e9eaf0',
  sub: '#a7adbb',
  card: '#141821',
  border: '#252a34',
  bg: '#0f1115',
  light: '#ffffff',
};

// ------- tiny UI atoms -------
function Card(props: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        background: brand.card,
        border: `1px solid ${brand.border}`,
        borderRadius: 16,
        padding: 18,
        ...props.style,
      }}
    >
      {props.children}
    </div>
  );
}

function SectionTitle(props: { icon?: React.ReactNode; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '10px 0', ...props.style }}>
      <div style={{ fontSize: 18 }}>{props.icon ?? '📄'}</div>
      <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: brand.text }}>{props.children}</h2>
    </div>
  );
}

function Pill(props: { children: React.ReactNode; tone?: 'primary' | 'secondary' | 'third' }) {
  const tone =
    props.tone === 'secondary' ? brand.secondary : props.tone === 'third' ? brand.third : brand.primary;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 12px',
        borderRadius: 999,
        border: `1px solid ${tone}`,
        color: tone,
        background: 'transparent',
        fontWeight: 800,
        fontSize: 12,
      }}
    >
      {props.children}
    </span>
  );
}

function Button(props: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'solid' | 'outline' | 'ghost';
  color?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
  title?: string;
}) {
  const color = props.color ?? brand.primary;
  const v = props.variant ?? 'solid';
  const bg =
    v === 'solid' ? color : v === 'outline' ? 'transparent' : 'transparent';
  const brd =
    v === 'solid' ? `1px solid ${color}` : v === 'outline' ? `1px solid ${color}` : `1px dashed ${brand.border}`;
  const text = v === 'solid' ? '#fff' : color;
  return (
    <button
      title={props.title}
      onClick={props.onClick}
      disabled={props.disabled}
      style={{
        padding: '10px 16px',
        borderRadius: 12,
        border: brd,
        background: props.disabled ? '#2a2f3a' : bg,
        color: props.disabled ? '#8892a0' : text,
        fontWeight: 900,
        cursor: props.disabled ? 'not-allowed' : 'pointer',
        opacity: props.disabled ? 0.8 : 1,
        ...props.style,
      }}
    >
      {props.children}
    </button>
  );
}

// ------- local helpers (no deps) -------
const API_BASE = ''; // use Next.js rewrite: fetch('/api/...')

function getTokenCandidates(): (string | null)[] {
  if (typeof window === 'undefined') return [];
  return [
    localStorage.getItem('auth_token'),
    localStorage.getItem('access_token'),
    localStorage.getItem('sb_access_token'),
    localStorage.getItem('enrich_token'),
  ];
}

function buildHeaders(): HeadersInit {
  const t = getTokenCandidates().find(Boolean);
  return t ? { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

// quick CSV fallback if backend didn’t attach exports
function toCsvFallback(obj: any): string {
  // extremely simple 2-column CSV (key,value) for Canva import
  const rows: string[] = [['key', 'value']];
  const walk = (prefix: string, v: any) => {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      Object.keys(v).forEach((k) => walk(prefix ? `${prefix}.${k}` : k, v[k]));
    } else {
      rows.push([prefix, v == null ? '' : String(v)]);
    }
  };
  walk('', obj);
  return rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
}

function downloadBlob(filename: string, content: Blob | string, type = 'text/plain') {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ------- types (loose) -------
type ReportContent = {
  business_name?: string;
  contact_info?: string;
  overview?: {
    growth_transparency_info?: string;
    claim_confidence?: { unverified?: number; estimated?: number; verified?: number };
  };
  goals?: string;
  certifications?: string;
  sections?: {
    operations_information?: string;
    localimpact_information?: string;
    peoplepartners_information?: string;
    unwto_information?: string;
    ctc_information?: string;
  };
  insights?: {
    local_supplier_details?: string;
    employee_details?: string;
    economic_details?: string;
  };
  recommendations?: {
    goals?: string;
    operations?: string;
  };
};

type ReportRow = {
  id: string;
  report_type: string;
  created_at?: string;
  content: ReportContent;
  exports?: {
    pdf_url?: string;
    csv_url?: string;
    json_url?: string;
  };
};

// ------- preview modal -------
function Modal(props: { open: boolean; onClose: () => void; children: React.ReactNode; width?: number }) {
  if (!props.open) return null;
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'grid',
        placeItems: 'center',
        zIndex: 1000,
      }}
      onClick={props.onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: props.width ?? 960,
          maxWidth: '94vw',
          maxHeight: '90vh',
          overflow: 'auto',
          background: brand.bg,
          border: `1px solid ${brand.border}`,
          borderRadius: 16,
          boxShadow: '0 10px 30px rgba(0,0,0,.45)',
        }}
      >
        {props.children}
      </div>
    </div>
  );
}

function PreviewOverview({ report }: { report: ReportRow | null }) {
  if (!report) {
    return (
      <div style={{ padding: 18, color: brand.sub }}>
        No report yet. Generate a <b>Business Overview</b> to preview it here.
      </div>
    );
  }
  const c = report.content || {};
  const claim = c.overview?.claim_confidence || {};
  const label = (s: string) => <div style={{ fontWeight: 900, marginBottom: 4 }}>{s}</div>;

  return (
    <div style={{ padding: 18 }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto',
          gap: 12,
          alignItems: 'center',
          marginBottom: 10,
          background: '#1a1f29',
          border: `1px solid ${brand.border}`,
          borderRadius: 12,
          padding: 14,
        }}
      >
        <div>
          <div style={{ fontWeight: 900, fontSize: 22 }}>{c.business_name || 'BUSINESS_NAME'}</div>
          <div style={{ color: brand.sub, fontWeight: 800 }}>{c.contact_info || 'CONTACT_INFO'}</div>
        </div>
        <Pill>SUMMARY</Pill>
      </div>

      <h3 style={{ textAlign: 'center', marginTop: 6, marginBottom: 14, color: brand.primary, fontSize: 22 }}>
        OVERVIEW
      </h3>

      {/* Growth Transparency + Claim Confidence */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Card>
          {label('Growth Transparency')}
          <div style={{ color: brand.sub }}>{c.overview?.growth_transparency_info || 'Growth_Transparency_Info'}</div>
        </Card>
        <Card>
          {label('Claim Confidence')}
          <div style={{ color: brand.sub }}>
            {`Unverified: ${claim.unverified ?? 25}% • Estimated: ${claim.estimated ?? 35}% • Verified: ${
              claim.verified ?? 40
            }%`}
          </div>
        </Card>
      </div>

      {/* Goals + Certificates */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
        <Card>
          {label('Goals')}
          <div style={{ color: brand.sub }}>{c.goals || 'Goal_Information'}</div>
        </Card>
        <Card>
          {label('3rd Party Certificates')}
          <div style={{ color: brand.sub }}>{c.certifications || 'Certification_Information'}</div>
        </Card>
      </div>

      {/* Sections grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
        <Card>
          {label('Operations')}
          <div style={{ color: brand.sub }}>{c.sections?.operations_information || 'operations_information'}</div>
        </Card>
        <Card>
          {label('Global Standards (UNWTO)')}
          <div style={{ color: brand.sub }}>{c.sections?.unwto_information || 'UNWTO_information'}</div>
        </Card>
        <Card>
          {label('Local Impact')}
          <div style={{ color: brand.sub }}>{c.sections?.localimpact_information || 'localimpact_information'}</div>
        </Card>
        <Card>
          {label('National Standards (CTC)')}
          <div style={{ color: brand.sub }}>{c.sections?.ctc_information || 'CTC_information'}</div>
        </Card>
        <Card style={{ gridColumn: '1 / span 2' }}>
          <h3 style={{ textAlign: 'center', color: brand.primary, margin: 0, marginBottom: 10 }}>Insights</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <div>
              {label('Local Suppliers')}
              <div style={{ color: brand.sub }}>{c.insights?.local_supplier_details || 'local_supplier_details'}</div>
            </div>
            <div>
              {label('Employee')}
              <div style={{ color: brand.sub }}>{c.insights?.employee_details || 'employee_details'}</div>
            </div>
            <div>
              {label('Economic Impact')}
              <div style={{ color: brand.sub }}>{c.insights?.economic_details || 'economic_details'}</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Recommendations */}
      <Card style={{ marginTop: 12 }}>
        <h3 style={{ marginTop: 0, color: brand.primary }}>Recommendations</h3>
        <div style={{ color: brand.sub, marginBottom: 6 }}>
          {c.recommendations?.goals || 'recommendations_goals'}
        </div>
        <div style={{ color: brand.sub }}>{c.recommendations?.operations || 'recommendations_operations'}</div>
      </Card>
    </div>
  );
}

// ------- PAGE -------
export default function GeneratePage() {
  // toast
  const [toast, setToast] = useState<string | null>(null);
  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  };

  // Report Builder (UI only, unchanged)
  const [reportType, setReportType] = useState('');
  const [timePeriod, setTimePeriod] = useState('');
  const [topics, setTopics] = useState('');
  const [format, setFormat] = useState('');
  const [includeVisuals, setIncludeVisuals] = useState(true);
  const [includeContext, setIncludeContext] = useState(true);
  const [requirements, setRequirements] = useState('');
  const [title, setTitle] = useState('');

  // business id + latest report
  const [bizId, setBizId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [latest, setLatest] = useState<ReportRow | null>(null);

  // preview modal
  const [open, setOpen] = useState(false);

  // discover business + latest reports on mount
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        // 1) who am I
        const me = await fetch(`${API_BASE}/api/auth/me`, { headers: buildHeaders(), cache: 'no-store' });
        if (!me.ok) throw new Error(`/api/auth/me -> ${me.status}`);
        const m = await me.json();
        const b: string | undefined =
          m?.profile?.id || m?.profile?.business_id || m?.profile?.businessId || m?.profile?.business?.id;
        if (!alive) return;
        if (b) setBizId(b);

        // 2) latest reports
        if (b) {
          const r = await fetch(`${API_BASE}/api/reports/list/${encodeURIComponent(b)}`, {
            headers: buildHeaders(),
            cache: 'no-store',
          });
          if (r.ok) {
            const data = await r.json();
            const first: ReportRow | undefined = (data?.reports || [])[0];
            if (alive) setLatest(first || null);
          }
        }
      } catch (e) {
        // no-op; UI still works
        console.warn('[generate] bootstrap error', e);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  async function refreshLatest() {
    if (!bizId) return;
    try {
      const r = await fetch(`${API_BASE}/api/reports/list/${encodeURIComponent(bizId)}`, {
        headers: buildHeaders(),
        cache: 'no-store',
      });
      if (r.ok) {
        const data = await r.json();
        const first: ReportRow | undefined = (data?.reports || [])[0];
        setLatest(first || null);
      }
    } catch (e) {
      console.warn('[generate] refresh list error', e);
    }
  }

  async function generateBusinessOverview() {
    if (!bizId) {
      notify('No business profile found. Please log in again.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/reports/generate-business-overview`, {
        method: 'POST',
        headers: buildHeaders(),
        body: JSON.stringify({ business_id: bizId }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`${res.status} : ${text || 'Internal Server Error'}`);
      }
      // server should insert & return a report; if not, we re-list
      await refreshLatest();
      setOpen(true);
      notify('Report generated');
    } catch (e: any) {
      console.error('[generate] error', e);
      notify(`Failed to generate: ${e?.message || 'error'}`);
    } finally {
      setLoading(false);
    }
  }

  // downloads (prefer backend export URLs, otherwise fallbacks)
  const pdfUrl = latest?.exports?.pdf_url || '';
  const csvUrl = latest?.exports?.csv_url || '';
  const jsonUrl = latest?.exports?.json_url || '';

  const canDownloadPdf = !!pdfUrl;
  const canDownloadCsv = !!csvUrl || !!latest?.content;
  const canDownloadJson = !!jsonUrl || !!latest?.content;

  const handleDownloadJSON = async () => {
    if (jsonUrl) {
      window.open(jsonUrl, '_blank', 'noopener');
      return;
    }
    if (latest?.content) {
      downloadBlob(`business_overview_${latest.id}.json`, JSON.stringify(latest.content, null, 2), 'application/json');
    }
  };

  const handleDownloadCSV = async () => {
    if (csvUrl) {
      window.open(csvUrl, '_blank', 'noopener');
      return;
    }
    if (latest?.content) {
      const csv = toCsvFallback(latest.content);
      downloadBlob(`business_overview_${latest.id}.csv`, csv, 'text/csv');
    }
  };

  // —————— PAGE UI ——————
  return (
    <div style={{ color: brand.text }}>
      <div style={{ marginBottom: 14 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900 }}>Generate Report</h1>
        <div style={{ color: brand.sub, marginTop: 6 }}>
          Create comprehensive reports with AI-powered insights and analysis
        </div>
      </div>

      {/* 1) Popular Reports (Business Overview wired) */}
      <SectionTitle icon={<span>📈</span>}>Popular Reports</SectionTitle>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: 16,
          marginBottom: 18,
        }}
      >
        {/* BUSINESS OVERVIEW (WIRED) */}
        <Card>
          <div style={{ display: 'grid', gridTemplateColumns: '64px 1fr auto', gap: 14, alignItems: 'center' }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 14,
                background: '#2b2437',
                display: 'grid',
                placeItems: 'center',
                color: brand.primary,
                fontSize: 22,
                fontWeight: 900,
              }}
            >
              📊
            </div>
            <div>
              <div style={{ fontWeight: 900, fontSize: 22 }}>Business Overview</div>
              <div style={{ color: brand.sub, marginTop: 6, fontSize: 18, lineHeight: 1.4 }}>
                Comprehensive analysis of performance and key metrics
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
                <Pill>Revenue Growth</Pill>
                <Pill>Market Share</Pill>
                <Pill>Operational Efficiency</Pill>
              </div>
            </div>
            <div>
              <Button onClick={generateBusinessOverview} disabled={loading} style={{ minWidth: 160 }}>
                {loading ? 'Generating…' : 'Generate →'}
              </Button>
            </div>
          </div>
        </Card>

        {/* (The other two cards remain UI-only for now) */}
        <Card>
          <div style={{ display: 'grid', gridTemplateColumns: '64px 1fr auto', gap: 14, alignItems: 'center' }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 14,
                background: '#273026',
                display: 'grid',
                placeItems: 'center',
                color: brand.third,
                fontSize: 22,
                fontWeight: 900,
              }}
            >
              🌍
            </div>
            <div>
              <div style={{ fontWeight: 900, fontSize: 18 }}>Local Impact</div>
              <div style={{ color: brand.sub, marginTop: 6 }}>
                Community engagement and local market influence assessment
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                <Pill tone="third">Community Reach</Pill>
                <Pill tone="third">Local Partnerships</Pill>
                <Pill tone="third">Regional Growth</Pill>
              </div>
            </div>
            <div>
              <Button color={brand.third} variant="outline" onClick={() => notify('Coming soon')}>
                Generate →
              </Button>
            </div>
          </div>
        </Card>

        <Card>
          <div style={{ display: 'grid', gridTemplateColumns: '64px 1fr auto', gap: 14, alignItems: 'center' }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 14,
                background: '#322b1c',
                display: 'grid',
                placeItems: 'center',
                color: brand.secondary,
                fontSize: 22,
                fontWeight: 900,
              }}
            >
              ⚡
            </div>
            <div>
              <div style={{ fontWeight: 900, fontSize: 18 }}>Energy &amp; Resources</div>
              <div style={{ color: brand.sub, marginTop: 6 }}>
                Sustainability metrics and resource utilization analysis
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                <Pill tone="secondary">Energy Efficiency</Pill>
                <Pill tone="secondary">Carbon Footprint</Pill>
                <Pill tone="secondary">Resource Usage</Pill>
              </div>
            </div>
            <div>
              <Button color={brand.secondary} variant="outline" onClick={() => notify('Coming soon')}>
                Generate →
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* 2) Report Builder (unchanged UI-only) */}
      <SectionTitle icon={<span>⚙️</span>}>Report Builder</SectionTitle>
      <Card>
        <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 6 }}>Custom Report Configuration</div>
        <div style={{ color: brand.sub, marginBottom: 12 }}>
          Configure your report parameters and generate a custom analysis
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
          <div>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>Report Type</div>
            <div style={{ display: 'flex', alignItems: 'center', border: `1px solid ${brand.border}`, borderRadius: 12, padding: '0 10px', background: '#0f1115' }}>
              <select value={reportType} onChange={(e) => setReportType(e.target.value)}
                style={{ appearance: 'none', width: '100%', padding: '12px 8px', background: 'transparent', color: brand.sub, border: 'none', outline: 'none', fontWeight: 700 }}>
                <option value="">Select report type</option>
                <option value="business_overview">Business Overview</option>
                <option value="local_impact">Local Impact</option>
                <option value="energy_resources">Energy & Resources</option>
              </select>
              <span style={{ color: brand.sub, fontSize: 12, marginLeft: 8 }}>▾</span>
            </div>
          </div>
          <div>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>Time Period</div>
            <div style={{ display: 'flex', alignItems: 'center', border: `1px solid ${brand.border}`, borderRadius: 12, padding: '0 10px', background: '#0f1115' }}>
              <select value={timePeriod} onChange={(e) => setTimePeriod(e.target.value)}
                style={{ appearance: 'none', width: '100%', padding: '12px 8px', background: 'transparent', color: brand.sub, border: 'none', outline: 'none', fontWeight: 700 }}>
                <option value="">Select period</option>
                <option value="last_30">Last 30 days</option>
                <option value="last_quarter">Last quarter</option>
                <option value="ytd">Year to date</option>
              </select>
              <span style={{ color: brand.sub, fontSize: 12, marginLeft: 8 }}>▾</span>
            </div>
          </div>
          <div>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>Focus Topics</div>
            <div style={{ display: 'flex', alignItems: 'center', border: `1px solid ${brand.border}`, borderRadius: 12, padding: '0 10px', background: '#0f1115' }}>
              <select value={topics} onChange={(e) => setTopics(e.target.value)}
                style={{ appearance: 'none', width: '100%', padding: '12px 8px', background: 'transparent', color: brand.sub, border: 'none', outline: 'none', fontWeight: 700 }}>
                <option value="">Select topics</option>
                <option value="growth">Growth & revenue</option>
                <option value="sustainability">Sustainability</option>
                <option value="engagement">Community engagement</option>
              </select>
              <span style={{ color: brand.sub, fontSize: 12, marginLeft: 8 }}>▾</span>
            </div>
          </div>
          <div>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>Output Format</div>
            <div style={{ display: 'flex', alignItems: 'center', border: `1px solid ${brand.border}`, borderRadius: 12, padding: '0 10px', background: '#0f1115' }}>
              <select value={format} onChange={(e) => setFormat(e.target.value)}
                style={{ appearance: 'none', width: '100%', padding: '12px 8px', background: 'transparent', color: brand.sub, border: 'none', outline: 'none', fontWeight: 700 }}>
                <option value="">Select format</option>
                <option value="pdf">PDF</option>
                <option value="csv">CSV</option>
                <option value="json">JSON</option>
              </select>
              <span style={{ color: brand.sub, fontSize: 12, marginLeft: 8 }}>▾</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 14 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, border: `1px solid ${brand.border}`, borderRadius: 12, padding: 12, cursor: 'pointer' }}>
            <span style={{ fontSize: 18 }}>🖼️</span>
            <input type="checkbox" checked={includeVisuals} onChange={e => setIncludeVisuals(e.target.checked)} style={{ width: 18, height: 18 }} />
            <div style={{ fontWeight: 800 }}>Include charts, graphs, and visual analytics</div>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, border: `1px solid ${brand.border}`, borderRadius: 12, padding: 12, cursor: 'pointer' }}>
            <span style={{ fontSize: 18 }}>💬</span>
            <input type="checkbox" checked={includeContext} onChange={e => setIncludeContext(e.target.checked)} style={{ width: 18, height: 18 }} />
            <div style={{ fontWeight: 800 }}>Add contextual questions and AI insights</div>
          </label>
        </div>

        <div style={{ marginTop: 14 }}>
          <div style={{ fontWeight: 900, marginBottom: 6 }}>Custom Requirements</div>
          <textarea value={requirements} onChange={(e) => setRequirements(e.target.value)} rows={6}
            placeholder="Describe any specific requirements, focus areas, or questions you'd like the report to address..."
            style={{ width: '100%', resize: 'vertical', border: `1px solid ${brand.border}`, borderRadius: 12, padding: 12, background: '#0f1115', color: brand.text }} />
        </div>

        <div style={{ marginTop: 14 }}>
          <div style={{ fontWeight: 900, marginBottom: 6 }}>Report Title</div>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Enter a custom title for your report"
            style={{ width: '100%', border: `1px solid ${brand.border}`, borderRadius: 12, padding: 12, background: '#0f1115', color: brand.text, fontWeight: 700 }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: 12, marginTop: 16 }}>
          <div style={{ color: brand.sub }}>Estimated generation time: 2–5 minutes</div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Button variant="outline" onClick={() => notify('Template saving coming soon')}>Save as Template</Button>
            <Button variant="ghost" onClick={() => notify('Use the Business Overview card above for now')}>
              Generate Report
            </Button>
          </div>
        </div>
      </Card>

      {/* 3) Trending Topics */}
      <SectionTitle icon={<span>📊</span>} style={{ marginTop: 18 }}>Trending Topics</SectionTitle>
      <Card>
        {[
          { label: 'AI Integration', tag: 'Hot', change: '+24%' },
          { label: 'Supply Chain Resilience', tag: 'Rising', change: '+18%' },
          { label: 'Sustainability Reporting', tag: 'Trending', change: '+15%' },
          { label: 'Digital Transformation', tag: 'Popular', change: '+12%' },
          { label: 'ESG Compliance', tag: 'Growing', change: '+9%' },
        ].map((t, i) => (
          <div key={t.label}
            style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto auto', alignItems: 'center', gap: 12, padding: '10px 6px', borderTop: i === 0 ? 'none' : `1px solid ${brand.border}` }}>
            <div style={{ width: 10, height: 10, borderRadius: 999, background: brand.primary }} />
            <div style={{ fontWeight: 800 }}>{t.label}</div>
            <span style={{ justifySelf: 'start', background: '#2b2437', color: brand.primary, border: `1px solid ${brand.primary}`, borderRadius: 999, padding: '4px 10px', fontSize: 12, fontWeight: 900 }}>
              {t.tag}
            </span>
            <div style={{ color: brand.secondary, fontWeight: 900 }}>{t.change}</div>
          </div>
        ))}
      </Card>

      {/* 4) Industry Updates */}
      <SectionTitle icon={<span>🌿</span>} style={{ marginTop: 18 }}>Industry Updates</SectionTitle>
      <Card>
        {[
          { title: 'New ESG Disclosure Requirements', cat: 'Regulatory', time: '2 hours ago' },
          { title: 'AI Ethics Guidelines Released', cat: 'Technology', time: '1 day ago' },
          { title: 'Global Supply Chain Index Update', cat: 'Market Data', time: '3 days ago' },
        ].map((u, i) => (
          <div key={u.title} style={{ padding: '14px 6px', borderTop: i === 0 ? 'none' : `1px solid ${brand.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 4, height: 32, background: brand.third, borderRadius: 4 }} />
              <div style={{ fontWeight: 900 }}>{u.title}</div>
              <span style={{ marginLeft: 'auto', background: '#2a281e', border: `1px solid ${brand.secondary}`, color: '#f3e2a4', padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 900 }}>
                {u.cat}
              </span>
            </div>
            <div style={{ color: brand.sub, marginLeft: 14, marginTop: 6 }}>🕒 {u.time}</div>
          </div>
        ))}
      </Card>

      {/* 5) Suggested Updates */}
      <SectionTitle icon={<span>📅</span>} style={{ marginTop: 18 }}>Suggested Updates</SectionTitle>
      <Card>
        {[
          { title: 'Q3 Financial Performance Report', sub: 'Quarterly deadline approaching', days: '45 days ago', dot: '#e04a59' },
          { title: 'Customer Satisfaction Analysis', sub: 'New survey data available', days: '32 days ago', dot: '#d2b24a' },
          { title: 'Market Competitive Analysis', sub: 'Industry shifts detected', days: '28 days ago', dot: '#8cb874' },
        ].map((s, i) => (
          <div key={s.title}
            style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'center', padding: 14, borderRadius: 12, borderTop: i === 0 ? 'none' : `1px solid ${brand.border}` }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 10, height: 10, borderRadius: 999, background: s.dot }} />
                <div style={{ fontWeight: 900 }}>{s.title}</div>
              </div>
              <div style={{ color: brand.sub, marginLeft: 20, marginTop: 6 }}>{s.sub}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ color: brand.sub }}>{s.days}</div>
              <Button variant="outline" onClick={() => notify('Update flow will be wired later.')}>Update</Button>
            </div>
          </div>
        ))}
      </Card>

      {/* Preview modal */}
      <Modal open={open} onClose={() => setOpen(false)} width={1000}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', padding: 12, borderBottom: `1px solid ${brand.border}` }}>
          <div style={{ fontWeight: 900, fontSize: 18 }}>Business Overview – Preview</div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Button variant="outline" onClick={handleDownloadJSON} disabled={!canDownloadJson} title="Download JSON">
              JSON
            </Button>
            <Button variant="outline" onClick={handleDownloadCSV} disabled={!canDownloadCsv} title="Download Canva CSV">
              Canva CSV
            </Button>
            <Button variant="outline" onClick={() => window.open(pdfUrl, '_blank', 'noopener')} disabled={!canDownloadPdf} title="Open PDF">
              PDF
            </Button>
            <Button variant="ghost" onClick={() => setOpen(false)}>Close</Button>
          </div>
        </div>
        <PreviewOverview report={latest} />
      </Modal>

      {/* toast */}
      {toast && (
        <div
          role="status"
          style={{
            position: 'fixed', right: 16, bottom: 16,
            background: '#2b2437', border: `1px solid ${brand.border}`,
            color: brand.light, padding: '10px 12px', borderRadius: 10,
            maxWidth: 520, boxShadow: '0 6px 20px rgba(0,0,0,0.4)', zIndex: 1000,
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
