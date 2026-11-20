"use client";
import { recordSlug } from "@/lib/record-slug";


import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Field, inputClass } from "@/components/form/fields";
import { updateTrainingSession, deleteTrainingSession } from "../actions";
import { TRAINING_SESSION_TITLES, TRAINING_SESSION_LOCATIONS } from "@/lib/constants";

type Session = {
  id: string;
  title: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  description: string | null;
  endedAt: Date | null;
};

function EditSessionForm({
  session,
  onCancel,
}: {
  session: Session;
  onCancel: () => void;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    const form = new FormData(e.currentTarget);
    await updateTrainingSession(session.id, {
      title: String(form.get("title")),
      date: String(form.get("date")),
      startTime: String(form.get("startTime") || ""),
      endTime: String(form.get("endTime") || ""),
      location: String(form.get("location") || ""),
      description: String(form.get("description") || ""),
    });
    setSubmitting(false);
    router.refresh();
    onCancel();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-lg bg-zinc-50 p-4">
      <Field label="Title">
        <select name="title" defaultValue={session.title} required className={inputClass}>
          {TRAINING_SESSION_TITLES.map((title) => (
            <option key={title} value={title}>
              {title}
            </option>
          ))}
        </select>
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Date">
          <input type="date" name="date" defaultValue={session.date} required className={inputClass} />
        </Field>
        <Field label="Start Time">
          <input type="time" name="startTime" defaultValue={session.startTime ?? ""} className={inputClass} />
        </Field>
        <Field label="End Time">
          <input type="time" name="endTime" defaultValue={session.endTime ?? ""} className={inputClass} />
        </Field>
      </div>
      <Field label="Location">
        <select
          name="location"
          required
          className={inputClass}
          defaultValue={session.location ?? TRAINING_SESSION_LOCATIONS[0]}
        >
          {TRAINING_SESSION_LOCATIONS.map((location) => (
            <option key={location} value={location}>
              {location}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Description">
        <textarea name="description" rows={2} defaultValue={session.description ?? ""} className={inputClass} />
      </Field>
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-full bg-brand-red px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {submitting ? "Saving..." : "Save Changes"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export function SessionsList({ sessions }: { sessions: Session[] }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function onDelete(id: string) {
    if (!confirm("Delete this training session? Attendance records for it will also be removed."))
      return;
    setDeletingId(id);
    await deleteTrainingSession(id);
    setDeletingId(null);
    router.refresh();
  }

  if (sessions.length === 0) {
    return <p className="mt-3 text-sm text-zinc-500">No sessions scheduled yet.</p>;
  }

  return (
    <ul className="mt-4 divide-y divide-black/5 text-sm">
      {sessions.map((s) =>
        editingId === s.id ? (
          <li key={s.id} className="py-3">
            <EditSessionForm session={s} onCancel={() => setEditingId(null)} />
          </li>
        ) : (
          <li key={s.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-brand-black">{s.title}</span>
                {s.endedAt && (
                  <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-[10px] font-medium text-zinc-600">
                    Ended
                  </span>
                )}
              </div>
              <div className="text-xs text-zinc-500">
                {s.date} {s.startTime && `· ${s.startTime}–${s.endTime}`} {s.location && `· ${s.location}`}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:flex-none">
              <Link
                href={`/dashboard/coach/attendance/${recordSlug(s.title, s.id)}`}
                className="rounded-full border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-brand-black hover:bg-zinc-50"
              >
                Record Attendance
              </Link>
              <button
                type="button"
                onClick={() => setEditingId(s.id)}
                className="rounded-full border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-brand-black hover:bg-zinc-50"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => onDelete(s.id)}
                disabled={deletingId === s.id}
                className="rounded-full border border-brand-red px-3 py-1.5 text-xs font-semibold text-brand-red hover:bg-brand-red hover:text-white disabled:opacity-60"
              >
                {deletingId === s.id ? "..." : "Delete"}
              </button>
            </div>
          </li>
        )
      )}
    </ul>
  );
}
