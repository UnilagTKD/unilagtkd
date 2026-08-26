"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cancelLeaveRequest } from "../actions";

export function WithdrawLeaveButton({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  return (
    <button
      type="button"
      disabled={saving}
      onClick={async () => {
        setSaving(true);
        await cancelLeaveRequest(requestId);
        setSaving(false);
        router.refresh();
      }}
      className="flex-none text-xs font-medium text-zinc-500 underline hover:text-brand-red disabled:opacity-60"
    >
      {saving ? "Withdrawing..." : "Withdraw"}
    </button>
  );
}
