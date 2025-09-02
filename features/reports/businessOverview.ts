import { apiFetch } from "../../lib/api";

export async function generateBusinessOverview(): Promise<{ ok: boolean; id?: string; message?: string }> {
  // get business id from current session
  const me = await apiFetch("/auth/me");
  if (!me.ok) {
    const t = await me.text();
    return { ok: false, message: `auth/me failed: ${me.status} ${t}` };
  }
  const data = await me.json();
  const prof = data?.profile || {};
  const bizId: string | null =
    prof.business_id || prof.id || prof.businessId || (prof.business?.id ?? null);

  if (!bizId) return { ok: false, message: "No business id found for current user." };

  const r = await apiFetch("/reports/generate-business-overview", {
    method: "POST",
    body: JSON.stringify({ business_id: bizId }),
  });
  const text = await r.text();
  if (!r.ok) return { ok: false, message: `${r.status} ${text || "Internal Server Error"}` };

  try {
    const j = JSON.parse(text);
    return { ok: true, id: j?.report_id };
  } catch {
    return { ok: true };
  }
}

/**
 * Returns a simple HTML Blob to preview a SAMPLE report (not tied to any business).
 * GenerateHub uses this to open an in-page preview via object URL.
 */
export async function sampleBusinessOverviewPreview(): Promise<{ blob: Blob }> {
  const html = `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8"/>
      <meta name="viewport" content="width=device-width,initial-scale=1"/>
      <title>Business Overview – Sample Preview</title>
      <style>
        :root { color-scheme: dark; }
        body { margin: 0; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; background:#0f1115; color:#e9eaf0; }
        .wrap { max-width: 980px; margin: 24px auto; padding: 16px; }
        .card { background:#141821; border:1px solid #252a34; border-radius:16px; padding:18px; margin-bottom:16px; }
        h1 { font-size: 28px; margin: 0 0 8px; }
        h2 { font-size: 18px; margin: 0 0 8px; }
        .row { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
        .pill { display:inline-block; border:1px solid #9881b8; color:#9881b8; border-radius:999px; padding:6px 10px; font-weight:800; font-size:12px; }
        .muted { color:#a7adbb; }
      </style>
    </head>
    <body>
      <div class="wrap">
        <h1>Business Overview — Sample Preview</h1>
        <div class="card">
          <h2>Summary</h2>
          <div class="muted">Sample Business • hello@sample.biz</div>
        </div>

        <div class="row">
          <div class="card">
            <h2>Growth Transparency</h2>
            <div class="muted">Transparent reporting on growth drivers; balanced KPI mix.</div>
          </div>
          <div class="card">
            <h2>Claim Confidence</h2>
            <div class="muted">Unverified: 20% • Estimated: 35% • Verified: 45%</div>
          </div>
        </div>

        <div class="row">
          <div class="card">
            <h2>Goals</h2>
            <div class="muted">Improve NPS; expand segments; reduce churn.</div>
          </div>
          <div class="card">
            <h2>3rd Party Certificates</h2>
            <div class="muted">B-Corp (in progress); ISO 14001 certified.</div>
          </div>
        </div>

        <div class="card">
          <span class="pill">Revenue Growth</span>
          <span class="pill">Market Share</span>
          <span class="pill">Operational Efficiency</span>
        </div>
      </div>
    </body>
  </html>`;
  return { blob: new Blob([html], { type: "text/html;charset=utf-8" }) };
}
