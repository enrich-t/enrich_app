export type ApiInit = RequestInit & { noAuthRedirect?: boolean };

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE ?? "").replace(/\/$/, "");

function buildUrl(path: string) {
  return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Raw fetch (returns Response). Safe for callers that do .text() / .json() manually */
export async function apiFetch(path: string, init: ApiInit = {}): Promise<Response> {
  const { noAuthRedirect, ...rest } = init; // accept & ignore custom flag
  const url = buildUrl(path);
  const headers = {
    "Content-Type": "application/json",
    ...(rest.headers as Record<string, string> | undefined),
  };
  return fetch(url, { ...rest, headers });
}

/** Convenience helper that returns parsed JSON (or text fallback) and throws on !ok */
export async function apiJson<T = any>(path: string, init: ApiInit = {}): Promise<T> {
  const res = await apiFetch(path, init);
  if (!res.ok) {
    let msg = `API error: ${res.status}`;
    try {
      const data = await res.json();
      if (data && (data.message || data.detail)) msg += ` - ${data.message ?? data.detail}`;
    } catch {
      try {
        const txt = await res.text();
        if (txt) msg += ` - ${txt}`;
      } catch {}
    }
    throw new Error(msg);
  }
  const ct = res.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) return res.json();
  return (await res.text()) as unknown as T;
}

/** Wrapper used by /app/generate/page.tsx */
export async function generateBusinessOverview(payload: unknown) {
  return apiJson("/reports/overview/generate", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export default { apiFetch, apiJson, generateBusinessOverview };
