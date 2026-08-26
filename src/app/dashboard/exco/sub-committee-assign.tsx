"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { assignSubCommittee } from "../actions";

export function SubCommitteeAssign({
  userId,
  currentSubCommitteeId,
  subCommittees,
}: {
  userId: string;
  currentSubCommitteeId: string | null;
  subCommittees: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <select
        value={currentSubCommitteeId ?? ""}
        disabled={saving}
        onChange={async (e) => {
          const value = e.target.value;
          setSaving(true);
          setError(null);
          try {
            await assignSubCommittee(userId, value === "" ? null : value);
            router.refresh();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Could not reassign");
          } finally {
            setSaving(false);
          }
        }}
        className="rounded-md border border-zinc-300 px-2 py-1 text-xs"
      >
        <option value="">Unassigned</option>
        {subCommittees.map((sc) => (
          <option key={sc.id} value={sc.id}>
            {sc.name}
          </option>
        ))}
      </select>
      {error && <span className="text-[11px] text-brand-red">{error}</span>}
    </div>
  );
}
