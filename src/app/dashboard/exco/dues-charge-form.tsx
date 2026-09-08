"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Field, inputClass } from "@/components/form/fields";
import { createDuesCharge } from "../actions";

// Kept in sync with the ALL_MEMBERS sentinel in ../actions.ts.
const ALL_MEMBERS = "__all__";

export function DuesChargeForm({ students }: { students: { id: string; name: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);
    const form = new FormData(e.currentTarget);
    const userId = String(form.get("userId"));
    const outcome = await createDuesCharge({
      userId,
      periodLabel: String(form.get("periodLabel")),
      amount: String(form.get("amount")),
    });
    setSubmitting(false);
    if (userId === ALL_MEMBERS) {
      setResult(
        outcome.skipped > 0
          ? `Charged ${outcome.charged} member(s). Skipped ${outcome.skipped} already charged for this period.`
          : `Charged ${outcome.charged} member(s).`
      );
    } else {
      setOpen(false);
    }
    router.refresh();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full bg-brand-red px-4 py-2 text-sm font-semibold text-white hover:bg-brand-red-dark"
      >
        + New Dues Charge
      </button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 rounded-lg border border-black/10 p-4 sm:grid-cols-3">
      <Field label="Student">
        <select name="userId" required className={inputClass} defaultValue="">
          <option value="" disabled>
            Select
          </option>
          <option value={ALL_MEMBERS}>All Members</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Period Label">
        <input name="periodLabel" required placeholder="e.g. 2026 Reactivation" className={inputClass} />
      </Field>
      <Field label="Amount (₦)">
        <input name="amount" type="number" step="0.01" required className={inputClass} />
      </Field>
      {result && <p className="text-xs font-medium text-green-700 sm:col-span-3">{result}</p>}
      <div className="flex gap-3 sm:col-span-3">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-full bg-brand-red px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {submitting ? "Saving..." : "Add Charge"}
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
