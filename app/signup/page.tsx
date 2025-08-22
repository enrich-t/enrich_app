"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "../../lib/api";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null); setLoading(true);
    try {
      await apiFetch("/auth/signup", {
        method: "POST",
        body: JSON.stringify({ email, password, business_name: businessName }),
      });
      const data = await apiFetch<{ access_token?: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      if (data?.access_token) {
        localStorage.setItem("access_token", data.access_token);
        router.push("/dashboard");
      } else {
        router.push("/login");
      }
    } catch (e:any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <h1>Sign up</h1>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12, maxWidth: 420 }}>
        <input placeholder="Business Name (optional)" value={businessName} onChange={e=>setBusinessName(e.target.value)} />
        <input type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} required />
        <input type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} required />
        <button disabled={loading} type="submit">{loading ? "Creating…" : "Create account"}</button>
      </form>
      {err && <p style={{color:"crimson"}}>{err}</p>}
      <p style={{marginTop:16}}>Already have an account? <a href="/login">Log in</a></p>
    </>
  );
}
