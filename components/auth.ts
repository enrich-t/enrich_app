export function getToken(): string | null {
  try { return typeof window !== "undefined" ? localStorage.getItem("auth_token") : null; } catch { return null; }
}

export function getBusinessId(): string | null {
  try {
    const fromStorage = typeof window !== "undefined" ? localStorage.getItem("business_id") : null;
    if (fromStorage) return fromStorage;
  } catch {}
  return (process.env.NEXT_PUBLIC_BUSINESS_ID as string) || null;
}

/** Read a Response safely. If JSON parse fails, returns the raw text. */
export async function safeJson<T = any>(res: Response): Promise<T> {
  const txt = await (res as any).text?.();
  try { return JSON.parse(txt ?? ""); } catch { return (txt as unknown) as T; }
}
