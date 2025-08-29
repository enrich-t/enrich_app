'use client';

import React, { useState } from 'react';
import Link from 'next/link';

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

function SectionTitle(props: { icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
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

function Button(props: { children: React.ReactNode; onClick?: () => void; variant?: 'solid' | 'outline'; color?: string }) {
  const color = props.color ?? brand.primary;
  const solid = props.variant !== 'outline';
  return (
    <button
      onClick={props.onClick}
      style={{
        padding: '10px 16px',
        borderRadius: 12,
        border: `1px solid ${color}`,
        background: solid ? color : 'transparent',
        color: solid ? '#fff' : color,
        fontWeight: 900,
        cursor: 'pointer',
      }}
    >
      {props.children}
    </button>
  );
}

export default function GeneratePage() {
  const [toast, setToast] = useState<string | null>(null);
  const showSoon = (msg = 'Coming soon — logic will be wired on the generate branch.') => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  return (
    <div style={{ color: brand.text }}>
      {/* Header / Intro */}
      <div style={{ marginBottom: 14 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900 }}>Generate Report</h1>
        <div style={{ color: brand.sub, marginTop: 6 }}>
          Create comprehensive reports with AI-powered insights and analysis
        </div>
      </div>

      {/* Popular Reports */}
      <SectionTitle icon={<span>📈</span>}>Popular Reports</SectionTitle>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: 16,
          marginBottom: 18,
        }}
      >
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
              <div style={{ color: brand.sub, marginTop: 6 }}>
                Comprehensive analysis of performance and key metrics
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                <Pill>Revenue Growth</Pill>
                <Pill>Market Share</Pill>
                <Pill>Operational Efficiency</Pill>
              </div>
            </div>
            <div>
              <Button onClick={() => showSoon('This Generate action will be wired later.')}>Generate Report →</Button>
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
              <Button color={brand.third} onClick={() => showSoon()}>Generate Report →</Button>
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
              <Button color={brand.secondary} onClick={() => showSoon()}>Generate Report →</Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Trending Topics */}
      <SectionTitle icon={<span>📈</span>}>Trending Topics</SectionTitle>
      <Card>
        {[
          { label: 'AI Integration', tag: 'Hot', change: '+24%' },
          { label: 'Supply Chain Resilience', tag: 'Rising', change: '+18%' },
          { label: 'Sustainability Reporting', tag: 'Trending', change: '+15%' },
          { label: 'Digital Transformation', tag: 'Popular', change: '+12%' },
          { label: 'ESG Compliance', tag: 'Growing', change: '+9%' },
        ].map((t, i) => (
          <div
            key={t.label}
            style={{
              display: 'grid',
              gridTemplateColumns: 'auto 1fr auto auto',
              alignItems: 'center',
              gap: 12,
              padding: '10px 6px',
              borderTop: i === 0 ? 'none' : `1px solid ${brand.border}`,
            }}
          >
            <div style={{ width: 10, height: 10, borderRadius: 999, background: brand.primary }} />
            <div style={{ fontWeight: 800 }}>{t.label}</div>
            <span
              style={{
                justifySelf: 'start',
                background: '#2b2437',
                color: brand.primary,
                border: `1px solid ${brand.primary}`,
                borderRadius: 999,
                padding: '4px 10px',
                fontSize: 12,
                fontWeight: 900,
              }}
            >
              {t.tag}
            </span>
            <div style={{ color: brand.secondary, fontWeight: 900 }}>{t.change}</div>
          </div>
        ))}
      </Card>

      {/* Industry Updates */}
      <SectionTitle icon={<span>🌿</span>}>Industry Updates</SectionTitle>
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
              <span
                style={{
                  marginLeft: 'auto',
                  background: '#2a281e',
                  border: `1px solid ${brand.secondary}`,
                  color: '#f3e2a4',
                  padding: '4px 10px',
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 900,
                }}
              >
                {u.cat}
              </span>
            </div>
            <div style={{ color: brand.sub, marginLeft: 14, marginTop: 6 }}>🕒 {u.time}</div>
          </div>
        ))}
      </Card>

      {/* Suggested Updates */}
      <SectionTitle icon={<span>📅</span>}>Suggested Updates</SectionTitle>
      <Card>
        {[
          { title: 'Q3 Financial Performance Report', sub: 'Quarterly deadline approaching', days: '45 days ago', dot: '#e04a59' },
          { title: 'Customer Satisfaction Analysis', sub: 'New survey data available', days: '32 days ago', dot: '#d2b24a' },
          { title: 'Market Competitive Analysis', sub: 'Industry shifts detected', days: '28 days ago', dot: '#8cb874' },
        ].map((s, i) => (
          <div
            key={s.title}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto',
              gap: 12,
              alignItems: 'center',
              padding: 14,
              borderRadius: 12,
              border: i === 0 ? 'none' : `1px solid ${brand.border}`,
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 10, height: 10, borderRadius: 999, background: s.dot }} />
                <div style={{ fontWeight: 900 }}>{s.title}</div>
              </div>
              <div style={{ color: brand.sub, marginLeft: 20, marginTop: 6 }}>{s.sub}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ color: brand.sub }}>{s.days}</div>
              <Button variant="outline" onClick={() => showSoon('Update flow will be wired later.')}>
                Update
              </Button>
            </div>
          </div>
        ))}
      </Card>

      {/* Builder (visual-only shell) */}
      <SectionTitle icon={<span>⚙️</span>}>Report Builder</SectionTitle>
      <Card>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>Report Type</div>
            <div style={{ border: `1px solid ${brand.border}`, borderRadius: 12, padding: 12, color: brand.sub }}>
              Select report type
            </div>
          </div>
          <div>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>Time Period</div>
            <div style={{ border: `1px solid ${brand.border}`, borderRadius: 12, padding: 12, color: brand.sub }}>
              Select period
            </div>
          </div>
          <div>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>Focus Topics</div>
            <div style={{ border: `1px solid ${brand.border}`, borderRadius: 12, padding: 12, color: brand.sub }}>
              Select topics
            </div>
          </div>
          <div>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>Output Format</div>
            <div style={{ border: `1px solid ${brand.border}`, borderRadius: 12, padding: 12, color: brand.sub }}>
              Select format
            </div>
          </div>
        </div>

        <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>Visual Elements</div>
            <div
              style={{
                border: `1px solid ${brand.border}`,
                borderRadius: 12,
                padding: 12,
                color: brand.sub,
              }}
            >
              Include charts, graphs, and visual analytics
            </div>
          </div>
          <div>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>Context &amp; Insights</div>
            <div
              style={{
                border: `1px solid ${brand.border}`,
                borderRadius: 12,
                padding: 12,
                color: brand.sub,
              }}
            >
              Add contextual questions and AI insights
            </div>
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <div style={{ fontWeight: 900, marginBottom: 6 }}>Custom Requirements</div>
          <div
            style={{
              border: `1px solid ${brand.border}`,
              borderRadius: 12,
              padding: 12,
              color: brand.sub,
              minHeight: 90,
            }}
          >
            Describe any specific requirements, focus areas, or questions you'd like the report to address…
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
          <Button variant="outline" onClick={() => showSoon('Template saving will be added later.')}>
            Save as Template
          </Button>
          <Button onClick={() => showSoon('Generate logic will be implemented on the logic branch.')}>
            Generate Report
          </Button>
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
            background: '#2b2437',
            border: `1px solid ${brand.border}`,
            color: brand.light,
            padding: '10px 12px',
            borderRadius: 10,
            maxWidth: 520,
            boxShadow: '0 6px 20px rgba(0,0,0,0.4)',
            zIndex: 1000,
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
