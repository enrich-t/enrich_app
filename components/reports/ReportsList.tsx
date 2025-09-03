"use client";

import React, { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";
import { getBusinessId } from "../auth";

type Report = {
  id: string;
  report_type: string;
  status: string;
  created_at: string;
  csv_url: string | null;
  json_url: string | null;
  pdf_url: string | null;
};

export function ReportsList({ title = "Recent Reports" }: { title?: string }) {
  const [rows, setRows] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);

  async function refresh() {
    const bizId = getBusinessId();
    if (!bizId) return;
    setLoading(true);
    try {
      const res = await apiFetch(`/reports/list/${bizId}`, { cache: "no-store", noAuthRedirect: true });
      const txt = await res.text();
      if (!res.ok) throw new Error(`${res.status} ${txt}`);
      const json = JSON.parse(txt);
      const arr: Report[] = Array.isArray(json?.reports) ? json.reports.map((r: any) => ({
        id: r.id || r.report_id || crypto.randomUUID(),
        report_type: r.report_type || r.type || "Business Overview",
        status: r.status || r.state || "generated",
        created_at: r.created_at || new Date().toISOString(),
        csv_url: r.csv_url ?? null,
        json_url: r.json_url ?? r.export_link ?? null,
        pdf_url: r.pdf_url ?? null,
      })) : [];
      setRows(arr);
    } catch (e) {
      console.error("List reports failed:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">{title}</h3>
        <button className="text-sm underline" onClick={refresh} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>
      <div className="divide-y divide-neutral-800 rounded-xl border border-neutral-800 overflow-hidden">
        {rows.length === 0 && (
          <div className="p-4 opacity-70">No reports yet.</div>
        )}
        {rows.map((r) => (
          <div key={r.id} className="p-4 flex flex-wrap items-center gap-3">
            <div className="min-w-[12rem] font-medium">{r.report_type}</div>
            <div className="opacity-70 text-sm">{new Date(r.created_at).toLocaleString()}</div>
            <div className="ml-auto flex gap-2">
              {r.pdf_url && <a className="px-3 py-1 rounded border border-neutral-700" href={r.pdf_url} target="_blank" rel="noreferrer">PDF</a>}
              {r.json_url && <a className="px-3 py-1 rounded border border-neutral-700" href={r.json_url} target="_blank" rel="noreferrer">JSON</a>}
              {r.csv_url && <a className="px-3 py-1 rounded border border-neutral-700" href={r.csv_url} target="_blank" rel="noreferrer">CSV</a>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

