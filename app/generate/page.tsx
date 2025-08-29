'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '../../components/api';
import { getBusinessId, getToken } from '../../components/auth';

const brand = {
  primary: '#9881b8',   // figma: primary
  secondary: '#e5c564', // figma: secondary
  third: '#aec483',     // figma: third
  bg: '#0f1115',
  text: '#e9eaf0',
  sub: '#a7adbb',
  card: '#141821',
  border: '#252a34',
};

type PopularCard = {
  id: 'business_overview' | 'local_impact' | 'energy_resources';
  title: string;
  desc: string;
  metrics: string[];
  age: string;
  icon: string;
  tone: 'primary' | 'third' | 'secondary';
};

const POPULAR: PopularCard[] = [
  {
    id: 'business_overview',
    title: 'Business Overview',
    desc: 'Comprehensive analysis of your business performance and key metrics',
    metrics: ['Revenue Growth', 'Market Share', 'Operational Efficiency'],
    age: '2 days ago',
    icon: '📊',
    tone: 'primary',
  },
  {
    id: 'local_impact',
    title: 'Local Impact',
    desc: 'Community engagement and local market influence assessment',
    metrics: ['Community Reach', 'Local Partnerships', 'Regional Growth'],
    age: '1 week ago',
    icon: '🌍',
    tone: 'third',
  },
  {
    id: 'energy_resources',
    title: 'Energy & Resources',
    desc: 'Sustainability metrics and resource utilization analysis',
    metrics: ['Energy Efficiency', 'Carbon Footprint', 'Resource Usage'],
    age: '3 days ago',
    icon: '⚡',
    tone: 'secondary',
  },
];

const colorsForTone: Record<PopularCard['tone'], { bg: string; fg: string }> = {
  primary:  { bg: '#372c4a', fg: brand.primary },
  secondary:{ bg: '#3a320e', fg: brand.secondary },
  third:    { bg: '#2f3b29', fg: brand.third },
};

const inputCss: React.CSSProperties = {
  padding: '12px 12px',
  borderRadius: 12,
  border: `1px solid ${brand.border}`,
  background: '#0f131a',
  color: brand.text,
  outline: 'none',
  fontSize: 14,
  width: '100%',
};

const btn = {
  primary: {
    padding: '12px 16px',
    borderRadius: 12,
    border: `1px solid ${brand.primary}`,
    background: brand.primary,
    color: '#fff',
    fontWeight: 800,
    cursor: 'pointer',
  } as React.CSSProperties,
  ghost: {
    padding: '10px 14px',
    borderRadius: 12,
    border: `1px solid ${brand.border}`,
    background: 'transparent',
    color: brand.text,
    fontWeight: 700,
    cursor: 'pointer',
  } as React.CSSProperties,
  outline: {
    padding: '12px 16px',
    borderRadius: 12,
    border: `1px solid ${brand.primary}`,
    background: 'transparent',
    color: brand.primary,
    fontWeight: 800,
    cursor: 'pointer',
  } as React.CSSProperties,
};

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        background: brand.card,
        border: `1px solid ${brand.border}`,
        borderRadius: 16,
        padding: 18,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function SectionTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
      <span style={{ fontSize: 18 }}>{icon}</span>
      <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>{children}</h3>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '6px 10px',
        borderRadius: 999,
        border: `1px solid ${brand.border}`,
        background: '#0f131a',
        color: brand.text,
        fontSize: 12,
        fontWeight: 700,
      }}
    >
      {children}
    </span>
  );
}

export default function GeneratePage() {
  const router = useRouter();

  // form state
  const [reportType, setReportType] = useState<string>('business_overview');
  const [period, setPeriod] = useState<string>('last_quarter');
  const [format, setFormat] = useState<string>('pdf');
  const [topics, setTopics] = useState<string[]>([]);
  const [includeVisuals, setIncludeVisuals] = useState<boolean>(true);
  const [includeAI, setIncludeAI] = useState<boolean>(true);
  const [notes, setNotes] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [busy, setBusy] = useState<boolean>(false);
  const [toast, setToast] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null);

  const toggleTopic = (t: string) =>
    setTopics((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  const quickTemplates = useMemo(
    () =>
      POPULAR.map((p) => ({
        id: p.id,
        label: p.title,
        apply: () => {
          setReportType(p.id);
          setTopics(p.metrics);
          setTitle(p.title);
        },
      })),
    []
  );

  async function generate(payloadExtras?: Record<string, any>) {
    const token = getToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    const business_id = getBusinessId() || process.env.NEXT_PUBLIC_BUSINESS_ID || '';
    const payload = {
      business_id: String(business_id),
      report_type: reportType || 'business_overview',
      output_format: format,
      time_period: period,
      include_visuals: includeVisuals,
      include_ai_insights: includeAI,
      topics,
      title: title?.trim() || undefined,
      ...payloadExtras,
    };

    setBusy(true);
    setToast(null);
    try {
      const res = await apiFetch('/api/reports/generate-business-overview', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const txt = await res.text();
      let json: any = null;
      try { json = JSON.parse(txt); } catch {}

      if (!res.ok) {
        const msg = json?.message || json?.detail || txt || `${res.status} ${res.statusText}`;
        setToast({ kind: 'err', msg: `Generate failed: ${String(msg).slice(0, 220)}` });
        setBusy(false);
        return;
      }

      setToast({ kind: 'ok', msg: 'Report generation started. It will appear in My Reports shortly.' });
      setBusy(false);
      // optional: route to My Reports
      setTimeout(() => router.push('/my-reports'), 800);
    } catch (e: any) {
      setToast({ kind: 'err', msg: e?.message || 'Network error' });
      setBusy(false);
    }
  }

  return (
    <div style={{ color: brand.text }}>
      <div style={{ marginBottom: 10 }}>
        <h1 style={{ margin: 0, fontSize: 32, fontWeight: 900 }}>Generate Report</h1>
        <div style={{ color: brand.sub, marginTop: 6 }}>
          Create comprehensive reports with AI-powered insights and analysis
        </div>
      </div>

      {/* Popular Reports */}
      <Card style={{ marginTop: 18 }}>
        <SectionTitle icon="🗂️">Popular Reports</SectionTitle>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 16,
          }}
        >
          {POPULAR.map((p) => {
            const tone = colorsForTone[p.tone];
            return (
              <div
                key={p.id}
                style={{
                  border: `1px solid ${brand.border}`,
                  borderRadius: 16,
                  padding: 16,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      display: 'grid',
                      placeItems: 'center',
                      borderRadius: 12,
                      background: tone.bg,
                      color: tone.fg,
                      fontSize: 24,
                      fontWeight: 700,
                    }}
                  >
                    {p.icon}
                  </div>
                  <span
                    style={{
                      alignSelf: 'start',
                      background: '#0f131a',
                      border: `1px solid ${brand.border}`,
                      color: brand.sub,
                      padding: '4px 10px',
                      borderRadius: 999,
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    {p.age}
                  </span>
                </div>

                <div style={{ fontSize: 18, fontWeight: 800, marginTop: 12 }}>{p.title}</div>
                <div style={{ color: brand.sub, marginTop: 6 }}>{p.desc}</div>

                <div style={{ marginTop: 16 }}>
                  <div style={{ fontWeight: 800, marginBottom: 10 }}>Key Metrics:</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {p.metrics.map((m) => (
                      <Chip key={m}>{m}</Chip>
                    ))}
                  </div>
                </div>

                <div style={{ marginTop: 16 }}>
                  <button
                    style={{ ...btn.outline, width: '100%', borderColor: tone.fg, color: tone.fg }}
                    onClick={() => {
                      setReportType(p.id);
                      setTopics(p.metrics);
                      setTitle(p.title);
                      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                    }}
                  >
                    Generate Report →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Trending Topics */}
      <Card style={{ marginTop: 18 }}>
        <SectionTitle icon="📈">Trending Topics</SectionTitle>
        <div style={{ display: 'grid', gap: 16 }}>
          {[
            { name: 'AI Integration', delta: '+24%', badge: 'Hot', c: brand.primary },
            { name: 'Supply Chain Resilience', delta: '+18%', badge: 'Rising', c: brand.secondary },
            { name: 'Sustainability Reporting', delta: '+15%', badge: 'Trending', c: brand.third },
            { name: 'Digital Transformation', delta: '+12%', badge: 'Popular', c: brand.primary },
            { name: 'ESG Compliance', delta: '+9%', badge: 'Growing', c: brand.third },
          ].map((t) => (
            <div
              key={t.name}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto',
                alignItems: 'center',
                borderBottom: `1px solid ${brand.border}`,
                paddingBottom: 10,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    background: t.c,
                    display: 'inline-block',
                  }}
                />
                <div style={{ fontWeight: 800 }}>{t.name}</div>
                <span
                  style={{
                    marginLeft: 8,
                    background: '#0f131a',
                    border: `1px solid ${brand.border}`,
                    color: brand.sub,
                    padding: '2px 8px',
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {t.badge}
                </span>
              </div>
              <div style={{ color: brand.primary, fontWeight: 900 }}>{t.delta}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Industry Updates */}
      <Card style={{ marginTop: 18 }}>
        <SectionTitle icon="🌐">Industry Updates</SectionTitle>
        <div style={{ display: 'grid', gap: 14 }}>
          {[
            { title: 'New ESG Disclosure Requirements', tag: 'Regulatory', ago: '2 hours ago' },
            { title: 'AI Ethics Guidelines Released', tag: 'Technology', ago: '1 day ago' },
            { title: 'Global Supply Chain Index Update', tag: 'Market Data', ago: '3 days ago' },
          ].map((u, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10 }}>
              <div>
                <div style={{ fontWeight: 800 }}>{u.title}</div>
                <div style={{ color: brand.sub, marginTop: 4 }}>Updated regulations and standards</div>
                <div style={{ color: brand.sub, marginTop: 6, fontSize: 12 }}>🕒 {u.ago}</div>
              </div>
              <div style={{ alignSelf: 'start' }}>
                <span
                  style={{
                    background: '#0f131a',
                    border: `1px solid ${brand.border}`,
                    color: brand.sub,
                    padding: '4px 10px',
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {u.tag}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Report Builder */}
      <Card style={{ marginTop: 18 }}>
        <SectionTitle icon="⚙️">Report Builder</SectionTitle>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>Report Type</div>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              style={inputCss}
            >
              <option value="business_overview">Business Overview</option>
              <option value="local_impact">Local Impact</option>
              <option value="energy_resources">Energy & Resources</option>
            </select>
          </div>

          <div>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>Time Period</div>
            <select value={period} onChange={(e) => setPeriod(e.target.value)} style={inputCss}>
              <option value="last_month">Last Month</option>
              <option value="last_quarter">Last Quarter</option>
              <option value="ytd">Year to Date</option>
            </select>
          </div>

          <div>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>Focus Topics</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {['Revenue Growth', 'Market Share', 'Operational Efficiency', 'Community Reach', 'Carbon Footprint'].map(
                (t) => (
                  <button
                    key={t}
                    onClick={() => toggleTopic(t)}
                    style={{
                      ...inputCss,
                      padding: '8px 12px',
                      width: 'auto',
                      borderColor: topics.includes(t) ? brand.primary : brand.border,
                      background: topics.includes(t) ? '#2b2437' : '#0f131a',
                    }}
                  >
                    {t}
                  </button>
                )
              )}
            </div>
          </div>

          <div>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>Output Format</div>
            <select value={format} onChange={(e) => setFormat(e.target.value)} style={inputCss}>
              <option value="pdf">PDF</option>
              <option value="json">JSON</option>
              <option value="csv">CSV</option>
            </select>
          </div>
        </div>

        <hr style={{ border: 0, borderTop: `1px solid ${brand.border}`, margin: '18px 0' }} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, border: `1px solid ${brand.border}`, borderRadius: 12, padding: 12 }}>
            <input type="checkbox" checked={includeVisuals} onChange={(e) => setIncludeVisuals(e.target.checked)} />
            Include charts, graphs, and visual analytics
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, border: `1px solid ${brand.border}`, borderRadius: 12, padding: 12 }}>
            <input type="checkbox" checked={includeAI} onChange={(e) => setIncludeAI(e.target.checked)} />
            Add contextual questions and AI insights
          </label>
        </div>

        <div style={{ marginTop: 14 }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Custom Requirements</div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Describe any specific requirements, focus areas, or questions…"
            rows={5}
            style={{ ...inputCss, resize: 'vertical' }}
          />
        </div>

        <div style={{ marginTop: 14 }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Report Title</div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter a custom title for your report"
            style={inputCss}
          />
          <div style={{ color: brand.sub, marginTop: 8, fontSize: 13 }}>
            Estimated generation time: 2–5 minutes
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
          <button style={btn.ghost} onClick={() => alert('Templates coming soon')}>
            Save as Template
          </button>
          <button style={{ ...btn.primary, opacity: busy ? 0.6 : 1 }} disabled={busy} onClick={() => generate({ notes })}>
            {busy ? 'Generating…' : 'Generate Report'}
          </button>
        </div>
      </Card>

      {/* tiny toast */}
      {toast && (
        <div
          role="status"
          style={{
            position: 'fixed',
            right: 16,
            bottom: 16,
            background: toast.kind === 'ok' ? '#18321b' : '#3a1c1c',
            border: `1px solid ${toast.kind === 'ok' ? '#2e6b36' : '#764343'}`,
            color: '#fff',
            padding: '10px 12px',
            borderRadius: 10,
            maxWidth: 520,
            boxShadow: '0 6px 20px rgba(0,0,0,0.4)',
          }}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}
