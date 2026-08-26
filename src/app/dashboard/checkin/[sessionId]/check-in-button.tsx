"use client";

import { useState } from "react";
import { selfCheckIn } from "@/app/dashboard/actions";

export function CheckInButton({ sessionId }: { sessionId: string }) {
  const [state, setState] = useState<
    { status: "idle" } | { status: "busy" } | { status: "done"; title: string } | { status: "error"; error: string }
  >({ status: "idle" });

  if (state.status === "done") {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center">
        <p className="text-lg font-semibold text-green-800">You&apos;re checked in.</p>
        <p className="mt-1 text-sm text-green-700">{state.title}</p>
      </div>
    );
  }

  return (
    <div className="text-center">
      <button
        type="button"
        disabled={state.status === "busy"}
        onClick={async () => {
          setState({ status: "busy" });
          const result = await selfCheckIn(sessionId);
          if (result.ok) {
            setState({ status: "done", title: result.title });
          } else {
            setState({ status: "error", error: result.error });
          }
        }}
        className="rounded-full bg-brand-red px-8 py-3 text-base font-semibold text-white disabled:opacity-60"
      >
        {state.status === "busy" ? "Checking in..." : "Check in"}
      </button>
      {state.status === "error" && (
        <p className="mt-3 text-sm text-brand-red">{state.error}</p>
      )}
    </div>
  );
}
