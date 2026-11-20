"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GradingFees } from "@/components/dashboard/grading-fees";
import type { GradingFeeEvent } from "@/lib/grading-fees";
import { requestGrading } from "./actions";

export function RequestGradingButton({ targetBeltId, events }: { targetBeltId: string; events: GradingFeeEvent[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await requestGrading(targetBeltId, note);
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit the request.");
    } finally {
      setSubmitting(false);
      setOpen(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 w-full sm:w-auto rounded-full bg-brand-red px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-red-dark"
      >
        Request to Grade
      </button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-3 space-y-2">
      <GradingFees events={events} />
      <label htmlFor={`grading-note-${targetBeltId}`} className="block text-sm font-medium">Note for the coaches (optional)</label>
      <textarea
        id={`grading-note-${targetBeltId}`}
        maxLength={2000}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Optional note for the coaches"
        rows={2}
        className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-xs focus:border-brand-red focus:outline-none"
      />
      {error && <p className="text-xs text-brand-red">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-full bg-brand-red px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {submitting ? "Sending..." : "Send Request"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-full border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
