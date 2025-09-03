"use client";
import React from "react";
import { ReportsList } from "../../components/reports/ReportsList";

export default function Dashboard() {
  return (
    <div className="p-6 space-y-8">
      <h1 className="text-3xl font-semibold">Overview</h1>
      <ReportsList />
    </div>
  );
}

