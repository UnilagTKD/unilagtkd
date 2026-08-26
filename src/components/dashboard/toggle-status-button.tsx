"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setUserStatus } from "@/app/dashboard/actions";

export function ToggleStatusButton({
  userId,
  currentStatus,
}: {
  userId: string;
  currentStatus: "active" | "inactive";
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  return (
    <button
      type="button"
      disabled={saving}
      onClick={async () => {
        setSaving(true);
        await setUserStatus(userId, currentStatus === "active" ? "inactive" : "active");
        setSaving(false);
        router.refresh();
      }}
      className="text-xs font-medium text-brand-red hover:underline disabled:opacity-60"
    >
      {currentStatus === "active" ? "Deactivate" : "Activate"}
    </button>
  );
}
