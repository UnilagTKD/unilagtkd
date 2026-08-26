"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Field, inputClass } from "@/components/form/fields";
import {
  addDays,
  toDateInput,
  DEFAULT_WINDOW_DAYS,
  type GradingWindowState,
} from "@/lib/grading";
import { openGradingWindow, closeGradingWindow } from "./actions";

/**
 * The on/off switch for the grading system. Closed is the resting state: the
 * club grades in periods, and a coach opens one as a grading approaches. A
 * window also lapses on its own at its end date, so nobody has to remember to
 * switch it back off.
 */
export function GradingWindowControl({
  state,
  note,
}: {
  state: GradingWindowState;
  note: string | null;
}) {
  const router = useRouter();
  const [opening, setOpening] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const today = toDateInput(new Date());

  async function open(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    try {
      await openGradingWindow({
        opensAt: String(form.get("opensAt") || ""),
        closesAt: String(form.get("closesAt") || ""),
        note: String(form.get("note") || ""),
      });
      setOpening(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open the grading period");
    } finally {
      setBusy(false);
    }
  }

  async function close() {
    setBusy(true);
    setError(null);
    try {
      await closeGradingWindow();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not close the grading period");
    } finally {
      setBusy(false);
    }
  }

  const tone = state.open
    ? "border-green-200 bg-green-50"
    : state.phase === "upcoming"
      ? "border-blue-200 bg-blue-50"
      : "border-zinc-200 bg-zinc-50";

  return (
    <div className={`rounded-xl border p-5 ${tone}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 flex-none rounded-full ${
                state.open ? "bg-green-500" : "bg-zinc-400"
              }`}
              aria-hidden
            />
            <span className="font-semibold text-brand-black">
              Grading {state.open ? "Open" : "Closed"}
            </span>
            {state.closingSoon && (
              <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
                Closing soon
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-zinc-600">{state.label}</p>
          {note && state.open && (
            <p className="mt-2 rounded-md bg-white/70 p-2 text-xs text-zinc-600">{note}</p>
          )}
          {!state.open && (
            <p className="mt-1 text-xs text-zinc-500">
              While closed, no grading can be scheduled and no candidate entered. Gradings
              already under way can still be marked and published.
            </p>
          )}
        </div>

        <div className="flex flex-none gap-2">
          {state.open || state.phase === "upcoming" ? (
            <button
              type="button"
              onClick={close}
              disabled={busy}
              className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
            >
              {busy ? "Working..." : "Close Period"}
            </button>
          ) : (
            !opening && (
              <button
                type="button"
                onClick={() => setOpening(true)}
                className="rounded-full bg-brand-red px-4 py-2 text-sm font-semibold text-white hover:bg-brand-red-dark"
              >
                Open Grading Period
              </button>
            )
          )}
        </div>
      </div>

      {opening && (
        <form onSubmit={open} className="mt-4 space-y-4 rounded-lg bg-white p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Opens">
              <input type="date" name="opensAt" defaultValue={today} className={inputClass} />
            </Field>
            <Field label="Closes">
              <input
                type="date"
                name="closesAt"
                defaultValue={addDays(new Date(), DEFAULT_WINDOW_DAYS)}
                className={inputClass}
              />
            </Field>
          </div>
          <Field label="Note for members (optional)">
            <textarea
              name="note"
              rows={2}
              placeholder="What is being graded, what to bring, where to be."
              className={inputClass}
            />
          </Field>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={busy}
              className="rounded-full bg-brand-red px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {busy ? "Opening..." : "Open Period"}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpening(false);
                setError(null);
              }}
              className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {error && <p className="mt-3 text-sm text-brand-red">{error}</p>}
    </div>
  );
}
