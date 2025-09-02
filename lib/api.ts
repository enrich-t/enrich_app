/** Lightweight client helpers (no path aliases). */

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return (
    localStorage.getItem("auth_token") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("sb_access_token") ||
    localStorage.getItem("enrich_token") ||
    null
  );
}

export function authHeaders(extra?: HeadersInit): HeadersInit {
  const token = getToken();
  const base: Record<string, string> = { "Content-Type": "application/json" };
  if (token) base["Authorization"] = `Bearer ${token}`;

  if (!extra) return base;

  const out: Record<string, string> = { ...base };
  if (extra instanceof Headers) {
    extra.forEach((v, k) => (out[k] = v));
  } else if (Array.isArray(extra)) {
    for (const [k, v] of extra) out[k] = String(v);
  } else {
    Object.assign(out, extra as Record<string, string>);
  }
  return out;
}

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const url = path.startsWith("/api") ? path : `/api${path.startsWith("/") ? path : `/${path}`}`;
  return fetch(url, { ...init, headers: authHeaders(init?.headers as any), cache: "no-store" });
}

/** Shared download helper for JSON/CSV/etc. */
export function downloadBlob(filename: string, content: Blob | string, type = "text/plain") {
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
