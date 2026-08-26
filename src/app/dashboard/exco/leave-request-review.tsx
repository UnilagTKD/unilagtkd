"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { reviewLeaveRequest } from "../actions";

export function LeaveRequestReview({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function decide(decision: "approved" | "rejected") {
    setSaving(true);
    setError(null);
    try {
      await reviewLeaveRequest(requestId, decision, notes);
      setNotes("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save that decision");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-3 space-y-2">
      <input
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Note to the member (optional)"
        className="w-full rounded-lg border border-zinc-300 px-3 py-1.5 text-xs"
      />
      <div className="flex gap-2">
        <button
          type="button"
          disabled={saving}
          onClick={() => decide("approved")}
          className="rounded-full bg-green-600 px-3 py-1 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-60"
        >
          {saving ? "Saving..." : "Approve"}
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => decide("rejected")}
          className="rounded-full border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-60"
        >
          Decline
        </button>
      </div>
      {error && <p className="text-xs text-brand-red">{error}</p>}
    </div>
  );
}
