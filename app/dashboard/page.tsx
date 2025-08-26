'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ToastProvider, useToast } from '../../components/Toast';
import ReportsTable, { Report, ReportStatus } from '../../components/ReportsTable';
import GenerateReportButton from '../../components/GenerateReportButton';
import { getToken, getBusinessId } from '../../components/auth';
import FigmaDashboardShell from '../../components/FigmaDashboardShell';
import { apiFetch } from '../../components/api';

type ApiListResponse = unknown;

const ENV_BIZ =
  typeof process?.env?.NEXT_PUBLIC_BUSINESS_ID === 'string'
    ? (process.env.NEXT_PUBLIC_BUSINESS_ID as string)
    : '';

// ---------- helpers ----------

function asStatus(v: any): ReportStatus {
  const s = String(v ?? '').toLowerCase();
  return (['pending', 'processing', 'ready', 'failed'] as ReportStatus[]).includes(
    s as ReportStatus
  )
    ? (s as ReportStatus)
    : 'ready';
}

function firstPresent<T = any>(obj: any, keys: string[], coerce?: (x: any) => T): T | null {
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
    const id =
      firstPresent<string>(r, ['id', 'report_id'], (x) => String(x)) ?? `tmp-${Date.now()}-${i}`;
    const report_type =
      firstPresent<string>(r, ['report_type', 'type', 'kind'], (x) => String(x)) ??
      'business_overview';
    const status = asStatus(
      firstPresent<string>(r, ['status', 'state', 'phase'], (x) => String(x)) ?? 'ready'
    );
    const createdISO = (() => {
      const raw = firstPresent<any>(r, [
        'created_at',
        'createdAt',
        'inserted_at',
        'created_on',
        'createdOn',
      ]);
      const d = raw ? new Date(raw) : new Date();
      return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
    })();
    const csv_url = firstPresent<string>(r, ['csv_url', 'csvUrl', 'canva_csv_url'], (x) => String(x));
    const json_url = firstPresent<string>(r, ['json_url', 'jsonUrl'], (x) => String(x));
    const pdf_url = firstPresent<string>(r, ['pdf_url', 'pdfUrl'], (x) => String(x));
    const export_link = firstPresent<string>(r, ['export_link', 'download_url', 'downloadUrl'], (x) => String(x));
    const pdf = pdf_url ?? export_link ?? null;

    return {
      id,
      report_type,
      status,
      created_at: createdISO,
      csv_url: csv_url ?? null,
      json_url: json_url ?? null,
      pdf_url: pdf,
      export_link: export_link ?? null,
    } satisfies Report;
  });
}

async function fetchReports(
  businessId: string,
  signal?: AbortSignal
): Promise<Report[]> {
  const res = await apiFetch(`/api/reports/list/${encodeURIComponent(String(businessId))}`, {
    method: 'GET',
    signal,
    cache: 'no-store',
  });
  const raw = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${raw}`);
  let json: any = [];
  try {
    json = JSON.parse(raw);
  } catch {
    // leave as []
  }
  return normalizeReports(json);
}

// ---------- page ----------

export default function DashboardPage() {
  return (
    <ToastProvider>
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
  const [diag, setDiag] = useState<string>('');

  // Auth guard
  useEffect(() => {
    const token = getToken();
    if (!token || typeof token !== 'string' || token.trim() === '') {
      router.replace('/login');
    }
  }, [router]);

  // Resolve businessId
  useEffect(() => {
    if (ENV_BIZ) {
      setBusinessId(ENV_BIZ);
      return;
    }
    const fromLS = getBusinessId();
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
      .then((data) => setReports(Array.isArray(data) ? data : []))
      .catch((err) => {
        console.error('[dashboard] list error', err);
        push({
          title: 'Could not load reports',
          description: String(err?.message || err),
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
        setReports(Array.isArray(data) ? data : []);
        push({ title: 'Refreshed', description: 'Report list updated.' });
      } catch (err: any) {
        console.error('[dashboard] refresh error', err);
        push({ title: 'Refresh failed', description: String(err?.message || err), tone: 'error' });
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
        push({
          title: 'Missing Business ID',
          description: 'Log in or set NEXT_PUBLIC_BUSINESS_ID / localStorage.business_id',
          tone: 'error',
        });
        return;
      }

      // Best-effort: get profile to include business name + requester id
      let business_name: string | undefined;
      let requested_by: string | undefined;
      try {
        const meRes = await apiFetch('/api/auth/me');
        if (meRes.ok) {
          const me = await meRes.json().catch(() => null);
          const prof = me?.profile ?? me?.data ?? me ?? {};
          business_name = prof?.business_name ?? prof?.businessName ?? undefined;
          requested_by = prof?.id ?? prof?.user_id ?? prof?.userId ?? undefined;
        }
      } catch {
        /* ignore */
      }

      // Universal payload (snake + camel)
      const payload: Record<string, any> = {
        business_id: String(businessId),
        businessId: String(businessId),
        report_type: 'business_overview',
        reportType: 'business_overview',
        ...(business_name ? { business_name, businessName: business_name } : {}),
        ...(requested_by ? { requested_by, requestedBy: requested_by } : {}),
        source: 'dashboard',
      };

      const res = await apiFetch('/api/reports/generate-business-overview', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const bodyText = await res.text();
      if (!res.ok) {
        const snippet = bodyText?.slice(0, 500) || res.statusText || 'Unknown error';
        throw new Error(`${res.status} ${res.statusText}: ${snippet}`);
      }

      push({ title: 'Report requested', description: 'We’ll refresh your list shortly.' });
      await onRefresh();
    },
    [businessId, push, router, onRefresh]
  );

  // Diagnostics: show statuses + snippet; auto-redirect handled by apiFetch
  const runDiagnostics = useMemo(
    () => async () => {
      const biz = businessId || '(none)';
      try {
        const me = await apiFetch('/api/auth/me');
        const meTxt = await me.text();

        const list = await apiFetch(`/api/reports/list/${encodeURIComponent(biz)}`);
        const listTxt = await list.text();

        const gen = await apiFetch('/api/reports/generate-business-overview', {
          method: 'POST',
          body: JSON.stringify({ business_id: String(biz), report_type: 'business_overview' }),
        });
        const genTxt = await gen.text();

        setDiag(
          [
            `Token present: ${!!getToken()} (len=${getToken()?.length || 0})`,
            `Business ID: ${biz}`,
            `GET /api/auth/me -> ${me.status} ${me.statusText}`,
            (meTxt || '').slice(0, 200),
            `GET /api/reports/list/${biz} -> ${list.status} ${list.statusText}`,
            (listTxt || '').slice(0, 200),
            `POST /api/reports/generate-business-overview -> ${gen.status} ${gen.statusText}`,
            (genTxt || '').slice(0, 200),
          ].join('\n')
        );
      } catch (e: any) {
        setDiag(`Diagnostics error: ${String(e?.message || e)}`);
      }
    },
    [businessId]
  );

  const headerRight = (
    <div style={{ display: 'inline-flex', gap: 8 }}>
      <button onClick={onRefresh} className="chip-btn" aria-label="Refresh reports">
        Refresh
      </button>
    </div>
  );

  return (
    <>
      <FigmaDashboardShell
        actions={<GenerateReportButton onGenerate={onGenerate} onDone={onRefresh} />}
        extraHeaderRight={headerRight}
        reports={<ReportsTable reports={reports} loading={loading} />}
      />
      <div style={{ maxWidth: 1200, margin: '8px auto 24px', padding: '0 24px' }}>
        <div style={{ background: '#0b0c0e', border: '1px solid #22252a', borderRadius: 8, padding: 12 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <strong>Diagnostics</strong>
            <button className="chip-btn" onClick={runDiagnostics}>Run</button>
          </div>
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: 12.5 }}>
            {diag || 'Click Run to test /auth/me, list, and generate.'}
          </pre>
        </div>
      </div>
    </>
  );
}
