"use client";
import { useEffect, useState } from "react";

export default function DashboardPage() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    try {
      setToken(localStorage.getItem("enrich_access"));
      const u = localStorage.getItem("enrich_user");
      setUser(u ? JSON.parse(u) : null);
    } catch {}
  }, []);

  return (
    <div>
      <h2>Dashboard</h2>
      <p>Token present: <strong>{token ? "yes" : "no"}</strong></p>
      <h3>User</h3>
      <pre style={{ whiteSpace: "pre-wrap", background: "#f6f6f6", padding: 12, borderRadius: 8 }}>
{JSON.stringify(user, null, 2)}
      </pre>
    </div>
  );
}
