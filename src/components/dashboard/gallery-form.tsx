"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Field, inputClass } from "@/components/form/fields";
import { createGalleryItem } from "@/app/dashboard/actions";

export function GalleryForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    const form = new FormData(e.currentTarget);
    await createGalleryItem({
      imageUrl: String(form.get("imageUrl")),
      caption: String(form.get("caption") || ""),
      category: form.get("category") as "training" | "demo" | "tournament",
    });
    setSubmitting(false);
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full bg-brand-red px-4 py-2 text-sm font-semibold text-white hover:bg-brand-red-dark"
      >
        + Add Photo
      </button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 rounded-lg border border-black/10 p-4 sm:grid-cols-2">
      <Field label="Image URL" className="sm:col-span-2">
        <input name="imageUrl" type="url" required placeholder="https://..." className={inputClass} />
      </Field>
      <Field label="Caption">
        <input name="caption" className={inputClass} />
      </Field>
      <Field label="Category">
        <select name="category" className={inputClass} defaultValue="training">
          <option value="training">Training</option>
          <option value="demo">Demonstration</option>
          <option value="tournament">Tournament</option>
        </select>
      </Field>
      <div className="flex gap-3 sm:col-span-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-full bg-brand-red px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {submitting ? "Saving..." : "Save"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
