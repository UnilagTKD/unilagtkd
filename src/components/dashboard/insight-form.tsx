"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Field, inputClass } from "@/components/form/fields";
import { PhotoUpload } from "@/components/form/photo-upload";
import type { insights } from "@/db/schema";
import { createInsight, updateInsight } from "@/app/dashboard/actions";

export function InsightForm({ initial }: { initial?: typeof insights.$inferSelect }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coverImageUrl, setCoverImageUrl] = useState(initial?.coverImageUrl ?? "");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    try {
      setSubmitting(true);
      const form = new FormData(e.currentTarget);
      await (initial ? (data: Parameters<typeof createInsight>[0]) => updateInsight(initial.id, data) : createInsight)({
        title: String(form.get("title")),
        excerpt: String(form.get("excerpt")),
        body: String(form.get("body")),
        coverImageUrl,
        category: form.get("category") as "training" | "competition" | "club_news" | "wellness",
        authorName: String(form.get("authorName") || ""),
      });
      setOpen(false);
      setCoverImageUrl(initial?.coverImageUrl ?? "");
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
        onClick={() => { setCoverImageUrl(initial?.coverImageUrl ?? ""); setError(null); setOpen(true); }}
        className="rounded-full bg-brand-red px-4 py-2 text-sm font-semibold text-white hover:bg-brand-red-dark"
      >
        {initial ? "Edit" : "+ New Post"}
      </button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 rounded-lg border border-black/10 p-4 sm:grid-cols-2">
      <Field label="Title" className="sm:col-span-2">
        <input defaultValue={initial?.title ?? ""} name="title" required className={inputClass} />
      </Field>
      <Field label="Category">
        <select name="category" className={inputClass} defaultValue={initial?.category ?? "club_news"}>
          <option value="training">Training</option>
          <option value="competition">Competition</option>
          <option value="club_news">Club News</option>
          <option value="wellness">Wellness</option>
        </select>
      </Field>
      <Field label="Author (optional)">
        <input defaultValue={initial?.authorName ?? ""} name="authorName" className={inputClass} />
      </Field>
      <Field label="Cover Image (optional)" className="sm:col-span-2">
        <PhotoUpload
          value={coverImageUrl}
          onChange={setCoverImageUrl}
          itemLabel="Cover Image"
          previewAlt="Cover image preview"
          previewClassName="object-cover"
          noValueLabel={"No cover\nimage"}
          helpText="Shown at the top of the post. Under 2MB."
        />
      </Field>
      <Field label="Excerpt" className="sm:col-span-2">
        <textarea defaultValue={initial?.excerpt ?? ""} name="excerpt" required rows={2} className={inputClass} />
      </Field>
      <Field label="Body" className="sm:col-span-2">
        <textarea defaultValue={initial?.body ?? ""} name="body" required rows={6} className={inputClass} />
      </Field>
      {error && <p role="alert" className="text-sm text-red-600 sm:col-span-2">{error}</p>}
      <div className="flex gap-3 sm:col-span-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-full bg-brand-red px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {submitting ? "Saving..." : initial ? "Save changes" : "Publish"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setCoverImageUrl("");
          }}
          className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
