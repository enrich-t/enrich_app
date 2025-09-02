"use client";

import React, { useMemo, useState } from "react";
import { generateBusinessOverview, sampleBusinessOverviewPreview } from "../../features/reports/businessOverview";
import { downloadBlob } from "../../lib/api";

const BRAND = {
  primary: "#9881b8",
  secondary: "#e5c564",
  tertiary: "#aec483",
  card: "#141821",
  border: "#252a34",
  text: "#e9eaf0",
  sub: "#a7adbb",
  bg: "#0f1115",
};

type Tile = {
  key: "business_overview" | "local_impact" | "energy_resources";
  title: string;
  desc: string;
  tags: string[];
  tint: string;
  onGenerate?: () => Promise<void>;
  onView: () => Promise<void>;
};

export function GenerateHub() {
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [toast, setToast] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  const closePreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  };

  const tiles: Tile[] = useMemo(
    () => [
      {
        key: "business_overview",
        title: "Business Overview",
        desc: "Comprehensive analysis of performance and key metrics",
        tags: ["Revenue Growth", "Market Share", "Operational Efficiency"],
        tint: BRAND.primary,
        onGenerate: async () => {
          setBusyKey("business_overview");
          setToast(null);
          try {
            const r = await generateBusinessOverview(); // infers business from /api/auth/me
            if (!r.ok) {
              throw new Error(r.message || "Failed to generate report");
            }
            setToast({ kind: "ok", msg: "Report generated. Find it in Dashboard → Recent Reports and My Reports." });
          } catch (e: any) {
            setToast({ kind: "err", msg: e?.message || "Generation failed" });
          } finally {
            setBusyKey(null);
          }
        },
        onView: async () => {
          setBusyKey("business_overview");
          try {
            const { blob } = await sampleBusinessOverviewPreview();
            const url = URL.createObjectURL(blob);
            setPreviewUrl(url);
          } finally {
            setBusyKey(null);
          }
        },
      },
      {
        key: "local_impact",
        title: "Local Impact",
        desc: "Community engagement and local market influence assessment",
        tags: ["Community Reach", "Local Partnerships", "Regional Growth"],
        tint: BRAND.tertiary,
        onView: async () => {
          setBusyKey("local_impact");
          try {
            const { blob } = await sampleBusinessOverviewPreview(); // placeholder preview
            const url = URL.createObjectURL(blob);
            setPreviewUrl(url);
          } finally {
            setBusyKey(null);
          }
        },
      },
      {
        key: "energy_resources",
        title: "Energy & Resources",
        desc: "Sustainability metrics and resource utilization analysis",
        tags: ["Energy Efficiency", "Carbon Footprint", "Resource Usage"],
        tint: BRAND.secondary,
        onView: async () => {
          setBusyKey("energy_resources");
          try {
            const { blob } = await sampleBusinessOverviewPreview(); // placeholder preview
            const url = URL.createObjectURL(blob);
            setPreviewUrl(url);
          } finally {
            setBusyKey(null);
          }
        },
      },
    ],
    []
  );

  return (
    <div style={{ background: BRAND.bg, color: BRAND.text, minHeight: "100%", padding: "16px 12px 64px" }}>
      <h1 style={{ fontSize: 44, margin: "4px 0 2px" }}>Generate Report</h1>
      <div style={{ color: BRAND.sub, marginBottom: 18 }}>
        Create comprehensive reports with AI-powered insights and analysis
      </div>

      {/* Popular Reports */}
      <SectionTitle icon="🗂" title="Popular Reports" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {tiles.slice(0, 2).map((t) => (
          <ReportCard key={t.key} tile={t} busy={busyKey === t.key} onToast={setToast} />
        ))}
      </div>
      <div style={{ marginTop: 16 }}>
        <ReportCard tile={tiles[2]} busy={busyKey === tiles[2].key} onToast={setToast} />
      </div>

      {/* Report Builder */}
      <SectionTitle icon="⚙️" title="Report Builder" style={{ marginTop: 28 }} />
      <ReportBuilder />

      {/* Trending Topics */}
      <SectionTitle icon="📈" title="Trending Topics" style={{ marginTop: 28 }} />
      <TrendingTopics />

      {/* Industry Updates */}
      <SectionTitle icon="🌿" title="Industry Updates" style={{ marginTop: 28 }} />
      <IndustryUpdates />

      {/* Suggested Updates */}
      <SectionTitle icon="🗓" title="Suggested Updates" style={{ marginTop: 28 }} />
      <SuggestedUpdates />

      {/* Toast */}
      {toast && (
        <div
          role="status"
          style={{
            position: "fixed",
            right: 16,
            bottom: 16,
            background: toast.kind === "ok" ? "rgba(50,160,90,.15)" : "rgba(200,70,80,.15)",
            border: `1px solid ${toast.kind === "ok" ? "#3aa76d" : "#e26d6d"}`,
            color: BRAND.text,
            padding: "10px 12px",
            borderRadius: 10,
            maxWidth: 520,
          }}
        >
          {toast.msg}
        </div>
      )}

      {/* In-page Preview Modal */}
      {previewUrl && (
        <div
          onClick={closePreview}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.6)",
            display: "grid",
            placeItems: "center",
            zIndex: 50,
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(1100px, 96vw)",
              height: "min(80vh, 900px)",
              background: BRAND.card,
              border: `1px solid ${BRAND.border}`,
              borderRadius: 14,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", borderBottom: `1px solid ${BRAND.border}` }}>
              <div style={{ fontWeight: 700 }}>Sample Preview</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => {
                    downloadBlob("sample.html", new Blob([`<iframe src="${previewUrl}" />`], { type: "text/html" }), "text/html");
                  }}
                  style={btnSecondary()}
                >
                  Download HTML
                </button>
                <button onClick={closePreview} style={btnPrimary()}>Close</button>
              </div>
            </div>
            <iframe src={previewUrl} style={{ border: 0, width: "100%", height: "100%" }} />
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- small building blocks ---------- */

function ReportCard({
  tile,
  busy,
  onToast,
}: {
  tile: Tile;
  busy: boolean;
  onToast: (t: { kind: "ok" | "err"; msg: string } | null) => void;
}) {
  return (
    <div
      style={{
        background: BRAND.card,
        border: `1px solid ${BRAND.border}`,
        borderRadius: 16,
        padding: 16,
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "64px 1fr auto", gap: 16, alignItems: "center" }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 16,
            background: "#0e121a",
            border: `1px solid ${BRAND.border}`,
            display: "grid",
            placeItems: "center",
          }}
        >
          <div style={{ width: 18, height: 18, borderRadius: 6, background: tile.tint }} />
        </div>

        <div>
          <div style={{ fontSize: 28, fontWeight: 800, marginBottom: 6 }}>{tile.title}</div>
          <div style={{ color: BRAND.sub, maxWidth: 720 }}>{tile.desc}</div>
          <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
            {tile.tags.map((t) => (
              <span key={t} style={pill()}>{t}</span>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          {tile.onGenerate && (
            <button
              disabled={busy}
              onClick={tile.onGenerate}
              style={btnPrimary()}
              title="Generate without preview; will appear in My Reports & Dashboard"
            >
              {busy ? "Working…" : "Generate"}
            </button>
          )}
          <button disabled={busy} onClick={tile.onView} style={btnHollow()}>View</button>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ icon, title, style }: { icon: string; title: string; style?: React.CSSProperties }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "10px 0 12px", ...style }}>
      <div style={{ width: 16, height: 16, background: "#2a2f3b", border: `1px solid ${BRAND.border}`, borderRadius: 4, display: "grid", placeItems: "center", fontSize: 12 }}>
        {icon}
      </div>
      <div style={{ fontSize: 22, fontWeight: 800 }}> {title}</div>
    </div>
  );
}

/* ----- Report Builder (placeholder UI) ----- */
function ReportBuilder() {
  const inputStyle: React.CSSProperties = {
    width: "100%",
    height: 40,
    background: "#0e121a",
    color: BRAND.text,
    border: `1px solid ${BRAND.border}`,
    borderRadius: 10,
    padding: "0 12px",
  };

  return (
    <div style={{ background: BRAND.card, border: `1px solid ${BRAND.border}`, borderRadius: 16, padding: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
        <Labeled label="Report Type"><select style={inputStyle}><option>Select report type</option></select></Labeled>
        <Labeled label="Time Period"><select style={inputStyle}><option>Select period</option></select></Labeled>
        <Labeled label="Focus Topics"><select style={inputStyle}><option>Select topics</option></select></Labeled>
        <Labeled label="Output Format"><select style={inputStyle}><option>Select format</option></select></Labeled>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
        <Labeled label="Visual Elements">
          <div style={checkboxBox()}><input type="checkbox" defaultChecked /> Include charts, graphs, and visual analytics</div>
        </Labeled>
        <Labeled label="Context & Insights">
          <div style={checkboxBox()}><input type="checkbox" /> Add contextual questions and AI insights</div>
        </Labeled>
      </div>

      <div style={{ marginTop: 12 }}>
        <Labeled label="Custom Requirements">
          <textarea style={{ width: "100%", minHeight: 160, background: "#0e121a", color: BRAND.text, border: `1px solid ${BRAND.border}`, borderRadius: 12, padding: 12 }} placeholder="Describe any specific requirements, focus areas, or questions you'd like the report to address…" />
        </Labeled>
      </div>

      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr auto auto", gap: 10 }}>
        <input style={{ height: 40, background: "#0e121a", color: BRAND.text, border: `1px solid ${BRAND.border}`, borderRadius: 10, padding: "0 12px" }} placeholder="Enter a custom title for your report" />
        <button style={btnHollow()}>Save as Template</button>
        <button style={btnPrimary()}>Generate Report</button>
      </div>

      <div style={{ color: BRAND.sub, marginTop: 8 }}>Estimated generation time: 2–5 minutes</div>
    </div>
  );
}

/* ----- Trending Topics (placeholder) ----- */
function TrendingTopics() {
  const items = [
    { name: "AI Integration", badge: "Hot", delta: "+24%" },
    { name: "Supply Chain Resilience", badge: "Rising", delta: "+18%" },
    { name: "Sustainability Reporting", badge: "Trending", delta: "+15%" },
    { name: "Digital Transformation", badge: "Popular", delta: "+12%" },
    { name: "ESG Compliance", badge: "Growing", delta: "+9%" },
  ];

  return (
    <div style={{ background: BRAND.card, border: `1px solid ${BRAND.border}`, borderRadius: 16, padding: 12 }}>
      {items.map((it) => (
        <div key={it.name} style={{ display: "grid", gridTemplateColumns: "1fr auto", padding: "10px 6px", borderBottom: `1px solid ${BRAND.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 8, height: 8, background: BRAND.primary, borderRadius: 999 }} />
            <div style={{ fontWeight: 700 }}>{it.name}</div>
            <span style={miniBadge()}>{it.badge}</span>
          </div>
          <div style={{ color: BRAND.secondary, fontWeight: 800 }}>{it.delta}</div>
        </div>
      ))}
    </div>
  );
}

/* ----- Industry Updates (placeholder) ----- */
function IndustryUpdates() {
  const items = [
    { title: "New ESG Disclosure Requirements", tag: "Regulatory", ago: "2 hours ago" },
    { title: "AI Ethics Guidelines Released", tag: "Technology", ago: "1 day ago" },
    { title: "Global Supply Chain Index Update", tag: "Market Data", ago: "3 days ago" },
  ];
  return (
    <div style={{ background: BRAND.card, border: `1px solid ${BRAND.border}`, borderRadius: 16, padding: 12 }}>
      {items.map((it) => (
        <div key={it.title} style={{ display: "grid", gridTemplateColumns: "1fr auto", padding: "12px 6px", borderBottom: `1px solid ${BRAND.border}` }}>
          <div>
            <div style={{ fontWeight: 800 }}>{it.title}</div>
            <div style={{ color: BRAND.sub, marginTop: 2 }}>{it.ago}</div>
          </div>
          <span style={chip()}>{it.tag}</span>
        </div>
      ))}
    </div>
  );
}

/* ----- Suggested Updates (placeholder) ----- */
function SuggestedUpdates() {
  const items = [
    { title: "Q3 Financial Performance Report", sub: "Quarterly deadline approaching", ago: "45 days ago", dot: "#e46067" },
    { title: "Customer Satisfaction Analysis", sub: "New survey data available", ago: "32 days ago", dot: "#e4c564" },
    { title: "Market Competitive Analysis", sub: "Industry shifts detected", ago: "28 days ago", dot: "#91c37e" },
  ];
  return (
    <div style={{ background: BRAND.card, border: `1px solid ${BRAND.border}`, borderRadius: 16, padding: 12 }}>
      {items.map((it) => (
        <div key={it.title} style={{ display: "grid", gridTemplateColumns: "1fr auto", padding: "12px 6px", borderBottom: `1px solid ${BRAND.border}` }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 10, height: 10, background: it.dot, borderRadius: 999 }} />
              <div style={{ fontWeight: 800 }}>{it.title}</div>
            </div>
            <div style={{ color: BRAND.sub, marginLeft: 20 }}>{it.sub}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ color: BRAND.sub }}>{it.ago}</div>
            <button style={btnHollow()}>Update</button>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------- tiny UI helpers ---------- */

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <div style={{ fontWeight: 700 }}>{label}</div>
      {children}
    </label>
  );
}

function pill(): React.CSSProperties {
  return {
    display: "inline-block",
    border: `1px solid ${BRAND.primary}`,
    color: BRAND.primary,
    background: "transparent",
    borderRadius: 999,
    padding: "8px 12px",
    fontWeight: 800,
    fontSize: 13,
  };
}
function chip(): React.CSSProperties {
  return {
    display: "inline-block",
    border: `1px solid ${BRAND.border}`,
    color: BRAND.text,
    background: "#0e121a",
    borderRadius: 999,
    padding: "6px 12px",
    fontWeight: 800,
    fontSize: 12,
  };
}
function miniBadge(): React.CSSProperties {
  return { border: `1px solid ${BRAND.border}`, borderRadius: 999, padding: "2px 8px", fontSize: 12, color: BRAND.sub };
}
function btnPrimary(): React.CSSProperties {
  return {
    background: BRAND.primary,
    color: "#101217",
    border: "0",
    borderRadius: 12,
    padding: "10px 14px",
    fontWeight: 800,
    cursor: "pointer",
  };
}
function btnSecondary(): React.CSSProperties {
  return {
    background: BRAND.secondary,
    color: "#101217",
    border: "0",
    borderRadius: 12,
    padding: "8px 12px",
    fontWeight: 800,
    cursor: "pointer",
  };
}
function btnHollow(): React.CSSProperties {
  return {
    background: "transparent",
    color: BRAND.text,
    border: `1px solid ${BRAND.border}`,
    borderRadius: 12,
    padding: "10px 14px",
    fontWeight: 800,
    cursor: "pointer",
  };
}
function checkboxBox(): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: 10,
    height: 40,
    background: "#0e121a",
    border: `1px solid ${BRAND.border}`,
    borderRadius: 10,
    padding: "0 10px",
  };
}
