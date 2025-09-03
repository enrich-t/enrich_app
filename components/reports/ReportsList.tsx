"use client";

import React, { useEffect, useMemo, useState } from "react";

type ReportStatus = "pending" | "processing" | "generated" | "ready" | "failed";
type Report = {
  id: string;
  report_type: string; // e.g. "Business Overview" | "business_overview"
  created_at: string;
  status: ReportStatus;
  csv_url: string | null;
  json_url: string | null;
  pdf_url: string | null;
  export_link: string | null;
  content?: any;
};

type Props = {
  businessId?: string;
  limit?: number;
  title?: string;
  dense?: boolean; // smaller cards (for dashboard sidebar/section)
};

function first<T = any>(obj: any, keys: string[], coerce?: (x: any) => T): T | null {
  for (const k of keys) {
    if (obj && obj[k] != null) return coerce ? coerce(obj[k]) : obj[k];
  }
  return null;
}

function normStatus(v: any): ReportStatus {
  const s = String(v ?? "").toLowerCase();
  if (["pending","processing","ready","failed","generated"].includes(s)) return s as ReportStatus;
  return "ready";
}

function normalizeArray(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.reports)) return payload.reports;
  return [];
}

function normalizeReports(payload: any): Report[] {
  const arr = normalizeArray(payload);
  return arr.map((r: any, i: number) => ({
    id: first<string>(r, ["id","report_id"], (x)=>String(x)) ?? `tmp-${Date.now()}-${i}`,
    report_type: first<string>(r, ["report_type","type","kind"], (x)=>String(x)) ?? "business_overview",
    created_at: first<string>(r, ["created_at","createdAt","ts"], (x)=>String(x)) ?? new Date().toISOString(),
    status: normStatus(first<string>(r, ["status","state","phase"], (x)=>String(x))),
    csv_url: first<string>(r, ["csv_url","csv","csvUrl"], (x)=>String(x)),
    json_url: first<string>(r, ["json_url","json","jsonUrl","export_link"], (x)=>String(x)),
    pdf_url: first<string>(r, ["pdf_url","pdf","pdfUrl"], (x)=>String(x)),
    export_link: first<string>(r, ["export_link","public_url"], (x)=>String(x)),
    content: r?.content
  }));
}

/** Small helper to call our backend via Next.js rewrite (/api -> backend) with auth token */
async function apiFetch(path: string, init?: RequestInit) {
  const base = path.startsWith("http") ? path : path;
  const headers: Record<string,string> = { ...(init?.headers as any) };
  const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
  if (token && !headers["Authorization"]) headers["Authorization"] = `Bearer ${token}`;
  if (!headers["Content-Type"] && (init?.method && init.method !== "GET")) {
    headers["Content-Type"] = "application/json";
  }
  const res = await fetch(base, { ...init, headers, cache: "no-store" });
  const text = await res.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch {}
  return { ok: res.ok, status: res.status, json, text };
}

export function ReportsList({ businessId, limit, title = "Recent Reports", dense }: Props) {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  const resolvedBizId = useMemo(() => {
    if (businessId && businessId.trim() !== "") return businessId;
    if (typeof window !== "undefined") {
      const localBiz = localStorage.getItem("business_id");
      if (localBiz && localBiz !== "null") return localBiz;
    }
    const envBiz = (process.env.NEXT_PUBLIC_BUSINESS_ID || "").trim();
    return envBiz;
  }, [businessId]);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!resolvedBizId) {
        setError("No business_id found.");
        return;
      }
      setLoading(true);
      setError(null);
      const { ok, status, json, text } = await apiFetch(`/api/reports/list/${resolvedBizId}`);
      if (!alive) return;
      if (!ok) {
        setError(`${status}: ${text?.slice?.(0,300) || "Failed to load"}`);
      } else {
        setReports(normalizeReports(json));
      }
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [resolvedBizId]);

  const items = useMemo(() => {
    const sorted = [...reports].sort((a,b)=> (b.created_at||"").localeCompare(a.created_at||""));
    return typeof limit === "number" ? sorted.slice(0, limit) : sorted;
  }, [reports, limit]);

  const [preview, setPreview] = useState<Report | null>(null);
  const [dlOpenIdx, setDlOpenIdx] = useState<string | null>(null);

  const openDownload = (id: string) => setDlOpenIdx(prev => prev === id ? null : id);
  const closeDownload = () => setDlOpenIdx(null);

  const onDownload = (url: string | null) => {
    if (!url) return;
    // open in same tab for now; could stream as blob if needed
    window.open(url, "_self");
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">{title}</h3>
        {loading ? <span className="text-sm opacity-70">Loading…</span> : null}
      </div>

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 text-red-700 p-3 mb-4 text-sm">
          {error}
        </div>
      )}

      {items.length === 0 && !loading && !error && (
        <div className="rounded-md border bg-muted/20 p-6 text-sm opacity-80">
          No reports yet. Generate your first report to see it here.
        </div>
      )}

      <div className={`grid ${dense ? "grid-cols-1 gap-3" : "grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"}`}>
        {items.map(r => {
          const humanType = (r.report_type || "").replace(/_/g," ");
          const dateStr = new Date(r.created_at).toLocaleString();
          const hasAnyExport = !!(r.pdf_url || r.json_url || r.csv_url || r.export_link);
          const id = r.id;

          return (
            <div key={id} className="rounded-xl border bg-card text-card-foreground shadow-sm p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm uppercase tracking-wide opacity-70">{humanType}</div>
                  <div className="font-medium mt-1">{r.content?.title ?? "Business Overview"}</div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full border ${
                  r.status === "failed" ? "border-red-300 text-red-700 bg-red-50"
                  : r.status === "processing" || r.status === "pending" ? "border-amber-300 text-amber-700 bg-amber-50"
                  : "border-emerald-300 text-emerald-700 bg-emerald-50"
                }`}>
                  {r.status}
                </span>
              </div>

              <div className="text-xs opacity-70 mt-2">Created: {dateStr}</div>

              <div className="mt-3 flex items-center gap-2">
                <button
                  className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm"
                  onClick={() => setPreview(r)}
                >
                  View
                </button>

                <div className="relative">
                  <button
                    className="px-3 py-1.5 rounded-lg border text-sm"
                    onClick={() => openDownload(id)}
                    aria-expanded={dlOpenIdx === id}
                  >
                    Download ▾
                  </button>
                  {dlOpenIdx === id && (
                    <div
                      className="absolute z-20 mt-1 w-44 rounded-lg border bg-popover text-popover-foreground shadow p-1"
                      onMouseLeave={closeDownload}
                    >
                      <button
                        disabled={!hasAnyExport}
                        className="w-full text-left text-sm px-3 py-2 rounded hover:bg-accent disabled:opacity-50"
                        onClick={() => onDownload(r.pdf_url)}
                      >
                        PDF
                      </button>
                      <button
                        disabled={!hasAnyExport}
                        className="w-full text-left text-sm px-3 py-2 rounded hover:bg-accent disabled:opacity-50"
                        onClick={() => onDownload(r.json_url ?? r.export_link)}
                      >
                        JSON
                      </button>
                      <button
                        disabled={!hasAnyExport}
                        className="w-full text-left text-sm px-3 py-2 rounded hover:bg-accent disabled:opacity-50"
                        onClick={() => onDownload(r.csv_url)}
                      >
                        CSV
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Lightweight modal for preview */}
      {preview && (
        <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4" onClick={() => setPreview(null)}>
          <div className="w-full max-w-3xl max-h-[85vh] overflow-auto rounded-xl bg-background border shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <div className="font-semibold">{preview.content?.title ?? "Report"}</div>
              <button className="text-sm opacity-70 hover:opacity-100" onClick={() => setPreview(null)}>Close</button>
            </div>
            <div className="p-4">
              {preview.pdf_url ? (
                <iframe src={preview.pdf_url} className="w-full h-[70vh] rounded-md border" />
              ) : preview.json_url ? (
                <iframe src={preview.json_url} className="w-full h-[70vh] rounded-md border" />
              ) : preview.content ? (
                <pre className="text-xs whitespace-pre-wrap leading-relaxed bg-muted/30 p-3 rounded-md border">
                  {JSON.stringify(preview.content, null, 2)}
                </pre>
              ) : (
                <div className="text-sm opacity-70">No preview available.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
