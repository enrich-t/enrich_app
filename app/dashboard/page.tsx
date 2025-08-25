'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppHeader from '../../components/AppHeader';
import { ToastProvider, useToast } from '../../components/Toast';
import ReportsTable, { Report, ReportStatus } from '../../components/ReportsTable';
import GenerateReportButton from '../../components/GenerateReportButton';
import { authHeaders, getToken, getBusinessId } from '../../components/auth';

type ApiListResponse = unknown;

const ENV_BIZ = typeof process?.env?.NEXT_PUBLIC_BUSINESS_ID === 'string'
  ? (process.env.NEXT_PUBLIC_BUSINESS_ID as string)
  : '';

function asStatus(v: any): ReportStatus {
  const s = String(v ?? '').toLowerCase();
  return (['pending','processing','ready','failed'] as ReportStatus[]).includes(s as ReportStatus)
    ? (s as ReportStatus)
    : 'ready';
}

function firstPresent<T = any>(obj: any, keys: string[], coerce?: (x:any)=>T): T | null {
  for (const k of keys) {
    if (obj && obj[k] != null) return coerce ? coerce(obj[k]) : obj[k];
  }
  return null;
}

function normalizeArray(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.reports)) return payload.reports;
  return [];
}

function normalizeReports(payload: any): Report[] {
  const arr = normalizeArray(payload);
  return arr.map((r: any, i: number) => {
    const id = firstPresent<string>(r, ['id','report_id'], (x)=>String(x)) ?? `tmp-${Date.now()}-${i}`;
    const report_type = firstPresent<string>(r, ['report_type','type','kind'], (x)=>String(x)) ?? 'business_overview';
    const status = asStatus(firstPresent<string>(r, ['status','state','phase'], (x)=>String(x)) ?? 'ready');
    const createdISO = (() => {
      const raw = firstPresent<any>(r, ['created_at','createdAt','inserted_at','created_on','createdOn']);
      const d = raw ? new Date(raw) : new Date();
      return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
    })();
    const csv_url  = firstPresent<string>(r, ['csv_url','csvUrl','canva_csv_url'], (x)=>String(x));
    const json_url = firstPresent<string>(r, ['json_url','jsonUrl'], (x)=>String(x));
    const pdf_url  = firstPresent<string>(r, ['pdf_url','pdfUrl'], (x)=>String(x));
    const export_link = firstPresent<string>(r, ['export_link','download_url','downloadUrl'], (x)=>String(x));
    const pdf = pdf_url ?? export_link ?? null;

    return { id, report_type, status, created_at: createdISO, csv_url: csv_url ?? null, json_url: json_url ?? null, pdf_url: pdf, export_link: export_link ?? null };
  });
}

async function fetchReports(businessId: string, signal?: AbortSignal): Promise<Report[]> {
  const res = await fetch(`/api/reports/list/${encodeURIComponent(String(businessId))}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    signal,
    cache: 'no-store',
  });
  const raw = await res.text();
  if (!res.ok) throw new Error(raw || `Failed to load reports (HTTP ${res.status}).`);
  let json: any = [];
  try { json = JSON.parse(raw); } catch {}
  return normalizeReports(json);
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

  useEffect(() => {
    const token = getToken();
    if (!token || typeof token !== 'string' || token.trim() === '') {
      router.replace('/login');
    }
  }, [router]);

  useEffect(() => {
    if (ENV_BIZ) { setBusinessId(ENV_BIZ); return; }
    const fromLS = getBusinessId();
    if (fromLS) setBusinessId(fromLS);
  }, []);

  useEffect(() => {
    if (!businessId) { setLoading(false); return; }
    const ac = new AbortController();
    setLoading(true);
    fetchReports(businessId, ac.signal)
      .then((data) => setReports(Array.isArray(data) ? data : []))
      .catch((err) => {
        console.error('[dashboard] list error', err);
        push({ title: 'Could not load reports', description: err?.message || 'Please try again.', tone: 'error' });
      })
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, [businessId, push]);

  const onRefresh = useMemo(
    () => async () => {
      if (!businessId) return;
      try {
        const data = await fetchReports(businessId);
        setReports(Array.isArray(data) ? data : []);
        push({ title: 'Refreshed', description: 'Report list updated.' });
      } catch (err: any) {
        console.error('[dashboard] refresh error', err);
        push({ title: 'Refresh failed', description: err?.message || 'Please try again.', tone: 'error' });
      }
    },
    [businessId, push]
  );

  const onGenerate = useMemo(
    () => async () => {
      const token = getToken();
      if (!token) {
        push({ title: 'Not logged in', description: 'Please log in again.', tone: 'error' });
        router.replace('/login');
        return;
      }
      if (!businessId) {
        push({ title: 'Missing Business ID', description: 'Log in or set NEXT_PUBLIC_BUSINESS_ID / localStorage.business_id', tone: 'error' });
        return;
      }

      const res = await fetch('/api/reports/generate-business-overview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ business_id: String(businessId) }),
      });

      const body = await res.text();
      if (!res.ok) {
        const msg = body || `Generate failed (HTTP ${res.status}).`;
        // Common case: 403 from backend
        if (res.status === 403) {
          throw new Error('Forbidden: your account may not be linked to this business or the token is not recognized.');
        }
        throw new Error(msg);
      }

      push({ title: 'Report requested', description: 'We’ll refresh your list shortly.' });
      await onRefresh();
    },
    [businessId, push, router, onRefresh]
  );

  return (
    <main style={styles.main}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.h1}>Dashboard</h1>
          <p style={styles.subtitle}>Reports overview & quick actions</p>
          <p style={{ margin: '6px 0 0', fontSize: 12, opacity: 0.7 }}>
            Business ID: <code>{businessId || '(none)'}</code>
          </p>
        </div>
        <GenerateReportButton onGenerate={onGenerate} onDone={onRefresh} />
      </header>

      <section style={styles.card}>
        <div style={styles.cardHeader}>
          <h2 style={styles.h2}>Reports</h2>
          <button onClick={onRefresh} style={styles.secondaryBtn} aria-label="Refresh reports">Refresh</button>
        </div>
        <ReportsTable reports={reports} loading={loading} />
        {!loading && reports.length === 0 && (
          <p style={{ marginTop: 8, opacity: 0.8 }}>
            No reports found for this business. Generate one, then press Refresh.
          </p>
        )}
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
