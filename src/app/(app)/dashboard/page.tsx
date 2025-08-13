"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function DashboardPage() {
  const [me, setMe] = useState<any>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [genLoading, setGenLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api.me().then(async (m) => {
      setMe(m);
      const list = await api.listReports(m.business_id);
      setReports(list);
    }).catch(() => (window.location.href = "/login"));
  }, []);

  async function handleGenerate() {
    try {
      setErr(null); setGenLoading(true);
      await api.generateOverview({});
      // refresh list
      const list = await api.listReports(me.business_id);
      setReports(list);
    } catch (e:any) {
      setErr(e.message || "Failed to generate report");
    } finally {
      setGenLoading(false);
    }
  }

  if (!me) return null;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="card p-5">
          <div className="text-sm text-zinc-500">Business</div>
          <div className="text-lg font-semibold">{me?.profile?.business_name || "Your business"}</div>
          <div className="text-xs text-zinc-500 mt-1">{me.email}</div>
        </div>
        <div className="card p-5">
          <div className="text-sm text-zinc-500">Brand colors</div>
          <div className="flex items-center gap-3 mt-2">
            <div className="h-6 w-10 rounded" style={{ background: "var(--brand-primary)" }} />
            <div className="h-6 w-10 rounded" style={{ background: "var(--brand-secondary)" }} />
          </div>
        </div>
        <div className="card p-5 flex items-center justify-between">
          <div>
            <div className="text-sm text-zinc-500">Reports</div>
            <div className="text-lg font-semibold">{reports.length}</div>
          </div>
          <button className="btn" onClick={handleGenerate} disabled={genLoading}>
            {genLoading ? "Generating…" : "Generate Business Overview"}
          </button>
        </div>
      </div>

      {err && <div className="text-sm text-red-600">{err}</div>}

      <div className="card p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">My Reports</h2>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-neutral-500">
              <tr>
                <th className="py-2 pr-4">Created</th>
                <th className="py-2 pr-4">CSV</th>
                <th className="py-2 pr-4">JSON</th>
                <th className="py-2 pr-4">PDF</th>
              </tr>
            </thead>
            <tbody>
              {reports.length === 0 && (
                <tr><td className="py-3 text-zinc-500" colSpan={4}>No reports yet. Generate your first!</td></tr>
              )}
              {reports.map((r) => (
                <tr key={r.id} className="border-t border-neutral-200">
                  <td className="py-2 pr-4">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="py-2 pr-4">{r.csv_url ? <a className="underline" href={r.csv_url} target="_blank">Download</a> : "-"}</td>
                  <td className="py-2 pr-4">{r.json_url ? <a className="underline" href={r.json_url} target="_blank">Download</a> : "-"}</td>
                  <td className="py-2 pr-4">{r.pdf_url ? <a className="underline" href={r.pdf_url} target="_blank">Download</a> : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
