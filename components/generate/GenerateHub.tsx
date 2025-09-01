"use client";

import React, { useEffect, useMemo, useState } from "react";

/** ========= theme tokens ========= */
const brand = {
  primary: "#9881b8",
  secondary: "#e5c564",
  third: "#aec483",
  text: "#e9eaf0",
  sub: "#a7adbb",
  card: "#141821",
  border: "#252a34",
  bg: "#0f1115",
  light: "#ffffff",
};

/** ========= tiny UI atoms ========= */
function Card(props: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        background: brand.card,
        border: `1px solid ${brand.border}`,
        borderRadius: 16,
        padding: 18,
        ...props.style,
      }}
    >
      {props.children}
    </div>
  );
}
function SectionTitle(props: { icon?: React.ReactNode; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "14px 0 10px", ...props.style }}>
      <div style={{ fontSize: 18 }}>{props.icon ?? "📄"}</div>
      <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: brand.text }}>{props.children}</h2>
    </div>
  );
}
function Pill(props: { children: React.ReactNode; color?: string }) {
  const c = props.color ?? brand.primary;
  return (
    <span
      style={{
        border: `1px solid ${c}`,
        color: c,
        borderRadius: 999,
        padding: "6px 12px",
        fontWeight: 800,
        fontSize: 12,
      }}
    >
      {props.children}
    </span>
  );
}
function Button(props: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "solid" | "outline" | "ghost";
  color?: string;
  disabled?: boolean;
  title?: string;
  style?: React.CSSProperties;
}) {
  const color = props.color ?? brand.primary;
  const v = props.variant ?? "solid";
  const bg = v === "solid" ? color : "transparent";
  const text = v === "solid" ? "#fff" : color;
  const border = `1px ${v === "ghost" ? "dashed" : "solid"} ${color}`;
  return (
    <button
      title={props.title}
      onClick={props.onClick}
      disabled={props.disabled}
      style={{
        padding: "10px 16px",
        borderRadius: 12,
        border,
        background: props.disabled ? "#2a2f3a" : bg,
        color: props.disabled ? "#8892a0" : text,
        fontWeight: 900,
        cursor: props.disabled ? "not-allowed" : "pointer",
        ...props.style,
      }}
    >
      {props.children}
    </button>
  );
}
function Modal(props: { open: boolean; onClose: () => void; children: React.ReactNode; width?: number }) {
  if (!props.open) return null;
  return (
    <div
      onClick={props.onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "grid",
        placeItems: "center",
        zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: props.width ?? 1000,
          maxWidth: "94vw",
          maxHeight: "90vh",
          overflow: "auto",
          background: brand.bg,
          border: `1px solid ${brand.border}`,
          borderRadius: 16,
          boxShadow: "0 10px 30px rgba(0,0,0,.45)",
        }}
      >
        {props.children}
      </div>
    </div>
  );
}
function downloadBlob(filename: string, content: Blob | string, type = "text/plain") {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** ========= lightweight API helpers (no path aliases) ========= */
function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return (
    localStorage.getItem("auth_token") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("sb_access_token") ||
    localStorage.getItem("enrich_token") ||
    null
  );
}
function authHeaders(extra?: HeadersInit): HeadersInit {
  const token = getToken();
  const base: Record<string, string> = { "Content-Type": "application/json" };
  if (token) base["Authorization"] = `Bearer ${token}`;
  if (!extra) return base;
  const obj: Record<string, string> = { ...base };
  if (extra instanceof Headers) {
    extra.forEach((v, k) => (obj[k] = v));
  } else if (Array.isArray(extra)) {
    for (const [k, v] of extra) obj[k] = String(v);
  } else {
    Object.assign(obj, extra as Record<string, string>);
  }
  return obj;
}
async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const url = path.startsWith("/api") ? path : `/api${path.startsWith("/") ? path : `/${path}`}`;
  return fetch(url, { ...init, headers: authHeaders(init?.headers as any), cache: "no-store" });
}

/** ========= types ========= */
type ReportContent = {
  business_name?: string;
  contact_info?: string;
  overview?: {
    growth_transparency_info?: string;
    claim_confidence?: { unverified?: number; estimated?: number; verified?: number };
  };
  goals?: string;
  certifications?: string;
  sections?: {
    operations_information?: string;
    localimpact_information?: string;
    peoplepartners_information?: string;
    unwto_information?: string;
    ctc_information?: string;
  };
  insights?: {
    local_supplier_details?: string;
    employee_details?: string;
    economic_details?: string;
  };
  recommendations?: {
    goals?: string;
    operations?: string;
  };
};
type ReportRow = {
  id: string;
  report_type: string;
  created_at?: string;
  content: ReportContent;
  exports?: {
    pdf_url?: string;
    csv_url?: string;
    json_url?: string;
  };
};

/** ========= sample preview content (non-auth, generic) ========= */
const sampleReport: ReportRow = {
  id: "SAMPLE",
  report_type: "business_overview",
  created_at: new Date().toISOString(),
  content: {
    business_name: "Sample Business",
    contact_info: "hello@sample.biz",
    overview: {
      growth_transparency_info:
        "The business provides transparent reporting on growth drivers and maintains a healthy balance across operational KPIs.",
      claim_confidence: { unverified: 20, estimated: 35, verified: 45 },
    },
    goals: "Improve NPS by 10 points, expand into two adjacent segments, reduce churn by 2%.",
    certifications: "B-Corp in progress; ISO 14001 certified.",
    sections: {
      operations_information: "Lean process adoption across fulfillment and support.",
      localimpact_information: "Partnerships with 12 local suppliers; seasonal hiring programs.",
      peoplepartners_information: "Employee upskilling; DEI initiatives tracked quarterly.",
      unwto_information: "Tourism sustainability guidelines mapped to internal KPIs.",
      ctc_information: "Regional best-practice benchmarks applied.",
    },
    insights: {
      local_supplier_details: "78% procurement via local suppliers.",
      employee_details: "Avg. tenure 2.4 years; 11% internal mobility rate.",
      economic_details: "YoY revenue +14%; gross margin stable.",
    },
    recommendations: {
      goals: "Codify OKR cadence, publish progress monthly.",
      operations: "Automate high-variance tasks, introduce forecasting dashboard.",
    },
  },
  exports: {},
};

/** ========= feature funcs ========= */
async function generateBusinessOverview(businessId: string): Promise<{ ok: boolean; id?: string }> {
  const res = await apiFetch("/reports/generate-business-overview", {
    method: "POST",
    body: JSON.stringify({ business_id: businessId }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${text || "Internal Server Error"}`);
  try {
    const j = JSON.parse(text);
    return { ok: true, id: j?.report_id };
  } catch {
    return { ok: true };
  }
}
async function listReports(businessId: string): Promise<ReportRow[]> {
  const r = await apiFetch(`/reports/list/${encodeURIComponent(businessId)}`);
  if (!r.ok) return [];
  const data = await r.json();
  return (data?.reports as ReportRow[]) || [];
}
function toCsvFallback(obj: any): string {
  const rows: string[][] = [["key", "value"]];
  const walk = (prefix: string, v: any) => {
    if (v && typeof v === "object" && !Array.isArray(v)) {
      Object.keys(v).forEach((k) => walk(prefix ? `${prefix}.${k}` : k, v[k]));
    } else {
      rows.push([prefix, v == null ? "" : String(v)]);
    }
  };
  walk("", obj);
  return rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\r\n");
}

/** ========= preview renderer ========= */
function Preview({ report }: { report: ReportRow | null }) {
  if (!report) return <div style={{ padding: 18, color: brand.sub }}>No report yet.</div>;
  const c = report.content || {};
  const claim = c.overview?.claim_confidence || {};
  const Label = (s: string) => <div style={{ fontWeight: 900, marginBottom: 4 }}>{s}</div>;
  return (
    <div style={{ padding: 18 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto",
          gap: 12,
          alignItems: "center",
          marginBottom: 10,
          background: "#1a1f29",
          border: `1px solid ${brand.border}`,
          borderRadius: 12,
          padding: 14,
        }}
      >
        <div>
          <div style={{ fontWeight: 900, fontSize: 22 }}>{c.business_name || "BUSINESS_NAME"}</div>
          <div style={{ color: brand.sub, fontWeight: 800 }}>{c.contact_info || "CONTACT_INFO"}</div>
        </div>
        <Pill>SUMMARY</Pill>
      </div>

      <h3 style={{ textAlign: "center", marginTop: 6, marginBottom: 14, color: brand.primary, fontSize: 22 }}>
        OVERVIEW
      </h3>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Card>
          {Label("Growth Transparency")}
          <div style={{ color: brand.sub }}>
            {c.overview?.growth_transparency_info || "Growth_Transparency_Info"}
          </div>
        </Card>
        <Card>
          {Label("Claim Confidence")}
          <div style={{ color: brand.sub }}>
            {`Unverified: ${claim.unverified ?? 25}% • Estimated: ${claim.estimated ?? 35}% • Verified: ${
              claim.verified ?? 40
            }%`}
          </div>
        </Card>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
        <Card>
          {Label("Goals")}
          <div style={{ color: brand.sub }}>{c.goals || "Goal_Information"}</div>
        </Card>
        <Card>
          {Label("3rd Party Certificates")}
          <div style={{ color: brand.sub }}>{c.certifications || "Certification_Information"}</div>
        </Card>
      </div>
    </div>
  );
}

/** ========= page component ========= */
export function GenerateHub() {
  const [toast, setToast] = useState<string | null>(null);
  const [bizId, setBizId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [latestList, setLatestList] = useState<ReportRow[]>([]);
  const [open, setOpen] = useState(false);
  const [previewReport, setPreviewReport] = useState<ReportRow | null>(null); // sample or real row
  const [showDiag, setShowDiag] = useState(false);
  const [diag, setDiag] = useState<string>("• Ready.");

  const notify = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 2200);
  };

  // bootstrap identity + list
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const me = await apiFetch("/auth/me");
        const ok = me.ok;
        const m = ok ? await me.json() : null;
        const p = m?.profile || {};
        const id: string | null = p?.business_id || p?.id || p?.businessId || (p?.business?.id ?? null);
        if (live) setBizId(id);
        if (id) {
          const list = await listReports(id);
          if (live) setLatestList(list);
        }
      } catch (e: any) {
        setDiag(`bootstrap error: ${e?.message || "error"}`);
      }
    })();
    return () => {
      live = false;
    };
  }, []);

  async function refreshList() {
    if (!bizId) return;
    const list = await listReports(bizId);
    setLatestList(list);
  }

  /** === user actions === */

  // 1) View (sample): open preview with canned data (does NOT touch backend)
  function onViewSample() {
    setPreviewReport(sampleReport);
    setOpen(true);
  }

  // 2) Generate (real): calls backend for current business; no preview; adds to lists
  async function onGenerateBusinessOverview() {
    if (!bizId) {
      notify("No business profile found. Please log in again.");
      return;
    }
    setLoading(true);
    try {
      const res = await generateBusinessOverview(bizId);
      await refreshList();
      notify("Report generated");
      // Optionally: scroll to Recent Reports so the new one is visible
      const anchor = document.getElementById("recent-reports");
      if (anchor) anchor.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (e: any) {
      console.error("[generate] Error:", e);
      notify(e?.message || "Failed to generate.");
    } finally {
      setLoading(false);
    }
  }

  // 3) View a specific existing report
  function onViewExisting(r: ReportRow) {
    setPreviewReport(r);
    setOpen(true);
  }

  // helpers for downloads per report row (use URLs if present; else fallback)
  function jsonDownloadFor(r: ReportRow) {
    if (r.exports?.json_url) { window.open(r.exports.json_url, "_blank", "noopener"); return; }
    if (r.content) downloadBlob(`business_overview_${r.id}.json`, JSON.stringify(r.content, null, 2), "application/json");
  }
  function csvDownloadFor(r: ReportRow) {
    if (r.exports?.csv_url) { window.open(r.exports.csv_url, "_blank", "noopener"); return; }
    if (r.content) downloadBlob(`business_overview_${r.id}.csv`, toCsvFallback(r.content), "text/csv");
  }
  function pdfOpenFor(r: ReportRow) {
    if (r.exports?.pdf_url) window.open(r.exports.pdf_url, "_blank", "noopener");
  }

  /** === derived === */
  const latest = latestList[0] ?? null;

  /** === layout === */
  return (
    <div style={{ color: brand.text }}>
      {/* header */}
      <div style={{ marginBottom: 14, display: "grid", gridTemplateColumns: "1fr auto", alignItems: "center", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900 }}>Generate Report</h1>
          <div style={{ color: brand.sub, marginTop: 6 }}>
            Create comprehensive reports with AI-powered insights and analysis
          </div>
        </div>
        {/* Dedicated GENERATE action (real) */}
        <div style={{ display: "flex", gap: 10 }}>
          <Button onClick={onGenerateBusinessOverview} disabled={loading} style={{ minWidth: 150 }}>
            {loading ? "Generating…" : "Generate"}
          </Button>
          <Button variant="outline" onClick={onViewSample} title="Preview a generic sample">
            Preview
          </Button>
        </div>
      </div>

      {/* Popular Reports row */}
      <SectionTitle icon="📈">Popular Reports</SectionTitle>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
          gap: 16,
          marginBottom: 18,
        }}
      >
        {/* Business Overview CARD — button is now VIEW (sample) */}
        <Card>
          <div style={{ display: "grid", gridTemplateColumns: "64px 1fr auto", gap: 14, alignItems: "center" }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 14,
                background: "#2b2437",
                display: "grid",
                placeItems: "center",
                color: brand.primary,
                fontSize: 22,
                fontWeight: 900,
              }}
            >
              📊
            </div>
            <div>
              <div style={{ fontWeight: 900, fontSize: 22 }}>Business Overview</div>
              <div style={{ color: brand.sub, marginTop: 6, fontSize: 18, lineHeight: 1.4 }}>
                Comprehensive analysis of performance and key metrics
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
                <Pill>Revenue Growth</Pill>
                <Pill>Market Share</Pill>
                <Pill>Operational Efficiency</Pill>
              </div>
            </div>
            <div>
              <Button variant="outline" onClick={onViewSample} title="Preview a sample">
                View
              </Button>
            </div>
          </div>
        </Card>

        {/* placeholders unchanged */}
        <Card>
          <div style={{ display: "grid", gridTemplateColumns: "64px 1fr auto", gap: 14, alignItems: "center" }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 14,
                background: "#273026",
                display: "grid",
                placeItems: "center",
                color: brand.third,
                fontSize: 22,
                fontWeight: 900,
              }}
            >
              🌍
            </div>
            <div>
              <div style={{ fontWeight: 900, fontSize: 18 }}>Local Impact</div>
              <div style={{ color: brand.sub, marginTop: 6 }}>
                Community engagement and local market influence assessment
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                <Pill color={brand.third}>Community Reach</Pill>
                <Pill color={brand.third}>Local Partnerships</Pill>
                <Pill color={brand.third}>Regional Growth</Pill>
              </div>
            </div>
            <div>
              <Button variant="outline" color={brand.third} onClick={() => setToast("Coming soon")}>
                View
              </Button>
            </div>
          </div>
        </Card>

        <Card>
          <div style={{ display: "grid", gridTemplateColumns: "64px 1fr auto", gap: 14, alignItems: "center" }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 14,
                background: "#322b1c",
                display: "grid",
                placeItems: "center",
                color: brand.secondary,
                fontSize: 22,
                fontWeight: 900,
              }}
            >
              ⚡
            </div>
            <div>
              <div style={{ fontWeight: 900, fontSize: 18 }}>Energy &amp; Resources</div>
              <div style={{ color: brand.sub, marginTop: 6 }}>
                Sustainability metrics and resource utilization analysis
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                <Pill color={brand.secondary}>Energy Efficiency</Pill>
                <Pill color={brand.secondary}>Carbon Footprint</Pill>
                <Pill color={brand.secondary}>Resource Usage</Pill>
              </div>
            </div>
            <div>
              <Button variant="outline" color={brand.secondary} onClick={() => setToast("Coming soon")}>
                View
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Report Builder (layout only) */}
      <SectionTitle icon="⚙️">Report Builder</SectionTitle>
      <Card>
        <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 6 }}>Custom Report Configuration</div>
        <div style={{ color: brand.sub, marginBottom: 12 }}>
          Configure your report parameters and generate a custom analysis
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
          {["Report Type", "Time Period", "Focus Topics", "Output Format"].map((label) => (
            <div key={label}>
              <div style={{ fontWeight: 900, marginBottom: 6 }}>{label}</div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  border: `1px solid ${brand.border}`,
                  borderRadius: 12,
                  padding: "0 10px",
                  background: "#0f1115",
                }}
              >
                <select
                  defaultValue=""
                  style={{
                    appearance: "none",
                    width: "100%",
                    padding: "12px 8px",
                    background: "transparent",
                    color: brand.sub,
                    border: "none",
                    outline: "none",
                    fontWeight: 700,
                  }}
                >
                  <option value="">Select</option>
                </select>
                <span style={{ color: brand.sub, fontSize: 12, marginLeft: 8 }}>▾</span>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 14 }}>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              border: `1px solid ${brand.border}`,
              borderRadius: 12,
              padding: 12,
              cursor: "pointer",
            }}
          >
            <span style={{ fontSize: 18 }}>🖼️</span>
            <input type="checkbox" defaultChecked style={{ width: 18, height: 18 }} />
            <div style={{ fontWeight: 800 }}>Include charts, graphs, and visual analytics</div>
          </label>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              border: `1px solid ${brand.border}`,
              borderRadius: 12,
              padding: 12,
              cursor: "pointer",
            }}
          >
            <span style={{ fontSize: 18 }}>💬</span>
            <input type="checkbox" defaultChecked style={{ width: 18, height: 18 }} />
            <div style={{ fontWeight: 800 }}>Add contextual questions and AI insights</div>
          </label>
        </div>

        <div style={{ marginTop: 14 }}>
          <div style={{ fontWeight: 900, marginBottom: 6 }}>Custom Requirements</div>
          <textarea
            rows={6}
            placeholder="Describe any specific requirements, focus areas, or questions you'd like the report to address..."
            style={{
              width: "100%",
              resize: "vertical",
              border: `1px solid ${brand.border}`,
              borderRadius: 12,
              padding: 12,
              background: "#0f1115",
              color: brand.text,
            }}
          />
        </div>

        <div style={{ marginTop: 14 }}>
          <div style={{ fontWeight: 900, marginBottom: 6 }}>Report Title</div>
          <input
            placeholder="Enter a custom title for your report"
            style={{
              width: "100%",
              border: `1px solid ${brand.border}`,
              borderRadius: 12,
              padding: 12,
              background: "#0f1115",
              color: brand.text,
              fontWeight: 700,
            }}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", alignItems: "center", gap: 12, marginTop: 16 }}>
          <div style={{ color: brand.sub }}>Estimated generation time: 2–5 minutes</div>
          <div style={{ display: "flex", gap: 10 }}>
            <Button variant="outline" onClick={() => setToast("Template saving coming soon")}>
              Save as Template
            </Button>
            <Button variant="ghost" onClick={() => setToast("Use the Generate button at the top-right for now")}>
              Generate Report
            </Button>
          </div>
        </div>
      </Card>

      {/* Recent Reports */}
      <SectionTitle icon="🕘" style={{ marginTop: 18 }}>
        Recent Reports
      </SectionTitle>
      <div id="recent-reports" />
      <Card>
        {latestList.length === 0 ? (
          <div style={{ color: brand.sub }}>No reports yet. Generate one to see it here.</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {latestList.map((r, i) => {
              const created = r.created_at ? new Date(r.created_at).toLocaleString() : "—";
              const canPdf = !!r.exports?.pdf_url;
              const canCsv = !!r.exports?.csv_url || !!r.content;
              const canJson = !!r.exports?.json_url || !!r.content;
              return (
                <div
                  key={r.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto auto",
                    gap: 12,
                    alignItems: "center",
                    padding: 10,
                    borderTop: i === 0 ? "none" : `1px solid ${brand.border}`,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 900 }}>{r.report_type.replaceAll("_", " ")}</div>
                    <div style={{ color: brand.sub, marginTop: 2, fontSize: 12 }}>Created {created}</div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <Button variant="outline" onClick={() => onViewExisting(r)}>
                      View
                    </Button>
                    <div style={{ position: "relative" }}>
                      {/* Simple downloads menu: 3 inline buttons for now */}
                      <Button variant="outline" onClick={() => jsonDownloadFor(r)} disabled={!canJson}>
                        JSON
                      </Button>
                      <Button variant="outline" onClick={() => csvDownloadFor(r)} disabled={!canCsv}>
                        CSV
                      </Button>
                      <Button variant="outline" onClick={() => pdfOpenFor(r)} disabled={!canPdf}>
                        PDF
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Trending Topics */}
      <SectionTitle icon="📊" style={{ marginTop: 18 }}>
        Trending Topics
      </SectionTitle>
      <Card>
        {[
          { label: "AI Integration", tag: "Hot", change: "+24%" },
          { label: "Supply Chain Resilience", tag: "Rising", change: "+18%" },
          { label: "Sustainability Reporting", tag: "Trending", change: "+15%" },
          { label: "Digital Transformation", tag: "Popular", change: "+12%" },
          { label: "ESG Compliance", tag: "Growing", change: "+9%" },
        ].map((t, i) => (
          <div
            key={t.label}
            style={{
              display: "grid",
              gridTemplateColumns: "auto 1fr auto auto",
              alignItems: "center",
              gap: 12,
              padding: "10px 6px",
              borderTop: i === 0 ? "none" : `1px solid ${brand.border}`,
            }}
          >
            <div style={{ width: 10, height: 10, borderRadius: 999, background: brand.primary }} />
            <div style={{ fontWeight: 800 }}>{t.label}</div>
            <span
              style={{
                justifySelf: "start",
                background: "#2b2437",
                color: brand.primary,
                border: `1px solid ${brand.primary}`,
                borderRadius: 999,
                padding: "4px 10px",
                fontSize: 12,
                fontWeight: 900,
              }}
            >
              {t.tag}
            </span>
            <div style={{ color: brand.secondary, fontWeight: 900 }}>{t.change}</div>
          </div>
        ))}
      </Card>

      {/* Industry Updates */}
      <SectionTitle icon="🌿" style={{ marginTop: 18 }}>
        Industry Updates
      </SectionTitle>
      <Card>
        {[
          { title: "New ESG Disclosure Requirements", cat: "Regulatory", time: "2 hours ago" },
          { title: "AI Ethics Guidelines Released", cat: "Technology", time: "1 day ago" },
          { title: "Global Supply Chain Index Update", cat: "Market Data", time: "3 days ago" },
        ].map((u, i) => (
          <div key={u.title} style={{ padding: "14px 6px", borderTop: i === 0 ? "none" : `1px solid ${brand.border}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 4, height: 32, background: brand.third, borderRadius: 4 }} />
              <div style={{ fontWeight: 900 }}>{u.title}</div>
              <span
                style={{
                  marginLeft: "auto",
                  background: "#2a281e",
                  border: `1px solid ${brand.secondary}`,
                  color: "#f3e2a4",
                  padding: "4px 10px",
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 900,
                }}
              >
                {u.cat}
              </span>
            </div>
            <div style={{ color: brand.sub, marginLeft: 14, marginTop: 6 }}>🕒 {u.time}</div>
          </div>
        ))}
      </Card>

      {/* Suggested Updates */}
      <SectionTitle icon="📅" style={{ marginTop: 18 }}>
        Suggested Updates
      </SectionTitle>
      <Card>
        {[
          { title: "Q3 Financial Performance Report", sub: "Quarterly deadline approaching", days: "45 days ago", dot: "#e04a59" },
          { title: "Customer Satisfaction Analysis", sub: "New survey data available", days: "32 days ago", dot: "#d2b24a" },
          { title: "Market Competitive Analysis", sub: "Industry shifts detected", days: "28 days ago", dot: "#8cb874" },
        ].map((s, i) => (
          <div
            key={s.title}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto",
              gap: 12,
              alignItems: "center",
              padding: 14,
              borderRadius: 12,
              borderTop: i === 0 ? "none" : `1px solid ${brand.border}`,
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 10, height: 10, borderRadius: 999, background: s.dot }} />
                <div style={{ fontWeight: 900 }}>{s.title}</div>
              </div>
              <div style={{ color: brand.sub, marginLeft: 20, marginTop: 6 }}>{s.sub}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ color: brand.sub }}>{s.days}</div>
              <Button variant="outline" onClick={() => setToast("Update flow will be wired later.")}>
                Update
              </Button>
            </div>
          </div>
        ))}
      </Card>

      {/* modal for sample or existing report */}
      <Modal open={open} onClose={() => setOpen(false)}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto",
            alignItems: "center",
            padding: 12,
            borderBottom: `1px solid ${brand.border}`,
          }}
        >
          <div style={{ fontWeight: 900, fontSize: 18 }}>
            {previewReport?.id === "SAMPLE" ? "Business Overview – Sample Preview" : "Business Overview – Preview"}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Button
              variant="outline"
              onClick={() => {
                if (!previewReport) return;
                if (previewReport.exports?.json_url) window.open(previewReport.exports.json_url, "_blank", "noopener");
                else if (previewReport.content)
                  downloadBlob(
                    `business_overview_${previewReport.id}.json`,
                    JSON.stringify(previewReport.content, null, 2),
                    "application/json"
                  );
              }}
              disabled={!previewReport}
            >
              JSON
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (!previewReport) return;
                if (previewReport.exports?.csv_url) window.open(previewReport.exports.csv_url, "_blank", "noopener");
                else if (previewReport.content)
                  downloadBlob(`business_overview_${previewReport.id}.csv`, toCsvFallback(previewReport.content), "text/csv");
              }}
              disabled={!previewReport}
            >
              Canva CSV
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (!previewReport) return;
                if (previewReport.exports?.pdf_url) window.open(previewReport.exports.pdf_url, "_blank", "noopener");
              }}
              disabled={!previewReport?.exports?.pdf_url}
            >
              PDF
            </Button>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Close
            </Button>
          </div>
        </div>
        <Preview report={previewReport} />
      </Modal>

      {/* diagnostics toggle (unchanged) */}
      <div style={{ marginTop: 18 }}>
        <Button variant="ghost" onClick={() => setShowDiag(!showDiag)}>{showDiag ? "Hide" : "Show"} Diagnostics</Button>
        {showDiag && (
          <Card style={{ marginTop: 10 }}>
            <div style={{ fontWeight: 900, marginBottom: 8 }}>Diagnostics</div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Button
                variant="outline"
                onClick={async () => {
                  const t = getToken();
                  setDiag(`Token present: ${!!t} (len=${t?.length ?? 0})`);
                }}
              >
                Token?
              </Button>
              <Button
                variant="outline"
                onClick={async () => {
                  const r = await apiFetch("/auth/me");
                  setDiag(`[auth/me] ${r.status} ${r.ok ? "OK" : "ERR"} : ${await r.text()}`);
                }}
              >
                /auth/me
              </Button>
              <Button
                variant="outline"
                onClick={async () => {
                  if (!bizId) {
                    setDiag("No business id yet");
                    return;
                  }
                  const r = await apiFetch(`/reports/list/${encodeURIComponent(bizId)}`);
                  setDiag(`[list] ${r.status} ${r.ok ? "OK" : "ERR"} : ${(await r.text()).slice(0, 250)}…`);
                }}
              >
                /reports/list
              </Button>
              <Button
                variant="outline"
                onClick={async () => {
                  if (!bizId) {
                    setDiag("No business id yet");
                    return;
                  }
                  const r = await apiFetch("/reports/generate-business-overview", {
                    method: "POST",
                    body: JSON.stringify({ business_id: bizId }),
                  });
                  setDiag(`[generate] ${r.status} ${r.ok ? "OK" : "ERR"} : ${(await r.text()).slice(0, 250)}…`);
                }}
              >
                generate
              </Button>
              <Button
                variant="outline"
                onClick={async () => {
                  await refreshList();
                  setDiag("Refreshed latest list");
                }}
              >
                refresh list
              </Button>
              <Button variant="outline" onClick={() => { if (latest) onViewExisting(latest); }} disabled={!latest}>
                open latest preview
              </Button>
            </div>
            <pre style={{ marginTop: 10, whiteSpace: "pre-wrap", color: brand.sub }}>{diag}</pre>
          </Card>
        )}
      </div>

      {/* toast */}
      {toast && (
        <div
          role="status"
          style={{
            position: "fixed",
            right: 16,
            bottom: 16,
            background: "#2b2437",
            border: `1px solid ${brand.border}`,
            color: brand.light,
            padding: "10px 12px",
            borderRadius: 10,
            maxWidth: 520,
            boxShadow: "0 6px 20px rgba(0,0,0,0.4)",
            zIndex: 1000,
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
