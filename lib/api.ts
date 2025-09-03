export async function fetcher(url: string, options: RequestInit = {}) {
  const res = await fetch(url, options);
  if (!res.ok) {
    let msg = `API error: ${res.status}`;
    try {
      const data = await res.json();
      if (data && (data.message || data.detail)) {
        msg += ` - ${data.message ?? data.detail}`;
      }
    } catch {
      try {
        const txt = await res.text();
        if (txt) msg += ` - ${txt}`;
      } catch {}
    }
    throw new Error(msg);
  }
  // Try JSON first; fall back to text
  try {
    return await res.json();
  } catch {
    return await res.text();
  }
}

/** Base URL for your FastAPI backend */
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "") ?? "";

export async function apiFetch(path: string, init: RequestInit = {}) {
  const url = `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
  const headers = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> | undefined),
  };
  return fetcher(url, { ...init, headers });
}

/** Minimal wrapper for the Business Overview generate endpoint */
export async function generateBusinessOverview(payload: unknown) {
  return apiFetch("/reports/overview/generate", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export default { fetcher, apiFetch, generateBusinessOverview };
