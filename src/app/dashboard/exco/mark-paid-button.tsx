"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { markDuesPaid } from "../actions";

export function MarkPaidButton({ duesId }: { duesId: string }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  return (
    <button
      type="button"
      disabled={saving}
      onClick={async () => {
        setSaving(true);
        await markDuesPaid(duesId);
        setSaving(false);
        router.refresh();
      }}
      className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800 hover:bg-yellow-200 disabled:opacity-60"
    >
      {saving ? "Saving..." : "Mark Paid"}
    </button>
  );
}
