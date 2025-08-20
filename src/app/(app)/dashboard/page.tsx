"use client";
import { useEffect, useMemo, useState } from "react";

type Link = { label: string; url: string };
type Report = { id?: string; report_type?: string; created_at?: string; links?: Link[]; [k: string]: unknown };
type Profile = { id?: string; user_id?: string; business_name?: string; [k: string]: unknown };

function normalizeReports(raw: any): Report[] {
  const arr = Array.isArray(raw) ? raw : raw?.reports ?? raw?.items ?? raw?.data ?? [];
  if (!Array.isArray(arr)) return [];

  const pickUrl = (x: any) => (typeof x === "string" && /^https?:\/\//i.test(x) ? x : undefined);

  const looksLikePdf = (url?: string, labelMaybe?: string) => {
    if (!url) return false;
    try {
      const low = url.toLowerCase();
      if (low.endsWith(".pdf")) return true;
      const u = new URL(url);
      const filename = u.searchParams.get("filename") || u.searchParams.get("download") || u.searchParams.get("name");
      if (filename && filename.toLowerCase().endsWith(".pdf")) return true;
    } catch {}
    if (labelMaybe && /pdf/i.test(labelMaybe)) return true;
    return false;
  };

  return arr.map((r: any) => {
    const id = r.id ?? r.report_id ?? r.uuid ?? r.pk ?? undefined;
    const created_at = r.created_at ?? r.createdAt ?? r.created ?? r.timestamp ?? undefined;
    const report_type = r.report_type ?? r.type ?? r.kind ?? "Report";

    // Preferred URLs (exact fields first)
    const jsonUrl  = pickUrl(r.json_url  ?? r.jsonUrl  ?? r.json);
    const canvaCsv =
      pickUrl(r.canva_csv_url ?? r.canvaCsvUrl ?? r.canva_csv) ||
      (Array.isArray(r.files)
        ? (() => {
            const f = r.files.find((f: any) => {
              const u = pickUrl(f?.url ?? f?.public_url ?? f?.signed_url);
              const label = (f?.label ?? f?.type ?? f?.filename ?? "").toString();
              return u && /\.csv(\?|$)/i.test(u) && /canva/i.test(label);
            });
            return f ? pickUrl(f.url ?? f.public_url ?? f.signed_url) : undefined;
          })()
        : undefined);
    const csvUrl   = pickUrl(r.csv_url   ?? r.csvUrl   ?? r.csv);

    let pdfUrl = pickUrl(r.pdf_url ?? r.pdfUrl ?? r.pdf ?? r.report_pdf_url ?? r.summary_pdf_url ?? r.download_pdf);
    if (!looksLikePdf(pdfUrl)) pdfUrl = undefined;
    if (!pdfUrl && Array.isArray(r.files)) {
      for (const f of r.files) {
        const u = pickUrl(f?.url ?? f?.public_url ?? f?.signed_url);
        const label = (f?.label ?? f?.type ?? f?.filename ?? "").toString();
        if (looksLikePdf(u, label)) { pdfUrl = u; break; }
      }
    }
    if (!pdfUrl) {
      for (const [k, v] of Object.entries(r)) {
        if (typeof v !== "string") continue;
        const u = pickUrl(v);
        if (!u) continue;
        if (k.toLowerCase().includes("pdf") || looksLikePdf(u)) { pdfUrl = u; break; }
      }
    }

    // Build links in strict order, deduping by URL
    const out: Link[] = [];
    const seen = new Set<string>();
    const add = (label: string, url?: string) => {
      if (!url) return;
      const key = url.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      out.push({ label, url });
    };

    add("JSON", jsonUrl);
    add("Canva CSV", canvaCsv);
    if (!out.find(l => l.label === "Canva CSV")) add("CSV", csvUrl);
    add("PDF", pdfUrl);

    return { id, created_at, report_type, links: out, ...r };
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
  const [debugOpen, setDebugOpen] = useState(false);
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const dlog = (s: string) => setDebugLog((p) => [...p, s]);

  useEffect(() => {
    try {
      setToken(localStorage.getItem("enrich_access"));
      const u = localStorage.getItem("enrich_user");
      setEmail(u ? (JSON.parse(u).email as string) : null);
    } catch {}
  }, []);

  async function tryFetchList(bizId: string) {
    const tries: { label: string; url: string }[] = [
      { label: "list/{bizId}", url: `${base}/reports/list/${bizId}` },
      { label: "list?business_id=", url: `${base}/reports/list?business_id=${encodeURIComponent(bizId)}` },
    ];
    for (const t of tries) {
      try {
        dlog(`GET ${t.label} → ${t.url}`);
        const res = await fetch(t.url, { headers: { Authorization: `Bearer ${token}` } });
        const text = await res.text();
        dlog(`↳ ${res.status} ${res.ok ? "OK" : "ERR"} · ${text.slice(0, 140)}${text.length > 140 ? "…" : ""}`);
        if (!res.ok) continue;
        const parsed = text ? JSON.parse(text) : {};
        const list = normalizeReports(parsed);
        if (Array.isArray(list)) return list;
      } catch (e: any) {
        dlog(`⚠ ${t.label} failed: ${e?.message || e}`);
      }
    }
    return [];
  }

  async function fetchProfileAndReports() {
    if (!token) return;
    setLoading(true);
    setErr(null);
    setDebugLog([]);
    try {
      dlog(`GET /auth/me`);
      const meRes = await fetch(`${base}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
      const meText = await meRes.text();
      dlog(`↳ ${meRes.status} ${meRes.ok ? "OK" : "ERR"} · ${meText.slice(0, 140)}${meText.length > 140 ? "…" : ""}`);
      let me: any = {};
      try { me = meText ? JSON.parse(meText) : {}; } catch {}
      if (!meRes.ok) throw new Error(me?.detail?.message || meText || "Failed to load profile");
      const p = (me?.profile || me?.data || me) as Profile;
      setProfile(p);
      const bizId = p?.id || p?.user_id;
      if (!bizId) throw new Error("No business/profile id on profile");

      const list = await tryFetchList(String(bizId));
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

      let res = await fetch(`${base}/reports/generate-business-overview`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });

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
        <button onClick={fetchProfileAndReports}>Refresh</button>
        <button onClick={() => setDebugOpen((v) => !v)}>{debugOpen ? "Hide" : "Show"} debug</button>
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
              const baseLinks = (r.links || []) as Link[];

              // Add fallbacks based on id if missing
              const out: Link[] = [];
              const seen = new Set<string>();
              const add = (label: string, url?: string) => {
                if (!url) return;
                const key = url.toLowerCase();
                if (seen.has(key)) return;
                seen.add(key);
                out.push({ label, url });
              };

              for (const l of baseLinks) add(l.label, l.url);

              const hasLabel = (lbl: string) => out.some(x => x.label.toLowerCase() === lbl.toLowerCase());
              const id = (r.id as string) || "";
              if (id) {
                if (!hasLabel("JSON")) add("JSON", `${base}/reports/${id}/json`);
                if (!hasLabel("Canva CSV") && !hasLabel("CSV")) add("Canva CSV", `${base}/reports/${id}/csv?variant=canva`);
                if (!hasLabel("PDF")) add("PDF", `${base}/reports/${id}/pdf`);
              }

              return (
                <li key={id || i} style={{border: "1px solid #eee", borderRadius: 8, padding: 12}}>
                  <div style={{display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap"}}>
                    <div>
                      <div style={{fontWeight: 600}}>{r.report_type || "Report"}</div>
                      {created && <div style={{fontSize: 12, opacity: 0.7}}>{created}</div>}
                    </div>
                    <div style={{display: "flex", gap: 8, alignItems: "center"}}>
                      {out.map((l, idx) => (
                        <a key={idx} href={l.url} target="_blank" rel="noreferrer">{l.label}</a>
                      ))}
                      {out.length === 0 && <span style={{fontSize: 12, opacity: 0.6}}>No files yet</span>}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {debugOpen && (
        <div style={{marginTop: 16, padding: 12, background: "#fafafa", border: "1px dashed #ddd", borderRadius: 8}}>
          <div style={{fontWeight: 600, marginBottom: 6}}>Debug log</div>
          <pre style={{whiteSpace: "pre-wrap"}}>{debugLog.join("\n") || "(empty)"}</pre>
        </div>
      )}
    </div>
  );
}
