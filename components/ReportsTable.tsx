'use client';

import React from 'react';

export type ReportStatus = 'pending' | 'processing' | 'ready' | 'failed';

export type Report = {
  id: string;
  report_type: string;
  status: ReportStatus;
  created_at: string; // ISO
  csv_url?: string | null;
  json_url?: string | null;
  pdf_url?: string | null;
  export_link?: string | null; // optional generic export
};

type Props = {
  reports: Report[];
  loading?: boolean;
};

export default function ReportsTable({ reports, loading }: Props) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={styles.table} aria-busy={loading} aria-live="polite">
        <thead>
          <tr>
            <th style={styles.th}>Type</th>
            <th style={styles.th}>Status</th>
            <th style={styles.th}>Created</th>
            <th style={styles.th} aria-label="Actions">Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <SkeletonRows />
          ) : reports.length === 0 ? (
            <tr>
              <td style={styles.td} colSpan={4}>
                No reports yet.
              </td>
            </tr>
          ) : (
            reports
              .slice()
              .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
              .map((r) => <ReportRow key={r.id} report={r} />)
          )}
        </tbody>
      </table>
    </div>
  );
}

function ReportRow({ report }: { report: Report }) {
  const created = new Date(report.created_at);
  const dateStr = created.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <tr>
      <td style={styles.td}>
        <span style={styles.mono}>{report.report_type}</span>
      </td>
      <td style={styles.td}>
        <StatusBadge status={report.status} />
      </td>
      <td style={styles.td}>{dateStr}</td>
      <td style={{ ...styles.td, whiteSpace: 'nowrap' }}>
        <DownloadButton href={report.json_url} label="JSON" />
        <DownloadButton href={report.csv_url} label="CSV" />
        <DownloadButton href={report.pdf_url} label="PDF" />
      </td>
    </tr>
  );
}

function StatusBadge({ status }: { status: ReportStatus }) {
  const palette: Record<ReportStatus, { bg: string; fg: string; text: string }> = {
    pending: { bg: 'rgba(255, 196, 0, 0.15)', fg: '#ffc400', text: 'Pending' },
    processing: { bg: 'rgba(0, 174, 255, 0.15)', fg: '#00aeff', text: 'Processing' },
    ready: { bg: 'rgba(16, 185, 129, 0.15)', fg: '#10b981', text: 'Ready' },
    failed: { bg: 'rgba(239, 68, 68, 0.15)', fg: '#ef4444', text: 'Failed' },
  };

  const p = palette[status] ?? palette.pending;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '4px 10px',
        borderRadius: 999,
        background: p.bg,
        color: p.fg,
        fontSize: 12,
        fontWeight: 600,
      }}
      aria-label={`Status: ${p.text}`}
    >
      <Dot color={p.fg} />
      {p.text}
    </span>
  );
}

function Dot({ color }: { color: string }) {
  return (
    <span
      aria-hidden
      style={{
        width: 8,
        height: 8,
        borderRadius: 999,
        background: color,
        display: 'inline-block',
      }}
    />
  );
}

function DownloadButton({ href, label }: { href?: string | null; label: string }) {
  const disabled = !href;
  if (disabled) {
    return (
      <button style={{ ...styles.ghostBtn, opacity: 0.5 }} disabled aria-disabled="true" title={`${label} not available`}>
        {label}
      </button>
    );
  }
  return (
    <a
      href={href!}
      style={styles.ghostBtn}
      target="_blank"
      rel="noopener noreferrer"
      title={`Download ${label}`}
    >
      {label}
    </a>
  );
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 4 }).map((_, i) => (
        <tr key={`sk-${i}`}>
          <td style={styles.td}><div style={styles.skeleton} /></td>
          <td style={styles.td}><div style={{ ...styles.skeleton, width: 90 }} /></td>
          <td style={styles.td}><div style={{ ...styles.skeleton, width: 160 }} /></td>
          <td style={styles.td}><div style={{ ...styles.skeleton, width: 180 }} /></td>
        </tr>
      ))}
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  table: {
    width: '100%',
    borderCollapse: 'separate',
    borderSpacing: 0,
    fontSize: 14,
  },
  th: {
    textAlign: 'left',
    padding: '10px 12px',
    borderBottom: '1px solid #2a2a2a',
    fontWeight: 600,
    position: 'sticky',
    top: 0,
    background: 'var(--table-bg, #0b0c0d)',
    zIndex: 1,
  },
  td: {
    padding: '12px',
    borderBottom: '1px solid #1d1e1f',
  },
  mono: {
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    fontSize: 13,
  },
  ghostBtn: {
    display: 'inline-block',
    padding: '6px 10px',
    borderRadius: 8,
    border: '1px solid #2f2f2f',
    textDecoration: 'none',
    background: 'transparent',
    color: 'inherit',
    marginRight: 8,
  },
  skeleton: {
    width: 120,
    height: 12,
    borderRadius: 6,
    background:
      'linear-gradient(90deg, rgba(255,255,255,0.06) 25%, rgba(255,255,255,0.12) 37%, rgba(255,255,255,0.06) 63%)',
    animation: 'loading 1.2s ease-in-out infinite',
  },
};

// keyframes for skeleton shimmer (scoped per component usage)
if (typeof document !== 'undefined') {
  const id = 'reports-table-skeleton-keyframes';
  if (!document.getElementById(id)) {
    const style = document.createElement('style');
    style.id = id;
    style.textContent = `
      @keyframes loading {
        0% { background-position: 0% 0; }
        100% { background-position: 200% 0; }
      }
    `;
    document.head.appendChild(style);
  }
}
