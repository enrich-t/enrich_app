"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { generateBusinessOverview } from "@/lib/api";

export default function GeneratePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onGenerate() {
    setError(null);
    setLoading(true);
    try {
      const data = await generateBusinessOverview({
        business_id: "ui-generate",
        report_type: "business-overview",
      });
      // TODO: route to the new report; adjust to your returned payload
      router.push("/reports");
    } catch (e: any) {
      setError(e?.message || "Failed to generate");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold mb-4">Generate Report</h1>
      <button
        onClick={onGenerate}
        disabled={loading}
        className="rounded-xl bg-slate-900 text-white px-4 py-2 disabled:opacity-60"
      >
        {loading ? "Generating..." : "Generate Business Overview"}
      </button>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  );
}

