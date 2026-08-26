"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  assessGrading,
  beltById,
  buildPromotion,
  criteriaFor,
  isPromoting,
  rankById,
  suggestedAward,
  MAX_CRITERION_SCORE,
  OUTCOME_LABELS,
  OUTCOME_STYLES,
  type CriterionScores,
  type GradingCriterionId,
} from "@/lib/grading";
import { saveCandidateScores, setCandidateAttendance, removeGradingCandidate } from "../actions";

type Candidate = {
  id: string;
  name: string;
  fromLabel: string;
  toLabel: string;
  fromRankId: string;
  toBeltId: string;
  awardedRankId: string | null;
  isDouble: boolean;
  outcome: string;
  totalScore: string | null;
  examinerNotes: string | null;
  overrideReason: string | null;
  scores: Record<GradingCriterionId, number | null>;
  valid: boolean;
};

export function CandidateScoring({
  candidate,
  readOnly,
}: {
  candidate: Candidate;
  readOnly: boolean;
}) {
  const router = useRouter();
  const [scores, setScores] = useState<CriterionScores>(candidate.scores);
  const [notes, setNotes] = useState(candidate.examinerNotes ?? "");
  // Empty means "use the standard award for this result" - the panel only has
  // to touch this when they want a different grade inside the belt.
  const [award, setAward] = useState<string>(candidate.awardedRankId ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const from = rankById(candidate.fromRankId);
  const to = beltById(candidate.toBeltId);

  if (!candidate.valid || !from || !to) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        <div className="font-semibold">{candidate.name}</div>
        <p className="mt-1 text-xs">
          This entry refers to a rank or belt no longer on the club ladder
          ({candidate.fromLabel} to {candidate.toLabel}) and cannot be marked. Remove it and
          enter the candidate again.
        </p>
        {!readOnly && (
          <button
            type="button"
            onClick={async () => {
              await removeGradingCandidate(candidate.id);
              router.refresh();
            }}
            className="mt-2 rounded-full border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700"
          >
            Remove
          </button>
        )}
      </div>
    );
  }

  const promotion = buildPromotion(from, to);
  const criteria = criteriaFor(to);
  const sitting = candidate.outcome !== "absent" && candidate.outcome !== "withdrawn";

  // The same assessment the server will run, so the panel sees the verdict its
  // marks produce before committing them. The server recomputes on save - this
  // is a preview, never the source of the stored outcome.
  const preview = assessGrading(promotion, scores);

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  const shownOutcome = saved || !sitting ? candidate.outcome : preview.outcome;

  return (
    <div className="rounded-lg border border-black/10 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-brand-black">{candidate.name}</span>
            {candidate.isDouble && (
              <span className="rounded-full bg-brand-red/10 px-2 py-0.5 text-xs font-medium text-brand-red">
                Double
              </span>
            )}
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${OUTCOME_STYLES[shownOutcome]}`}
            >
              {OUTCOME_LABELS[shownOutcome]}
            </span>
          </div>
          <div className="mt-1 text-xs text-zinc-500">
            {candidate.fromLabel} &rarr; {candidate.toLabel} · pass {promotion.passMark}% · min{" "}
            {promotion.minCriterionScore}/{MAX_CRITERION_SCORE} per component
          </div>
          <div className="mt-0.5 text-xs text-zinc-500">
            Poomsae: {promotion.requiredPoomsae.join(" + ") || "none"}
            {to.externallyCertified && " · Dan rank, subject to Kukkiwon/NTF certification"}
          </div>
        </div>

        {!readOnly && (
          <div className="flex flex-none flex-wrap gap-2">
            {sitting ? (
              <>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => run(() => setCandidateAttendance(candidate.id, "absent"))}
                  className="rounded-full border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
                >
                  Absent
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => run(() => setCandidateAttendance(candidate.id, "withdrawn"))}
                  className="rounded-full border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
                >
                  Withdraw
                </button>
              </>
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={() => run(() => setCandidateAttendance(candidate.id, "reinstate"))}
                className="rounded-full border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
              >
                Reinstate
              </button>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={() => run(() => removeGradingCandidate(candidate.id))}
              className="rounded-full border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-500 hover:bg-zinc-50 disabled:opacity-60"
            >
              Remove
            </button>
          </div>
        )}
      </div>

      {candidate.overrideReason && (
        <p className="mt-3 rounded-md bg-yellow-50 p-2 text-xs text-yellow-900">
          <span className="font-semibold">Entered on override:</span>{" "}
          {candidate.overrideReason}
        </p>
      )}

      {!sitting ? (
        <p className="mt-3 text-xs text-zinc-500">
          Marked {OUTCOME_LABELS[candidate.outcome].toLowerCase()}. No marks are recorded.
        </p>
      ) : (
        <>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[440px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="py-2">Component</th>
                  <th className="py-2 w-20">Weight</th>
                  <th className="py-2 w-28">Mark /10</th>
                  <th className="py-2 w-24">Contributes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {criteria.map((c) => {
                  const row = preview.breakdown.find((b) => b.id === c.id)!;
                  return (
                    <tr key={c.id}>
                      <td className="py-2">
                        <div className="font-medium text-brand-black">{c.label}</div>
                        <div className="text-xs text-zinc-500">{c.ko}</div>
                      </td>
                      <td className="py-2 text-zinc-600">{c.weight}</td>
                      <td className="py-2">
                        <input
                          type="number"
                          min={0}
                          max={MAX_CRITERION_SCORE}
                          step={1}
                          disabled={readOnly || busy}
                          value={scores[c.id] ?? ""}
                          onChange={(e) => {
                            const raw = e.target.value;
                            setSaved(false);
                            setScores((s) => ({
                              ...s,
                              [c.id]: raw === "" ? null : Number(raw),
                            }));
                          }}
                          className={`w-20 rounded-lg border px-2 py-1 text-sm focus:outline-none focus:ring-1 ${
                            row.belowMinimum
                              ? "border-red-300 text-red-700 focus:border-red-400 focus:ring-red-400"
                              : "border-zinc-300 text-zinc-900 focus:border-brand-red focus:ring-brand-red"
                          }`}
                        />
                      </td>
                      <td className="py-2 text-zinc-600">
                        {row.score === null ? "-" : `${row.contribution} / ${c.weight}`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-3 rounded-md bg-zinc-50 p-3 text-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="font-semibold text-brand-black">
                {preview.complete ? `${preview.total}%` : `${preview.total}% so far`}
              </span>
              <span className="text-xs text-zinc-600">{preview.summary}</span>
            </div>
          </div>

          {!readOnly && (
            <>
              {/*
                The grade inside the belt is the panel's call, not the system's.
                A default is suggested from the result - top of the belt for a
                distinction, bottom for a plain pass - but the examiners set it.
              */}
              {isPromoting(preview.outcome) && promotion.awardable.length > 1 && (
                <label className="mt-3 block">
                  <span className="text-xs font-medium text-zinc-700">
                    Grade awarded within {promotion.to.name}
                  </span>
                  <select
                    value={award}
                    disabled={busy}
                    onChange={(e) => {
                      setAward(e.target.value);
                      setSaved(false);
                    }}
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-brand-red focus:outline-none focus:ring-1 focus:ring-brand-red"
                  >
                    <option value="">
                      Standard for this result
                      {suggestedAward(promotion, preview.outcome)
                        ? ` (${suggestedAward(promotion, preview.outcome)!.grade})`
                        : ""}
                    </option>
                    {promotion.awardable.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.grade}
                        {r.requiredPoomsae ? ` · ${r.requiredPoomsae}` : ""}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <label className="mt-3 block">
                <span className="text-xs font-medium text-zinc-700">Examiner notes</span>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => {
                    setNotes(e.target.value);
                    setSaved(false);
                  }}
                  placeholder="What to work on before the next grading."
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-brand-red focus:outline-none focus:ring-1 focus:ring-brand-red"
                />
              </label>

              <div className="mt-3 flex items-center gap-3">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      await saveCandidateScores({
                        candidateId: candidate.id,
                        scores,
                        examinerNotes: notes,
                        awardedRankId: award || null,
                      });
                      setSaved(true);
                    })
                  }
                  className="rounded-full bg-brand-red px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {busy ? "Saving..." : "Save Marks"}
                </button>
                {saved && <span className="text-sm text-green-600">Saved.</span>}
              </div>
            </>
          )}

          {readOnly && candidate.examinerNotes && (
            <p className="mt-3 text-xs text-zinc-600">
              <span className="font-semibold">Examiner notes:</span> {candidate.examinerNotes}
            </p>
          )}
        </>
      )}

      {error && <p className="mt-2 text-sm text-brand-red">{error}</p>}
    </div>
  );
}
