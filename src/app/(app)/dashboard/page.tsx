"use client";
import { useEffect, useMemo, useState } from "react";

type Report = {
  id?: string;
  report_type?: string;
  created_at?: string;
  csv_url?: string;
  pdf_url?: string;
  json_url?: string;
  [key: string]: unknown;
};

type Profile = {
  id: string;
  user_id: string;
  business_name?: string;
  brand_primary_color?: string;
  brand_secondary_color?: string;
  [key: string]: unknown;
};

export default function DashboardPage() {
  const base = useMemo(
    () => (process.env.NEXT_PUBLIC_API_BASE_URL || "https://enrich-backend-new.onrender.com").replace(/\/$/, ""),
    []
  );

  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [err, setErr] = useState<string | null>(null);
  const [genStatus, setGenStatus] = useState<string>("");

  useEffect(() => {
    try {
      setToken(localStorage.getItem("enrich_access"));
      const u = localStorage.getItem("enrich_user");
      setEmail(u ? (JSON.parse(u).email as string) : null);
    } catch {}
  }, []);

  useEffect(() => {
    const run = async () => {
      if (!token) return;
      setLoading(true);
      setErr(null);
      try {
        // 1) get profile
        const meRes = await fetch(`${base}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const meText = await meRes.text();
        let me: any = {};
        try { me = meText ? JSON.parse(meText) : {}; } catch {}
        if (!meRes.ok) throw new Error(me?.detail?.message || meText || "Failed to load profile");
        const p = (me?.profile || me?.data || me) as Profile;
        setProfile(p);

        // Resolve business/profile id (prefer the profile row id, else user_id)
        const bizId = p?.id || p?.user_id;
        if (!bizId) throw new Error("No business/profile id on profile");

        // 2) list reports: try /reports/list/{business_id}, else fallback to query param
        let list: Report[] = [];
        let listRes = await fetch(`${base}/reports/list/${bizId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!listRes.ok) {
          // fallback
          listRes = await fetch(`${base}/reports/list?user_id=${encodeURIComponent(p.user_id)}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
        }
        const listText = await listRes.text();
        let data: any = {};
        try { data = listText ? JSON.parse(listText) : {}; } catch {}
        if (listRes.ok) {
          list = Array.isArray(data) ? data : (data?.reports || data?.data || []);
        }
        setReports(Array.isArray(list) ? list : []);
      } catch (e: any) {
        setErr(e?.message || "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [token, base]);

  async function generateReport() {
    if (!token || !profile) return;
    setGenStatus("Generating…");
    setErr(null);
    try {
      const payload: Record<string, unknown> = {};
      if (profile.id) payload["business_id"] = profile.id;
      if (!profile.id && profile.user_id) payload["user_id"] = profile.user_id;

      // primary endpoint
      let res = await fetch(`${base}/reports/generate-business-overview`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });

      // simple fallback if server expects slightly different shape
      if (!res.ok && profile.user_id && !payload["user_id"]) {
        res = await fetch(`${base}/reports/generate-business-overview`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ user_id: profile.user_id }),
        });
      }

      const text = await res.text();
      let data: any = null;
      try { data = text ? JSON.parse(text) : null; } catch {}
      if (!res.ok) throw new Error(data?.detail?.message || text || "Generate failed");

      setGenStatus("Generated! Refreshing list…");
      // Refresh list after a short pause
      setTimeout(async () => {
        try {
          const bizId = profile.id || profile.user_id;
          let listRes = await fetch(`${base}/reports/list/${bizId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!listRes.ok) {
            listRes = await fetch(`${base}/reports/list?user_id=${encodeURIComponent(profile.user_id)}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
          }
          const listText = await listRes.text();
          let d: any = {};
          try { d = listText ? JSON.parse(listText) : {}; } catch {}
          const list = Array.isArray(d) ? d : (d?.reports || d?.data || []);
          setReports(Array.isArray(list) ? list : []);
        } catch (e) {}
        setGenStatus("");
      }, 800);
    } catch (e: any) {
      setGenStatus("");
      setErr(e?.message || "Generate failed");
    }
  }

  return (
    <div>
      <h2 style={{marginBottom: 8}}>Dashboard</h2>
      <div style={{marginBottom: 16, opacity: 0.8, fontSize: 14}}>
        {email ? <>Signed in as <strong>{email}</strong></> : "Signed in"}
      </div>

      <div style={{display: "flex", gap: 12, alignItems: "center", marginBottom: 16}}>
        <button onClick={generateReport}>Generate Business Overview</button>
        {genStatus && <span style={{fontSize: 12, opacity: 0.7}}>{genStatus}</span>}
      </div>

      {err && <div style={{ color: "crimson", marginBottom: 12 }}>{err}</div>}
      {loading && <div>Loading…</div>}

      <h3 style={{marginTop: 12}}>Your Reports</h3>
      <div style={{marginTop: 8}}>
        {reports.length === 0 ? (
          <div style={{opacity: 0.7}}>No reports yet.</div>
        ) : (
          <ul style={{listStyle: "none", padding: 0, display: "grid", gap: 8}}>
            {reports.map((r, i) => {
              const created = r.created_at ? new Date(r.created_at as string).toLocaleString() : null;
              return (
                <li key={(r.id as string) || i} style={{border: "1px solid #eee", borderRadius: 8, padding: 12}}>
                  <div style={{display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap"}}>
                    <div>
                      <div style={{fontWeight: 600}}>{r.report_type || "Report"}</div>
                      {created && <div style={{fontSize: 12, opacity: 0.7}}>{created}</div>}
                    </div>
                    <div style={{display: "flex", gap: 8, alignItems: "center"}}>
                      {r.csv_url && <a href={String(r.csv_url)} target="_blank">CSV</a>}
                      {r.pdf_url && <a href={String(r.pdf_url)} target="_blank">PDF</a>}
                      {r.json_url && <a href={String(r.json_url)} target="_blank">JSON</a>}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
