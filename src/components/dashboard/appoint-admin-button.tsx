"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { appointAdmin } from "@/app/dashboard/actions";

export function AppointAdminButton({ userId, name }: { userId: string; name: string }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  return <div>
    <button type="button" disabled={saving} className="rounded-full bg-brand-red px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" onClick={async () => {
      if (!window.confirm(`Give ${name} administrator access? This replaces their current role and lets them approve accounts, verify profile changes, manage roles, and edit website content.`)) return;
      setSaving(true); setMessage("");
      try {
        await appointAdmin(userId);
        window.alert(`${name} now has administrator access.`);
        router.refresh();
      } catch (error) { setMessage(error instanceof Error ? error.message : "Could not appoint admin. Please try again."); }
      finally { setSaving(false); }
    }}>{saving ? "Appointing…" : "Make admin"}</button>
    {message && <p role="alert" className="mt-2 text-sm text-brand-red">{message}</p>}
  </div>;
}
