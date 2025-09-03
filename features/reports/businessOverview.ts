import { apiFetch } from "../../lib/api";

export async function generateBusinessOverview(businessId: string): Promise<void> {
  const res = await apiFetch("/reports/generate-business-overview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ business_id: businessId }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Generate failed: ${res.status} ${txt.slice(0, 500)}`);
  }
}

export const SAMPLE_PREVIEW = {
  title: "Business Overview",
  summary: "Snapshot of performance & sustainability posture.",
  kpis: [
    { label: "Revenue Growth", value: "12% YoY" },
    { label: "Market Share", value: "7.4%" },
  ],
  recommendations: [
    "Expand local partnerships",
    "Publish quarterly sustainability updates",
  ],
  exports: { pdf: null as any, json: null as any, csv: null as any },
};
