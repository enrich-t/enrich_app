"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "../../lib/api";

type Report = { id: string; report_type?: string; created_at?: string; status?: string };

function pickBusinessId(me: any): string | null {
  if (!me) return null;
  // Your /auth/me example: { ok:true, profile:{ id:"...", ... } }
  if (me.profile && typeof me.profile.id === "string") return me.profile.id;

  // Harmless fallbacks
  if (typeof me.business_id === "string") return me.business_id;
  if (typeof me.businessId === "string") return me.businessId;
  if (me.business && typeof me.business.id === "string") return me.business.id;
  if (me.profile && typeof me.profile.business_id === "string") return me.profile.business_id;
  if (typeof me.business_profile_id === "string") return me.business_profile_id;
  if (me.business_profile && typeof me.business_profile.id === "string") return me.business_profile.id;
  if (Array.isArray(me.businesses) && me.businesses[0] && typeof me.businesses[0].id === "string") return me.businesses[0].id;
  return null;
}

// Try to locate an array of reports in a flexible response
function extractReports(payload: any): Report[] | null {
  if (!payload) return null;

  // If it's already an array
  if (Array.isArray(payload)) return payload as Report[];

  // Common top-level keys
  const candidates = [
    payload.data,
    payload.reports,
    payload.items,
    payload.results,
    payload.rows,
    payload.records,
    payload.list,
    payload.entries,

    // Nested under data
    payload?.data?.reports,
    payload?.data?.items,
    payload?.data?.results,
    payload?.data?.rows,
    payload?.data?.records,
    payload?.data?.list,
    payload?.data?.entries,
  ];

  for (const c of candidates) {
    if (Array.isArray(c)) return c as Report[];
  }

  // As a last resort: recursively search for the first array of objects
  const visited = new Set<any>();
  function dfs(obj: any, depth = 0): Report[] | null {
    if (!obj || typeof obj !== "object" || depth > 4 || visited.has(obj)) return null;
    visited.add(obj);
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      if (Array.isArray(val)) {
        if (val.length === 0) continue;
        if (typeof val[0] === "object") return val as Report[];
      } else if (val && typeof val === "object") {
        const found = dfs(val, depth + 1);
        if (found) return found;
      }
    }
    return null;
  }
  return dfs(payload);
}

export default function DashboardPage() {
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [manualId, setManualId] = useState<string>("");
  const [meRaw, setMeRaw] = useState<any>(null);
  const [attempts, setAttempts] = useState<string[]>([]);
  const [listResponseSample, setListResponseSample] = useState<any>(null);
  const pushAttempt = (msg: string) => setAttempts(prev => [...prev, msg]);

  async function tryList(id: string | null) {
    const paths: string[] = [];
    if (id) {
      paths.push(`/reports/list/${id}`);
      paths.push(`/reports/list?business_id=${id}`);
      paths.push(`/reports/${id}`);
      paths.push(`/reports?business_id=${id}`);
    }
    paths.push(`/reports/list`);
    paths.push(`/reports`);

    for (const p of paths) {
      try {
        pushAttempt(`GET ${p}`);
        const data = await apiFetch<any>(p, {}, true);
        const arr = extractReports(data);
        if (arr) {
          setListResponseSample(data);
          pushAttempt(`✅ OK ${p} → ${arr.length} reports`);
          return arr as Report[];
        } else {
          setListResponseSample(data);
          pushAttempt(`⚠️ OK ${p} but response not array (showing sample below)`);
        }
      } catch (e: any) {
        pushAttempt(`❌ ${p} → ${e?.message ?? String(e)}`);
      }
    }
    throw new Error("Could not load reports from any known endpoint.");
  }

  async function load() {
    setLoading(true);
    setErr(null);
    setAttempts([]);
    setListResponseSample(null);
    try {
      pushAttempt("GET /auth/me");
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
    setAttempts([]);
    try {
      let id = businessId;
      if (!id) {
        pushAttempt("GET /auth/me (to fetch id)");
        const me = await apiFetch<any>("/auth/me", {}, true);
        setMeRaw(me);
        id = pickBusinessId(me);
        if (id) setBusinessId(id);
      }
      if (!id) throw new Error("No business_id available to generate report.");

      const postVariants: { path: string; body: Record<string, unknown> }[] = [
        { path: "/reports/generate-business-overview", body: { business_id: id } },
        { path: "/reports/generate", body: { business_id: id } },
        { path: "/reports/create", body: { business_id: id } },
        { path: "/reports", body: { business_id: id, action: "generate" } },
        { path: `/reports/generate-business-overview/${id}`, body: {} },
        { path: `/reports/generate/${id}`, body: {} },
        // Alternate field names if your backend expects them:
        { path: "/reports/generate", body: { id } },
        { path: "/reports/generate", body: { business_profile_id: id } },
      ];

      let generated = false;
      for (const v of postVariants) {
        try {
          pushAttempt(`POST ${v.path} body=${JSON.stringify(v.body)}`);
          await apiFetch(v.path, { method: "POST", body: JSON.stringify(v.body) }, true);
          pushAttempt(`✅ OK ${v.path}`);
          generated = true;
          break;
        } catch (e: any) {
          pushAttempt(`❌ ${v.path} → ${e?.message ?? String(e)}`);
        }
      }
      if (!generated) throw new Error("All generate endpoints failed.");

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
      setAttempts([]);
      setListResponseSample(null);
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
        <small><strong>Business ID:</strong> {businessId ?? "unknown"}</small>
      </div>

      <details style={{ marginBottom:16 }}>
        <summary>Network attempts (click to expand)</summary>
        <pre style={{ whiteSpace:"pre-wrap", wordBreak:"break-word", background:"#f7f7f7", padding:12, borderRadius:8 }}>
{attempts.join("\n")}
        </pre>
      </details>

      {listResponseSample && (
        <details style={{ marginBottom:16 }}>
          <summary>List response sample (first successful/OK response)</summary>
          <pre style={{ whiteSpace:"pre-wrap", wordBreak:"break-word", background:"#f7f7f7", padding:12, borderRadius:8 }}>
{JSON.stringify(listResponseSample, null, 2)}
          </pre>
        </details>
      )}

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
