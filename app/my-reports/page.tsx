"use client";
import React from "react";
import { ReportsList } from "../../components/reports/ReportsList";

export default function MyReportsPage() {
  return (
    <div style={{ padding: "16px 12px" }}>
      <h1 style={{ fontSize: 36, margin: "4px 0 2px" }}>My Reports</h1>
      <div style={{ color: "#a7adbb", marginBottom: 16 }}>
        Your generated reports with available exports.
      </div>
      <ReportsList />
    </div>
  );
}
