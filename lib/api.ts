/* lib/api.ts */
function findAccessToken(): string | null {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i) || "";
      if (k.startsWith("sb-") && k.endsWith("-auth-token")) {
        const raw = localStorage.getItem(k);
        if (!raw) continue;
        try {
          const obj = JSON.parse(raw);
          const s = obj?.currentSession || obj?.session || obj;
          const t = s?.access_token || s?.accessToken || obj?.access_token;
          if (typeof t === "string" && t.length > 10) return t;
        } catch {}
      }
    }
    const fallbacks = ["access_token", "auth_token", "token", "ENRICH_TOKEN"];
    for (const k of fallbacks) {
      const t = localStorage.getItem(k);
      if (t && t.length > 10) return t;
    }
  } catch {}
  return null;
}

export async function apiFetch(
  path: string,
  init: RequestInit = {}
): Promise<{ ok: boolean; status: number; json?: any; text?: string }> {
  const url = path.startsWith("http") ? path : path.startsWith("/") ? path : `/${path}`;

  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string>),
  };

  if (!headers["Authorization"]) {
    const token = typeof window !== "undefined" ? findAccessToken() : null;
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const method = (init.method || "GET").toUpperCase();
  const hasBody = typeof init.body !== "undefined";
  if (method !== "GET" && !hasBody && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(url, {
    ...init,
    headers,
    credentials: "include",
    cache: "no-store",
  });

  const ct = res.headers.get("content-type") || "";
  let payload: any = undefined;
  try {
    payload = ct.includes("application/json") ? await res.json() : await res.text();
  } catch {}

  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      ...(typeof payload === "string" ? { text: payload } : { json: payload }),
    };
  }

  return {
    ok: true,
    status: res.status,
    ...(typeof payload === "string" ? { text: payload } : { json: payload }),
  };
}

export function downloadBlob(filename: string, blob: Blob, mime = "application/octet-stream") {
  const b = new Blob([blob], { type: mime });
  const url = URL.createObjectURL(b);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
