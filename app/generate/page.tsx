'use client';

import React, { useState } from 'react';

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
        padding: '4px 10px',
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
  variant?: 'solid' | 'outline';
  color?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
}) {
  const color = props.color ?? brand.primary;
  const solid = props.variant !== 'outline';
  return (
    <button
      onClick={props.onClick}
      disabled={props.disabled}
      style={{
        padding: '10px 16px',
        borderRadius: 12,
        border: `1px solid ${color}`,
        background: solid ? color : 'transparent',
        color: solid ? '#fff' : color,
        fontWeight: 900,
        cursor: props.disabled ? 'not-allowed' : 'pointer',
        opacity: props.disabled ? 0.7 : 1,
        ...props.style,
      }}
    >
      {props.children}
    </button>
  );
}

export default function GeneratePage() {
  const [toast, setToast] = useState<string | null>(null);
  const showSoon = (msg = 'Coming soon — functionality will be wired separately.') => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  // Report Builder UI state (placeholders)
  const [reportType, setReportType] = useState('');
  const [timePeriod, setTimePeriod] = useState('');
  const [topics, setTopics] = useState('');
  const [format, setFormat] = useState('');
  const [includeVisuals, setIncludeVisuals] = useState(true);
  const [includeContext, setIncludeContext] = useState(true);
  const [requirements, setRequirements] = useState('');
  const [title, setTitle] = useState('');

  return (
    <div style={{ color: brand.text }}>
      <div style={{ marginBottom: 14 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900 }}>Generate Report</h1>
        <div style={{ color: brand.sub, marginTop: 6 }}>
          Create comprehensive reports with AI-powered insights and analysis
        </div>
      </div>

      {/* 1) Popular Reports */}
      <SectionTitle icon={<span>📈</span>}>Popular Reports</SectionTitle>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: 16,
          marginBottom: 18,
        }}
      >
        {/* Card 1 */}
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
              <div style={{ fontWeight: 900, fontSize: 18 }}>Business Overview</div>
              <div style={{ color: brand.sub, marginTop: 6 }}>Comprehensive analysis of performance and key metrics</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                <Pill>Revenue Growth</Pill>
                <Pill>Market Share</Pill>
                <Pill>Operational Efficiency</Pill>
              </div>
            </div>
            <div>
              <Button onClick={() => showSoon('Use this template → will open builder prefilled.')}>Generate →</Button>
            </div>
          </div>
        </Card>

        {/* Card 2 */}
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
              <Button color={brand.third} onClick={() => showSoon()}>Generate →</Button>
            </div>
          </div>
        </Card>

        {/* Card 3 */}
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
              <Button color={brand.secondary} onClick={() => showSoon()}>Generate →</Button>
            </div>
          </div>
        </Card>
      </div>

      {/* 2) Report Builder */}
      <SectionTitle icon={<span>⚙️</span>}>Report Builder</SectionTitle>
      <Card>
        <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 6 }}>Custom Report Configuration</div>
        <div style={{ color: brand.sub, marginBottom: 12 }}>
          Configure your report parameters and generate a custom analysis
        </div>

        {/* Select row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
          {/** Report Type */}
          <div>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>Report Type</div>
            <div style={{ display: 'flex', alignItems: 'center', border: `1px solid ${brand.border}`, borderRadius: 12, padding: '0 10px', background: '#0f1115' }}>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                style={{ appearance: 'none', width: '100%', padding: '12px 8px', background: 'transparent', color: brand.sub, border: 'none', outline: 'none', fontWeight: 700 }}
              >
                <option value="">Select report type</option>
                <option value="business_overview">Business Overview</option>
                <option value="local_impact">Local Impact</option>
                <option value="energy_resources">Energy & Resources</option>
              </select>
              <span style={{ color: brand.sub, fontSize: 12, marginLeft: 8 }}>▾</span>
            </div>
          </div>

          {/** Time Period */}
          <div>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>Time Period</div>
            <div style={{ display: 'flex', alignItems: 'center', border: `1px solid ${brand.border}`, borderRadius: 12, padding: '0 10px', background: '#0f1115' }}>
              <select
                value={timePeriod}
                onChange={(e) => setTimePeriod(e.target.value)}
                style={{ appearance: 'none', width: '100%', padding: '12px 8px', background: 'transparent', color: brand.sub, border: 'none', outline: 'none', fontWeight: 700 }}
              >
                <option value="">Select period</option>
                <option value="last_30">Last 30 days</option>
                <option value="last_quarter">Last quarter</option>
                <option value="ytd">Year to date</option>
              </select>
              <span style={{ color: brand.sub, fontSize: 12, marginLeft: 8 }}>▾</span>
            </div>
          </div>

          {/** Focus Topics */}
          <div>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>Focus Topics</div>
            <div style={{ display: 'flex', alignItems: 'center', border: `1px solid ${brand.border}`, borderRadius: 12, padding: '0 10px', background: '#0f1115' }}>
              <select
                value={topics}
                onChange={(e) => setTopics(e.target.value)}
                style={{ appearance: 'none', width: '100%', padding: '12px 8px', background: 'transparent', color: brand.sub, border: 'none', outline: 'none', fontWeight: 700 }}
              >
                <option value="">Select topics</option>
                <option value="growth">Growth & revenue</option>
                <option value="sustainability">Sustainability</option>
                <option value="engagement">Community engagement</option>
              </select>
              <span style={{ color: brand.sub, fontSize: 12, marginLeft: 8 }}>▾</span>
            </div>
          </div>

          {/** Output Format */}
          <div>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>Output Format</div>
            <div style={{ display: 'flex', alignItems: 'center', border: `1px solid ${brand.border}`, borderRadius: 12, padding: '0 10px', background: '#0f1115' }}>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                style={{ appearance: 'none', width: '100%', padding: '12px 8px', background: 'transparent', color: brand.sub, border: 'none', outline: 'none', fontWeight: 700 }}
              >
                <option value="">Select format</option>
                <option value="pdf">PDF</option>
                <option value="csv">CSV</option>
                <option value="json">JSON</option>
              </select>
              <span style={{ color: brand.sub, fontSize: 12, marginLeft: 8 }}>▾</span>
            </div>
          </div>
        </div>

        {/* Checkboxes */}
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

        {/* Requirements */}
        <div style={{ marginTop: 14 }}>
          <div style={{ fontWeight: 900, marginBottom: 6 }}>Custom Requirements</div>
          <textarea
            value={requirements}
            onChange={(e) => setRequirements(e.target.value)}
            rows={6}
            placeholder="Describe any specific requirements, focus areas, or questions you'd like the report to address..."
            style={{ width: '100%', resize: 'vertical', border: `1px solid ${brand.border}`, borderRadius: 12, padding: 12, background: '#0f1115', color: brand.text }}
          />
        </div>

        {/* Title */}
        <div style={{ marginTop: 14 }}>
          <div style={{ fontWeight: 900, marginBottom: 6 }}>Report Title</div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter a custom title for your report"
            style={{ width: '100%', border: `1px solid ${brand.border}`, borderRadius: 12, padding: 12, background: '#0f1115', color: brand.text, fontWeight: 700 }}
          />
        </div>

        {/* Footer */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: 12, marginTop: 16 }}>
          <div style={{ color: brand.sub }}>Estimated generation time: 2–5 minutes</div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Button variant="outline" onClick={() => showSoon('Template saving will be added later.')}>Save as Template</Button>
            <Button onClick={() => showSoon('Generate logic will be implemented on the logic branch.')}>Generate Report</Button>
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
              <Button variant="outline" onClick={() => showSoon('Update flow will be wired later.')}>Update</Button>
            </div>
          </div>
        ))}
      </Card>

      {/* tiny toast */}
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
