"use client";

import React from "react";
import { ReportsList } from "../../components/reports/ReportsList";

export default function MyReportsPage() {
  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-4">My Reports</h1>
      <p className="text-sm opacity-70 mb-6">
        All generated reports for your business. Use “View” for in-page preview, or “Download” to export.
      </p>
      <ReportsList title="All Reports" />
    </div>
  );
}
