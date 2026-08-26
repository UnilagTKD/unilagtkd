"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { acceptGradingRequest, declineGradingRequest } from "./actions";

type OpenGrading = { id: string; title: string };

export function GradingRequestRow({
  requestId,
  studentName,
  targetLabel,
  note,
  eligible,
  blockers,
  openGradings,
}: {
  requestId: string;
  studentName: string;
  targetLabel: string;
  note: string | null;
  eligible: boolean;
  blockers: string[];
  openGradings: OpenGrading[];
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "accept" | "decline">("idle");
  const [gradingId, setGradingId] = useState(openGradings[0]?.id ?? "");
  const [overrideReason, setOverrideReason] = useState("");
  const [declineNote, setDeclineNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onAccept(e: React.FormEvent) {
    e.preventDefault();
    if (!gradingId) {
      setError("Select a grading to enter them into.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await acceptGradingRequest({
        requestId,
        gradingId,
        overrideReason: overrideReason.trim() || undefined,
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not accept the request.");
      setSubmitting(false);
    }
  }

  async function onDecline(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await declineGradingRequest(requestId, declineNote.trim() || undefined);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not decline the request.");
      setSubmitting(false);
    }
  }

  return (
    <li className="py-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <span className="font-medium text-brand-black">{studentName}</span>
          <span className="ml-2 text-sm text-zinc-500">requesting {targetLabel}</span>
        </div>
        {eligible ? (
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
            Meets requirements
          </span>
        ) : (
          <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
            Does not meet requirements
          </span>
        )}
      </div>

      {note && <p className="mt-1 text-xs italic text-zinc-500">&ldquo;{note}&rdquo;</p>}

      {!eligible && blockers.length > 0 && (
        <ul className="mt-1 list-inside list-disc text-xs text-zinc-600">
          {blockers.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      )}

      {mode === "idle" && (
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => setMode("accept")}
            className="rounded-full bg-brand-red px-3 py-1 text-xs font-semibold text-white hover:bg-brand-red-dark"
          >
            Accept
          </button>
          <button
            type="button"
            onClick={() => setMode("decline")}
            className="rounded-full border border-zinc-300 px-3 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
          >
            Decline
          </button>
        </div>
      )}

      {mode === "accept" && (
        <form onSubmit={onAccept} className="mt-3 space-y-2 rounded-lg bg-zinc-50 p-3">
          {openGradings.length === 0 ? (
            <p className="text-xs text-brand-red">
              No open grading to enter them into &mdash; create one above first.
            </p>
          ) : (
            <select
              value={gradingId}
              onChange={(e) => setGradingId(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-1.5 text-xs"
            >
              {openGradings.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.title}
                </option>
              ))}
            </select>
          )}
          {!eligible && (
            <input
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              placeholder="Reason for entering despite unmet requirements (required)"
              className="w-full rounded-lg border border-zinc-300 px-3 py-1.5 text-xs"
            />
          )}
          {error && <p className="text-xs text-brand-red">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting || openGradings.length === 0}
              className="rounded-full bg-brand-red px-3 py-1 text-xs font-semibold text-white disabled:opacity-60"
            >
              {submitting ? "..." : "Confirm Accept"}
            </button>
            <button
              type="button"
              onClick={() => setMode("idle")}
              className="rounded-full border border-zinc-300 px-3 py-1 text-xs text-zinc-700"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {mode === "decline" && (
        <form onSubmit={onDecline} className="mt-3 space-y-2 rounded-lg bg-zinc-50 p-3">
          <input
            value={declineNote}
            onChange={(e) => setDeclineNote(e.target.value)}
            placeholder="Reason (optional, shown to the member)"
            className="w-full rounded-lg border border-zinc-300 px-3 py-1.5 text-xs"
          />
          {error && <p className="text-xs text-brand-red">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-full border border-brand-red px-3 py-1 text-xs font-semibold text-brand-red hover:bg-brand-red hover:text-white disabled:opacity-60"
            >
              {submitting ? "..." : "Confirm Decline"}
            </button>
            <button
              type="button"
              onClick={() => setMode("idle")}
              className="rounded-full border border-zinc-300 px-3 py-1 text-xs text-zinc-700"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </li>
  );
}
