"use client";

import { useState, type FormEvent } from "react";
import { Field, inputClass } from "@/components/form/fields";
import type { membershipFitness } from "@/db/schema";

const METRICS = [
  ["jumpingJacks", "Jumping jacks"],
  ["pushUps", "Push-ups"],
  ["sitUps", "Sit-ups"],
  ["burpees", "Burpees"],
] as const;

export function FitnessForm({ userId, name, result }: {
  userId: string;
  name: string;
  result?: typeof membershipFitness.$inferSelect;
}) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const [needsLogin, setNeedsLogin] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setMessage("");
    setNeedsLogin(false);
    try {
      const response = await fetch("/dashboard/membership-fitness/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...Object.fromEntries(form), userId }),
      });
      if (response.status === 401 || (response.redirected && new URL(response.url).pathname === "/login")) {
        setNeedsLogin(true);
        throw new Error("Your session has expired. Sign in in a new tab, then retry here.");
      }
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.ok) throw new Error(result?.error ?? "Could not save scores. Please try again.");
      setFailed(false);
      setMessage("Scores validated and added to the member’s form.");
    } catch (error) {
      setFailed(true);
      setMessage(error instanceof Error ? error.message : "Could not save scores.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-xl border bg-white p-5">
      <h2 className="font-semibold">{name}</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {METRICS.map(([key, label]) => (
          <Field key={key} label={`${label} (1 minute)`}>
            <input name={key} type="number" min={0} max={9999} step={1} required defaultValue={result?.[key]} className={inputClass} />
          </Field>
        ))}
      </div>
      <Field label="Shuttle result">
        <select name="shuttle" required className={inputClass} defaultValue={result ? (result.shuttlePassed ? "pass" : "fail") : ""}>
          <option value="" disabled>Select a result</option>
          <option value="pass">Pass</option>
          <option value="fail">Fail</option>
        </select>
      </Field>
      <button type="submit" disabled={saving} className="rounded-full bg-brand-blue px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
        {saving ? "Saving…" : "Validate scores"}
      </button>
      {message && <p role={failed ? "alert" : "status"} className={failed ? "text-sm text-brand-red" : "text-sm text-green-700"}>{message}</p>}
      {needsLogin && <a href="/login" target="_blank" rel="noopener" className="inline-block text-sm font-semibold text-brand-blue underline">Sign in in a new tab</a>}
    </form>
  );
}
