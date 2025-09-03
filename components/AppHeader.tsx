"use client";

import Link from "next/link";
import React from "react";

export default function AppHeader() {
  return (
    <header className="sticky top-0 z-50 border-b bg-white/70 backdrop-blur">
      <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
        <Link href="/" className="font-semibold tracking-tight">
          Enrich
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/reports" className="hover:underline">My Reports</Link>
          <Link href="/generate" className="hover:underline">Generate</Link>
          <Link href="/settings" className="hover:underline">Settings</Link>
        </nav>
      </div>
    </header>
  );
}
