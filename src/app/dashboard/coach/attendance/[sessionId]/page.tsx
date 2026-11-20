import { expireTrainingSessions } from "@/lib/training-session-data";
import { sessionExpiresAt } from "@/lib/training-session";
import { SessionExpiryRefresh } from "@/components/dashboard/session-expiry-refresh";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/session";
import { db } from "@/db";
import { trainingSessions, attendance, attendancePeriodSnapshots } from "@/db/schema";
import { eq } from "drizzle-orm";
import { rosterForSession } from "@/lib/attendance-data";
import { AttendanceForm } from "./attendance-form";
import { EndSessionButton } from "./end-session-button";
import { getAttendancePeriod } from "@/lib/attendance-periods";
import { recordIdFromSlug } from "@/lib/record-slug";

export default async function AttendanceMarkingPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  await requireRole(["coach"]);
  const { sessionId: slug } = await params;
  const sessionId = recordIdFromSlug(slug);
  if (!sessionId) notFound();
  await expireTrainingSessions(sessionId);

  const [session] = await db
    .select()
    .from(trainingSessions)
    .where(eq(trainingSessions.id, sessionId))
    .limit(1);

  if (!session) notFound();
  const period = await getAttendancePeriod(session.periodId);
  if (period?.closedAt) {
    const snapshots = await db.select().from(attendancePeriodSnapshots).where(eq(attendancePeriodSnapshots.periodId, period.id));
    return <div className="max-w-3xl space-y-5"><Link href="/dashboard/coach/attendance" className="text-sm text-brand-blue">&larr; Attendance periods</Link><h1 className="text-2xl font-bold">{session.title}</h1><p className="text-sm text-zinc-500">{session.date} · {period.name} · Archived, read only</p><ul className="divide-y rounded-xl border bg-white p-4 text-sm">{snapshots.map(row => { const mark = row.history.find(item => item.sessionId === session.id); return <li key={row.id} className="flex flex-wrap justify-between gap-2 py-3"><span>{row.name}</span><span>{!mark ? "Not recorded" : mark.beforeJoining ? "Excluded: before joining" : mark.onLeave ? "Excluded: approved leave" : mark.present ? "Present" : "Absent"}</span></li>; })}</ul></div>;
  }

  const [roster, existing] = await Promise.all([
    rosterForSession(sessionId),
    db.select().from(attendance).where(eq(attendance.sessionId, sessionId)),
  ]);

  const existingMap = new Map(existing.map((e) => [e.userId, e.present]));

  // Members who could not have been at this session are shown, but not offered
  // for marking - see `rosterForSession`.
  const markable = roster.filter((r) => r.markable);
  const excluded = roster.filter((r) => !r.markable);
  const ended = Boolean(session.endedAt);

  return (
    <div className="max-w-2xl space-y-6">
      <Link
        href="/dashboard/coach"
        className="inline-block text-sm font-medium text-zinc-500 hover:text-brand-black"
      >
        &larr; Back to Coach Dashboard
      </Link>

      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold text-brand-black">{session.title}</h1>
          {ended && (
            <span className="rounded-full bg-zinc-200 px-2.5 py-0.5 text-xs font-medium text-zinc-600">
              Ended
            </span>
          )}
        </div>
        <p className="text-sm text-zinc-500">
          {session.date} {session.startTime && `· ${session.startTime}–${session.endTime}`}
        </p>
      </div>

      <p className="rounded-lg bg-zinc-100 p-3 text-sm text-zinc-600">
        {ended ? "Member check-in has closed. You can still record or correct attendance below." : "Member check-in closes automatically 24 hours after the scheduled start. You can record attendance at any time."}
      </p>
      {!ended && <SessionExpiryRefresh deadline={sessionExpiresAt(session).toISOString()} />}
      <AttendanceForm sessionId={sessionId} roster={markable.map((r) => ({ id: r.id, name: r.name, present: existingMap.get(r.id) ?? false }))} />
      {!ended && <EndSessionButton sessionId={sessionId} />}

      {excluded.length > 0 && (
        <div className="rounded-xl border border-black/10 bg-zinc-50 p-5">
          <h2 className="text-sm font-semibold text-brand-black">
            Not marked for this session ({excluded.length})
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            These members are left out of this session&apos;s register, and it counts neither
            for nor against them.
          </p>
          <ul className="mt-3 divide-y divide-black/5 text-sm">
            {excluded.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2 py-2">
                <span className="text-zinc-500">{r.name}</span>
                <span className="flex-none rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-600">
                  {r.reason}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
