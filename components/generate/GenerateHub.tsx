// components/generate/GenerateHub.tsx
"use client";

import React, { useMemo, useState } from "react";
import { generateBusinessOverview, sampleBusinessOverviewPreview } from "../../features/reports/businessOverview";
import { apiFetch, downloadBlob } from "../../lib/api";

type Tile = {
  key: "business_overview" | "local_impact" | "energy_resources";
  title: string;
  description: string;
  tags: string[];
  accent: string; // hex for icon/tags outline
  onGenerate?: () => Promise<void>;
  onPreview?: () => Promise<void>;
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "24px 0 12px" }}>
      <span
        aria-hidden
        style={{
          width: 22,
          height: 22,
          borderRadius: 6,
          background:
            "linear-gradient(135deg, rgba(152,129,184,.3), rgba(174,196,131,.3))",
          display: "inline-block",
        }}
      />
      <h2 style={{ fontSize: 22, margin: 0 }}>Popular Reports</h2>
    </div>
  );
}

function Capsule({ children, accent }: { children: React.ReactNode; accent: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "8px 14px",
        borderRadius: 999,
        border: `1px solid ${accent}`,
        color: accent,
        fontWeight: 700,
        fontSize: 14,
      }}
    >
      {children}
    </span>
  );
}

function ActionButton({
  kind,
  onClick,
  loading,
}: {
  kind: "generate" | "view";
  onClick: () => void;
  loading?: boolean;
}) {
  const isPrimary = kind === "generate";
  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        padding: "12px 18px",
        borderRadius: 12,
        border: isPrimary ? "none" : "1px solid #bdb8c9",
        background: isPrimary ? "#9881b8" : "transparent",
        color: isPrimary ? "#0b0e13" : "#e7e6ea",
        fontWeight: 800,
        cursor: loading ? "not-allowed" : "pointer",
        minWidth: 112,
      }}
      aria-label={isPrimary ? "Generate" : "Preview"}
      title={isPrimary ? "Generate" : "Preview"}
    >
      {loading ? "…" : isPrimary ? "Generate" : "View"}
    </button>
  );
}

function ReportTile({
  tile,
}: {
  tile: Tile;
}) {
  const [busy, setBusy] = useState<"generate" | "view" | null>(null);

  const handle = async (which: "generate" | "view") => {
    if (busy) return;
    try {
      setBusy(which);
      if (which === "generate") {
        if (!tile.onGenerate) return;
        await tile.onGenerate();
      } else {
        if (!tile.onPreview) return;
        await tile.onPreview();
      }
    } finally {
      setBusy(null);
    }
  };

  return (
    <div
      style={{
        background: "#141720",
        border: "1px solid #232633",
        borderRadius: 16,
        padding: 24,
        display: "grid",
        gridTemplateColumns: "auto 1fr auto",
        gap: 20,
        alignItems: "center",
      }}
    >
      <div
        aria-hidden
        style={{
          width: 64,
          height: 64,
          borderRadius: 16,
          background: "#1c2130",
          display: "grid",
          placeItems: "center",
        }}
      >
        {/* simple icon dot */}
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: 6,
            background: tile.accent,
            opacity: 0.9,
          }}
        />
      </div>

      <div>
        <h3 style={{ margin: "0 0 6px", fontSize: 28 }}>{tile.title}</h3>
        <p style={{ margin: 0, color: "#c5c7ce", lineHeight: 1.5 }}>{tile.description}</p>
        <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
          {tile.tags.map((t) => (
            <Capsule key={t} accent={tile.accent}>{t}</Capsule>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <ActionButton
          kind="generate"
          onClick={() => handle("generate")}
          loading={busy === "generate"}
        />
        <ActionButton
          kind="view"
          onClick={() => handle("view")}
          loading={busy === "view"}
        />
      </div>
    </div>
  );
}

export function GenerateHub() {
  // We’ll use the logged-in business id/token via our existing client helpers in lib/api.ts
  // generateBusinessOverview() already posts to /api/reports/generate-business-overview
  // sampleBusinessOverviewPreview() returns a blob/pdf/json for quick preview.

  const tiles: Tile[] = useMemo(() => {
    return [
      {
        key: "business_overview",
        title: "Business Overview",
        description: "Comprehensive analysis of performance and key metrics",
        tags: ["Revenue Growth", "Market Share", "Operational Efficiency"],
        accent: "#9881b8", // brand primary
        onGenerate: async () => {
          // Real generate for the logged in business, store in DB, refresh list
          const res = await generateBusinessOverview();
          if (!res.ok) {
            throw new Error(res.message || "Failed to generate");
          }
          // Optionally ping a “recent reports” revalidation endpoint if you have one
          // await apiFetch('/api/reports/revalidate', { method: 'POST' });
          alert("Generated! It should appear under Dashboard → Recent Reports and My Reports.");
        },
        onPreview: async () => {
          // Preview is a general sample; show in-page (new tab avoided by creating an object URL)
          const sample = await sampleBusinessOverviewPreview();
          if (!sample) throw new Error("No preview available");
          const url = URL.createObjectURL(sample.blob);
          // open a light viewer inside the page if you prefer.
          // For now, we show same-tab view by replacing location to the blob URL:
          window.location.href = url;
        },
      },
      {
        key: "local_impact",
        title: "Local Impact",
        description: "Community engagement and local market influence assessment",
        tags: ["Community Reach", "Local Partnerships", "Regional Growth"],
        accent: "#aec483", // brand third
        onGenerate: async () => {
          alert("Local Impact generation is coming soon.");
        },
        onPreview: async () => {
          alert("Local Impact preview is coming soon.");
        },
      },
      {
        key: "energy_resources",
        title: "Energy & Resources",
        description: "Sustainability metrics and resource utilization analysis",
        tags: ["Energy Efficiency", "Carbon Footprint", "Resource Usage"],
        accent: "#e5c564", // brand secondary
        onGenerate: async () => {
          alert("Energy & Resources generation is coming soon.");
        },
        onPreview: async () => {
          alert("Energy & Resources preview is coming soon.");
        },
      },
    ];
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 6 }}>
        <h1 style={{ margin: 0, fontSize: 44 }}>Generate Report</h1>
        <p style={{ margin: "6px 0 0", color: "#c5c7ce" }}>
          Create comprehensive reports with AI-powered insights and analysis
        </p>
      </div>

      {/* removed the global header buttons; actions live on each card */}
      <SectionTitle>Popular Reports</SectionTitle>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22 }}>
        {tiles.map((t) => (
          <ReportTile key={t.key} tile={t} />
        ))}
      </div>
    </div>
  );
}
