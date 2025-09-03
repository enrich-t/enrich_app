/**
 * Fails the build if:
 *  - Required env vars are missing
 *  - Backend /reports/generate-business-overview is not reachable or returns !2xx
 */
const required = ["NEXT_PUBLIC_API_BASE_URL"];
for (const k of required) {
  if (!process.env[k] || String(process.env[k]).trim() === "") {
    console.error(`[prebuild] Missing env: ${k}`);
    process.exit(1);
  }
}

const API_BASE = String(process.env.NEXT_PUBLIC_API_BASE_URL).replace(/\/$/, "");
const url = `${API_BASE}/reports/generate-business-overview`;
const payload = { business_id: "prebuild-check", report_type: "business-overview" };

(async () => {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // No auth by default; if your backend requires auth, set it via env and header below.
      // headers: { Authorization: `Bearer ${process.env.GENERATE_TOKEN}` },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`[prebuild] Generate failed: ${res.status} ${res.statusText}\n${body}`);
      process.exit(1);
    } else {
      console.log("[prebuild] Generate endpoint reachable ✅");
      process.exit(0);
    }
  } catch (e) {
    console.error("[prebuild] Generate request errored:", e?.message || e);
    process.exit(1);
  }
})();
