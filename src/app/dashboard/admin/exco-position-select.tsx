"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateExcoPosition } from "../actions";
import { EXCO_POSITIONS, EXCO_POSITION_LABELS, type ExcoPosition } from "@/lib/exco";
import type { UserRole } from "@/types/next-auth";

export function ExcoPositionSelect({
  userId,
  currentRole,
  currentPosition,
}: {
  userId: string;
  currentRole: UserRole;
  currentPosition: ExcoPosition | null;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  if (currentRole !== "exco") {
    return <span className="text-xs text-zinc-400">-</span>;
  }

  return (
    <select
      value={currentPosition ?? ""}
      disabled={saving}
      onChange={async (e) => {
        setSaving(true);
        const value = e.target.value;
        await updateExcoPosition(userId, value === "" ? null : (value as ExcoPosition));
        setSaving(false);
        router.refresh();
      }}
      className="rounded-md border border-zinc-300 px-2 py-1 text-xs"
    >
      <option value="">Unassigned</option>
      {EXCO_POSITIONS.map((position) => (
        <option key={position} value={position}>
          {EXCO_POSITION_LABELS[position]}
        </option>
      ))}
    </select>
  );
}
