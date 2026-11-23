"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateUserRole } from "@/app/dashboard/actions";
import type { UserRole } from "@/types/next-auth";

export function UserRoleSelect({
  userId,
  currentRole,
}: {
  userId: string;
  currentRole: UserRole;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  return (
    <select
      defaultValue={currentRole}
      disabled={saving}
      onChange={async (e) => {
        const select = e.currentTarget;
        const nextRole = select.value as UserRole;
        if (!window.confirm(`Change this member's role from ${currentRole} to ${nextRole}?`)) { select.value = currentRole; return; }
        setSaving(true);
        try {
          await updateUserRole(userId, nextRole);
          window.alert(`Member role changed to ${nextRole}.`);
          router.refresh();
        } catch (error) {
          select.value = currentRole;
          window.alert(error instanceof Error ? error.message : "Could not update this role.");
        } finally { setSaving(false); }
      }}
      className="rounded-md border border-zinc-300 px-2 py-1 text-xs"
    >
      <option value="student">student</option>
      <option value="alumni">alumni</option>
      <option value="coach">coach</option>
      <option value="exco">exco</option>
      {currentRole === "admin" && (
        <option value="admin" disabled>
          admin
        </option>
      )}
    </select>
  );
}
