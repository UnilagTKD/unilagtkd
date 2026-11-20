"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { closeAttendancePeriod, openAttendancePeriod } from "./period-actions";
import { Field, inputClass } from "@/components/form/fields";
import { lagosToday } from "@/lib/members";

export function AttendancePeriodControls({ active }: { active: { id: string; name: string; startsOn: string } | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false), [message, setMessage] = useState<string | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);
  return <section className="space-y-4 rounded-xl border border-black/10 bg-white p-4 sm:p-6">
    <h2 className="font-semibold">Attendance periods</h2>
    {active ? <>
      <p className="text-sm"><strong>{active.name}</strong> is in progress from {active.startsOn}. End it before opening another period.</p>
      {!confirmClose ? <button type="button" onClick={() => setConfirmClose(true)} className="rounded-full border border-brand-red px-4 py-2 text-sm font-semibold text-brand-red">End this period</button> : <form className="space-y-3" onSubmit={async event => {
        event.preventDefault(); setBusy(true); setMessage(null);
        const end = String(new FormData(event.currentTarget).get("endsOn"));
        try { const result = await closeAttendancePeriod(active.id, end); if (result.ok) { setMessage("Period closed and saved for review."); setConfirmClose(false); router.push("/dashboard/coach/attendance"); router.refresh(); } else setMessage(result.error); }
        catch { setMessage("Could not close the period. Please try again."); } finally { setBusy(false); }
      }}>
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Finish recording attendance first. Ending this period freezes its records and percentages for review. It cannot be reopened or edited.</p>
        <Field label="Last day of this period"><input className={inputClass} name="endsOn" type="date" min={active.startsOn} max={lagosToday()} defaultValue={lagosToday()} required /></Field>
        <div className="flex flex-wrap gap-3"><button disabled={busy} className="rounded-full bg-brand-red px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{busy ? "Saving archive..." : "End and archive period"}</button><button type="button" disabled={busy} onClick={() => setConfirmClose(false)} className="text-sm text-zinc-600">Cancel</button></div>
      </form>}
    </> : <form className="space-y-3" onSubmit={async event => {
      event.preventDefault(); setBusy(true); setMessage(null); const form = new FormData(event.currentTarget);
      try { const result = await openAttendancePeriod({ name: String(form.get("name")), startsOn: String(form.get("startsOn")), notes: String(form.get("notes") || "") }); if (result.ok) { setMessage("New period started. Attendance thresholds now use this period only."); router.push("/dashboard/coach/attendance"); router.refresh(); } else setMessage(result.error); }
      catch { setMessage("Could not start the period. Please try again."); } finally { setBusy(false); }
    }}>
      <p className="text-sm text-zinc-600">No period is in progress. Create one to start monitoring attendance and recording new sessions.</p>
      <Field label="Period / semester name"><input name="name" className={inputClass} placeholder="2026/2027 First Semester" minLength={2} maxLength={150} required /></Field>
      <Field label="Start date"><input name="startsOn" type="date" className={inputClass} defaultValue={lagosToday()} max={lagosToday()} required /></Field>
      <Field label="Notes (optional)"><textarea name="notes" rows={2} maxLength={2000} className={inputClass} /></Field>
      <button disabled={busy} className="rounded-full bg-brand-blue px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{busy ? "Starting..." : "Start new attendance period"}</button>
    </form>}
    {message && <p role="status" className="text-sm text-zinc-700">{message}</p>}
  </section>;
}
