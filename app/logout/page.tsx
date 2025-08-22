"use client";
import { useEffect } from "react";

export default function LogoutPage() {
  useEffect(() => {
    try {
      localStorage.removeItem("enrich_access");
      localStorage.removeItem("enrich_user");
    } catch {}
    window.location.href = "/login";
  }, []);
  return <div style={{padding:24}}>Logging out…</div>;
}
