"use client";

import React, { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../lib/api";

type ExportUrls = {
  pdf?: string;
  json?: string;
  csv?: string;
  [k: string]: string | undefined;
};

type ReportRow = {
  id: string;
  business_id: string;
  report_type: string;
  status?: "pending" | "ready" | "failed";
  created_at?: string;
  export_urls?: ExportUrls | null;
  // optional other fields: content, meta, etc.
};

export function ReportsList({ limit }: { limit?: number }) {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [rows, setRows] = useState<ReportRow[]>([]);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      // 1) get profile → business id
      const me = await apiFetch("/api/auth/me");
      if (!me.ok) throw new Error((me.json?.detail?.message || me.text || `auth ${me.status}`) as string);

      const profile = me.json?.profile ?? {};
      const biz =
        profile.business_id ||
        profile.id ||
        profile.businessId ||
        (profile.business && profile.business.id);

      if (!biz) throw new Error("No business id found on profile.");

      // 2) fetch reports list
      const r = await apiFetch(`/api/reports/list/${encodeURIComponent(biz)}`);
      if (!r.ok) throw new Error((r.json?.detail?.message || r.text || `list ${r.status}`) as string);

      const all: ReportRow[] = r.json?.reports ?? [];
      // newest first
      all.sort((a, b) => {
        const ta = a.created_at ? Date.parse(a.created_at) : 0;
        const tb = b.created_at ? Date.parse(b.created_at) : 0;
        return tb - ta;
      });

      setRows(limit ? all.slice(0, limit) : all);
    } catch (e: any) {
      setErr(e?.message || "Failed to load reports");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // lightweight auto-refresh if this page stays open
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, []);

  const body = useMemo(() => {
    if (loading) return <div style={{ color: "#a7adbb" }}>Loading…</div>;
    if (err) return <div style={{ color: "#e26d6d" }}>Error: {err}</div>;
    if (!rows.length) return <div style={{ color: "#a7adbb" }}>No reports yet.</div>;

    return (
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #252a34" }}>
              <Th>Type</Th>
              <Th>Status</Th>
              <Th>Created</Th>
              <Th style={{ textAlign: "right" }}>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} style={{ borderBottom: "1px solid #1c222d" }}>
                <Td>{labelForType(r.report_type)}</Td>
                <Td>{badge(r.status || "ready")}</Td>
                <Td>{fmtDate(r.created_at)}</Td>
                <Td style={{ textAlign: "right" }}>
                  {renderActions(r)}
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }, [loading, err, rows, limit]);

  return (
    <div
      style={{
        background: "#141821",
        border: "1px solid #252a34",
        borderRadius: 14,
        padding: 12,
      }}
    >
      {body}
    </div>
  );
}

function Th(props: React.HTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      {...props}
      style={{
        textAlign: "left",
        padding: "10px 8px",
        fontWeight: 800,
        color: "#e9eaf0",
        fontSize: 13,
        ...(props.style || {}),
      }}
    />
  );
}
function Td(props: React.HTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      {...props}
      style={{
        padding: "10px 8px",
        color: "#cfd3db",
        fontSize: 13,
        ...(props.style || {}),
      }}
    />
  );
}

function labelForType(t: string) {
  if (t === "business_overview") return "Business Overview";
  if (t === "local_impact") return "Local Impact";
  if (t === "energy_resources") return "Energy & Resources";
  return t.replaceAll("_", " ");
}

function badge(status: "pending" | "ready" | "failed") {
  const map: Record<typeof status, { bg: string; dot: string; text: string }> = {
    pending: { bg: "rgba(229,197,100,.12)", dot: "#e5c564", text: "Pending" },
    ready: { bg: "rgba(145,195,126,.12)", dot: "#91c37e", text: "Ready" },
    failed: { bg: "rgba(228,96,103,.12)", dot: "#e46067", text: "Failed" },
  };
  const s = map[status] || map.ready;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 10px",
        borderRadius: 999,
        background: s.bg,
        border: "1px solid #252a34",
        fontWeight: 800,
        color: "#e9eaf0",
      }}
    >
      <span style={{ width: 8, height: 8, borderRadius: 999, background: s.dot }} />
      {s.text}
    </span>
  );
}

function fmtDate(d?: string) {
  if (!d) return "—";
  try {
    const dt = new Date(d);
    return dt.toLocaleString();
  } catch {
    return d;
  }
}

function renderActions(r: ReportRow) {
  const hasAny =
    !!r.export_urls?.pdf || !!r.export_urls?.json || !!r.export_urls?.csv;

  if (!hasAny) {
    return (
      <div style={{ color: "#a7adbb", fontStyle: "italic" }}>
        No exports available
      </div>
    );
  }

  const open = (url?: string) => {
    if (!url) return;
    window.open(url, "_blank", "noreferrer");
  };

  return (
    <div style={{ display: "inline-flex", gap: 8 }}>
      {r.export_urls?.pdf && (
        <button style={btn()} onClick={() => open(r.export_urls?.pdf!)}>
          PDF
        </button>
      )}
      {r.export_urls?.json && (
        <button style={btn()} onClick={() => open(r.export_urls?.json!)}>
          JSON
        </button>
      )}
      {r.export_urls?.csv && (
        <button style={btn()} onClick={() => open(r.export_urls?.csv!)}>
          CSV
        </button>
      )}
    </div>
  );
}

function btn(): React.CSSProperties {
  return {
    background: "transparent",
    color: "#e9eaf0",
    border: "1px solid #252a34",
    borderRadius: 10,
    padding: "8px 12px",
    fontWeight: 800,
    cursor: "pointer",
  };
}
