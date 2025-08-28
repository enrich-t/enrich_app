'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '../../components/Toast';
import { getBusinessId, findAnyAccessToken, readSupabaseTokens, fetchWithAuth, clearLocalAuthForGenerate } from './auth-helpers';
import { fetchCredits, writeCreditsEverywhere } from './credits';
import { COST_PER_REPORT } from './reports-registry';

export function useGenerateReport() {
  const router = useRouter();
  const { push } = useToast();

  const [loadingId, setLoadingId] = React.useState<string | null>(null);
  const [credits, setCredits] = React.useState<number | null>(null);
  const businessId = React.useMemo(getBusinessId, []);

  React.useEffect(() => {
    const token = findAnyAccessToken() || readSupabaseTokens()?.accessToken || null;
    fetchCredits(token).then((v) => {
      if (v !== null) {
        setCredits(v);
        writeCreditsEverywhere(v);
      } else {
        const raw = localStorage.getItem('ai_credits');
        if (raw && !Number.isNaN(Number(raw))) setCredits(Number(raw));
      }
    });
  }, []);

  const notEnoughCredits = credits !== null && credits < COST_PER_REPORT;

  async function runBusinessOverview(extra?: { template?: any; custom?: any }) {
    if (!businessId) {
      push({ title: 'Missing Business ID', description: 'Set NEXT_PUBLIC_BUSINESS_ID', tone: 'error' });
      return;
    }
    if (notEnoughCredits) {
      push({ title: 'Not enough AI credits', description: 'Upgrade or add credits to continue.', tone: 'error' });
      return;
    }

    setLoadingId('business_overview');
    try {
      const res = await fetchWithAuth('/api/reports/generate-business-overview', {
        method: 'POST',
        body: JSON.stringify({ business_id: businessId, ...(extra || {}) }),
      });

      if (res.status === 401) {
        clearLocalAuthForGenerate();
        push({ title: 'Session expired', description: 'Please sign in again.', tone: 'error' });
        setTimeout(() => router.push('/login'), 400);
        return;
      }

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || 'Generation failed');
      }

      const data: any = await res.json();

      // Try to refresh credits from API; fall back to optimistic
      const token = findAnyAccessToken() || readSupabaseTokens()?.accessToken || null;
      const fresh = await fetchCredits(token);
      if (fresh !== null) {
        setCredits(fresh);
        writeCreditsEverywhere(fresh);
      } else if (typeof data?.remaining_ai_credits === 'number') {
        setCredits(data.remaining_ai_credits);
        writeCreditsEverywhere(data.remaining_ai_credits);
      } else if (credits !== null) {
        const optimistic = Math.max(0, credits - 1);
        setCredits(optimistic);
        writeCreditsEverywhere(optimistic);
      }

      push({ title: 'Business Overview generated', description: 'Opening My Reports…' });
      const newReportId = data?.report_id || data?.data?.report_id;
      setTimeout(() => {
        if (newReportId) router.push(`/my-reports?new=${encodeURIComponent(newReportId)}`);
        else router.push('/my-reports');
      }, 800);
    } catch (e: any) {
      push({ title: 'Generation failed', description: String(e?.message || 'Please try again.'), tone: 'error' });
    } finally {
      setLoadingId(null);
    }
  }

  return { loadingId, credits, businessId, notEnoughCredits, runBusinessOverview };
}
