"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createExternalExaminerInvite } from "../actions";

export function ExternalExaminerInviteForm({ gradingId }: { gradingId: string }) {
  const router = useRouter();
  const [examinerName, setExaminerName] = useState("");
  const [examinerEmail, setExaminerEmail] = useState("");
  const [invite, setInvite] = useState<{
    inviteUrl: string;
    expiresAt: string;
    emailSent: boolean;
    emailError: string | null;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setInvite(null);
    setCopyMessage(null);

    try {
      const result = await createExternalExaminerInvite({
        gradingId,
        examinerName,
        examinerEmail,
      });
      setInvite(result);
      setExaminerName("");
      setExaminerEmail("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create examiner link.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-black/10 bg-white p-6">
      <h2 className="font-semibold text-brand-black">External Examiner</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Invite an examiner to submit marks for this grading only. The private link expires
        after 7 days; creating a new invite revokes the previous link.
      </p>

      <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-medium text-zinc-700">
          Examiner name
          <input
            required
            maxLength={255}
            value={examinerName}
            onChange={(event) => setExaminerName(event.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm font-normal text-zinc-900"
          />
        </label>
        <label className="text-sm font-medium text-zinc-700">
          Examiner email
          <input
            required
            type="email"
            maxLength={255}
            value={examinerEmail}
            onChange={(event) => setExaminerEmail(event.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm font-normal text-zinc-900"
          />
        </label>
        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={busy}
            className="rounded-full bg-brand-red px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {busy ? "Creating link..." : "Create and email link"}
          </button>
        </div>
      </form>

      {error && <p className="mt-3 text-sm text-brand-red">{error}</p>}

      {invite && (
        <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm">
          <p className="font-medium text-blue-900">
            {invite.emailSent
              ? "Invitation email sent."
              : "The link was created, but the invitation email was not sent."}
          </p>
          {invite.emailError && (
            <p className="mt-1 text-xs text-blue-900">{invite.emailError}</p>
          )}
          <p className="mt-1 text-xs text-blue-900">
            Expires {new Date(invite.expiresAt).toLocaleString()}.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <input
              readOnly
              aria-label="External examiner link"
              value={invite.inviteUrl}
              onFocus={(event) => event.currentTarget.select()}
              className="min-w-0 flex-1 rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs text-zinc-800"
            />
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(invite.inviteUrl);
                  setCopyMessage("Link copied.");
                } catch {
                  setCopyMessage("Copy failed. Select the link and copy it manually.");
                }
              }}
              className="rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs font-medium text-blue-900"
            >
              Copy link
            </button>
          </div>
          {copyMessage && <p className="mt-1 text-xs text-blue-900">{copyMessage}</p>}
        </div>
      )}
    </div>
  );
}
