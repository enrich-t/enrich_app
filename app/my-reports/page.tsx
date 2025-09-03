"use client";
import React from "react";
import { ReportsList } from "../../components/reports/ReportsList";

export default function MyReportsPage() {
  return (
    <div className="p-6 space-y-2">
      <h1 className="text-3xl font-semibold">My Reports</h1>
      <p className="text-sm opacity-80">
        All generated reports for your business. Use the links to view or download exports.
      </p>
      <ReportsList />
    </div>
  );
}

