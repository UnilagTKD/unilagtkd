"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { markAttendance } from "../../../actions";

type RosterEntry = { id: string; name: string; present: boolean };

export function AttendanceForm({
  sessionId,
  roster,
}: {
  sessionId: string;
  roster: RosterEntry[];
}) {
  const router = useRouter();
  const [state, setState] = useState<Record<string, boolean>>(
    Object.fromEntries(roster.map((r) => [r.id, r.present]))
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    await markAttendance(
      sessionId,
      Object.entries(state).map(([userId, present]) => ({ userId, present }))
    );
    setSaving(false);
    setSaved(true);
    router.refresh();
  }

  if (roster.length === 0) {
    return <p className="text-sm text-zinc-500">No approved students to mark yet.</p>;
  }

  return (
    <div className="rounded-xl border border-black/10 bg-white p-6">
      <ul className="divide-y divide-black/5">
        {roster.map((r) => (
          <li key={r.id} className="flex items-center justify-between py-3">
            <span className="text-sm font-medium text-brand-black">{r.name}</span>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={state[r.id]}
                onChange={(e) => {
                  setState((s) => ({ ...s, [r.id]: e.target.checked }));
                  setSaved(false);
                }}
              />
              Present
            </label>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-full bg-brand-red px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save Attendance"}
        </button>
        {saved && <span className="text-sm text-green-600">Saved.</span>}
      </div>
    </div>
  );
}
