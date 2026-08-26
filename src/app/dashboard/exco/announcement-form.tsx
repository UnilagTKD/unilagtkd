"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Field, inputClass } from "@/components/form/fields";
import { createAnnouncement } from "../actions";

export function AnnouncementForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    const form = new FormData(e.currentTarget);
    await createAnnouncement({
      title: String(form.get("title")),
      body: String(form.get("body")),
      audience: form.get("audience") as "all" | "students" | "coaches" | "exco",
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
        + New Announcement
      </button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-lg border border-black/10 p-4">
      <Field label="Title">
        <input name="title" required className={inputClass} />
      </Field>
      <Field label="Message">
        <textarea name="body" required rows={3} className={inputClass} />
      </Field>
      <Field label="Audience">
        <select name="audience" defaultValue="all" className={inputClass}>
          <option value="all">Everyone</option>
          <option value="students">Students</option>
          <option value="coaches">Coaches</option>
          <option value="exco">Exco</option>
        </select>
      </Field>
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-full bg-brand-red px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {submitting ? "Posting..." : "Post"}
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
