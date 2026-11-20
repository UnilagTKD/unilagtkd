"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MAX_CRITERION_SCORE, type CriterionScores, type GradingCriterionId } from "@/lib/grading";
import { saveExternalExaminerMarks } from "@/app/dashboard/coach/grading/actions";

type Criterion = {
  id: GradingCriterionId;
  label: string;
  ko: string;
  description: string;
};

export function ExaminerMarksForm({
  token,
  candidateId,
  candidateName,
  fromLabel,
  toLabel,
  requiredPoomsae,
  criteria,
  initialScores,
  initialNotes,
  submittedAt,
  disabled,
}: {
  token: string;
  candidateId: string;
  candidateName: string;
  fromLabel: string;
  toLabel: string;
  requiredPoomsae: string[];
  criteria: readonly Criterion[];
  initialScores: CriterionScores;
  initialNotes: string | null;
  submittedAt: string | null;
  disabled: boolean;
}) {
  const router = useRouter();
  const [scores, setScores] = useState<CriterionScores>(initialScores);
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(submittedAt);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await saveExternalExaminerMarks({
        token,
        candidateId,
        scores,
        notes,
      });
      setSavedAt(result.submittedAt);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit marks.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-black/10 bg-white p-5">
      <div>
        <h2 className="font-semibold text-brand-black">{candidateName}</h2>
        <p className="mt-1 text-xs text-zinc-500">
          {fromLabel} &rarr; {toLabel}
        </p>
        {requiredPoomsae.length > 0 && (
          <p className="mt-1 text-xs text-zinc-600">
            Forms for reference: {requiredPoomsae.join(", ")}
          </p>
        )}
      </div>

      {disabled ? (
        <p className="mt-4 rounded-lg bg-zinc-100 p-3 text-sm text-zinc-600">
          This candidate is absent or withdrawn and cannot receive examiner marks.
        </p>
      ) : (
        <>
          <div className="mt-4 space-y-3">
            {criteria.map((criterion) => (
              <label
                key={criterion.id}
                className="grid gap-2 rounded-lg border border-black/5 p-3 sm:grid-cols-[1fr_auto]"
              >
                <span>
                  <span className="block text-sm font-medium text-brand-black">
                    {criterion.label} <span className="text-xs text-zinc-500">({criterion.ko})</span>
                  </span>
                  <span className="mt-0.5 block text-xs text-zinc-500">
                    {criterion.description}
                  </span>
                </span>
                <span className="flex items-center gap-2 text-xs text-zinc-500">
                  Mark /{MAX_CRITERION_SCORE}
                  <input
                    type="number"
                    min={0}
                    max={MAX_CRITERION_SCORE}
                    step={1}
                    value={scores[criterion.id] ?? ""}
                    onChange={(event) => {
                      const raw = event.target.value;
                      setScores((current) => ({
                        ...current,
                        [criterion.id]: raw === "" ? null : Number(raw),
                      }));
                    }}
                    className="w-20 rounded-lg border border-zinc-300 px-2 py-1 text-sm text-zinc-900"
                  />
                </span>
              </label>
            ))}
          </div>

          <label className="mt-4 block text-sm font-medium text-zinc-700">
            Examiner notes (optional)
            <textarea
              rows={3}
              maxLength={5000}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm font-normal text-zinc-900"
            />
          </label>
          <p className="mt-2 text-xs text-zinc-500">
            Marks are submitted for the coach to review. They do not calculate a total or
            determine the final result.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={busy}
              className="rounded-full bg-brand-red px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {busy ? "Submitting..." : "Submit marks"}
            </button>
            {savedAt && (
              <span className="text-xs text-green-700">
                Submitted {new Date(savedAt).toLocaleString()}
              </span>
            )}
          </div>
          {error && <p className="mt-2 text-sm text-brand-red">{error}</p>}
        </>
      )}
    </form>
  );
}
