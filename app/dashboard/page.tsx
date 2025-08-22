"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "../../lib/api";

type Report = { id: string; report_type?: string; created_at?: string; status?: string };

function pickBusinessId(me: any): string | null {
  if (!me) return null;

  // Your /auth/me shows: { ok: true, profile: { id: "<business_profile_id>", ... } }
  if (me.profile && typeof me.profile.id === "string") return me.profile.id;

  // Extra fallbacks (harmless)
  if (typeof me.business_id === "string") return me.business_id;
  if (typeof me.businessId === "string") return me.businessId;
  if (me.business && typeof me.business.id === "string") return me.business.id;
  if (me.profile && typeof me.profile.business_id === "string") return me.profile.business_id;
  if (typeof me.business_profile_id === "string") return me.business_profile_id;
  if (me.business_profile && typeof me.business_profile.id === "string") return me.business_profile.id;
  if (Array.isArray(me.businesses) && me.businesses[0] && typeof me.businesses[0].id === "string") return me.businesses[0].id;

  return null;
}

export default function DashboardPage() {
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [manualId, setManualId] = useState<string>("");
  const [meRaw, setMeRaw] = useState<any>(null);
  const [lastCall, setLastCall] = useState<string>("");

  async function tryList(id: string | null) {
    // Primary: /reports/list/{business_id}
    if (id) {
      try {
        setLastCall(`/reports/list/${id}`);
        const list1 = await apiFetch<Report[]>(`/reports/list/${id}`, {}, true);
        if (Array.isArray(list1)) return list1;
      } catch (e: any) {
        // keep trying
      }
      // Secondary: /reports/list?business_id=...
      try {
        setLastCall(`/reports/list?business_id=${id}`);
        const list2 = await apiFetch<Report[]>(`/reports/list?business_id=${id}`, {}, true);
        if (Array.isArray(list2)) return list2;
      } catch (e: any) {}
    }
    // Tertiary: /reports/list (auth implied)
    try {
      setLastCall(`/reports/list`);
      const list3 = await apiFetch<Report[]>(`/reports/list`, {}, true);
      if (Array.isArray(list3)) return list3;
    } catch (e: any) {}

    throw new Error("Could not load reports from any known endpoint.");
  }

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const me = await apiFetch<any>("/auth/me", {}, true);
      setMeRaw(me);
      const found = pickBusinessId(me);
      if (!found) throw new Error("No business_id found on /auth/me response.");
      setBusinessId(found);
      const list = await tryList(found);
      setReports(list);
    } catch (e: any) {
      setErr(e?.message ?? String(e));
      setReports([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const t = localStorage.getItem("access_token");
    if (!t) { router.replace("/login"); return; }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onGenerate = async () => {
    setErr(null);
    try {
      let id = businessId;
      if (!id) {
        const me = await apiFetch<any>("/auth/me", {}, true);
        setMeRaw(me);
        id = pickBusinessId(me);
        if (id) setBusinessId(id);
      }
      if (!id) throw new Error("No business_id available to generate report.");

      // Your backend expects { business_id } (from our past setup)
      setLastCall("POST /reports/generate-business-overview");
      await apiFetch(`/reports/generate-business-overview`, {
        method: "POST",
        body: JSON.stringify({ business_id: id }),
      }, true);

      const list = await tryList(id);
      setReports(list);
      alert("Report generation triggered.");
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    }
  };

  const onUseManualId = async () => {
    if (!manualId.trim()) return;
    try {
      setErr(null);
      setBusinessId(manualId.trim());
      const list = await tryList(manualId.trim());
      setReports(Array.isArray(list) ? list : []);
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    }
  };

  if (loading) return <p>Loading dashboard…</p>;

  return (
    <>
      <h1>Dashboard</h1>

      <div style={{ display:"flex", gap:12, marginBottom:16, flexWrap:"wrap" }}>
        <button onClick={onGenerate}>Generate Business Overview</button>
        <a href="#" onClick={(e)=>{e.preventDefault(); localStorage.removeItem("access_token"); router.push("/login");}}>Log out</a>
      </div>

      {err && (
        <div style={{ border:"1px solid #e5b3b3", background:"#fff5f5", padding:12, borderRadius:8, marginBottom:16 }}>
          <strong>Heads up:</strong> {err}
          <div style={{ marginTop:8 }}>
            Enter <code>business_id</code> if needed and click “Use ID”.
          </div>
          <div style={{ display:"flex", gap:8, marginTop:8 }}>
            <input value={manualId} onChange={(e)=>setManualId(e.target.value)} placeholder="Paste your business_id" style={{ flex:1 }} />
            <button onClick={onUseManualId}>Use ID</button>
          </div>
        </div>
      )}

      <div style={{ marginBottom:12 }}>
        <small><strong>Business ID:</strong> {businessId ?? "unknown"} &nbsp; | &nbsp; <strong>Last call:</strong> {lastCall || "—"}</small>
      </div>

      <details style={{ marginBottom:16 }}>
        <summary>/auth/me raw response (debug)</summary>
        <pre style={{ whiteSpace:"pre-wrap", wordBreak:"break-word", background:"#f7f7f7", padding:12, borderRadius:8 }}>
{JSON.stringify(meRaw, null, 2)}
        </pre>
      </details>

      <h2>Previous Reports</h2>
      {reports.length === 0 ? (
        <p>No reports yet.</p>
      ) : (
        <ul>
          {reports.map((r) => (
            <li key={r.id}>
              <strong>{r.report_type ?? "Report"}</strong> • {r.status ?? "unknown"} • {r.created_at ?? ""}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
