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
        setSaving(true);
        await updateUserRole(userId, e.target.value as UserRole);
        setSaving(false);
        router.refresh();
      }}
      className="rounded-md border border-zinc-300 px-2 py-1 text-xs"
    >
      <option value="student">student</option>
      <option value="alumni">alumni</option>
      <option value="coach">coach</option>
      <option value="exco">exco</option>
    </select>
  );
}
