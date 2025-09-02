// features/reports/businessOverview.ts
import { apiFetch } from "../../lib/api";

export async function generateBusinessOverview(): Promise<{ ok: true } | { ok: false; message: string }> {
  // POST body can be extended later (e.g., options, title, etc.)
  const r = await apiFetch("/api/reports/generate-business-overview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });

  if (!r.ok) {
    const message =
      (r.json && (r.json.message || r.json.detail?.message)) ||
      (typeof r.text === "string" && r.text) ||
      `HTTP ${r.status}`;
    return { ok: false, message };
  }

  return { ok: true };
}

export async function sampleBusinessOverviewPreview(): Promise<{ blob: Blob }> {
  // For now we return a small HTML stub to preview in the modal.
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Sample</title></head>
  <body style="font-family:system-ui;padding:24px;background:#fff;color:#111">
    <h1 style="margin:0 0 8px">Business Overview (Sample Preview)</h1>
    <p style="margin:0 0 16px;color:#555">This is a sample preview. The real "Generate" action stores and lists a report for the logged-in business.</p>
    <hr/>
    <p>Brand colors and layout placeholder here…</p>
  </body></html>`;
  return { blob: new Blob([html], { type: "text/html" }) };
}
