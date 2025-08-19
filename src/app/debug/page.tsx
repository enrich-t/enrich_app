"use client";
import { useEffect, useState } from "react";

export default function DebugPage() {
  const [base, setBase] = useState<string | undefined>(process.env.NEXT_PUBLIC_API_BASE_URL);
  const [result, setResult] = useState<string>("(waiting)");
  const [status, setStatus] = useState<string>("");

  useEffect(() => {
    const doTest = async () => {
      try {
        const res = await fetch(`${base}/auth/signup`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          // unique email each load so backend won't clash
          body: JSON.stringify({
            email: `debug+${Date.now()}@example.com`,
            password: "P@ssw0rd123!",
            business_name: "Debug Co",
            brand_primary_colour: "#6a2e3e",
            brand_secondary_colour: "#faf6d0",
          }),
        });
        const text = await res.text();
        setStatus(`HTTP ${res.status}`);
        setResult(text);
      } catch (e: any) {
        setStatus("NETWORK ERROR");
        setResult(String(e?.message || e));
      }
    };
    if (base && !base.startsWith("undefined")) doTest();
  }, [base]);

  return (
    <div style={{padding: 24, fontFamily: "Inter, system-ui, Arial", maxWidth: 900, margin: "40px auto"}}>
      <h1>/debug</h1>
      <p><strong>NEXT_PUBLIC_API_BASE_URL:</strong> {String(base)}</p>
      <p><strong>Result status:</strong> {status}</p>
      <pre style={{whiteSpace: "pre-wrap", background: "#f6f6f6", padding: 12, borderRadius: 8}}>{result}</pre>
      <p style={{marginTop: 12, fontSize: 12, opacity: 0.8}}>
        (Remove this page after debugging: delete <code>src/app/debug/page.tsx</code>)
      </p>
    </div>
  );
}
