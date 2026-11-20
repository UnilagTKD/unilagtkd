import "server-only";
import { and, desc, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { attendance, attendancePeriods, attendancePeriodSnapshots, memberProfiles, trainingSessions, users } from "@/db/schema";
import { attendanceRecordsForPeriod, attendanceStatsByUser } from "@/lib/attendance-data";
import { getActiveAttendancePeriod, lockAttendancePeriods, type AttendanceTransaction } from "@/lib/attendance-periods";
import { MEMBER_ROLES } from "@/lib/roles";
import { validate, recordId } from "@/lib/validation/actions";
import { lagosToday } from "@/lib/members";

export const attendancePeriodInput = z.object({ name: z.string().trim().min(2).max(150), startsOn: z.string().date(), notes: z.string().trim().max(2000).optional() }).strict();
export class AttendancePeriodError extends Error {}

export async function startAttendancePeriod(tx: AttendanceTransaction, actorId: string, input: unknown) {
  const data = validate(attendancePeriodInput, input);
  if (data.startsOn > lagosToday()) throw new AttendancePeriodError("An attendance period in progress must start today or earlier.");
  await lockAttendancePeriods(tx);
  if (await getActiveAttendancePeriod(tx)) throw new AttendancePeriodError("End the current attendance period before starting another.");
  const [previous] = await tx.select({ endsOn: attendancePeriods.endsOn }).from(attendancePeriods).where(isNotNull(attendancePeriods.closedAt)).orderBy(desc(attendancePeriods.closedAt)).limit(1);
  if (previous?.endsOn && data.startsOn < previous.endsOn) throw new AttendancePeriodError("The new period cannot start before the previous period ended.");
  const [period] = await tx.insert(attendancePeriods).values({ ...data, openedBy: actorId }).returning();
  return period;
}

export async function endAttendancePeriod(tx: AttendanceTransaction, actorId: string, periodId: string, endsOn: string) {
  validate(recordId, periodId); validate(z.string().date(), endsOn);
  await lockAttendancePeriods(tx);
  const [period] = await tx.select().from(attendancePeriods).where(and(eq(attendancePeriods.id, periodId), isNull(attendancePeriods.closedAt))).for("update");
  if (!period) throw new AttendancePeriodError("This attendance period is already closed or no longer exists.");
  if (endsOn < period.startsOn || endsOn > lagosToday()) throw new AttendancePeriodError("The end date must fall between the period's start and today.");
  const [future] = await tx.select({ id: trainingSessions.id }).from(trainingSessions)
    .where(and(eq(trainingSessions.periodId, periodId), sql`${trainingSessions.date} > ${endsOn}`)).limit(1);
  if (future) throw new AttendancePeriodError("This period has sessions after the chosen end date. Remove those sessions or choose a later end date before closing.");
  const allRoles = ["student", "exco", "alumni", "coach", "admin"] as const;
  const stats = await attendanceStatsByUser([...allRoles], periodId, tx);
  const members = await tx.select({ id: users.id, role: users.role, email: users.email, name: memberProfiles.fullName, beltGrade: memberProfiles.beltGrade }).from(users)
    .leftJoin(memberProfiles, eq(memberProfiles.userId, users.id)).where(sql`${users.id} in (
      select ${users.id} from ${users} where ${inArray(users.role, [...MEMBER_ROLES])}
      union select ${attendance.userId} from ${attendance} inner join ${trainingSessions} on ${attendance.sessionId}=${trainingSessions.id} where ${trainingSessions.periodId}=${periodId}
    )`);
  // Capture exclusions and display details now; later leave/role/profile changes
  // cannot rewrite a closed semester's percentages or historical register.
  const records = await attendanceRecordsForPeriod(periodId, tx);
  const histories = new Map<string, typeof records>();
  for (const record of records) {
    const history = histories.get(record.userId) ?? [];
    history.push(record); histories.set(record.userId, history);
  }
  const snapshots: (typeof attendancePeriodSnapshots.$inferInsert)[] = [];
  for (const member of members) {
    const summary = stats.get(member.id);
    if (!summary) continue;
    const history = (histories.get(member.id) ?? []).map(record => ({ sessionId: record.sessionId, sessionTitle: record.sessionTitle, sessionDate: record.sessionDate, present: record.present, beforeJoining: record.beforeJoining, onLeave: record.onLeave }));
    snapshots.push({ periodId, userId: member.id, name: member.name ?? member.email, email: member.email, role: member.role, beltGrade: member.beltGrade, stats: summary, history });
  }
  if (snapshots.length) await tx.insert(attendancePeriodSnapshots).values(snapshots);
  const now = new Date();
  await tx.update(trainingSessions).set({ endedAt: now }).where(and(eq(trainingSessions.periodId, periodId), isNull(trainingSessions.endedAt)));
  const [closed] = await tx.update(attendancePeriods).set({ endsOn, closedAt: now, closedBy: actorId }).where(eq(attendancePeriods.id, periodId)).returning();
  return closed;
}
