"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "../../lib/api";

type Report = { id: string; report_type?: string; created_at?: string; status?: string; };

export default function DashboardPage() {
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    try {
      const me = await apiFetch<{ business_id?: string }>("/auth/me", {}, true);
      if (!me?.business_id) throw new Error("No business_id on /auth/me");
      const list = await apiFetch<Report[]>(`/reports/list/${me.business_id}`, {}, true);
      setReports(Array.isArray(list) ? list : []);
    } catch (e:any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const t = localStorage.getItem("access_token");
    if (!t) { router.replace("/login"); return; }
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onGenerate = async () => {
    setErr(null);
    try {
      const me = await apiFetch<{ business_id?: string }>("/auth/me", {}, true);
      if (!me?.business_id) throw new Error("No business_id on /auth/me");
      await apiFetch(`/reports/generate-business-overview`, {
        method: "POST",
        body: JSON.stringify({ business_id: me.business_id }),
      }, true);
      await refresh();
      alert("Report generation triggered.");
    } catch (e:any) { setErr(e.message); }
  };

  if (loading) return <p>Loading dashboard…</p>;
  return (
    <>
      <h1>Dashboard</h1>
      <div style={{ display:"flex", gap:12, marginBottom:16 }}>
        <button onClick={onGenerate}>Generate Business Overview</button>
        <a href="#" onClick={(e)=>{e.preventDefault(); localStorage.removeItem("access_token"); router.push("/login");}}>Log out</a>
      </div>
      {err && <p style={{color:"crimson"}}>{err}</p>}
      <h2>Previous Reports</h2>
      {reports.length === 0 ? <p>No reports yet.</p> : (
        <ul>
          {reports.map(r => (
            <li key={r.id}>
              <strong>{r.report_type ?? "Report"}</strong> • {r.status ?? "unknown"} • {r.created_at ?? ""}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
