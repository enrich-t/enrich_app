"use client";

import React, { useMemo, useState } from "react";
import { generateBusinessOverview, SAMPLE_PREVIEW } from "../../features/reports/businessOverview";
import { apiFetch } from "../../lib/api";
import { getBusinessId } from "../auth";

async function downloadBlob(url: string, filename?: string) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Download failed: ${res.status} ${res.statusText}`);
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename || "download";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
}

type Tile = {
  key: "business_overview" | "local_impact" | "energy_resources";
  title: string;
  bullets: string[];
  accent?: string;
};

const TILES: Tile[] = [
  { key: "business_overview", title: "Business Overview", bullets: ["Revenue Growth", "Market Share", "Operational Efficiency"] },
  { key: "local_impact", title: "Local Impact", bullets: ["Community Reach", "Local Partnerships", "Regional Growth"] },
  { key: "energy_resources", title: "Energy & Resources", bullets: ["Energy Efficiency", "Carbon Footprint", "Resource Usage"] },
];

export default function GenerateHub() {
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const items = useMemo(() => TILES, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold">Generate Report</h1>
        <p className="text-sm opacity-80">Create comprehensive reports with AI-powered insights and analysis</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {items.map((t) => (
          <div key={t.key} className="rounded-2xl p-6 bg-neutral-900/40 border border-neutral-800">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold">{t.title}</h2>
                <div className="flex flex-wrap gap-2 mt-3">
                  {t.bullets.map((b) => (
                    <span key={b} className="text-xs px-2 py-1 rounded-full border border-lime-500/40">
                      {b}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  className="px-4 py-2 rounded-xl bg-purple-400 text-black font-medium disabled:opacity-50"
                  disabled={!!busyKey}
                  onClick={async () => {
                    const bizId = getBusinessId();
                    if (!bizId) { alert("No business selected. Please log in again."); return; }

                    try {
                      setBusyKey(t.key);
                      await generateBusinessOverview(bizId);

                      // pull the latest list to surface in UI
                      const listRes = await apiFetch(`/reports/list/${bizId}`, { cache: "no-store", noAuthRedirect: true });
                      const txt = await listRes.text();
                      if (!listRes.ok) throw new Error(`List failed: ${listRes.status} ${txt.slice(0,300)}`);

                      console.info("Latest reports:", txt);
                      alert("Report requested. It should appear in Recent Reports shortly.");
                    } catch (e: any) {
                      console.error("Generate failed", e);
                      alert(`Generate failed: ${e?.message || e}`);
                    } finally {
                      setBusyKey(null);
                    }
                  }}
                >
                  {busyKey === t.key ? "Generating..." : "Generate"}
                </button>

                <button
                  className="px-4 py-2 rounded-xl border border-neutral-700"
                  onClick={async () => {
                    // simple JSON preview in a new tab
                    const blob = new Blob([JSON.stringify(SAMPLE_PREVIEW, null, 2)], { type: "application/json" });
                    const url = URL.createObjectURL(blob);
                    window.open(url, "_blank", "noopener,noreferrer");
                    setTimeout(() => URL.revokeObjectURL(url), 5000);
                  }}
                >
                  View
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
