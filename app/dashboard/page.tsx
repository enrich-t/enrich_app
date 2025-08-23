"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "../../lib/api";

type MeProfile = { id: string; business_name?: string };
type MeResponse = { ok: boolean; profile: MeProfile };
type Report = {
  id: string;
  business_id: string;
  report_type: string;
  content?: Record<string, unknown>;
  created_at?: string;
  status?: "pending" | "generated" | string;
  csv_url?: string | null;
  json_url?: string | null;
  pdf_url?: string | null;
};

function fmt(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleString();
}

export default function DashboardPage() {
  const router = useRouter();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const businessId = useMemo(() => me?.profile?.id ?? null, [me]);
  const pollTimer = useRef<NodeJS.Timeout | null>(null);
  const pollUntil = useRef<number>(0);

  const fetchList = useCallback(async (id: string) => {
    const res = await apiFetch<{ ok: boolean; reports: Report[] }>(`/reports/list/${id}`, {}, true);
    return Array.isArray(res.reports) ? res.reports : [];
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
      if (!token) { router.replace("/login"); return; }

      const meRes = await apiFetch<MeResponse>("/auth/me", {}, true);
      setMe(meRes);
      const id = meRes?.profile?.id;
      if (!id) throw new Error("Could not determine business_id from /auth/me");

      const arr = await fetchList(id);
      setReports(arr);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, [router, fetchList]);

  useEffect(() => { load(); }, [load]);

  const startPolling = useCallback((id: string) => {
    if (pollTimer.current) clearInterval(pollTimer.current as unknown as number);
    pollUntil.current = Date.now() + 2 * 60 * 1000; // 2 minutes
    pollTimer.current = setInterval(async () => {
      if (Date.now() > pollUntil.current) {
        if (pollTimer.current) clearInterval(pollTimer.current as unknown as number);
        return;
      }
      const arr = await fetchList(id);
      setReports(arr);
      const anyPending = arr.some(r => (r.status ?? "").toLowerCase() === "pending");
      if (!anyPending && pollTimer.current) {
        clearInterval(pollTimer.current as unknown as number);
      }
    }, 5000);
  }, [fetchList]);

  const onGenerate = useCallback(async () => {
    setErr(null);
    try {
      if (!businessId) throw new Error("No business_id available.");
      await apiFetch(`/reports/generate-business-overview`, {
        method: "POST",
        body: JSON.stringify({ business_id: businessId }),
      }, true);

      const arr = await fetchList(businessId);
      setReports(arr);
      startPolling(businessId); // keep refreshing while pending
      alert("Report generation triggered.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }, [businessId, fetchList, startPolling]);

  const onLogout = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    localStorage.removeItem("access_token");
    router.push("/login");
  }, [router]);

  if (loading) return <p>Loading dashboard…</p>;

  return (
    <>
      <h1>Dashboard</h1>

      <div style={{ display:"flex", gap:12, marginBottom:16, flexWrap:"wrap" }}>
        <button onClick={onGenerate} disabled={!businessId}>Generate Business Overview</button>
        <a href="#" onClick={onLogout}>Log out</a>
      </div>

      {err && (
        <div style={{ border:"1px solid #e5b3b3", background:"#fff5f5", padding:12, borderRadius:8, marginBottom:16 }}>
          <strong>Heads up:</strong> {err}
        </div>
      )}

      <div style={{ marginBottom:12 }}>
        <small><strong>Business ID:</strong> {businessId ?? "unknown"}</small>
      </div>

      <h2>Previous Reports</h2>
      {reports.length === 0 ? (
        <p>No reports yet.</p>
      ) : (
        <ul style={{ paddingLeft:16 }}>
          {reports.map((r) => {
            const isPending = (r.status ?? "").toLowerCase() === "pending";
            return (
              <li key={r.id} style={{ marginBottom:8 }}>
                <div>
                  <strong>{r.report_type || "Report"}</strong> •
                  {" "}{r.status ?? "unknown"} • {fmt(r.created_at)}
                </div>
                {!isPending && (
                  <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                    {r.csv_url && <a href={r.csv_url} target="_blank" rel="noreferrer">CSV</a>}
                    {r.json_url && <a href={r.json_url} target="_blank" rel="noreferrer">JSON</a>}
                    {r.pdf_url && <a href={r.pdf_url} target="_blank" rel="noreferrer">PDF</a>}
                  </div>
                )}
                {isPending && <small>We’ll refresh automatically…</small>}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
