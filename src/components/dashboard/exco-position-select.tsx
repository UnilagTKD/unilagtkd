"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { updateExcoPosition } from "@/app/dashboard/actions";
import { EXCO_POSITIONS, EXCO_POSITION_LABELS, EXCO_POSITION_LIMIT, excoPositionIsFull, type ExcoPosition } from "@/lib/exco";
import type { UserRole } from "@/types/next-auth";

type Success = Extract<Awaited<ReturnType<typeof updateExcoPosition>>, { ok: true }>;
type Feedback = { ok: true; change: Success } | { ok: false; error: string };
const positionLabel = (position: ExcoPosition | null) => position ? EXCO_POSITION_LABELS[position] : "Unassigned";

export function ExcoPositionSelect({ userId, currentRole, currentPosition, memberName = "Member", currentStatus = "active", positionCounts }: {
  userId: string;
  currentRole: UserRole;
  currentPosition: ExcoPosition | null;
  memberName?: string;
  currentStatus?: "active" | "inactive";
  positionCounts?: Partial<Record<ExcoPosition, number>>;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (feedback && dialog.current && !dialog.current.open) dialog.current.showModal();
  }, [feedback]);

  if (currentRole === "coach") return <span className="text-xs text-zinc-400">-</span>;
  const change = feedback?.ok ? feedback.change : null;

  return <div className="min-w-0">
    <select
      aria-label={`Exco office for ${memberName}`}
      value={currentPosition ?? ""}
      disabled={saving || (currentStatus === "inactive" && currentPosition === null)}
      onChange={async (event) => {
        const position = event.target.value === "" ? null : event.target.value as ExcoPosition;
        if (position === currentPosition) return;
        setSaving(true);
        try {
          const result = await updateExcoPosition(userId, position);
          setFeedback(result.ok ? { ok: true, change: result } : result);
          router.refresh();
        } catch {
          setFeedback({ ok: false, error: "Could not save this appointment. Check your access and try again." });
        } finally { setSaving(false); }
      }}
      className="w-full max-w-full rounded-md border border-zinc-300 px-2 py-1 text-xs disabled:opacity-60"
    >
      <option value="">Unassigned</option>
      {EXCO_POSITIONS.map((position) => {
        const occupied = positionCounts?.[position] ?? 0;
        const full = excoPositionIsFull(position, occupied, currentPosition);
        return <option key={position} value={position} disabled={full || currentStatus === "inactive"}>
          {EXCO_POSITION_LABELS[position]}{positionCounts ? ` (${occupied}/${EXCO_POSITION_LIMIT}${full ? ", full" : ""})` : ""}
        </option>;
      })}
    </select>
    {saving && <p role="status" className="mt-1 text-xs text-zinc-500">Saving appointment...</p>}
    <dialog ref={dialog} aria-labelledby={titleId} onClose={() => setFeedback(null)} className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-md rounded-xl border border-black/10 bg-white p-5 text-left shadow-xl backdrop:bg-black/50 sm:p-6">
      <h2 id={titleId} className="text-lg font-semibold text-brand-black">
        {change ? change.changed ? change.position ? "Exco appointment updated" : "Exco appointment removed" : "Appointment unchanged" : "Appointment not changed"}
      </h2>
      <p className="mt-2 break-words text-sm font-medium text-zinc-700">{memberName}</p>
      {change && <>
        <dl className="mt-4 space-y-3 text-sm">
          <div><dt className="text-zinc-500">Previous position</dt><dd className="font-medium">{positionLabel(change.previousPosition)}</dd></div>
          <div><dt className="text-zinc-500">Current position</dt><dd className="font-medium">{positionLabel(change.position)}</dd></div>
          {change.previousRole !== change.role && <div><dt className="text-zinc-500">Account role</dt><dd className="font-medium capitalize">{change.previousRole} &rarr; {change.role}</dd></div>}
        </dl>
        <p className="mt-4 text-sm text-zinc-600">{change.changed ? "Your change has been saved." : "This member already has the selected appointment."}</p>
      </>}
      {feedback && !feedback.ok && <p role="alert" className="mt-3 text-sm text-red-700">{feedback.error}</p>}
      <button type="button" onClick={() => dialog.current?.close()} className="mt-5 rounded-full bg-brand-blue px-5 py-2 text-sm font-semibold text-white">Close</button>
    </dialog>
  </div>;
}
