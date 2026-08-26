"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { withdrawGradingRequest } from "./actions";

export function WithdrawRequestButton({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function onClick() {
    if (!confirm("Withdraw this grading request?")) return;
    setSubmitting(true);
    await withdrawGradingRequest(requestId);
    setSubmitting(false);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={submitting}
      className="rounded-full border border-zinc-300 px-3 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
    >
      {submitting ? "..." : "Withdraw"}
    </button>
  );
}
