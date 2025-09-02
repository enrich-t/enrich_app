// lib/api.ts
export async function apiFetch(
  path: string,
  init: RequestInit = {}
): Promise<{ ok: boolean; status: number; json?: any; text?: string }> {
  const url = path.startsWith("http") ? path : path.startsWith("/") ? path : `/${path}`;

  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string>),
  };

  // Default JSON for non-GET if no body provided
  const hasBody = typeof init.body !== "undefined";
  const method = (init.method || "GET").toUpperCase();
  if (method !== "GET" && !hasBody) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(url, {
    ...init,
    headers,
    // include cookies for /api/auth/me & any session backed flows
    credentials: "include",
    cache: "no-store",
  });

  const ct = res.headers.get("content-type") || "";
  let payload: any = undefined;

  try {
    if (ct.includes("application/json")) {
      payload = await res.json();
    } else {
      payload = await res.text();
    }
  } catch {
    // ignore parse errors; payload stays undefined
  }

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
