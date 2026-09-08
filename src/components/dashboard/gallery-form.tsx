"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Field, inputClass } from "@/components/form/fields";
import { PhotoUpload } from "@/components/form/photo-upload";
import { createGalleryItem } from "@/app/dashboard/actions";

export function GalleryForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [imageError, setImageError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setImageError(null);
    if (!imageUrl) {
      setImageError("Upload a photo.");
      return;
    }
    setSubmitting(true);
    const form = new FormData(e.currentTarget);
    await createGalleryItem({
      imageUrl,
      caption: String(form.get("caption") || ""),
      category: form.get("category") as "training" | "demo" | "tournament",
    });
    setSubmitting(false);
    setOpen(false);
    setImageUrl("");
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
      <Field label="Photo" className="sm:col-span-2">
        <PhotoUpload
          value={imageUrl}
          onChange={(url) => {
            setImageUrl(url);
            setImageError(null);
          }}
          error={imageError ?? undefined}
          itemLabel="Photo"
          previewAlt="Gallery photo preview"
          previewClassName="object-cover"
          helpText="Training, demo, or tournament photo. Under 2MB."
        />
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
          onClick={() => {
            setOpen(false);
            setImageUrl("");
            setImageError(null);
          }}
          className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
