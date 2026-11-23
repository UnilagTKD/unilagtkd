import { requireRole } from "@/lib/session";
import { db } from "@/db";
import { gradingEvents } from "@/db/schema";
import { inArray, desc } from "drizzle-orm";
import { ExternalExaminerInviteForm } from "@/app/dashboard/coach/grading/[gradingId]/external-examiner-invite-form";

export default async function ExaminersPage() {
  await requireRole(["admin"]);
  const events = await db.select({ id: gradingEvents.id, title: gradingEvents.title, date: gradingEvents.date }).from(gradingEvents).where(inArray(gradingEvents.status, ["scheduled", "in_progress"])).orderBy(desc(gradingEvents.date));
  return <div className="max-w-5xl space-y-6"><header><h1 className="text-2xl font-bold">Examiner invitations</h1><p className="mt-2 text-sm text-zinc-600">Create a private examiner invitation for an open grading. Examiners receive access to that grading only, without general dashboard permissions.</p></header>{events.map(event => <section key={event.id}><h2 className="mb-3 font-semibold">{event.title} · {event.date}</h2><ExternalExaminerInviteForm gradingId={event.id}/></section>)}{!events.length && <p className="rounded-xl border bg-white p-6">No open grading events. A coach must schedule a grading before an examiner can be invited.</p>}</div>;
}
