"use client";

import Link from "next/link";
import React from "react";

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-white shadow-sm p-5">
      <div className="mb-3 text-sm font-medium text-slate-600">{title}</div>
      {children}
    </div>
  );
}

export default function Page() {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      <div className="md:col-span-2 space-y-6">
        <Card title="Welcome back">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-xl font-semibold">Your reporting hub</div>
              <p className="text-sm text-slate-600">
                Generate snapshots, track transparency, and share progress.
              </p>
            </div>
            <div className="flex gap-3">
              <Link href="/generate" className="rounded-xl border px-4 py-2 hover:bg-slate-50">
                Create New Report
              </Link>
              <Link href="/reports" className="rounded-xl bg-slate-900 text-white px-4 py-2">
                View Reports
              </Link>
            </div>
          </div>
        </Card>

        <Card title="Recent Reports">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border p-4">
              <div className="font-medium">Business Overview — Aurora Lodge</div>
              <div className="text-xs text-slate-600">Generated 2 days ago · Transparency 68%</div>
            </div>
            <div className="rounded-xl border p-4">
              <div className="font-medium">Local Impact — Prairie Tours</div>
              <div className="text-xs text-slate-600">Generated 5 days ago · Transparency 54%</div>
            </div>
          </div>
        </Card>
      </div>

      <div className="space-y-6">
        <Card title="AI Credits">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-semibold">42</span>
            <span className="text-sm text-slate-600">remaining</span>
          </div>
          <div className="mt-3">
            <Link href="/settings" className="text-sm underline">Manage credits</Link>
          </div>
        </Card>

        <Card title="Recommendations">
          <ul className="list-disc pl-5 text-sm space-y-2">
            <li>Refresh your Business Overview (data age &gt; 90 days)</li>
            <li>Add your brand colours in Settings for personalized exports</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
