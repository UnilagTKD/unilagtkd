import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { attendance, trainingSessions } from "@/db/schema";
import { getActiveAttendancePeriod, lockAttendancePeriods, requireWritableSession, type AttendanceTransaction } from "@/lib/attendance-periods";
import { AttendancePeriodError } from "@/lib/attendance-period-lifecycle";
import { rosterForSession } from "@/lib/attendance-data";
import { sessionHasEnded, sessionStartsAt } from "@/lib/training-session";
import type { trainingSessionSchema } from "@/lib/validation/actions";
import type { z } from "zod";
type SessionInput = z.infer<typeof trainingSessionSchema>;

export async function createPeriodSession(tx: AttendanceTransaction, actorId: string, data: SessionInput) {
  await lockAttendancePeriods(tx);
  const period = await getActiveAttendancePeriod(tx);
  if (!period) throw new AttendancePeriodError("Start an attendance period before creating a training session.");
  if (data.date < period.startsOn) throw new AttendancePeriodError("The session date cannot be before this attendance period starts.");
  return tx.insert(trainingSessions).values({ ...data, periodId: period.id, createdBy: actorId }).returning();
}
export async function updatePeriodSession(tx: AttendanceTransaction, sessionId: string, data: SessionInput) {
  const row = await requireWritableSession(tx, sessionId);
  if (data.date < row.startsOn) throw new AttendancePeriodError("The session date cannot be before this attendance period starts.");
  await tx.update(trainingSessions).set(data).where(eq(trainingSessions.id, sessionId));
}
export async function deletePeriodSession(tx: AttendanceTransaction, sessionId: string) {
  await requireWritableSession(tx, sessionId);
  await tx.delete(trainingSessions).where(eq(trainingSessions.id, sessionId));
}
export async function endPeriodSession(tx: AttendanceTransaction, sessionId: string) {
  await requireWritableSession(tx, sessionId);
  await tx.update(trainingSessions).set({ endedAt: new Date() }).where(eq(trainingSessions.id, sessionId));
}
export async function recordPeriodAttendance(tx: AttendanceTransaction, actorId: string, sessionId: string, entries: { userId: string; present: boolean }[]) {
  await requireWritableSession(tx, sessionId);
  const roster = await rosterForSession(sessionId, undefined, tx);
  const markable = new Set(roster.filter(row => row.markable).map(row => row.id));
  const accepted = [...new Map(entries.filter(row => markable.has(row.userId)).map(row => [row.userId, row])).values()];
  const existing = await tx.select({ userId: attendance.userId }).from(attendance).where(eq(attendance.sessionId, sessionId));
  const recorded = new Set(existing.map(row => row.userId));
  const markedAt = new Date();
  for (const present of [true, false]) {
    const ids = accepted.filter(row => row.present === present && recorded.has(row.userId)).map(row => row.userId);
    if (ids.length) await tx.update(attendance).set({ present, markedBy: actorId, markedAt }).where(and(eq(attendance.sessionId, sessionId), inArray(attendance.userId, ids)));
  }
  const newRows = accepted.filter(row => !recorded.has(row.userId)).map(row => ({ ...row, sessionId, markedBy: actorId, markedAt }));
  if (newRows.length) await tx.insert(attendance).values(newRows);
  return { marked: accepted.length, skipped: entries.filter(row => !markable.has(row.userId)).length };
}
export async function checkInToPeriodSession(tx: AttendanceTransaction, userId: string, sessionId: string) {
  const { session } = await requireWritableSession(tx, sessionId);
  if (sessionHasEnded(session)) return { ok: false as const, error: "This session has ended; check-in is closed." };
  if (new Date() < sessionStartsAt(session)) return { ok: false as const, error: "Check-in opens at the scheduled session start." };
  const entry = (await rosterForSession(sessionId, undefined, tx)).find(row => row.id === userId);
  if (!entry?.markable) return { ok: false as const, error: entry?.reason ?? "You are not on this session's register." };
  const [existing] = await tx.select({ id: attendance.id }).from(attendance).where(and(eq(attendance.sessionId, sessionId), eq(attendance.userId, userId))).limit(1);
  if (existing) await tx.update(attendance).set({ present: true, markedBy: userId, markedAt: new Date() }).where(eq(attendance.id, existing.id));
  else await tx.insert(attendance).values({ sessionId, userId, present: true, markedBy: userId });
  return { ok: true as const, title: session.title };
}
