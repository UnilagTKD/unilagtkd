"use client";

import { useRouter } from "next/navigation";
import { deleteAchievement } from "../actions";

export function DeleteAchievementButton({ id }: { id: string }) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={async () => {
        await deleteAchievement(id);
        router.refresh();
      }}
      className="text-xs font-medium text-brand-red hover:underline"
    >
      Delete
    </button>
  );
}
