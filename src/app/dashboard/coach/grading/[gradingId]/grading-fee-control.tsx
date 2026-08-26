"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setGradingFee } from "../actions";

export function GradingFeeControl({
  gradingId,
  fee,
  readOnly,
}: {
  gradingId: string;
  fee: string | null;
  readOnly: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(fee ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await setGradingFee(gradingId, value);
      setEditing(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the fee");
    } finally {
      setSaving(false);
    }
  }

  if (readOnly) {
    return (
      <span className="text-sm text-zinc-600">
        {fee ? `NGN ${Number(fee).toLocaleString()}` : "No fee set"}
      </span>
    );
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-lg font-bold text-brand-black">
          {fee ? `NGN ${Number(fee).toLocaleString()}` : "No fee set"}
        </span>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-xs font-medium text-brand-red hover:underline"
        >
          {fee ? "Change" : "Set fee"}
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-zinc-500">NGN</span>
        <input
          type="number"
          min="0"
          step="50"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Blank clears the fee"
          className="w-40 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm"
        />
        <button
          type="button"
          disabled={saving}
          onClick={save}
          className="rounded-full bg-brand-red px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save"}
        </button>
        <button
          type="button"
          onClick={() => {
            setValue(fee ?? "");
            setEditing(false);
            setError(null);
          }}
          className="rounded-full border border-zinc-300 px-4 py-1.5 text-xs font-medium text-zinc-700"
        >
          Cancel
        </button>
      </div>
      <p className="mt-2 text-xs text-zinc-500">
        Candidates already entered are billed as soon as a fee is set. Clearing the fee
        stops future candidates being charged but leaves existing charges in place.
      </p>
      {error && <p className="mt-2 text-xs text-brand-red">{error}</p>}
    </div>
  );
}
