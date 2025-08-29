import { apiFetch } from '@/lib/api';
import type { ReportRow } from './types';

export async function generateBusinessOverview(businessId: string): Promise<void> {
  const res = await apiFetch('/reports/generate-business-overview', {
    method: 'POST',
    body: JSON.stringify({ business_id: businessId }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`${res.status} ${t || 'Internal Server Error'}`);
  }
}

export async function listReports(businessId: string): Promise<ReportRow[]> {
  const r = await apiFetch(`/reports/list/${encodeURIComponent(businessId)}`);
  if (!r.ok) return [];
  const data = await r.json();
  return (data?.reports as ReportRow[]) || [];
}

export function toCsvFallback(obj: any): string {
  const rows: string[][] = [['key', 'value']];
  const walk = (prefix: string, v: any) => {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      Object.keys(v).forEach((k) => walk(prefix ? `${prefix}.${k}` : k, v[k]));
    } else {
      rows.push([prefix, v == null ? '' : String(v)]);
    }
  };
  walk('', obj);
  return rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
}
