"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { publishGrading } from "../actions";

/**
 * Publishing is the point of no return: it applies every promotion and makes
 * the results visible to candidates. It asks for confirmation first, and states
 * plainly how many belts are about to change.
 */
export function PublishGradingButton({
  gradingId,
  unresolved,
  promoting,
}: {
  gradingId: string;
  unresolved: number;
  promoting: number;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (unresolved > 0) {
    return (
      <span className="text-xs text-zinc-500">
        {unresolved} candidate{unresolved === 1 ? "" : "s"} still unmarked
      </span>
    );
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="rounded-full bg-brand-red px-4 py-2 text-sm font-semibold text-white hover:bg-brand-red-dark"
      >
        Publish Results
      </button>
    );
  }

  return (
    <div className="w-full rounded-lg border border-yellow-200 bg-yellow-50 p-3">
      <p className="text-sm text-yellow-900">
        Publishing promotes {promoting} candidate{promoting === 1 ? "" : "s"} and makes every
        result visible to the members graded. It cannot be undone.
      </p>
      {error && <p className="mt-2 text-sm text-brand-red">{error}</p>}
      <div className="mt-3 flex gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError(null);
            try {
              await publishGrading(gradingId);
              router.refresh();
            } catch (err) {
              setError(err instanceof Error ? err.message : "Could not publish");
              setBusy(false);
            }
          }}
          className="rounded-full bg-brand-red px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {busy ? "Publishing..." : "Publish and Promote"}
        </button>
        <button
          type="button"
          onClick={() => {
            setConfirming(false);
            setError(null);
          }}
          className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
