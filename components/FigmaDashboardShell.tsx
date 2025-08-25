'use client';

import React from 'react';
import '../app/figma-dashboard.css';

type Props = {
  actions?: React.ReactNode;
  reports?: React.ReactNode;
  alerts?: React.ReactNode;
};

/**
 * Paste your Figma-exported HTML inside the FIGMA_PASTE area.
 * - Convert class="" to className=""
 * - Replace <img src="./assets/..."> with <img src="/figma/...">
 * - Keep the data-slot divs; we inject our interactive widgets into them.
 */
export default function FigmaDashboardShell({ actions, reports, alerts }: Props) {
  return (
    <div className="figma-root">
      {/* ===== FIGMA_PASTE_START =====
         Paste your Figma HTML below, kept as close as possible.
         Keep the slot placeholders (data-slot=...) somewhere logical in the layout.
      */}

      <div className="dashboard-container" style={{ minHeight: '100svh' }}>
        <header className="dashboard-header">
          <h1 className="title">Dashboard</h1>
          {/* Slot for actions (generate button, filters, etc.) */}
          <div data-slot="actions">{actions}</div>
        </header>

        <main className="dashboard-main">
          {/* Slot for reports table */}
          <section className="reports-section">
            <h2 className="subtitle">Reports</h2>
            <div data-slot="reports">{reports}</div>
          </section>
        </main>

        <footer className="dashboard-footer">
          <small>© Enrich</small>
        </footer>
      </div>

      {/* ===== FIGMA_PASTE_END ===== */}

      {/* Optional slot if you want to mount alerts somewhere specific */}
      <div data-slot="alerts" style={{ position: 'relative', zIndex: 10 }}>{alerts}</div>
    </div>
  );
}
