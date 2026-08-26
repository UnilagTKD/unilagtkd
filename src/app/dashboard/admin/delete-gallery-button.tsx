"use client";

import { useRouter } from "next/navigation";
import { deleteGalleryItem } from "../actions";

export function DeleteGalleryButton({ id }: { id: string }) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={async () => {
        await deleteGalleryItem(id);
        router.refresh();
      }}
      className="text-xs font-medium text-brand-red hover:underline"
    >
      Delete
    </button>
  );
}
