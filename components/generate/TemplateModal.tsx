'use client';
import * as React from 'react';

const colors = { border: '#252a34', text: '#e9eaf0', card: '#141821', link: '#a5b4fc' };

export default function TemplateModal({
  open, title, embedSrc, viewUrl, onClose,
}: { open: boolean; title?: string; embedSrc?: string; viewUrl?: string; onClose: () => void }) {
  if (!open) return null;
  return (
    <div role="dialog" aria-modal="true" onClick={onClose} style={styles.overlay}>
      <div onClick={(e) => e.stopPropagation()} style={styles.content}>
        <div style={styles.header}>
          <div style={{ fontWeight: 800 }}>{title} — Template Preview</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {viewUrl ? (
              <a href={viewUrl} target="_blank" rel="noreferrer" style={{ color: colors.link, textDecoration: 'none' }}>
                Open in Canva ↗
              </a>
            ) : null}
            <button onClick={onClose} style={styles.closeBtn}>Close</button>
          </div>
        </div>
        <div style={styles.embedWrap}>
          <iframe loading="lazy" title="Template" style={styles.iframe} src={embedSrc} allow="fullscreen" />
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'grid', placeItems: 'center', zIndex: 1100, padding: 16 },
  content: { width: 'min(980px, 100%)', background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 14, boxShadow: '0 20px 40px rgba(0,0,0,0.5)', padding: 16, color: colors.text },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  closeBtn: { appearance: 'none', border: `1px solid ${colors.border}`, background: '#0f131a', color: colors.text, borderRadius: 10, padding: '6px 10px', fontWeight: 800, cursor: 'pointer' },
  embedWrap: { position: 'relative', width: '100%', height: 0, paddingTop: '129.4118%', overflow: 'hidden', borderRadius: 8, boxShadow: '0 2px 8px 0 rgba(63,69,81,0.16)' },
  iframe: { position: 'absolute', width: '100%', height: '100%', top: 0, left: 0, border: 'none' },
};
