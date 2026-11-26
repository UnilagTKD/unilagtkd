"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Field, inputClass } from "@/components/form/fields";
import { createDuesCharge } from "../actions";

// Kept in sync with the ALL_MEMBERS sentinel in ../actions.ts.
const ALL_MEMBERS = "__all__";

export function DuesChargeForm({ students, existingDebt = false }: { students: { id: string; name: string }[]; existingDebt?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setResult(null);
    setError(null);
    const form = new FormData(e.currentTarget);
    const userId = String(form.get("userId"));
    try {
      const outcome = await createDuesCharge({
        userId,
        periodLabel: String(form.get("periodLabel")),
        amount: String(form.get("amount")),
        existingDebt,
      });
      if (existingDebt && outcome.skipped) {
        setError("This member already has an entry with the same purpose and amount.");
        return;
      }
      if (userId === ALL_MEMBERS) {
        setResult(
          outcome.skipped > 0
            ? `Charged ${outcome.charged} member(s). Skipped ${outcome.skipped} already charged for this period.`
            : `Charged ${outcome.charged} member(s).`
        );
      } else {
        if (existingDebt) setResult("Debt allocated. The member can see it in Payments.");
        setOpen(false);
      }
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not save charge.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => {
            setResult(null);
            setError(null);
            setOpen(true);
          }}
          className="rounded-full bg-brand-red px-4 py-2 text-sm font-semibold text-white hover:bg-brand-red-dark"
        >
          {existingDebt ? "+ Allocate debt" : "+ New Dues Charge"}
        </button>
        {result && <p role="status" className="text-sm text-green-700">{result}</p>}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 rounded-lg border border-black/10 p-4 sm:grid-cols-3">
      <Field label="Member">
        <select name="userId" required className={inputClass} defaultValue="">
          <option value="" disabled>
            Select
          </option>
          {!existingDebt && <option value={ALL_MEMBERS}>All Members</option>}
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label={existingDebt ? "Debt purpose / original semester" : "Period Label"}>
        <input name="periodLabel" maxLength={100} required placeholder="e.g. 2026 Reactivation" className={inputClass} />
      </Field>
      <Field label="Amount (₦)">
        <input name="amount" type="number" min="0.01" step="0.01" required className={inputClass} />
      </Field>
      {result && <p role="status" className="text-xs font-medium text-green-700 sm:col-span-3">{result}</p>}
      {error && <p role="alert" className="text-xs font-medium text-brand-red sm:col-span-3">{error}</p>}
      <div className="flex gap-3 sm:col-span-3">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-full bg-brand-red px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {submitting ? "Saving..." : existingDebt ? "Allocate debt" : "Add Charge"}
        </button>
        <button
          type="button"
          disabled={submitting}
          onClick={() => setOpen(false)}
          className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
