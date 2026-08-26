"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Field, inputClass } from "@/components/form/fields";
import { submitLeaveRequest } from "../actions";
import { LEAVE_REASONS, LEAVE_REASON_LABELS, type LeaveReason } from "@/lib/exco";

export function LeaveRequestForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const form = new FormData(e.currentTarget);

    try {
      await submitLeaveRequest({
        reasonCategory: String(form.get("reasonCategory")) as LeaveReason,
        startDate: String(form.get("startDate")),
        endDate: String(form.get("endDate")),
        details: String(form.get("details")),
      });
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send that request");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full bg-brand-red px-4 py-2 text-sm font-semibold text-white hover:bg-brand-red-dark"
      >
        + Request Leave
      </button>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="grid gap-4 rounded-lg border border-black/10 p-4 sm:grid-cols-2"
    >
      <Field label="Reason">
        <select name="reasonCategory" required defaultValue="" className={inputClass}>
          <option value="" disabled>
            Select
          </option>
          {LEAVE_REASONS.map((reason) => (
            <option key={reason} value={reason}>
              {LEAVE_REASON_LABELS[reason]}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Details">
        <input
          name="details"
          required
          minLength={5}
          placeholder="e.g. Ankle sprain, cleared to return after physio"
          className={inputClass}
        />
      </Field>
      <Field label="From">
        <input name="startDate" type="date" required className={inputClass} />
      </Field>
      <Field label="Until">
        <input name="endDate" type="date" required className={inputClass} />
      </Field>

      {error && <p className="text-xs text-brand-red sm:col-span-2">{error}</p>}

      <div className="flex gap-3 sm:col-span-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-full bg-brand-red px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {submitting ? "Sending..." : "Send Request"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
