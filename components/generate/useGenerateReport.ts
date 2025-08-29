'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '../../components/Toast';
import { COST_PER_REPORT } from './reports-registry';

type GenerateOk = {
  success?: boolean;
  report_id?: string;
  remaining_ai_credits?: number;
  ai_credits?: { remaining?: number };
  data?: { report_id?: string; ai_credits?: { remaining?: number } };
  detail?: { ok?: boolean; code?: string; message?: string };
};

const getBusinessId = () => process.env.NEXT_PUBLIC_BUSINESS_ID ?? null;

/** Try a few common localStorage keys, including Supabase blob */
function findToken(): string | null {
  try {
    // direct keys first
    const candidates = ['apiToken', 'api_token', 'access_token', 'sb-access-token', 'token'];
    for (const k of candidates) {
      const v = localStorage.getItem(k);
      if (v && v.length > 10) return v;
    }
    // any JWT-looking value
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)!;
      const val = localStorage.getItem(key);
      if (val && /[\w-]+\.[\w-]+\.[\w-]+/.test(val)) return val;
    }
    // supabase auth blob
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)!;
      if (/^sb-.*-auth-token$/.test(k)) {
        const raw = localStorage.getItem(k);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        const accessToken = parsed?.currentSession?.access_token ?? parsed?.access_token ?? null;
        if (accessToken && accessToken.length > 10) return accessToken;
      }
    }
  } catch {}
  return null;
}

async function api(path: string, init: RequestInit = {}) {
  const token = findToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  return fetch(path, { ...init, headers, cache: 'no-store' });
}

function persistCredits(n: number) {
  try {
    localStorage.setItem('ai_credits', String(n));
    // Sidebar listens to this event name
    window.dispatchEvent(new Event('ai:credits'));
  } catch {}
}

export function useGenerateReport() {
  const router = useRouter();
  const { push } = useToast();

  const [loadingId, setLoadingId] = React.useState<string | null>(null);
  const [credits, setCredits] = React.useState<number | null>(null);
  const [lastReportId, setLastReportId] = React.useState<string | null>(null);
  const businessId = React.useMemo(getBusinessId, []);
  const notEnoughCredits = credits !== null && credits < COST_PER_REPORT;

  // Load credits on mount (API → fallback to local)
  React.useEffect(() => {
    (async () => {
      try {
        const res = await api('/api/ai-credits', { method: 'GET' });
        if (res.ok) {
          const j = await res.json();
          const r = j?.remaining ?? j?.ai_credits?.remaining ?? j?.credits?.remaining;
          if (typeof r === 'number') {
            setCredits(r);
            persistCredits(r);
            return;
          }
        }
      } catch {}
      const cached = Number(localStorage.getItem('ai_credits') || NaN);
      if (!Number.isNaN(cached)) setCredits(cached);
    })();
  }, []);

  async function runBusinessOverview(extra?: { template?: any; custom?: any }) {
    if (!businessId) {
      push({ title: 'Missing Business ID', description: 'Set NEXT_PUBLIC_BUSINESS_ID', tone: 'error' });
      return;
    }
    if (notEnoughCredits) {
      push({ title: 'Not enough credits', description: 'Upgrade or add credits to continue.', tone: 'error' });
      return;
    }

    setLoadingId('business_overview');
    try {
      const res = await api('/api/reports/generate-business-overview', {
        method: 'POST',
        body: JSON.stringify({ business_id: businessId, ...(extra || {}) }),
      });

      if (res.status === 401) {
        push({ title: 'Session expired', description: 'Please sign in again.', tone: 'error' });
        setTimeout(() => router.push('/login'), 400);
        return;
      }

      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(txt || 'Generation failed');
      }

      const data = (await res.json()) as GenerateOk;
      const newId = data?.report_id || data?.data?.report_id || null;
      setLastReportId(newId);

      // Refresh credits (best-effort)
      try {
        const cRes = await api('/api/ai-credits', { method: 'GET' });
        if (cRes.ok) {
          const cj = await cRes.json();
          const r = cj?.remaining ?? cj?.ai_credits?.remaining ?? cj?.credits?.remaining;
          if (typeof r === 'number') {
            setCredits(r);
            persistCredits(r);
          }
        } else if (typeof data?.remaining_ai_credits === 'number') {
          setCredits(data.remaining_ai_credits);
          persistCredits(data.remaining_ai_credits);
        } else if (typeof data?.ai_credits?.remaining === 'number') {
          setCredits(data.ai_credits.remaining!);
          persistCredits(data.ai_credits.remaining!);
        } else if (credits !== null) {
          const optimistic = Math.max(0, credits - 1);
          setCredits(optimistic);
          persistCredits(optimistic);
        }
      } catch {}

      push({ title: 'Business Overview generated', description: 'Opening My Reports…' });
      setTimeout(() => {
        if (newId) router.push(`/my-reports?new=${encodeURIComponent(newId)}`);
        else router.push('/my-reports');
      }, 800);
    } catch (e: any) {
      push({ title: 'Generation failed', description: String(e?.message || 'Please try again.'), tone: 'error' });
    } finally {
      setLoadingId(null);
    }
  }

  return { loadingId, credits, businessId, notEnoughCredits, lastReportId, runBusinessOverview };
}
