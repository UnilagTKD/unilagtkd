"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Field, inputClass } from "@/components/form/fields";
import { PhotoUpload } from "@/components/form/photo-upload";
import type { galleryItems } from "@/db/schema";
import { createGalleryItem, updateGalleryItem } from "@/app/dashboard/actions";

export function GalleryForm({ initial }: { initial?: typeof galleryItems.$inferSelect }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl ?? "");
  const [imageError, setImageError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    try {
      setImageError(null);
      if (!imageUrl) {
        setImageError("Upload a photo.");
        return;
      }
      setSubmitting(true);
      const form = new FormData(e.currentTarget);
      await (initial ? (data: Parameters<typeof createGalleryItem>[0]) => updateGalleryItem(initial.id, data) : createGalleryItem)({
        imageUrl,
        caption: String(form.get("caption") || ""),
        category: form.get("category") as "training" | "demo" | "tournament",
      });
      setOpen(false);
      setImageUrl(initial?.imageUrl ?? "");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save content.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => { setImageUrl(initial?.imageUrl ?? ""); setError(null); setOpen(true); }}
        className="rounded-full bg-brand-red px-4 py-2 text-sm font-semibold text-white hover:bg-brand-red-dark"
      >
        {initial ? "Edit" : "+ Add Photo"}
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
        <input defaultValue={initial?.caption ?? ""} name="caption" className={inputClass} />
      </Field>
      <Field label="Category">
        <select name="category" className={inputClass} defaultValue={initial?.category ?? "training"}>
          <option value="training">Training</option>
          <option value="demo">Demonstration</option>
          <option value="tournament">Tournament</option>
        </select>
      </Field>
      {error && <p role="alert" className="text-sm text-red-600 sm:col-span-2">{error}</p>}
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
