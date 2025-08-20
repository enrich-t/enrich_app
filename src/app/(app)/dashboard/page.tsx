"use client";
import { useEffect, useMemo, useState } from "react";

type Link = { label: string; url: string };
type Report = { id?: string; report_type?: string; created_at?: string; links?: Link[]; [k: string]: unknown };
type Profile = { id?: string; user_id?: string; business_name?: string; size?: string | null; [k: string]: unknown };

/* ---------- helpers: data shaping ---------- */
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
      const fn = u.searchParams.get("filename") || u.searchParams.get("download") || u.searchParams.get("name");
      if (fn && fn.toLowerCase().endsWith(".pdf")) return true;
    } catch {}
    if (labelMaybe && /pdf/i.test(labelMaybe)) return true;
    return false;
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

    // links in strict order, dedup by URL
    const out: Link[] = [];
    const seen = new Set<string>();
    const add = (label: string, url?: string) => { if (!url) return; const key = url.toLowerCase(); if (seen.has(key)) return; seen.add(key); out.push({ label, url }); };
    add("JSON", jsonUrl);
    add("Canva CSV", canvaCsv);
    if (!out.find(l => l.label === "Canva CSV")) add("CSV", csvUrl);
    add("PDF", pdfUrl);

    return { id, created_at, report_type, links: out, ...r };
  });
}

/* ---------- tiny UI kit (inline styles so no Tailwind issues) ---------- */
const S = {
  page: { fontFamily: "Inter, ui-sans-serif, system-ui, Arial", maxWidth: 1100, margin: "24px auto", padding: "0 16px" },
  row: { display: "grid", gap: 16 },
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
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = Math.max(0, Math.min(100, percent)) / 100 * c;
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
  const [debugOpen, setDebugOpen] = useState(false);
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const [credits, setCredits] = useState<number>(() => {
    const v = Number(localStorage.getItem("enrich_credits") || "100"); return Number.isFinite(v) ? v : 100;
  });
  const dlog = (s: string) => setDebugLog((p) => [...p, s]);

  useEffect(() => {
    try {
      setToken(localStorage.getItem("enrich_access"));
      const u = localStorage.getItem("enrich_user"); setEmail(u ? (JSON.parse(u).email as string) : null);
    } catch {}
  }, []);

  const sameOrigin = (url: string) => {
    try { const u = new URL(url); const b = new URL(base); return u.origin === b.origin; } catch { return false; }
  };

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
        dlog(`GET ${t.label} → ${t.url}`);
        const res = await fetch(t.url, { headers: { Authorization: `Bearer ${token}` } });
        const text = await res.text(); dlog(`↳ ${res.status} ${res.ok ? "OK" : "ERR"} · ${text.slice(0, 140)}${text.length > 140 ? "…" : ""}`);
        if (!res.ok) continue;
        const parsed = text ? JSON.parse(text) : {}; const list = normalizeReports(parsed);
        if (Array.isArray(list)) return list;
      } catch (e: any) { dlog(`⚠ ${t.label} failed: ${e?.message || e}`); }
    }
    return [];
  }

  async function fetchProfileAndReports() {
    if (!token) return;
    setLoading(true); setErr(null); setDebugLog([]);
    try {
      dlog(`GET /auth/me`);
      const meRes = await fetch(`${base}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
      const meText = await res.text(); // <-- will be fixed below
    } catch {}
  }
}
