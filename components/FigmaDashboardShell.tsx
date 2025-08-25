'use client';

import React from 'react';
import '../app/figma-dashboard.css';

type Props = {
  actions?: React.ReactNode;
  reports?: React.ReactNode;
  extraHeaderRight?: React.ReactNode;
};

/**
 * This mirrors your Figma layout (header, stat tiles, reports card) without extra deps.
 * Later we can swap any block for real shadcn/recharts if you decide to add those deps.
 */
export default function FigmaDashboardShell({ actions, reports, extraHeaderRight }: Props) {
  return (
    <div className="figma-root">
      <div className="dashboard-container">
        <header className="dashboard-header">
          <div>
            <h1 className="title">Dashboard</h1>
            <p className="subtitle">Reports overview & quick actions</p>
          </div>
          <div className="header-actions">
            {extraHeaderRight}
            {actions}
          </div>
        </header>

        {/* Stat tiles — decorative for now; you can wire to real numbers later */}
        <div className="stats-row" aria-label="Key metrics">
          <div className="stat-card">
            <p className="stat-title">Transparency Score</p>
            <p className="stat-value">82</p>
            <p className="stat-trend stat-up">+4 this week</p>
          </div>
          <div className="stat-card">
            <p className="stat-title">Open Risks</p>
            <p className="stat-value">3</p>
            <p className="stat-trend stat-down">+1 this week</p>
          </div>
          <div className="stat-card">
            <p className="stat-title">Reports Generated</p>
            <p className="stat-value">24</p>
            <p className="stat-trend stat-up">+2 today</p>
          </div>
          <div className="stat-card">
            <p className="stat-title">Avg. Turnaround</p>
            <p className="stat-value">1m 12s</p>
            <p className="stat-trend">Last 10 jobs</p>
          </div>
        </div>

        <main className="dashboard-main">
          <section className="reports-section">
            <div className="section-head">
              <h2 className="section-title">Recent Reports</h2>
              <div style={{ display: 'inline-flex', gap: 8 }}>
                {/* Keep a small refresh here if you like */}
                {/* You can inject a Refresh button from the page if needed */}
              </div>
            </div>
            <div>{reports}</div>
          </section>
        </main>

        <footer className="dashboard-footer">
          <small>© Enrich</small>
        </footer>
      </div>
    </div>
  );
}
