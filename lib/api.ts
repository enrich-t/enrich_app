export async function fetcher(url: string, options: RequestInit = {}) {
  const res = await fetch(url, options);
  if (!res.ok) {
    // try to extract server message, but still include status
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
  return res.json();
}
