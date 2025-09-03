import { ENV, assertEnv } from "./env";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export async function api<T = unknown>(
  path: string,
  opts: { method?: HttpMethod; body?: any; authToken?: string } = {}
): Promise<T> {
  assertEnv();
  const url = `${ENV.API_BASE.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (opts.authToken) headers.Authorization = `Bearer ${opts.authToken}`;

  const res = await fetch(url, {
    method: opts.method ?? "GET",
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    // Avoid caching surprises during generate
    cache: "no-store",
  });

  let data: any = null;
  try { data = await res.json(); } catch { /* ignore */ }

  if (!res.ok) {
    const msg = (data && (data.error || data.message)) || res.statusText;
    throw new Error(`API ${res.status} ${url} → ${msg}`);
  }
  return (data ?? {}) as T;
}

// Domain helpers
export async function generateBusinessOverview(body: { business_id: string; report_type: string }, authToken?: string) {
  return api("reports/generate-business-overview", { method: "POST", body, authToken });
}
