'use client';

export async function fetchCredits(token?: string | null): Promise<number | null> {
  try {
    const res = await fetch('/api/ai-credits', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (typeof data?.remaining === 'number') return data.remaining;
    if (typeof data?.ai_credits?.remaining === 'number') return data.ai_credits.remaining;
    if (typeof data?.credits?.remaining === 'number') return data.credits.remaining;
    return null;
  } catch {
    return null;
  }
}

export function writeCreditsEverywhere(remaining: number | null) {
  try {
    if (typeof remaining === 'number') localStorage.setItem('ai_credits', String(remaining));
    // Sidebar listens for this custom event name
    window.dispatchEvent(new Event('ai:credits'));
  } catch {}
}
