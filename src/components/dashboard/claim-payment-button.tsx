"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { claimDuesPayment } from "@/app/dashboard/actions";

export function ClaimPaymentButton({ duesId }: { duesId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reference, setReference] = useState("");
  const [saving, setSaving] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full border border-brand-red px-3 py-1 text-xs font-semibold text-brand-red hover:bg-brand-red hover:text-white"
      >
        Verify Payment
      </button>
    );
  }

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setSaving(true);
        await claimDuesPayment(duesId, reference);
        setSaving(false);
        setOpen(false);
        router.refresh();
      }}
      className="flex items-center gap-2"
    >
      <input
        value={reference}
        onChange={(e) => setReference(e.target.value)}
        placeholder="Transfer reference (optional)"
        className="w-40 rounded-full border border-zinc-300 px-3 py-1 text-xs focus:border-brand-red focus:outline-none"
      />
      <button
        type="submit"
        disabled={saving}
        className="rounded-full bg-brand-red px-3 py-1 text-xs font-semibold text-white disabled:opacity-60"
      >
        {saving ? "..." : "Verify"}
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="text-xs text-zinc-500 hover:underline"
      >
        Cancel
      </button>
    </form>
  );
}
