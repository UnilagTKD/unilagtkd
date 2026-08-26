"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Field, inputClass } from "@/components/form/fields";
import { toDateInput } from "@/lib/grading";
import { createGrading } from "./actions";

export function CreateGradingForm() {
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
      const { id } = await createGrading({
        title: String(form.get("title")),
        date: String(form.get("date")),
        location: String(form.get("location") || ""),
        notes: String(form.get("notes") || ""),
        fee: String(form.get("fee") || ""),
      });
      setOpen(false);
      router.push(`/dashboard/coach/grading/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the grading");
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
        + New Grading
      </button>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="w-full space-y-4 rounded-xl border border-black/10 bg-white p-5"
    >
      <Field label="Title">
        <input
          name="title"
          required
          placeholder="e.g. Michaelmas Geup Grading"
          className={inputClass}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Date">
          <input
            type="date"
            name="date"
            required
            defaultValue={toDateInput(new Date())}
            className={inputClass}
          />
        </Field>
        <Field label="Location">
          <input name="location" className={inputClass} />
        </Field>
      </div>
      <Field label="Grading Fee (NGN)">
        <input
          name="fee"
          type="number"
          min="0"
          step="50"
          placeholder="Leave blank to set later"
          className={inputClass}
        />
        <p className="mt-1 text-xs text-zinc-500">
          Charged to each candidate when they are entered. You can set or change this
          afterwards - candidates already entered will be billed then.
        </p>
      </Field>
      <Field label="Notes">
        <textarea name="notes" rows={2} className={inputClass} />
      </Field>
      {error && <p className="text-sm text-brand-red">{error}</p>}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-full bg-brand-red px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {submitting ? "Creating..." : "Create Grading"}
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
