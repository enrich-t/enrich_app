'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppHeader from '../../components/AppHeader';
import { ToastProvider, useToast } from '../../components/Toast';
import ReportsTable, { Report } from '../../components/ReportsTable';
import GenerateReportButton from '../../components/GenerateReportButton';
import { authHeaders, getToken, getBusinessId } from '../../components/auth';

type ApiListResponse = Report[];

const BUSINESS_ID_ENV = process.env.NEXT_PUBLIC_BUSINESS_ID;

async function fetchReports(businessId: string, signal?: AbortSignal): Promise<ApiListResponse> {
  const res = await fetch(`/api/reports/list/${encodeURIComponent(businessId)}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    signal,
    cache: 'no-store',
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(msg || `Failed to load reports (HTTP ${res.status}).`);
  }
  return res.json();
}

export default function DashboardPage() {
  return (
    <ToastProvider>
      <AppHeader />
      <DashboardContent />
    </ToastProvider>
  );
}

function DashboardContent() {
  const router = useRouter();
  const { push } = useToast();

  const [businessId, setBusinessId] = useState<string>('');
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Auth guard
  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace('/login');
    }
  }, [router]);

  // Resolve businessId
  useEffect(() => {
    const fromEnv = (BUSINESS_ID_ENV ?? '').trim();
    if (fromEnv) {
      setBusinessId(fromEnv);
      return;
    }
    const fromLS = getBusinessId() ?? '';
    if (fromLS) setBusinessId(fromLS);
  }, []);

  // Load reports
  useEffect(() => {
    if (!businessId) {
      setLoading(false);
      return;
    }
    const ac = new AbortController();
    setLoading(true);
    fetchReports(businessId, ac.signal)
      .then((data) => setReports(data ?? []))
      .catch((err) => {
        console.error(err);
        push({
          title: 'Could not load reports',
          description: err?.message || 'Please try again.',
          tone: 'error',
        });
      })
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, [businessId, push]);

  const onRefresh = useMemo(
    () => async () => {
      if (!businessId) return;
      try {
        const data = await fetchReports(businessId);
        setReports(data ?? []);
        push({ title: 'Refreshed', description: 'Report list updated.' });
      } catch (err: any) {
        console.error(err);
        push({
          title: 'Refresh failed',
          description: err?.message || 'Please try again.',
          tone: 'error',
        });
      }
    },
    [businessId, push]
  );

  const onGenerate = useMemo(
    () => async () => {
      if (!businessId) {
        push({ title: 'Missing Business ID', description: 'Log in or set NEXT_PUBLIC_BUSINESS_ID / localStorage.business_id', tone: 'error' });
        return;
      }
      const res = await fetch('/api/reports/generate-business-overview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(),
        },
        body: JSON.stringify({ business_id: businessId }),
      });
      if (!res.ok) {
        const msg = await res.text().catch(() => res.statusText);
        throw new Error(msg || `Generate failed (HTTP ${res.status}).`);
      }
      return res.json();
    },
    [businessId, push]
  );

  return (
    <main style={styles.main}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.h1}>Dashboard</h1>
          <p style={styles.subtitle}>Reports overview & quick actions</p>
        </div>
        <GenerateReportButton onGenerate={onGenerate} onDone={onRefresh} />
      </header>

      <section style={styles.card}>
        <div style={styles.cardHeader}>
          <h2 style={styles.h2}>Reports</h2>
        <button onClick={onRefresh} style={styles.secondaryBtn} aria-label="Refresh reports">
            Refresh
          </button>
        </div>
        <ReportsTable reports={reports} loading={loading} />
      </section>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  main: { padding: '24px', maxWidth: 1100, margin: '0 auto', display: 'grid', gap: 24 },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  h1: { margin: 0, fontSize: 28, fontWeight: 700 },
  h2: { margin: 0, fontSize: 20, fontWeight: 600 },
  subtitle: { margin: 0, opacity: 0.75 },
  card: { background: 'var(--card)', border: '1px solid var(--card-bd)', borderRadius: 12, padding: 16 },
  cardHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  secondaryBtn: { padding: '8px 12px', borderRadius: 8, border: '1px solid #3a3a3a', background: 'transparent', color: 'inherit', cursor: 'pointer' },
};
