'use client';

import React, { useEffect, useState } from 'react';
import { fetchMe, extractBusinessId } from '../../lib/api';
import { generateBusinessOverview, listReports, toCsvFallback } from '../../features/reports/businessOverview';
import type { ReportRow } from '../../features/reports/types';

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

function Card(p: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: brand.card, border: `1px solid ${brand.border}`, borderRadius: 16, padding: 18, ...p.style }}>
      {p.children}
    </div>
  );
}
function SectionTitle(p: { children: React.ReactNode; icon?: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '10px 0', ...p.style }}>
      <div style={{ fontSize: 18 }}>{p.icon ?? '📄'}</div>
      <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: brand.text }}>{p.children}</h2>
    </div>
  );
}
function Pill(p: { children: React.ReactNode; color?: string }) {
  const c = p.color ?? brand.primary;
  return (
    <span style={{ border: `1px solid ${c}`, color: c, borderRadius: 999, padding: '6px 12px', fontWeight: 800, fontSize: 12 }}>
      {p.children}
    </span>
  );
}
function Button(p: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'solid' | 'outline' | 'ghost';
  color?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
}) {
  const color = p.color ?? brand.primary;
  const v = p.variant ?? 'solid';
  const bg = v === 'solid' ? color : 'transparent';
  const brd = `1px solid ${color}`;
  const text = v === 'solid' ? '#fff' : color;
  return (
    <button
      onClick={p.onClick}
      disabled={p.disabled}
      style={{
        padding: '10px 16px',
        borderRadius: 12,
        border: brd,
        background: p.disabled ? '#2a2f3a' : bg,
        color: p.disabled ? '#8892a0' : text,
        fontWeight: 900,
        cursor: p.disabled ? 'not-allowed' : 'pointer',
        ...p.style,
      }}
    >
      {p.children}
    </button>
  );
}
function Modal(p: { open: boolean; onClose: () => void; children: React.ReactNode; width?: number }) {
  if (!p.open) return null;
  return (
    <div
      onClick={p.onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'grid', placeItems: 'center', zIndex: 1000 }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{
        width: p.width ?? 960, maxWidth: '94vw', maxHeight: '90vh', overflow: 'auto',
        background: brand.bg, border: `1px solid ${brand.border}`, borderRadius: 16
      }}>
        {p.children}
      </div>
    </div>
  );
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

function Preview({ report }: { report: ReportRow | null }) {
  if (!report) return <div style={{ padding: 18, color: brand.sub }}>No report yet.</div>;
  const c = report.content || {};
  const claim = c.overview?.claim_confidence || {};
  const Label = (s: string) => <div style={{ fontWeight: 900, marginBottom: 4 }}>{s}</div>;
  return (
    <div style={{ padding: 18 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'center', marginBottom: 10, background: '#1a1f29', border: `1px solid ${brand.border}`, borderRadius: 12, padding: 14 }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 22 }}>{c.business_name || 'BUSINESS_NAME'}</div>
        </div>
        <Pill>SUMMARY</Pill>
      </div>

      <h3 style={{ textAlign: 'center', marginTop: 6, marginBottom: 14, color: brand.primary, fontSize: 22 }}>OVERVIEW</h3>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Card>
          {Label('Growth Transparency')}
          <div style={{ color: brand.sub }}>{c.overview?.growth_transparency_info || 'Growth_Transparency_Info'}</div>
        </Card>
        <Card>
          {Label('Claim Confidence')}
          <div style={{ color: brand.sub }}>
            {`Unverified: ${claim.unverified ?? 25}% • Estimated: ${claim.estimated ?? 35}% • Verified: ${claim.verified ?? 40}%`}
          </div>
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
        <Card>
          {Label('Goals')}
          <div style={{ color: brand.sub }}>{c.goals || 'Goal_Information'}</div>
        </Card>
        <Card>
          {Label('3rd Party Certificates')}
          <div style={{ color: brand.sub }}>{c.certifications || 'Certification_Information'}</div>
        </Card>
      </div>
    </div>
  );
}

export function GenerateHub() {
  const [toast, setToast] = useState<string | null>(null);
  const [bizId, setBizId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [latest, setLatest] = useState<ReportRow | null>(null);
  const [open, setOpen] = useState(false);

  const notify = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2200); };

  useEffect(() => {
    let live = true;
    (async () => {
      const me = await fetchMe();
      const id = extractBusinessId(me);
      if (!live) return;
      if (id) {
        setBizId(id);
        const list = await listReports(id);
        if (live) setLatest(list[0] ?? null);
      }
    })();
    return () => { live = false; };
  }, []);

  async function refreshLatest() {
    if (!bizId) return;
    const list = await listReports(bizId);
    setLatest(list[0] ?? null);
  }

  async function onGenerateBusinessOverview() {
    if (!bizId) { notify('No business profile found. Please log in again.'); return; }
    setLoading(true);
    try {
      await generateBusinessOverview(bizId);
      await refreshLatest();
      setOpen(true);
      notify('Report generated');
    } catch (e: any) {
      console.error(e);
      notify(`Failed to generate: ${e?.message || 'error'}`);
    } finally { setLoading(false); }
  }

  const pdfUrl = latest?.exports?.pdf_url || '';
  const csvUrl = latest?.exports?.csv_url || '';
  const jsonUrl = latest?.exports?.json_url || '';

  const canPdf = !!pdfUrl;
  const canCsv = !!csvUrl || !!latest?.content;
  const canJson = !!jsonUrl || !!latest?.content;

  const downloadJSON = () => {
    if (jsonUrl) { window.open(jsonUrl, '_blank', 'noopener'); return; }
    if (latest?.content) downloadBlob(`business_overview_${latest.id}.json`, JSON.stringify(latest.content, null, 2), 'application/json');
  };
  const downloadCSV = () => {
    if (csvUrl) { window.open(csvUrl, '_blank', 'noopener'); return; }
    if (latest?.content) {
      const csv = toCsvFallback(latest.content);
      downloadBlob(`business_overview_${latest.id}.csv`, csv, 'text/csv');
    }
  };

  return (
    <div style={{ color: brand.text }}>
      <div style={{ marginBottom: 14 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900 }}>Generate Report</h1>
        <div style={{ color: brand.sub, marginTop: 6 }}>
          Create comprehensive reports with AI-powered insights and analysis
        </div>
      </div>

      <SectionTitle icon="📈">Popular Reports</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 16, marginBottom: 18 }}>
        <Card>
          <div style={{ display: 'grid', gridTemplateColumns: '64px 1fr auto', gap: 14, alignItems: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, background: '#2b2437', display: 'grid', placeItems: 'center', color: brand.primary, fontSize: 22, fontWeight: 900 }}>📊</div>
            <div>
              <div style={{ fontWeight: 900, fontSize: 22 }}>Business Overview</div>
              <div style={{ color: brand.sub, marginTop: 6, fontSize: 18, lineHeight: 1.4 }}>
                Comprehensive analysis of performance and key metrics
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
                <Pill>Revenue Growth</Pill><Pill>Market Share</Pill><Pill>Operational Efficiency</Pill>
              </div>
            </div>
            <div>
              <Button onClick={onGenerateBusinessOverview} disabled={loading} style={{ minWidth: 160 }}>
                {loading ? 'Generating…' : 'Generate →'}
              </Button>
            </div>
          </div>
        </Card>

        <Card>
          <div style={{ display: 'grid', gridTemplateColumns: '64px 1fr auto', gap: 14, alignItems: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, background: '#273026', display: 'grid', placeItems: 'center', color: brand.third, fontSize: 22, fontWeight: 900 }}>🌍</div>
            <div>
              <div style={{ fontWeight: 900, fontSize: 18 }}>Local Impact</div>
              <div style={{ color: brand.sub, marginTop: 6 }}>Community engagement and local market influence assessment</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                <Pill color={brand.third}>Community Reach</Pill>
                <Pill color={brand.third}>Local Partnerships</Pill>
                <Pill color={brand.third}>Regional Growth</Pill>
              </div>
            </div>
            <div><Button variant="outline" color={brand.third} onClick={() => setToast('Coming soon')}>Generate →</Button></div>
          </div>
        </Card>

        <Card>
          <div style={{ display: 'grid', gridTemplateColumns: '64px 1fr auto', gap: 14, alignItems: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, background: '#322b1c', display: 'grid', placeItems: 'center', color: brand.secondary, fontSize: 22, fontWeight: 900 }}>⚡</div>
            <div>
              <div style={{ fontWeight: 900, fontSize: 18 }}>Energy &amp; Resources</div>
              <div style={{ color: brand.sub, marginTop: 6 }}>Sustainability metrics and resource utilization analysis</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                <Pill color={brand.secondary}>Energy Efficiency</Pill>
                <Pill color={brand.secondary}>Carbon Footprint</Pill>
                <Pill color={brand.secondary}>Resource Usage</Pill>
              </div>
            </div>
            <div><Button variant="outline" color={brand.secondary} onClick={() => setToast('Coming soon')}>Generate →</Button></div>
          </div>
        </Card>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} width={1000}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', padding: 12, borderBottom: `1px solid ${brand.border}` }}>
          <div style={{ fontWeight: 900, fontSize: 18 }}>Business Overview – Preview</div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Button variant="outline" onClick={downloadJSON} disabled={!canJson}>JSON</Button>
            <Button variant="outline" onClick={downloadCSV} disabled={!canCsv}>Canva CSV</Button>
            <Button variant="outline" onClick={() => window.open(pdfUrl, '_blank', 'noopener')} disabled={!canPdf}>PDF</Button>
            <Button variant="ghost" onClick={() => setOpen(false)}>Close</Button>
          </div>
        </div>
        <Preview report={latest} />
      </Modal>

      {toast && (
        <div style={{
          position: 'fixed', right: 16, bottom: 16, background: '#2b2437',
          border: `1px solid ${brand.border}`, color: brand.light, padding: '10px 12px',
          borderRadius: 10, boxShadow: '0 6px 20px rgba(0,0,0,0.4)', zIndex: 1000,
        }}>
          {toast}
        </div>
      )}
    </div>
  );
}

