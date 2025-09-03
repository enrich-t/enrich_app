export function getToken(): string | null {
  try { return typeof window !== "undefined" ? localStorage.getItem("auth_token") : null; } catch { return null; }
}

export function getBusinessId(): string | null {
  // Fallback to env if not saved after login
  try {
    const fromStorage = typeof window !== "undefined" ? localStorage.getItem("business_id") : null;
    if (fromStorage) return fromStorage;
  } catch {}
  return (process.env.NEXT_PUBLIC_BUSINESS_ID as string) || null;
}
