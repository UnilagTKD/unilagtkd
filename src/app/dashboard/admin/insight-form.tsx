"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Field, inputClass } from "@/components/form/fields";
import { createInsight } from "../actions";

export function InsightForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    const form = new FormData(e.currentTarget);
    await createInsight({
      title: String(form.get("title")),
      excerpt: String(form.get("excerpt")),
      body: String(form.get("body")),
      coverImageUrl: String(form.get("coverImageUrl") || ""),
      category: form.get("category") as "training" | "competition" | "club_news" | "wellness",
      authorName: String(form.get("authorName") || ""),
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
        + New Post
      </button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 rounded-lg border border-black/10 p-4 sm:grid-cols-2">
      <Field label="Title" className="sm:col-span-2">
        <input name="title" required className={inputClass} />
      </Field>
      <Field label="Category">
        <select name="category" className={inputClass} defaultValue="club_news">
          <option value="training">Training</option>
          <option value="competition">Competition</option>
          <option value="club_news">Club News</option>
          <option value="wellness">Wellness</option>
        </select>
      </Field>
      <Field label="Author (optional)">
        <input name="authorName" className={inputClass} />
      </Field>
      <Field label="Cover Image URL (optional)" className="sm:col-span-2">
        <input name="coverImageUrl" type="url" placeholder="https://..." className={inputClass} />
      </Field>
      <Field label="Excerpt" className="sm:col-span-2">
        <textarea name="excerpt" required rows={2} className={inputClass} />
      </Field>
      <Field label="Body" className="sm:col-span-2">
        <textarea name="body" required rows={6} className={inputClass} />
      </Field>
      <div className="flex gap-3 sm:col-span-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-full bg-brand-red px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {submitting ? "Publishing..." : "Publish"}
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
