import "server-only";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { attendancePeriods, trainingSessions } from "@/db/schema";
export type AttendanceTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
export type AttendanceDatabase = typeof db | AttendanceTransaction;
export async function getActiveAttendancePeriod(client: AttendanceDatabase = db) {
  const [period] = await client.select().from(attendancePeriods).where(isNull(attendancePeriods.closedAt)).limit(1);
  return period ?? null;
}
export async function getAttendancePeriod(periodId?: string, client: AttendanceDatabase = db) {
  if (!periodId) return getActiveAttendancePeriod(client);
  const [period] = await client.select().from(attendancePeriods).where(eq(attendancePeriods.id, periodId)).limit(1);
  return period ?? null;
}
export function listAttendancePeriods(client: AttendanceDatabase = db) {
  return client.select().from(attendancePeriods).orderBy(desc(attendancePeriods.openedAt));
}
export async function lockAttendancePeriods(tx: AttendanceTransaction) {
  await tx.execute(sql`select pg_advisory_xact_lock(20261117, 3)`);
}
export async function requireWritableSession(tx: AttendanceTransaction, sessionId: string) {
  await lockAttendancePeriods(tx);
  const [row] = await tx.select({ session: trainingSessions, closedAt: attendancePeriods.closedAt, startsOn: attendancePeriods.startsOn })
    .from(trainingSessions).innerJoin(attendancePeriods, eq(attendancePeriods.id, trainingSessions.periodId))
    .where(eq(trainingSessions.id, sessionId)).limit(1);
  if (!row) throw new Error("This training session no longer exists.");
  if (row.closedAt) throw new Error("This attendance period is closed. Its records are available for review only.");
  return row;
}
export const activePeriodSession = () => sql`${trainingSessions.periodId} in (select id from ${attendancePeriods} where ${attendancePeriods.closedAt} is null)`;
export function periodSessionFilter(periodId?: string | null) { return periodId ? eq(trainingSessions.periodId, periodId) : sql`false`; }
export async function periodSessions(periodId: string, client: AttendanceDatabase = db) {
  return client.select().from(trainingSessions).where(and(eq(trainingSessions.periodId, periodId))).orderBy(desc(trainingSessions.date));
}
