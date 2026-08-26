import { notFound } from "next/navigation";
import { requireRole } from "@/lib/session";
import { db } from "@/db";
import { trainingSessions, attendance } from "@/db/schema";
import { eq } from "drizzle-orm";
import { rosterForSession } from "@/lib/attendance-data";
import { AttendanceForm } from "./attendance-form";

export default async function AttendanceMarkingPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  await requireRole(["coach"]);
  const { sessionId } = await params;

  const [session] = await db
    .select()
    .from(trainingSessions)
    .where(eq(trainingSessions.id, sessionId))
    .limit(1);

  if (!session) notFound();

  const [roster, existing] = await Promise.all([
    rosterForSession(sessionId),
    db.select().from(attendance).where(eq(attendance.sessionId, sessionId)),
  ]);

  const existingMap = new Map(existing.map((e) => [e.userId, e.present]));

  // Members who could not have been at this session are shown, but not offered
  // for marking - see `rosterForSession`.
  const markable = roster.filter((r) => r.markable);
  const excluded = roster.filter((r) => !r.markable);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-black">{session.title}</h1>
        <p className="text-sm text-zinc-500">
          {session.date} {session.startTime && `· ${session.startTime}–${session.endTime}`}
        </p>
      </div>

      <AttendanceForm
        sessionId={sessionId}
        roster={markable.map((r) => ({
          id: r.id,
          name: r.name,
          present: existingMap.get(r.id) ?? true,
        }))}
      />

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
