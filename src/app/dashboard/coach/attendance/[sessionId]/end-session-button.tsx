"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { endTrainingSession } from "../../../actions";

export function EndSessionButton({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [ending, setEnding] = useState(false);

  return (
    <button
      type="button"
      disabled={ending}
      onClick={async () => {
        if (!confirm("Close member check-in for this session? Coaches can still record or correct attendance afterward."))
          return;
        setEnding(true);
        await endTrainingSession(sessionId);
        setEnding(false);
        router.refresh();
      }}
      className="rounded-full border border-brand-red px-5 py-2 text-sm font-semibold text-brand-red hover:bg-brand-red hover:text-white disabled:opacity-60"
    >
      {ending ? "Ending..." : "End Session"}
    </button>
  );
}
