"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Field, inputClass } from "@/components/form/fields";
import { registerGradingCandidate } from "../actions";

type Option = {
  targetBeltId: string;
  targetLabel: string;
  isDouble: boolean;
  eligible: boolean;
  blockers: string[];
};

type Member = {
  id: string;
  name: string;
  currentRank: string;
  rankInferred: boolean;
  options: Option[];
};

export function AddCandidateForm({
  gradingId,
  members,
}: {
  gradingId: string;
  members: Member[];
}) {
  const router = useRouter();
  const [memberId, setMemberId] = useState("");
  const [targetBeltId, setTargetBeltId] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const member = members.find((m) => m.id === memberId);
  const option = member?.options.find((o) => o.targetBeltId === targetBeltId);

  function pickMember(id: string) {
    setMemberId(id);
    setError(null);
    setOverrideReason("");
    // Default to the single step, which is the first option offered.
    const next = members.find((m) => m.id === id);
    setTargetBeltId(next?.options[0]?.targetBeltId ?? "");
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!memberId || !targetBeltId) return;
    setSubmitting(true);
    setError(null);
    try {
      await registerGradingCandidate({
        gradingId,
        userId: memberId,
        targetBeltId,
        overrideReason: overrideReason.trim() || undefined,
      });
      setMemberId("");
      setTargetBeltId("");
      setOverrideReason("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not enter this candidate");
    } finally {
      setSubmitting(false);
    }
  }

  if (members.length === 0) {
    return (
      <p className="mt-3 text-sm text-zinc-500">
        Everyone on the roster is either already entered or at the top of the ladder.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Member">
          <select
            value={memberId}
            onChange={(e) => pickMember(e.target.value)}
            className={inputClass}
          >
            <option value="">Select a member...</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.currentRank})
              </option>
            ))}
          </select>
        </Field>

        <Field label="Grading to">
          <select
            value={targetBeltId}
            onChange={(e) => {
              setTargetBeltId(e.target.value);
              setError(null);
            }}
            disabled={!member}
            className={inputClass}
          >
            {member ? (
              member.options.map((o) => (
                <option key={o.targetBeltId} value={o.targetBeltId}>
                  {o.targetLabel} · {o.isDouble ? "double" : "single"}
                  {o.eligible ? "" : " · guidance"}
                </option>
              ))
            ) : (
              <option value="">Select a member first</option>
            )}
          </select>
        </Field>
      </div>

      {member?.rankInferred && (
        <p className="rounded-lg bg-yellow-50 p-3 text-xs text-yellow-800">
          {member.name} has no exact grade on file. {member.currentRank} was assumed from their
          profile - confirm it before examining, since it sets what they are graded to.
        </p>
      )}

      {option && !option.eligible && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-xs text-yellow-900">
          <div className="font-semibold">Eligibility guidance for {member?.name}:</div>
          <ul className="mt-1 list-inside list-disc">
            {option.blockers.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
          <p className="mt-2">
            These are recommendations only. They do not prevent a coach from entering or
            promoting the candidate.
          </p>
        </div>
      )}

      {option?.isDouble && (
        <p className="rounded-lg bg-blue-50 p-3 text-xs text-blue-800">
          A double grading to {option.targetLabel}: it skips a belt outright, so the candidate
          performs the forms across both belts. The panel makes the final decision and picks
          the geup within the target belt when marking.
        </p>
      )}

      {option && !option.eligible && (
        <Field label="Coach note on eligibility (optional)">
          <textarea
            value={overrideReason}
            onChange={(e) => setOverrideReason(e.target.value)}
            rows={2}
            placeholder="Optional context for the panel."
            className={inputClass}
          />
        </Field>
      )}

      {error && <p className="text-sm text-brand-red">{error}</p>}

      <button
        type="submit"
        disabled={submitting || !memberId || !targetBeltId}
        className="rounded-full bg-brand-red px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {submitting ? "Entering..." : "Enter Candidate"}
      </button>
    </form>
  );
}
