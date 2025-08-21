"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";

type Profile = {
  id: string;
  business_id?: string;
  business_name?: string;
  ai_credits?: number;
  transparency_score?: number;
  growth_stage?: "initiated" | "growing" | "enriched" | string | null;
  pending_recommendations?: number;
};

type Report = {
  id: string;
  title?: string;
  created_at?: string;
  status?: string;
  export_link?: string | null;
};

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [recsCount, setRecsCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const fetchMeAndReports = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const meRes = await fetch("/api/auth/me", { credentials: "include" });
      if (!meRes.ok) {
        setProfile(null);
        setReports([]);
        setAuthChecked(true);
        setLoading(false);
        return;
      }
      const me: Profile = await meRes.json();
      setProfile(me);

      const businessId =
        me.business_id || (typeof window !== "undefined" ? localStorage.getItem("business_id") : null);

      let list: Report[] = [];
      if (businessId) {
        const listRes = await fetch(`/api/reports/list/${businessId}`, { credentials: "include" });
        if (listRes.ok) list = await listRes.json();
      }
      setReports(Array.isArray(list) ? list : []);
      setRecsCount(typeof me?.pending_recommendations === "number" ? me.pending_recommendations : 0);
    } catch (e: any) {
      setErr(e?.message || "Something went wrong.");
    } finally {
      setLoading(false);
      setAuthChecked(true);
    }
  }, []);

  useEffect(() => { fetchMeAndReports(); }, [fetchMeAndReports]);

  const growthLabel = (stage?: string | null) => {
    switch ((stage || "").toLowerCase()) {
      case "initiated": return "Initiated";
      case "growing": return "Growing";
      case "enriched": return "Enriched";
      default: return "Unknown";
    }
  };

  if (!authChecked) {
    return (
      <main className="p-6 max-w-5xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 bg-gray-200 rounded" />
          <div className="h-24 w-full bg-gray-100 rounded" />
          <div className="h-48 w-full bg-gray-100 rounded" />
        </div>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="p-6 max-w-3xl mx-auto">
        <h1 className="text-2xl font-semibold mb-2">Dashboard</h1>
        <p className="text-gray-600 mb-6">You’re not logged in. Please sign in to view your dashboard.</p>
        <Link href="/login" className="inline-block px-4 py-2 rounded-xl bg-black text-white hover:opacity-90">Go to Login</Link>
      </main>
    );
  }

  return (
    <main className="p-6 max-w-6xl mx-auto">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">{profile.business_name ? `${profile.business_name} — Dashboard` : "Dashboard"}</h1>
          <p className="text-gray-600">Welcome{profile.business_name ? `, ${profile.business_name}` : ""}.</p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/reports/create" className="px-4 py-2 rounded-xl bg-black text-white hover:opacity-90">Create New Report</Link>
        </div>
      </header>

      {err && <div className="mb-4 rounded-2xl border p-3 text-red-800 bg-red-50 border-red-200">{err}</div>}

      {loading ? (
        <div className="animate-pulse grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="h-28 bg-gray-100 rounded" />
          <div className="h-28 bg-gray-100 rounded" />
          <div className="h-28 bg-gray-100 rounded" />
        </div>
      ) : (
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="rounded-2xl border p-4">
            <div className="text-sm text-gray-500 mb-1">AI Report Credits</div>
            <div className="text-3xl font-semibold">{typeof profile.ai_credits === "number" ? profile.ai_credits : "—"}</div>
            <div className="mt-2 text-sm text-gray-600">Need more? <Link href="/billing" className="underline">Manage plan</Link></div>
          </div>

          <div className="rounded-2xl border p-4">
            <div className="text-sm text-gray-500 mb-2">Transparency</div>
            <div className="flex items-center gap-4">
              <div className="relative grid place-items-center rounded-full" style={{
                width: 72, height: 72,
                background: `conic-gradient(#000 ${(profile.transparency_score || 0) * 3.6}deg, #e5e7eb 0deg)`,
              }} aria-label="Transparency score">
                <div className="absolute bg-white rounded-full" style={{ width: 54, height: 54 }} />
                <span className="relative text-sm font-medium">
                  {typeof profile.transparency_score === "number" ? `${profile.transparency_score}%` : "—"}
                </span>
              </div>
              <div className="text-gray-700 text-sm">Higher = more verified, public data in reports.</div>
            </div>
          </div>

          <div className="rounded-2xl border p-4">
            <div className="text-sm text-gray-500 mb-1">Growth Stage</div>
            <div className="text-lg font-semibold capitalize">{["initiated","growing","enriched"].includes(String(profile.growth_stage||"")) ? profile.growth_stage : "Unknown"}</div>
            <div className="mt-1 text-sm text-gray-600">Progress through Initiated → Growing → Enriched.</div>
          </div>
        </section>
      )}

      <section className="rounded-2xl border p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-500">Recommendations</div>
            <div className="text-xl font-semibold">{recsCount} {recsCount === 1 ? "suggestion" : "suggestions"}</div>
          </div>
          <Link href="/recommendations" className="px-3 py-2 rounded-xl border hover:bg-gray-50">View</Link>
        </div>
        <p className="mt-2 text-sm text-gray-600">We’ll notify you when a report should be updated or new data is requested.</p>
      </section>

      <section className="mb-10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">My Reports</h2>
          <Link href="/reports" className="text-sm underline">View all</Link>
        </div>

        {loading ? (
          <div className="space-y-3">
            <div className="h-14 bg-gray-100 rounded" />
            <div className="h-14 bg-gray-100 rounded" />
            <div className="h-14 bg-gray-100 rounded" />
          </div>
        ) : reports.length === 0 ? (
          <div className="rounded-2xl border p-6 text-gray-600">
            No reports yet. <Link className="underline" href="/reports/create">Create your first report</Link>.
          </div>
        ) : (
          <ul className="divide-y rounded-2xl border">
            {reports.slice(0, 6).map((r) => (
              <li key={r.id} className="flex items-center justify-between p-4">
                <div className="min-w-0">
                  <div className="font-medium truncate">{r.title || `Report ${r.id.slice(0, 8)}`}</div>
                  <div className="text-sm text-gray-500">
                    {r.status ? `${r.status} • ` : ""}{r.created_at ? new Date(r.created_at).toLocaleString() : "Date unknown"}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {r.export_link ? (<a href={r.export_link} target="_blank" rel="noreferrer" className="px-3 py-1.5 rounded-xl border hover:bg-gray-50">Download</a>) : null}
                  <Link href={`/reports/${r.id}`} className="px-3 py-1.5 rounded-xl bg-black text-white hover:opacity-90">Open</Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
