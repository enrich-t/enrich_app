"use client";
import { useState } from "react";
import { apiFetch } from "../../lib/api";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");  
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null); setMsg(null); setLoading(true);
    try {
      await apiFetch("/auth/request-password-reset", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setMsg("If that email exists, a reset link has been sent.");
    } catch (e:any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <h1>Reset password</h1>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12, maxWidth: 420 }}>
        <input type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} required />
        <button disabled={loading} type="submit">{loading ? "Sending…" : "Send reset email"}</button>
      </form>
      {msg && <p style={{color:"green"}}>{msg}</p>}
      {err && <p style={{color:"crimson"}}>{err}</p>}
      <p style={{marginTop:16}}><a href="/login">Back to login</a></p>
    </>
  );
}

