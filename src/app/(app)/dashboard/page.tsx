"use client";
// ENRICH DASHBOARD v2
import { useEffect, useMemo, useState } from "react";

type Link = { label: string; url: string };
type Report = { id?: string; report_type?: string; created_at?: string; links?: Link[]; [k: string]: unknown };
type Profile = { id?: string; user_id?: string; business_name?: string; size?: string | null; [k: string]: unknown };

/* ---------- helpers: shape reports ---------- */
function normalizeReports(raw: any): Report[] {
  const arr = Array.isArray(raw) ? raw : raw?.reports ?? raw?.items ?? raw?.data ?? [];
  if (!Array.isArray(arr)) return [];
  const pickUrl = (x: any) => (typeof x === "string" && /^https?:\/\//i.test(x) ? x : undefined);
  const looksLikePdf = (url?: string, labelMaybe?: string) => {
    if (!url) return false;
    try {
      const low = url.toLowerCase(); if (low.endsWith(".pdf")) return true;
      const u = new URL(url);
      const fn = u.searchParams.get("filename") || u.searchParams.get("download") || u.searchParams.get("name");
      if (fn && fn.toLowerCase().endsWith(".pdf")) return true;
    } catch {}
    return !!(labelMaybe && /pdf/i.test(labelMaybe));
  };
  return arr.map((r: any) => {
    const id = r.id ?? r.report_id ?? r.uuid ?? r.pk ?? undefined;
    const created_at = r.created_at ?? r.createdAt ?? r.created ?? r.timestamp ?? undefined;
    const report_type = r.report_type ?? r.type ?? r.kind ?? "Report";
    const jsonUrl = pickUrl(r.json_url ?? r.jsonUrl ?? r.json);
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
    const csvUrl = pickUrl(r.csv_url ?? r.csvUrl ?? r.csv);
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
        const u = pickUrl(v); if (!u) continue;
        if (k.toLowerCase().includes("pdf") || looksLikePdf(u)) { pdfUrl = u; break; }
      }
    }
    const out: Link[] = []; const seen = new Set<string>();
    const add = (label: string, url?: string) => { if (!url) return; const key = url.toLowerCase(); if (seen.has(key)) return; seen.add(key); out.push({ label, url }); };
    add("JSON", jsonUrl);
    add("Canva CSV", canvaCsv);
    if (!out.find((l) => l.label === "Canva CSV")) add("CSV", csvUrl);
    add("PDF", pdfUrl);
    return { id, created_at, report_type, links: out, ...r };
  });
}

/* ---------- tiny UI kit (no Tailwind) ---------- */
const S = {
  page: { fontFamily: "Inter, ui-sans-serif, system-ui, Arial", maxWidth: 1100, margin: "24px auto", padding: "0 16px" },
  rowCols: (n: number) => ({ display: "grid", gap: 16, gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }),
  card: { background: "#fff", border: "1px solid #eee", borderRadius: 16, padding: 16, boxShadow: "0 1px 2px rgba(0,0,0,0.04)" },
  h2: { fontSize: 24, fontWeight: 700, margin: "0 0 8px" },
  h3: { fontSize: 18, fontWeight: 700, margin: "0 0 6px" },
  sub: { fontSize: 13, opacity: 0.7 },
  btn: { padding: "8px 12px", borderRadius: 10, border: "1px solid #ddd", background: "#0f172a", color: "#fff", fontWeight: 600, cursor: "pointer" as const },
  btnGhost: { padding: "8px 12px", borderRadius: 10, border: "1px solid #ddd", background: "#fff", color: "#0f172a", fontWeight: 600, cursor: "pointer" as const },
  tag: { padding: "2px 8px", borderRadius: 999, fontSize: 12, background: "#f1f5f9", color: "#0f172a", border: "1px solid #e5e7eb" },
  table: { width: "100%", borderCollapse: "separate" as const, borderSpacing: 0 },
  th: { textAlign: "left" as const, fontSize: 12, textTransform: "uppercase" as const, letterSpacing: 0.4, color: "#475569", borderBottom: "1px solid #e5e7eb", padding: "10px 8px" },
  td: { fontSize: 14, color: "#0f172a", borderBottom: "1px solid #f1f5f9", padding: "12px 8px", verticalAlign: "middle" as const },
  linkBtn: { display: "inline-block", padding: "6px 10px", borderRadius: 10, border: "1px solid #e5e7eb", background: "#fafafa", fontSize: 13, fontWeight: 600, color: "#0f172a" },
};

/* ---------- donut placeholder ---------- */
function Donut({ percent = 72, size = 90, stroke = 10, color = "#0ea5e9", track = "#e5e7eb" }: { percent?: number; size?: number; stroke?: number; color?: string; track?: string }) {
  const r = (size - stroke) / 2; const c = 2 * Math.PI * r; const dash = Math.max(0, Math.min(100, percent)) / 100 * c;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} stroke={track} strokeWidth={stroke} fill="none"/>
      <circle cx={size/2} cy={size/2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={`${dash} ${c-dash}`} transform={`rotate(-90 ${size/2} ${size/2})`}/>
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" fontWeight="700" fontSize="16" fill="#0f172a">{Math.round(percent)}%</text>
    </svg>
  );
}

/* ---------- main page ---------- */
export default function DashboardPage() {
  const base = useMemo(() => (process.env.NEXT_PUBLIC_API_BASE_URL || "https://enrich-backend-new.onrender.com").replace(/\/$/, ""), []);
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [err, setErr] = useState<string | null>(null);
  const [genStatus, setGenStatus] = useState<string>("");
  const [credits, setCredits] = useState<number>(() => {
    const v = Number(localStorage.getItem("enrich_credits") || "100"); return Number.isFinite(v) ? v : 100;
  });

  useEffect(() => {
    try {
      setToken(localStorage.getItem("enrich_access"));
      const u = localStorage.getItem("enrich_user"); setEmail(u ? (JSON.parse(u).email as string) : null);
    } catch {}
  }, []);

  const sameOrigin = (url: string) => { try { const u = new URL(url); const b = new URL(base); return u.origin === b.origin; } catch { return false; } };

  async function openAuthed(url: string, fallbackName?: string) {
    if (!sameOrigin(url) || !token) { window.open(url, "_blank", "noopener,noreferrer"); return; }
    try {
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error((await res.text()) || res.statusText);
      const blob = await res.blob();
      let filename = fallbackName || "download";
      const cd = res.headers.get("content-disposition");
      if (cd) { const m = /filename\*?=(?:UTF-8''|")?([^";\n]+)/i.exec(cd); if (m?.[1]) filename = decodeURIComponent(m[1].replace(/"/g, "")); }
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = objectUrl; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(objectUrl);
    } catch (e: any) { alert(`Download failed: ${e?.message || e}`); }
  }

  const buildLink = (path: string, extra?: Record<string, string>): string => {
    const u = new URL(path, "http://example"); const params = new URLSearchParams(u.search);
    if (token) params.set("token", token); if (extra) for (const [k,v] of Object.entries(extra)) if (v) params.set(k, v);
    const qs = params.toString(); const clean = path.split("?")[0]; return qs ? `${clean}?${qs}` : clean;
  };

  async function tryFetchList(bizId: string) {
    const tries: { label: string; url: string }[] = [
      { label: "list/{bizId}", url: `${base}/reports/list/${bizId}` },
      { label: "list?business_id=", url: `${base}/reports/list?business_id=${encodeURIComponent(bizId)}` },
    ];
    for (const t of tries) {
      try {
        const res = await fetch(t.url, { headers: { Authorization: `Bearer ${token}` } });
        const text = await res.text();
        if (!res.ok) continue;
        const parsed = text ? JSON.parse(text) : {}; const list = normalizeReports(parsed);
        if (Array.isArray(list)) return list;
      } catch {}
    }
    return [];
  }

  async function fetchProfileAndReports() {
    if (!token) return;
    setLoading(true); setErr(null);
    try {
      const meRes = await fetch(`${base}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
      const meText = await meRes.text(); let me: any = {}; try { me = meText ? JSON.parse(meText) : {}; } catch {}
      if (!meRes.ok) throw new Error(me?.detail?.message || meText || "Failed to load profile");
      const p = (me?.profile || me?.data || me) as Profile; setProfile(p);
      const bizId = p?.id || p?.user_id; if (!bizId) throw new Error("No business/profile id on profile");
      const list = await tryFetchList(String(bizId)); setReports(list);
    } catch (e: any) { setErr(e?.message || "Failed to load dashboard"); }
    finally { setLoading(false); }
  }
  useEffect(() => { fetchProfileAndReports(); /* eslint-disable-next-line */ }, [token, base]);

  async function pollReports(times = 3, delayMs = 1200) {
    for (let i = 0; i < times; i++) { await new Promise(r=>setTimeout(r, delayMs)); await fetchProfileAndReports(); if (i<times-1) setGenStatus(`Updating list… (${i+1}/${times})`); }
    setGenStatus("");
  }

  async function generateReport() {
    if (!token || !profile) return;
    setGenStatus("Generating…"); setErr(null);
    try {
      const payload: Record<string, unknown> = {}; if (profile.id) payload["business_id"] = profile.id;
      const res = await fetch(`${base}/reports/generate-business-overview`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(payload),
      });
      const text = await res.text(); let data: any = null; try { data = text ? JSON.parse(text) : null; } catch {}
      if (!res.ok) throw new Error(data?.detail?.message || text || "Generate failed");
      // pretend to spend a credit
      const n = Math.max(0, credits - 1); setCredits(n); localStorage.setItem("enrich_credits", String(n));
      setGenStatus("Generated! Updating list…"); await pollReports(3, 1500);
    } catch (e: any) { setGenStatus(""); setErr(e?.message || "Generate failed"); }
  }

  // derived UI values
  const transparency = 72; // placeholder
  const growthStage = profile?.size ? String(profile.size) : "Seedling";
  const growthEmoji = "🌱";

  return (
    <div style={S.page}>
      {/* header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <h2 style={S.h2}>Dashboard</h2>
        <span style={{ ...S.tag, marginLeft: "auto" }}>v2 • {email ? <>Signed in as <strong>{email}</strong></> : "Signed in"}</span>
      </div>

      {/* top stats */}
      <div style={S.rowCols(4)}>
        <div style={S.card}>
          <div style={S.h3 as any}>Transparency Score</div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Donut percent={transparency}/>
            <div>
              <div style={{ fontSize: 28, fontWeight: 800, lineHeight: 1 }}>{transparency}%</div>
              <div style={S.sub}>Placeholder metric</div>
            </div>
          </div>
        </div>

        <div style={S.card}>
          <div style={S.h3 as any}>Growth Stage</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6 }}>
            <div style={{ fontSize: 28 }}>{growthEmoji}</div>
            <div style={{ fontWeight: 700 }}>{growthStage}</div>
          </div>
          <div style={{ ...S.sub, marginTop: 6 }}>Based on your profile</div>
        </div>

        <div style={S.card}>
          <div style={S.h3 as any}>AI Credits</div>
          <div style={{ fontSize: 28, fontWeight: 800, marginTop: 6 }}>{credits}</div>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button style={S.btnGhost} onClick={() => { const n = credits + 50; setCredits(n); localStorage.setItem("enrich_credits", String(n)); }}>+50</button>
            <button style={S.btnGhost} onClick={() => { const n = 100; setCredits(n); localStorage.setItem("enrich_credits", String(n)); }}>Reset</button>
          </div>
        </div>

        <div style={S.card}>
          <div style={S.h3 as any}>Create New Report</div>
          <div style={S.sub}>Business Overview</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 10 }}>
            <button style={S.btn} onClick={generateReport}>Generate</button>
            {genStatus && <span style={S.sub}>{genStatus}</span>}
          </div>
        </div>
      </div>

      {/* recommendations */}
      <div style={{ ...S.card, marginTop: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={S.h3 as any}>Recommendations</div>
          <span style={S.tag}>🔔 AI-only</span>
        </div>
        <ul style={{ margin: 0, paddingLeft: 18, marginTop: 8 }}>
          <li>Optimize your Google Business Profile description for seasonal keywords.</li>
          <li>Add recent customer photos to increase engagement.</li>
          <li>Publish a 30-sec Reels/TikTok about your top tour this week.</li>
        </ul>
      </div>

      {/* recent reports */}
      <div style={{ ...S.card, marginTop: 16 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 8 }}>
          <div style={S.h3 as any}>Recent Reports</div>
          <span style={S.sub}>Latest 10</span>
          <button style={{ ...S.btnGhost, marginLeft: "auto" }} onClick={() => fetchProfileAndReports()}>Refresh</button>
        </div>

        {err && <div style={{ color: "crimson", marginBottom: 12 }}>{err}</div>}
        {loading ? (
          <div>Loading…</div>
        ) : reports.length === 0 ? (
          <div style={{ opacity: 0.7 }}>No reports yet.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={{ ...S.th, width: 160 }}>Date</th>
                  <th style={{ ...S.th, width: 200 }}>Type</th>
                  <th style={{ ...S.th }}>Files</th>
                </tr>
              </thead>
              <tbody>
                {reports.slice(0, 10).map((r, i) => {
                  const created = r.created_at ? new Date(r.created_at as string).toLocaleString() : "—";
                  const id = (r.id as string) || `row-${i}`;
                  // merge existing links + fallbacks
                  const baseLinks = (r.links || []) as Link[];
                  const out: Link[] = []; const seen = new Set<string>();
                  const add = (label: string, url?: string) => { if (!url) return; const key = url.toLowerCase(); if (seen.has(key)) return; seen.add(key); out.push({ label, url }); };
                  for (const l of baseLinks) add(l.label, l.url);
                  const hasLabel = (lbl: string) => out.some(x => x.label.toLowerCase() === lbl.toLowerCase());
                  if (r.id) {
                    if (!hasLabel("JSON")) add("JSON", buildLink(`${base}/reports/${r.id}/json`));
                    if (!hasLabel("Canva CSV") && !hasLabel("CSV")) add("Canva CSV", buildLink(`${base}/reports/${r.id}/csv`, { variant: "canva" }));
                    if (!hasLabel("PDF")) add("PDF", buildLink(`${base}/reports/${r.id}/pdf`));
                  }
                  return (
                    <tr key={id}>
                      <td style={S.td}>{created}</td>
                      <td style={S.td}><span style={S.tag}>{r.report_type || "Report"}</span></td>
                      <td style={S.td}>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          {out.map((l, idx) => {
                            const internal = sameOrigin(l.url);
                            const fallbackName =
                              l.label.toLowerCase().includes("csv") ? `report_${id}.csv` :
                              l.label.toLowerCase().includes("json") ? `report_${id}.json` :
                              `report_${id}.pdf`;
                            return (
                              <a
                                key={idx}
                                href={l.url}
                                style={S.linkBtn}
                                onClick={(e) => { if (internal) { e.preventDefault(); openAuthed(l.url, fallbackName); } }}
                                target={internal ? undefined : "_blank"}
                                rel={internal ? undefined : "noreferrer"}
                              >
                                {l.label}
                              </a>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
