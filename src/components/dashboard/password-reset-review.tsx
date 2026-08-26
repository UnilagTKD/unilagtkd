"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { issuePasswordResetLink, dismissPasswordResetRequest } from "@/app/dashboard/actions";

export type ResetRequest = {
  id: string;
  email: string;
  fullName: string | null;
  resetRequestedAt: Date | null;
};

export function PasswordResetReview({ request }: { request: ResetRequest }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"issue" | "dismiss" | null>(null);
  const [resetLink, setResetLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function issue() {
    setBusy("issue");
    setError(null);
    const result = await issuePasswordResetLink(request.id);
    setBusy(null);
    if (result.ok) setResetLink(result.resetLink);
    else setError(result.error);
    router.refresh();
  }

  async function dismiss() {
    setBusy("dismiss");
    await dismissPasswordResetRequest(request.id);
    setBusy(null);
    router.refresh();
  }

  if (resetLink) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm">
        <p className="font-medium text-green-800">
          Reset link for {request.fullName || request.email}. Valid 24 hours, single use.
        </p>
        <code className="mt-2 block break-all rounded bg-white p-2 text-xs text-zinc-700">
          {typeof window !== "undefined" ? window.location.origin : ""}
          {resetLink}
        </code>
        <p className="mt-2 text-xs text-green-800">
          Send this only to the member themselves. Anyone holding it can take over the
          account.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-black/10 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-semibold text-brand-black">
            {request.fullName || request.email}
          </div>
          <div className="text-xs text-zinc-500">
            {request.email}
            {request.resetRequestedAt
              ? ` · requested ${new Date(request.resetRequestedAt).toLocaleString()}`
              : null}
          </div>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            disabled={busy !== null}
            onClick={issue}
            className="rounded-full bg-brand-red px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
          >
            {busy === "issue" ? "Issuing..." : "Issue reset link"}
          </button>
          <button
            type="button"
            disabled={busy !== null}
            onClick={dismiss}
            className="rounded-full border border-zinc-300 px-4 py-1.5 text-xs font-medium text-zinc-700 disabled:opacity-60"
          >
            {busy === "dismiss" ? "Dismissing..." : "Dismiss"}
          </button>
        </div>
      </div>

      <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
        Confirm this is really them before issuing &mdash; in person, or on a number
        already on file. A reset link is full access to the account.
      </p>

      {error && <p className="mt-2 text-xs text-brand-red">{error}</p>}
    </div>
  );
}
