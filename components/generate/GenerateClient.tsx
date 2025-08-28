'use client';

import * as React from 'react';
import ReportCard from './ReportCard';
import TemplateModal from './TemplateModal';
import { REPORT_TYPES, COST_PER_REPORT } from './reports-registry';
import { useGenerateReport } from './useGenerateReport';
import { useToast } from '../../components/Toast';

const colors = { bg: '#0f1115', card: '#141821', border: '#252a34', text: '#e9eaf0', sub: '#a7adbb', brand: '#9b7bd1' };

export default function GenerateClient() {
  const { loadingId, credits, businessId, notEnoughCredits, runBusinessOverview } = useGenerateReport();
  const { push } = useToast();

  const [preview, setPreview] = React.useState<{ open: boolean; embed?: string; view?: string; title?: string }>({ open: false });

  return (
    <div style={styles.page}>
      <div style={styles.headerBlock}>
        <h1 style={styles.title}>Generate Report</h1>
        <p style={styles.subtitle}>Create comprehensive reports with AI-powered insights and analysis</p>
      </div>

      <div style={styles.sectionHeader}>
        <span style={{ fontSize: 18, lineHeight: 1 }}>📄</span>
        <span style={styles.sectionTitle}>Popular Reports</span>
      </div>

      <div style={styles.cardGrid3}>
        {REPORT_TYPES.map((def) => {
          const disabled =
            !!loadingId || !businessId || (credits !== null && credits < COST_PER_REPORT) || !def.enabled;

          const disabledReason = !def.enabled
            ? 'Coming soon'
            : !businessId
            ? 'Business ID not set'
            : credits !== null && credits < COST_PER_REPORT
            ? 'Not enough credits'
            : '';

          const onGenerate = () => {
            if (def.id === 'business_overview') return runBusinessOverview({ template: def.template });
            push({ title: `${def.title}`, description: 'This report is coming soon.', tone: 'default' });
          };

          return (
            <ReportCard
              key={def.id}
              def={def}
              loading={loadingId === def.id}
              disabled={disabled}
              onGenerate={onGenerate}
              onPreviewTemplate={
                def.template
                  ? () =>
                      setPreview({
                        open: true,
                        embed: def.template!.embedSrc,
                        view: def.template!.viewUrl,
                        title: def.title,
                      })
                  : undefined
              }
              creditsText={credits == null ? undefined : `Credits: ${credits}`}
              disabledReason={disabledReason}
            />
          );
        })}
      </div>

      {/* Builder placeholder (kept minimal) */}
      <div style={styles.sectionHeader}>
        <span style={{ fontSize: 18, lineHeight: 1 }}>⚙️</span>
        <span style={styles.sectionTitle}>Report Builder</span>
      </div>
      <div style={styles.panel}>
        <div style={{ color: colors.sub }}>
          Builder controls will live here. For now, use the “Business Overview” card above to generate and test the flow.
        </div>
      </div>

      {preview.open && (
        <TemplateModal
          open={preview.open}
          title={preview.title}
          embedSrc={preview.embed}
          viewUrl={preview.view}
          onClose={() => setPreview({ open: false })}
        />
      )}
    </div>
  );
}

/* ---------- styles ---------- */
const styles: Record<string, React.CSSProperties> = {
  page: { maxWidth: 1100, margin: '24px auto 80px', padding: '0 16px', color: colors.text, background: colors.bg, borderRadius: 16 },
  headerBlock: { marginBottom: 8 },
  title: { fontSize: 28, fontWeight: 700, margin: 0, color: colors.text },
  subtitle: { margin: '6px 0 16px', color: colors.sub },
  sectionHeader: { display: 'flex', alignItems: 'center', gap: 10, marginTop: 18, marginBottom: 12, color: colors.text },
  sectionTitle: { fontSize: 16, fontWeight: 700 },
  cardGrid3: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 16 },
  panel: { border: `1px solid ${colors.border}`, borderRadius: 16, background: colors.card, padding: 16, boxShadow: '0 10px 18px rgba(0,0,0,0.25)' },
};
