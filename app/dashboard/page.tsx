"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "../../lib/api";

type MeProfile = {
  id: string;
  business_name?: string;
  email?: string;
  [k: string]: unknown;
};
type MeResponse = { ok: boolean; profile: MeProfile };

type ReportContent = Record<string, unknown>;
type Report = {
  id: string;
  business_id: string;
  report_type: string;
  content?: ReportContent;
  created_at?: string;
  status?: "pending" | "generated" | string;
  export_link?: string | null;
  ai_logic_summary?: string | null;
  csv_url?: string | null;
  json_url?: string | null;
  pdf_url?: string | null;
  report_id?: string | null;
};

function formatDate(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

export default function DashboardPage() {
  const router = useRouter();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const businessId = useMemo(() => me?.profile?.id ?? null, [me]);

  const load = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      // auth check
      const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
      if (!token) {
        router.replace("/login");
        return;
      }

      // get me
      const meRes = await apiFetch<MeResponse>("/auth/me", {}, true);
      setMe(meRes);
      const id = meRes?.profile?.id;
      if (!id) throw new Error("Could not determine business_id from /auth/me");

      // list reports
      const listRes = await apiFetch<{ ok: boolean; reports: Report[] }>(`/reports/list/${id}`, {}, true);
      const arr = Array.isArray(listRes?.reports) ? listRes.reports : [];
      setReports(arr);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : String(e));
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  const onGenerate = useCallback(async () => {
    setErrorMsg(null);
    try {
      if (!businessId) throw new Error("No business_id available.");
      await apiFetch(`/reports/generate-business-overview`, {
        method: "POST",
        body: JSON.stringify({ business_id: businessId }),
      }, true);

      // refresh after trigger
      const listRes = await apiFetch<{ ok: boolean; reports: Report[] }>(`/reports/list/${businessId}`, {}, true);
      setReports(Array.isArray(listRes.reports) ? listRes.reports : []);
      alert("Report generation triggered.");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : String(e));
    }
  }, [businessId]);

  const onLogout = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    if (typeof window !== "undefined") {
      localStorage.removeItem("access_token");
    }
    router.push("/login");
  }, [router]);

  if (loading) return <p>Loading dashboard…</p>;

  return (
    <>
      <h1>Dashboard</h1>

      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <button onClick={onGenerate} disabled={!businessId}>Generate Business Overview</button>
        <a href="#" onClick={onLogout}>Log out</a>
      </div>

      {errorMsg && (
        <div style={{ border: "1px solid #e5b3b3", background: "#fff5f5", padding: 12, borderRadius: 8, marginBottom: 16 }}>
          <strong>Heads up:</strong> {errorMsg}
        </div>
      )}

      <div style={{ marginBottom: 12 }}>
        <small><strong>Business ID:</strong> {businessId ?? "unknown"}</small>
      </div>

      <h2>Previous Reports</h2>
      {reports.length === 0 ? (
        <p>No reports yet.</p>
      ) : (
        <ul style={{ paddingLeft: 16 }}>
          {reports.map((r) => (
            <li key={r.id} style={{ marginBottom: 8 }}>
              <div><strong>{r.report_type || "Report"}</strong> • {r.status ?? "unknown"} • {formatDate(r.created_at)}</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {r.csv_url && <a href={r.csv_url} target="_blank" rel="noreferrer">CSV</a>}
                {r.json_url && <a href={r.json_url} target="_blank" rel="noreferrer">JSON</a>}
                {r.pdf_url && <a href={r.pdf_url} target="_blank" rel="noreferrer">PDF</a>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
