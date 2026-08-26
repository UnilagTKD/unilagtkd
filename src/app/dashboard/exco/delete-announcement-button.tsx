"use client";

import { useRouter } from "next/navigation";
import { deleteAnnouncement } from "../actions";

export function DeleteAnnouncementButton({ id }: { id: string }) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={async () => {
        await deleteAnnouncement(id);
        router.refresh();
      }}
      className="text-xs font-medium text-brand-red hover:underline"
    >
      Delete
    </button>
  );
}
