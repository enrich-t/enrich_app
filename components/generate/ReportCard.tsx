'use client';
import * as React from 'react';
import { ReportType } from './reports-registry';

const colors = { border: '#252a34', text: '#e9eaf0', sub: '#a7adbb', card: '#141821', surface: '#0f131a' };

export default function ReportCard({
  def, loading, disabled, onGenerate, onPreviewTemplate, creditsText, disabledReason,
}: {
  def: ReportType;
  loading: boolean;
  disabled: boolean;
  onGenerate: () => void;
  onPreviewTemplate?: () => void;
  creditsText?: string;
  disabledReason?: string;
}) {
  return (
    <div style={styles.cardOuter} title={disabled ? (disabledReason || '') : ''}>
      <div style={styles.cardInner}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ ...styles.iconWrap, background: def.accent }}>{def.icon}</div>
          {def.badge ? <span style={styles.badge}>{def.badge}</span> : null}
        </div>

        <div>
          <div style={styles.cardTitle}>{def.title}</div>
          <div style={styles.cardDesc}>{def.description}</div>
        </div>

        <div>
          <div style={styles.keyMetrics}>Key Metrics:</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {def.metrics.map((m) => (
              <span key={m} style={styles.metricChip}>{m}</span>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gap: 8, marginTop: 4 }}>
          <button
            onClick={onGenerate}
            disabled={disabled}
            style={{ ...styles.button, ...(disabled ? styles.buttonDisabled : styles.hollowBtn), width: '100%' }}
          >
            {loading ? 'Generating…' : 'Generate Report →'}
          </button>

          {onPreviewTemplate ? (
            <button type="button" onClick={onPreviewTemplate} style={{ ...styles.button, ...styles.secondaryBtn, width: '100%' }}>
              Preview Template
            </button>
          ) : null}

          {creditsText ? <div style={{ color: colors.sub, fontSize: 12 }}>{creditsText}</div> : null}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  cardOuter: { border: `1px solid ${colors.border}`, borderRadius: 16, background: colors.card, boxShadow: '0 10px 18px rgba(0,0,0,0.25)' },
  cardInner: { padding: 16, display: 'grid', gap: 12 },
  iconWrap: { width: 40, height: 40, borderRadius: 10, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: colors.text },
  cardTitle: { fontSize: 16, fontWeight: 700, color: colors.text },
  cardDesc: { color: colors.sub, fontSize: 14 },
  keyMetrics: { fontSize: 13, fontWeight: 700, marginBottom: 6, color: colors.text },
  metricChip: { display: 'inline-flex', alignItems: 'center', padding: '4px 8px', borderRadius: 999, background: colors.surface, border: `1px solid ${colors.border}`, fontSize: 12, color: colors.text },
  badge: { display: 'inline-flex', padding: '2px 8px', borderRadius: 999, border: `1px solid ${colors.border}`, background: '#1a1f29', color: colors.sub, fontSize: 12, fontWeight: 700 },
  button: { appearance: 'none', border: '1px solid transparent', borderRadius: 10, padding: '10px 14px', fontWeight: 800, fontSize: 14, cursor: 'pointer' },
  secondaryBtn: { background: colors.surface, color: colors.text, borderColor: colors.border },
  hollowBtn: { background: 'transparent', color: colors.text, borderColor: '#b8a3ea' },
  buttonDisabled: { opacity: 0.6, cursor: 'not-allowed', background: '#3b3f4b', color: '#c9ceda' },
};
