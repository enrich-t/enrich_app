"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function ProfilePage() {
  const [me, setMe] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    api.me().then(setMe).catch(() => (window.location.href = "/login"));
  }, []);

  async function onSubmit(formData: FormData) {
    setSaving(true); setMsg(null);
    const body = Object.fromEntries(formData.entries());
    try {
      await api.updateProfile(body);
      setMsg("Saved!");
      // update CSS variables immediately
      const root = document.documentElement;
      if (body["brand_primary_colour"]) root.style.setProperty("--brand-primary", String(body["brand_primary_colour"]));
      if (body["brand_secondary_colour"]) root.style.setProperty("--brand-secondary", String(body["brand_secondary_colour"]));
    } catch (e:any) {
      setMsg(e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (!me) return null;

  return (
    <div className="space-y-6">
      <div className="card p-5">
        <h1 className="text-lg font-semibold">Profile</h1>
        <p className="text-sm text-zinc-500">Update your business details and brand colors.</p>

        <form action={onSubmit} className="mt-4 grid gap-3 max-w-lg">
          <label className="text-sm">
            <span className="block text-zinc-600 mb-1">Business name</span>
            <input name="business_name" defaultValue={me?.profile?.business_name || ""} className="w-full rounded-xl border border-zinc-300 px-3 py-2" />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">
              <span className="block text-zinc-600 mb-1">Primary color</span>
              <input name="brand_primary_colour" defaultValue={me?.profile?.brand_primary_colour || "#6a2e3e"} className="w-full rounded-xl border border-zinc-300 px-3 py-2" />
            </label>
            <label className="text-sm">
              <span className="block text-zinc-600 mb-1">Secondary color</span>
              <input name="brand_secondary_colour" defaultValue={me?.profile?.brand_secondary_colour || "#faf6d0"} className="w-full rounded-xl border border-zinc-300 px-3 py-2" />
            </label>
          </div>

          <button className="btn w-fit" disabled={saving} type="submit">
            {saving ? "Saving…" : "Save changes"}
          </button>
          {msg && <div className="text-sm text-zinc-600">{msg}</div>}
        </form>
      </div>
    </div>
  );
}
