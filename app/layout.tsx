import "./globals.css";
import React from "react";
import AppHeader from "../components/AppHeader";

export const metadata = {
  title: "Enrich",
  description: "Responsible operations reporting",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gradient-to-b from-white to-slate-50 text-slate-900">
        <AppHeader />
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
