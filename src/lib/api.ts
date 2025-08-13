export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "https://api.enrich.ca";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  me: () => request<{ email: string; business_id: string; profile?: any }>("/auth/me"),
  signup: (body: any) =>
    request("/auth/signup", { method: "POST", body: JSON.stringify(body) }),
  login: (body: any) =>
    request("/auth/login", { method: "POST", body: JSON.stringify(body) }),
  logout: () => request("/auth/logout", { method: "POST" }),
  updateProfile: (body: any) =>
    request("/auth/update-profile", { method: "PATCH", body: JSON.stringify(body) }),
  generateOverview: (body: any = {}) =>
    request<{ report_id: string; csv_url?: string; json_url?: string; pdf_url?: string }>(
      "/reports/generate-business-overview",
      { method: "POST", body: JSON.stringify(body) }
    ),
  listReports: (businessId: string) =>
    request<Array<{ id: string; created_at: string; csv_url?: string; json_url?: string; pdf_url?: string }>>(
      `/reports/list/${businessId}`
    ),
};
