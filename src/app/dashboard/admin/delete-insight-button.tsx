"use client";

import { useRouter } from "next/navigation";
import { deleteInsight } from "../actions";

export function DeleteInsightButton({ id }: { id: string }) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={async () => {
        await deleteInsight(id);
        router.refresh();
      }}
      className="text-xs font-medium text-brand-red hover:underline"
    >
      Delete
    </button>
  );
}
