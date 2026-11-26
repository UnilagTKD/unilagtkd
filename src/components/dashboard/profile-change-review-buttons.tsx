"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { reviewProfileChange } from "@/app/dashboard/settings/actions";
import { PROFILE_REVIEW_LABELS, type ProfileReviewStage } from "@/lib/verification-permissions";
export function ProfileChangeReviewButtons({ id, isSelf, stage }: { id: string; isSelf: boolean; stage?: ProfileReviewStage }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function review(decision: "approved" | "rejected") {
    if (!stage) return;
    setBusy(true); setError(null);
    try {
      const result = await reviewProfileChange(id, stage, decision, note);
      if (result.ok) { setNote(""); router.refresh(); } else setError(result.error);
    } catch { setError("Could not review this request. Please try again."); }
    finally { setBusy(false); }
  }
  if (isSelf) return <p className="mt-3 text-sm text-zinc-500">Another reviewer must review your own request.</p>;
  if (!stage) return <p className="mt-3 text-sm text-zinc-500">You’ve completed your approval. Other reviews are pending.</p>;
  return <div className="mt-3 space-y-2">
    <label className="block text-sm">Review note (optional)<textarea aria-label="Review note (optional)" maxLength={2000} rows={2} value={note} onChange={(e) => setNote(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2" /></label>
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    <div className="flex flex-wrap gap-2">
      <button disabled={busy} onClick={() => review("approved")} className="rounded-full bg-brand-red px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">Approve as {PROFILE_REVIEW_LABELS[stage]}</button>
      <button disabled={busy} onClick={() => review("rejected")} className="rounded-full border border-zinc-300 px-4 py-2 text-sm disabled:opacity-60">Reject changes</button>
    </div>
  </div>;
}
