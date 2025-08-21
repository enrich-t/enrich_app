"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Profile = {
  id: string;
  business_id?: string;
  business_name?: string;
  brand_primary_colour?: string | null;
  brand_secondary_colour?: string | null;
  ai_credits?: number;
  transparency_score?: number; // 0–100
  growth_stage?: "initiated" | "growing" | "enriched" | string | null;
};

type Report = {
  id: string;
  title?: string;
  created_at?: string;
  status?: string;
  export_link?: string | null;
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE?.replace(/\/+$/, "") || "http://localhost:8000";

export default function DashboardPage() {
  const router = useRouter();

  const [authChecked, setAuthChecked] = useState(false); // gate UI until we check localStorage (client-only)
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [recsCount, setRecsCount] = useState<number>(0);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // --- Helpers (client-only) ---
  const readTokens = useCallback(() => {
    try {
      const at = localStorage.getItem("access_token");
      const rt = localStorage.getItem("refresh_token"); // keep for refresh flow
      return { at, rt };
    } catch {
      return { at: null, rt: null };
    }
  }, []);

  const writeAccessToken = useCallback((token: string) => {
    try {
      localStorage.setItem("access_token", token);
    } catch {}
  }, []);

  const apiFetch = useCallback(
    async (input: string, init?: RequestInit) => {
      // Attach Bearer automatically; try refresh once on 401
      const doFetch = async (token?: string) => {
        const headers = new Headers(init?.headers || {});
        if (token) headers.set("Authorization", `Bearer ${token}`);
        headers.set("Content-Type", headers.get("Content-Type") || "application/json");
        return fetch(`${API_BASE}${input}`, { ...init, headers });
      };

      let token = accessToken;
      let res = await doFetch(token || undefined);

      if (res.status === 401) {
        // Attempt refresh once
        const { rt } = readTokens();
        if (!rt) return res;

        const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: rt }),
        });

        if (refreshRes.ok) {
          const data = await refreshRes.json().catch(() => ({}));
          const newToken = data?.access_token as string | undefined;
          if (newToken) {
            writeAccessToken(newToken);
            setAccessToken(newToken);
            res = await doFetch(newToken);
          }
        }
      }

      return res;
    },
    [API_BASE, accessToken, readTokens, writeAccessToken]
  );

  const fetchMeAndReports = useCallback(async () => {
    setLoading(true);
    setErr(null);

    try {
      // 1) Who am I?
      const meRes = await apiFetch("/auth/me", { method: "GET" });
      if (!meRes.ok) {
        if (meRes.status === 401) {
          // Not logged in
          setProfile(null);
          setReports([]);
          setLoading(false);
          return;
        }
        throw new Error(`Auth check failed (${meRes.status})`);
      }
      const me = (await meRes.json()) as Profile;
      setProfile(me);

      // 2) Reports list (needs business_id)
      const businessId =
        me.business_id ||
        (typeof window !== "undefined" ? localStorage.getItem("business_id") : null);

      let reportsData: Report[] = [];
      if (businessId) {
        const listRes = await apiFetch(`/reports/list/${businessId}`, { method: "GET" });
        if (!listRes.ok) throw new Error(`Reports fetch failed (${listRes.status})`);
        reportsData = (await listRes.json()) as Report[];
      }
      setReports(Array.isArray(reportsData) ? reportsData : []);

      // 3) (Optional) recommendations count from profile or compute later
      // If backend provides a number on /auth/me, prefer it; else derive 0 for now.
      const inferredRecs =
        typeof (me as any)?.pending_recommendations === "number"
          ? (me as any).pending_recommendations
          : 0;
      setRecsCount(inferredRecs);
    } catch (e: any) {
      setErr(e?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  // --- First client pass: read tokens from localStorage safely ---
  useEffect(() => {
    const { at } = readTokens();
    if (!at) {
      setAccessToken(null);
    } else {
      setAccessToken(at);
    }
    setAuthChecked(true);
  }, [readTokens]);

  // Once we know auth state, fetch profile/reports if logged in
  useEffect(() => {
    if (!authChecked) return;
    if (!accessToken) {
      // Not logged in — show friendly state (and offer Login)
      setProfile(null);
      setReports([]);
      setLoading(false);
      return;
    }
    fetchMeAndReports();
  }, [authChecked, accessToken, fetchMeAndReports]);

  // UI helpers
  const growthLabel = (stage?: string | null) => {
    switch ((stage || "").toLowerCase()) {
      case "initiated":
        return "Initiated";
      case "growing":
        return "Growing";
      case "enriched":
        return "Enriched";
      default:
        return "Unknown";
    }
  };

  // --- Render ---

  // Until we read localStorage on client, render a neutral shell (SSR-safe)
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

  // Not logged in
  if (!accessToken) {
    return (
      <main className="p-6 max-w-3xl mx-auto">
        <h1 className="text-2xl font-semibold mb-2">Dashboard</h1>
        <p className="text-gray-600 mb-6">
          You’re not logged in. Please sign in to view your dashboard.
        </p>
        <Link
          href="/login"
          className="inline-block px-4 py-2 rounded-xl bg-black text-white hover:opacity-90"
        >
          Go to Login
        </Link>
      </main>
    );
  }

  return (
    <main className="p-6 max-w-6xl mx-auto">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">
            {profile?.business_name ? `${profile.business_name} — Dashboard` : "Dashboard"}
          </h1>
          <p className="text-gray-600">
            Welcome{profile?.business_name ? `, ${profile.business_name}` : ""}.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/reports/create"
            className="px-4 py-2 rounded-xl bg-black text-white hover:opacity-90"
          >
            Create New Report
          </Link>
        </div>
      </header>

      {err && (
        <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3 text-red-800">
          {err}
        </div>
      )}

      {loading ? (
        <div className="animate-pulse grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="h-28 bg-gray-100 rounded" />
          <div className="h-28 bg-gray-100 rounded" />
          <div className="h-28 bg-gray-100 rounded" />
        </div>
      ) : (
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* AI Credits */}
          <div className="rounded-2xl border p-4">
            <div className="text-sm text-gray-500 mb-1">AI Report Credits</div>
            <div className="text-3xl font-semibold">
              {typeof profile?.ai_credits === "number" ? profile.ai_credits : "—"}
            </div>
            <div className="mt-2 text-sm text-gray-600">
              Need more?{" "}
              <Link href="/billing" className="underline">
                Manage plan
              </Link>
            </div>
          </div>

          {/* Transparency (simple ring) */}
          <div className="rounded-2xl border p-4">
            <div className="text-sm text-gray-500 mb-2">Transparency</div>
            <div className="flex items-center gap-4">
              <div
                className="relative grid place-items-center rounded-full"
                style={{
                  width: 72,
                  height: 72,
                  background: `conic-gradient(#000 ${
                    (profile?.transparency_score || 0) * 3.6
                  }deg, #e5e7eb 0deg)`,
                }}
                aria-label="Transparency score"
              >
                <div className="absolute bg-white rounded-full" style={{ width: 54, height: 54 }} />
                <span className="relative text-sm font-medium">
                  {typeof profile?.transparency_score === "number"
                    ? `${profile.transparency_score}%`
                    : "—"}
                </span>
              </div>
              <div className="text-gray-700 text-sm">
                Higher = more verified, public data in reports.
              </div>
            </div>
          </div>

          {/* Growth Stage */}
          <div className="rounded-2xl border p-4">
            <div className="text-sm text-gray-500 mb-1">Growth Stage</div>
            <div className="text-lg font-semibold capitalize">
              {growthLabel(profile?.growth_stage)}
            </div>
            <div className="mt-1 text-sm text-gray-600">
              Progress through Initiated → Growing → Enriched.
            </div>
          </div>
        </section>
      )}

      {/* Recommendations widget */}
      <section className="rounded-2xl border p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-500">Recommendations</div>
            <div className="text-xl font-semibold">
              {recsCount} pending{" "}
              {recsCount === 1 ? "suggestion" : "suggestions"}
            </div>
          </div>
          <Link href="/recommendations" className="px-3 py-2 rounded-xl border hover:bg-gray-50">
            View
          </Link>
        </div>
        <p className="mt-2 text-sm text-gray-600">
          We’ll notify you when a report should be updated or new data is requested.
        </p>
      </section>

      {/* Recent Reports */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">My Reports</h2>
          <Link href="/reports" className="text-sm underline">
            View all
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3">
            <div className="h-14 bg-gray-100 rounded" />
            <div className="h-14 bg-gray-100 rounded" />
            <div className="h-14 bg-gray-100 rounded" />
          </div>
        ) : reports.length === 0 ? (
          <div className="rounded-2xl border p-6 text-gray-600">
            No reports yet.{" "}
            <Link className="underline" href="/reports/create">
              Create your first report
            </Link>
            .
          </div>
        ) : (
          <ul className="divide-y rounded-2xl border">
            {reports.slice(0, 6).map((r) => (
              <li key={r.id} className="flex items-center justify-between p-4">
                <div className="min-w-0">
                  <div className="font-medium truncate">
                    {r.title || `Report ${r.id.slice(0, 8)}`}
                  </div>
                  <div className="text-sm text-gray-500">
                    {r.status ? `${r.status} • ` : ""}
                    {r.created_at
                      ? new Date(r.created_at).toLocaleString()
                      : "Date unknown"}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {r.export_link ? (
                    <a
                      href={r.export_link}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 rounded-xl border hover:bg-gray-50"
                    >
                      Download
                    </a>
                  ) : null}
                  <Link
                    href={`/reports/${r.id}`}
                    className="px-3 py-1.5 rounded-xl bg-black text-white hover:opacity-90"
                  >
                    Open
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
