"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { reportPayment } from "@/app/dashboard/actions";

export function ReportPaymentButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [periodLabel, setPeriodLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full bg-brand-red px-5 py-2 text-sm font-semibold text-white hover:bg-brand-red-dark"
      >
        Verify Payment
      </button>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await reportPayment({ periodLabel, amount, reference });
      setOpen(false);
      setPeriodLabel("");
      setAmount("");
      setReference("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="rounded-lg border border-black/10 bg-zinc-50 p-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-xs font-medium text-zinc-600 sm:col-span-2">
          What was this for?
          <input
            value={periodLabel}
            onChange={(e) => setPeriodLabel(e.target.value)}
            placeholder="e.g. 2026 Reactivation"
            required
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs font-medium text-zinc-600">
          Amount (&#8358;)
          <input
            type="number"
            min="1"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
          />
        </label>
      </div>
      <label className="mt-3 block text-xs font-medium text-zinc-600">
        Transfer reference (optional)
        <input
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
        />
      </label>

      {error && <p className="mt-2 text-xs text-brand-red">{error}</p>}

      <div className="mt-3 flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-brand-red px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
        >
          {saving ? "Submitting..." : "Submit for confirmation"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-full border border-zinc-300 px-4 py-1.5 text-xs font-medium text-zinc-700"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
