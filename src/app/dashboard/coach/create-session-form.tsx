"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Field, inputClass } from "@/components/form/fields";
import { createTrainingSession } from "../actions";
import { TRAINING_SESSION_TITLES, TRAINING_SESSION_LOCATIONS } from "@/lib/constants";
import { toDateInput } from "@/lib/dates";

export function CreateSessionForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    const form = new FormData(e.currentTarget);
    await createTrainingSession({
      title: String(form.get("title")),
      date: String(form.get("date")),
      startTime: String(form.get("startTime") || ""),
      endTime: String(form.get("endTime") || ""),
      location: String(form.get("location") || ""),
      description: String(form.get("description") || ""),
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
        + New Training Session
      </button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-black/10 bg-white p-5">
      <Field label="Title">
        <select name="title" required className={inputClass} defaultValue={TRAINING_SESSION_TITLES[0]}>
          {TRAINING_SESSION_TITLES.map((title) => (
            <option key={title} value={title}>
              {title}
            </option>
          ))}
        </select>
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Date">
          <input
            type="date"
            name="date"
            required
            defaultValue={toDateInput(new Date())}
            className={inputClass}
          />
        </Field>
        <Field label="Start Time">
          <input type="time" name="startTime" className={inputClass} />
        </Field>
        <Field label="End Time">
          <input type="time" name="endTime" className={inputClass} />
        </Field>
      </div>
      <Field label="Location">
        <select name="location" required className={inputClass} defaultValue={TRAINING_SESSION_LOCATIONS[0]}>
          {TRAINING_SESSION_LOCATIONS.map((location) => (
            <option key={location} value={location}>
              {location}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Description">
        <textarea name="description" rows={2} className={inputClass} />
      </Field>
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-full bg-brand-red px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {submitting ? "Saving..." : "Save Session"}
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
