"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Field, inputClass } from "@/components/form/fields";
import { createAchievement } from "@/app/dashboard/actions";

export function AchievementForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    const form = new FormData(e.currentTarget);
    await createAchievement({
      athleteName: String(form.get("athleteName")),
      matricNo: String(form.get("matricNo") || ""),
      sex: String(form.get("sex") || ""),
      course: String(form.get("course") || ""),
      level: String(form.get("level") || ""),
      medal: form.get("medal") as "gold" | "silver" | "bronze",
      competitionName: String(form.get("competitionName")),
      competitionDate: String(form.get("competitionDate")),
      venue: String(form.get("venue") || ""),
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
        + New Achievement
      </button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 rounded-lg border border-black/10 p-4 sm:grid-cols-2">
      <Field label="Athlete Name">
        <input name="athleteName" required className={inputClass} />
      </Field>
      <Field label="Matric No. (optional)">
        <input name="matricNo" className={inputClass} />
      </Field>
      <Field label="Sex">
        <select name="sex" className={inputClass} defaultValue="">
          <option value="">-</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
        </select>
      </Field>
      <Field label="Course">
        <input name="course" className={inputClass} />
      </Field>
      <Field label="Level">
        <input name="level" className={inputClass} placeholder="e.g. 300" />
      </Field>
      <Field label="Medal">
        <select name="medal" required className={inputClass} defaultValue="gold">
          <option value="gold">Gold</option>
          <option value="silver">Silver</option>
          <option value="bronze">Bronze</option>
        </select>
      </Field>
      <Field label="Competition Name">
        <input name="competitionName" required className={inputClass} />
      </Field>
      <Field label="Competition Date">
        <input type="date" name="competitionDate" required className={inputClass} />
      </Field>
      <Field label="Venue" className="sm:col-span-2">
        <input name="venue" className={inputClass} />
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
