"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getReceiptDraft, issueReceipt } from "../actions";

type Draft = Awaited<ReturnType<typeof getReceiptDraft>>;

/**
 * Treasurer flow: open the claim, check the evidence, then issue the receipt.
 * Deliberately two steps - confirming a payment is an assertion that money
 * actually arrived, so it should not be a single stray click.
 */
export function IssueReceiptButton({ duesId }: { duesId: string }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [receiptNo, setReceiptNo] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [issued, setIssued] = useState<string | null>(null);

  async function open() {
    setBusy(true);
    setError(null);
    try {
      const d = await getReceiptDraft(duesId);
      setDraft(d);
      setReceiptNo(d.suggestedReceiptNo);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load this charge");
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    setBusy(true);
    setError(null);
    const result = await issueReceipt(duesId, receiptNo);
    setBusy(false);
    if (result.ok) {
      setIssued(result.receiptNo);
      setDraft(null);
      router.refresh();
    } else {
      setError(result.error);
    }
  }

  if (issued) {
    return (
      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
        Receipt {issued}
      </span>
    );
  }

  if (!draft) {
    return (
      <span className="flex items-center gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={open}
          className="rounded-full bg-brand-red px-3 py-0.5 text-xs font-semibold text-white hover:bg-brand-red-dark disabled:opacity-60"
        >
          {busy ? "Opening..." : "Verify & issue receipt"}
        </button>
        {error && <span className="text-xs text-brand-red">{error}</span>}
      </span>
    );
  }

  return (
    <div className="w-full rounded-lg border border-black/10 bg-zinc-50 p-3 text-left">
      <div className="text-xs font-semibold text-brand-black">
        Confirm payment received
      </div>
      <dl className="mt-2 grid gap-x-4 gap-y-1 text-xs sm:grid-cols-2">
        <div>
          <dt className="text-zinc-400">Member</dt>
          <dd>{draft.memberName ?? draft.memberEmail}</dd>
        </div>
        <div>
          <dt className="text-zinc-400">Charge</dt>
          <dd>
            {draft.periodLabel} &mdash; &#8358;{Number(draft.amount).toLocaleString()}
          </dd>
        </div>
        <div>
          <dt className="text-zinc-400">Member reference</dt>
          <dd className={draft.paymentReference ? "" : "text-zinc-400"}>
            {draft.paymentReference || "None supplied"}
          </dd>
        </div>
        <div>
          <dt className="text-zinc-400">Claimed</dt>
          <dd className={draft.paymentClaimedAt ? "" : "text-zinc-400"}>
            {draft.paymentClaimedAt
              ? new Date(draft.paymentClaimedAt).toLocaleString()
              : "Not claimed by the member"}
          </dd>
        </div>
      </dl>

      {!draft.paymentClaimed && (
        <p className="mt-2 rounded bg-amber-50 px-2 py-1 text-[11px] text-amber-800">
          This member has not claimed payment. Only issue a receipt if you have confirmed
          the money another way.
        </p>
      )}

      <label className="mt-3 block text-[11px] font-medium text-zinc-600">
        Receipt number
        <input
          value={receiptNo}
          onChange={(e) => setReceiptNo(e.target.value)}
          className="mt-1 w-full rounded border border-zinc-300 px-2 py-1 text-xs"
        />
      </label>
      <p className="mt-1 text-[10px] text-zinc-500">
        Next in the UTC-R series. Change it only to match a receipt already written by
        hand &mdash; it cannot be edited once issued.
      </p>

      {!draft.hasSignature && (
        <p className="mt-2 rounded bg-amber-50 px-2 py-1 text-[11px] text-amber-800">
          You have no signature on file, so a receipt cannot be issued yet.{" "}
          <Link href="/dashboard/settings" className="font-semibold underline">
            Add one in Settings
          </Link>
          , then reopen this claim &mdash; it prints on every receipt you confirm.
        </p>
      )}

      {error && <p className="mt-2 text-xs text-brand-red">{error}</p>}

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={busy || !receiptNo.trim() || !draft.hasSignature}
          onClick={confirm}
          className="rounded-full bg-brand-red px-3 py-1 text-xs font-semibold text-white disabled:opacity-60"
        >
          {busy ? "Issuing..." : "Confirm & issue"}
        </button>
        <button
          type="button"
          onClick={() => {
            setDraft(null);
            setError(null);
          }}
          className="rounded-full border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-700"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
