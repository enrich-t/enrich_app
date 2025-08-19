"use client";
import { useEffect, useMemo, useState } from "react";

type Link = { label: string; url: string };
type Report = {
  id?: string;
  report_type?: string;
  created_at?: string;
  links?: Link[];
  [key: string]: unknown;
};
type Profile = { id?: string; user_id?: string; business_name?: string; [k: string]: unknown };

function normalizeReports(raw: any): Report[] {
  const arr =
    Array.isArray(raw) ? raw :
    raw?.reports ?? raw?.items ?? raw?.data ?? [];
  if (!Array.isArray(arr)) return [];

  return arr.map((r: any) => {
    const id = r.id ?? r.report_id ?? r.uuid ?? r.pk ?? undefined;
    const created_at = r.created_at ?? r.createdAt ?? r.created ?? r.timestamp ?? undefined;
    const report_type = r.report_type ?? r.type ?? r.kind ?? "Report";

    const links: Link[] = [];
    const add = (label: string, url?: any) => {
      if (!url || typeof url !== "string") return;
      links.push({ label, url });
    };
    // common fields
    add("CSV", r.csv_url ?? r.csvUrl ?? r.csv);
    add("PDF", r.pdf_url ?? r.pdfUrl ?? r.pdf);
    add("JSON", r.json_url ?? r.jsonUrl ?? r.json);
    // generic files array
    if (Array.isArray(r.files)) {
      for (const f of r.files) {
        const url = f?.url ?? f?.public_url ?? f?.signed_url;
        if (!url) continue;
        const label = (f?.label ?? f?.type ?? f?.kind ?? f?.format ?? f?.filename ?? "File").toString().toUpperCase();
        links.push({ label, url });
      }
    }
    // generic fields that look like urls
    for (const k of Object.keys(r)) {
      const v = r[k];
      if (typeof v === "string" && /^https?:\/\//.test(v)) {
        const u = v.toLowerCase();
        if (u.endsWith(".csv")) add("CSV", v);
        else if (u.endsWith(".pdf")) add("PDF", v);
        else if (u.endsWith(".json")) add("JSON", v);
      }
    }

    return { id, created_at, report_type, links, ...r };
  });
}

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

  async function fetchProfileAndReports() {
    if (!token) return;
    setLoading(true);
    setErr(null);
    try {
      // 1) /auth/me
      const meRes = await fetch(`${base}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const meText = await meRes.text();
      let me: any = {};
      try { me = meText ? JSON.parse(meText) : {}; } catch {}
      if (!meRes.ok) throw new Error(me?.detail?.message || meText || "Failed to load profile");

      const p = (me?.profile || me?.data || me) as Profile;
      setProfile(p);
      const bizId = p?.id || p?.user_id;
      if (!bizId) throw new Error("No business/profile id on profile");

      // 2) list reports (try path param, then fallback to query)
      let listRes = await fetch(`${base}/reports/list/${bizId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!listRes.ok) {
        listRes = await fetch(`${base}/reports/list?user_id=${encodeURIComponent(p.user_id || "")}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      const listText = await listRes.text();
      let parsed: any = {};
      try { parsed = listText ? JSON.parse(listText) : {}; } catch {}
      const list = normalizeReports(parsed);
      setReports(list);
    } catch (e: any) {
      setErr(e?.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchProfileAndReports(); /* eslint-disable-next-line */ }, [token, base]);

  async function pollReports(times = 3, delayMs = 1200) {
    for (let i = 0; i < times; i++) {
      await new Promise(r => setTimeout(r, delayMs));
      await fetchProfileAndReports();
      if (i < times - 1) setGenStatus(`Updating list… (${i + 1}/${times})`);
    }
    setGenStatus("");
  }

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

      setGenStatus("Generated! Updating list…");
      await pollReports(3, 1500);
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
        <button onClick={fetchProfileAndReports} title="Refresh list">Refresh</button>
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
              const links = (r.links || []) as Link[];
              return (
                <li key={(r.id as string) || i} style={{border: "1px solid #eee", borderRadius: 8, padding: 12}}>
                  <div style={{display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap"}}>
                    <div>
                      <div style={{fontWeight: 600}}>{r.report_type || "Report"}</div>
                      {created && <div style={{fontSize: 12, opacity: 0.7}}>{created}</div>}
                    </div>
                    <div style={{display: "flex", gap: 8, alignItems: "center"}}>
                      {links.length > 0 ? (
                        links.map((l, idx) => (
                          <a key={idx} href={l.url} target="_blank" rel="noreferrer">{l.label}</a>
                        ))
                      ) : (
                        <span style={{fontSize: 12, opacity: 0.6}}>No files yet</span>
                      )}
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
