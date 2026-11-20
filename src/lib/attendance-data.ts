import "server-only";

import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  users,
  memberProfiles,
  attendance,
  trainingSessions,
  leaveRequests,
  attendancePeriodSnapshots,
  type PeriodAttendanceRecord,
} from "@/db/schema";
import { buildStats, type AttendanceStats } from "@/lib/attendance";
import type { UserRole } from "@/types/next-auth";
import { MEMBER_ROLES } from "@/lib/roles";
import { getAttendancePeriod, periodSessionFilter, type AttendanceDatabase } from "@/lib/attendance-periods";

// The single place that knows how to count a member's attendance.
//
// Both exclusion rules (see `@/lib/attendance`) are applied here in SQL, so a
// roster page stays one query instead of one per member, and the rule lives in
// one place rather than copied across the five dashboards showing a percentage.

/**
 * Approved leave covering the session being marked. A LEFT JOIN rather than a
 * subquery because Postgres will not take a correlated subquery inside an
 * aggregate's FILTER clause.
 *
 * Overlapping approved leave periods would match the same attendance row twice,
 * so every count below is DISTINCT on the attendance id.
 */
const LEAVE_JOIN = and(
  eq(leaveRequests.userId, users.id),
  eq(leaveRequests.status, "approved"),
  sql`${trainingSessions.date} between ${leaveRequests.startDate} and ${leaveRequests.endDate}`
);

/** Session predates the member's account. `created_at` is a timestamp, cast to a
 *  date so joining midway through a training day still counts that day. */
const BEFORE_JOINING = sql`${trainingSessions.date} < ${users.createdAt}::date`;

/** The session falls inside approved leave. */
const ON_LEAVE = sql`${leaveRequests.id} is not null`;

/** Sessions that count: on or after the join date, and not during approved leave. */
const COUNTED = sql`not ${BEFORE_JOINING} and not ${ON_LEAVE}`;

const TOTAL = sql<number>`count(distinct ${attendance.id}) filter (where ${COUNTED})`.mapWith(
  Number
);

const PRESENT =
  sql<number>`count(distinct ${attendance.id}) filter (where ${COUNTED} and ${attendance.present})`.mapWith(
    Number
  );

const EXCLUDED_BEFORE_JOINING =
  sql<number>`count(distinct ${attendance.id}) filter (where ${BEFORE_JOINING})`.mapWith(Number);

const EXCLUDED_ON_LEAVE =
  sql<number>`count(distinct ${attendance.id}) filter (where not ${BEFORE_JOINING} and ${ON_LEAVE})`.mapWith(
    Number
  );

const COUNTS_FROM = sql<string>`to_char(${users.createdAt}::date, 'YYYY-MM-DD')`;

const STATS_COLUMNS = {
  countsFrom: COUNTS_FROM,
  total: TOTAL,
  present: PRESENT,
  excludedBeforeJoining: EXCLUDED_BEFORE_JOINING,
  excludedOnLeave: EXCLUDED_ON_LEAVE,
};

/** Attendance for one member. */
export async function attendanceStatsFor(userId: string, periodId?: string, client: AttendanceDatabase = db): Promise<AttendanceStats | null> {
  const period = await getAttendancePeriod(periodId, client);
  if (period?.closedAt) {
    const [snapshot] = await client.select({ stats: attendancePeriodSnapshots.stats }).from(attendancePeriodSnapshots)
      .where(and(eq(attendancePeriodSnapshots.periodId, period.id), eq(attendancePeriodSnapshots.userId, userId))).limit(1);
    return snapshot?.stats ?? null;
  }
  const [row] = await client
    .select(STATS_COLUMNS)
    .from(users)
    .leftJoin(attendance, eq(attendance.userId, users.id))
    .leftJoin(trainingSessions, and(eq(trainingSessions.id, attendance.sessionId), periodSessionFilter(period?.id)))
    .leftJoin(leaveRequests, LEAVE_JOIN)
    .where(eq(users.id, userId))
    .groupBy(users.id);

  if (!row) return null;
  const stats = buildStats(
    row.present,
    row.total,
    period && period.startsOn > row.countsFrom ? period.startsOn : row.countsFrom,
    row.excludedBeforeJoining,
    row.excludedOnLeave
  );
  return { ...stats, periodId: period?.id, periodName: period?.name };
}

/**
 * Attendance for every member in `roles`, keyed by user id. One query, so a
 * roster page does not fan out per member.
 */
export async function attendanceStatsByUser(
  roles: UserRole[] = [...MEMBER_ROLES], periodId?: string, client: AttendanceDatabase = db
): Promise<Map<string, AttendanceStats>> {
  const period = await getAttendancePeriod(periodId, client);
  if (period?.closedAt) {
    const rows = await client.select().from(attendancePeriodSnapshots).where(and(eq(attendancePeriodSnapshots.periodId, period.id), inArray(attendancePeriodSnapshots.role, roles)));
    return new Map(rows.filter(row => row.userId).map(row => [row.userId!, row.stats]));
  }
  const rows = await client
    .select({ id: users.id, ...STATS_COLUMNS })
    .from(users)
    .leftJoin(attendance, eq(attendance.userId, users.id))
    .leftJoin(trainingSessions, and(eq(trainingSessions.id, attendance.sessionId), periodSessionFilter(period?.id)))
    .leftJoin(leaveRequests, LEAVE_JOIN)
    .where(inArray(users.role, roles))
    .groupBy(users.id);

  return new Map(
    rows.map((r) => [
      r.id,
      { ...buildStats(r.present, r.total, period && period.startsOn > r.countsFrom ? period.startsOn : r.countsFrom, r.excludedBeforeJoining, r.excludedOnLeave), periodId: period?.id, periodName: period?.name },
    ])
  );
}

/**
 * Who may be marked for one session, and who may not.
 *
 * A member who joined after the session date could not have been there, and a
 * member the club excused could not be expected to be. Both are returned with a
 * reason rather than filtered out, so the marking page can show the coach who
 * has been set aside instead of silently shortening the list.
 *
 * This is the other half of the counting rules: without it, marking a
 * back-dated session creates rows for members who were not yet in the club,
 * which the counts then have to throw away.
 */
export async function rosterForSession(
  sessionId: string,
  roles: UserRole[] = [...MEMBER_ROLES], client: AttendanceDatabase = db
) {
  const rows = await client
    .select({
      id: users.id,
      email: users.email,
      fullName: memberProfiles.fullName,
      joinedAt: sql<string>`to_char(${users.createdAt}::date, 'YYYY-MM-DD')`,
      joinedAfter: sql<boolean>`bool_or(${trainingSessions.date} < ${users.createdAt}::date)`,
      onLeave: sql<boolean>`bool_or(${leaveRequests.id} is not null)`,
    })
    .from(users)
    .leftJoin(memberProfiles, eq(memberProfiles.userId, users.id))
    .innerJoin(trainingSessions, eq(trainingSessions.id, sessionId))
    .leftJoin(
      leaveRequests,
      and(
        eq(leaveRequests.userId, users.id),
        eq(leaveRequests.status, "approved"),
        sql`${trainingSessions.date} between ${leaveRequests.startDate} and ${leaveRequests.endDate}`
      )
    )
    .where(inArray(users.role, roles))
    .groupBy(users.id, memberProfiles.fullName);

  return rows
    .map((r) => ({
      id: r.id,
      name: r.fullName ?? r.email,
      joinedAt: r.joinedAt,
      markable: !r.joinedAfter && !r.onLeave,
      reason: r.joinedAfter
        ? (`Joined on ${r.joinedAt}, after this session` as string | null)
        : r.onLeave
          ? "On approved leave"
          : null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * A member's marked sessions, newest first, each flagged with whether it counts
 * and why not. The member dashboard shows excluded sessions rather than hiding
 * them, so nobody thinks a night they were marked has gone missing.
 */
export async function attendanceHistoryFor(userId: string, periodId?: string, client: AttendanceDatabase = db): Promise<PeriodAttendanceRecord[]> {
  const period = await getAttendancePeriod(periodId, client);
  if (!period) return [];
  if (period.closedAt) {
    const [snapshot] = await client.select({ history: attendancePeriodSnapshots.history }).from(attendancePeriodSnapshots)
      .where(and(eq(attendancePeriodSnapshots.periodId, period.id), eq(attendancePeriodSnapshots.userId, userId))).limit(1);
    return snapshot?.history ?? [];
  }
  return client
    .select({
      sessionId: trainingSessions.id,
      present: attendance.present,
      sessionTitle: trainingSessions.title,
      sessionDate: trainingSessions.date,
      beforeJoining: sql<boolean>`bool_or(${BEFORE_JOINING})`,
      onLeave: sql<boolean>`bool_or(${ON_LEAVE})`,
    })
    .from(attendance)
    .innerJoin(users, eq(users.id, attendance.userId))
    .innerJoin(trainingSessions, eq(trainingSessions.id, attendance.sessionId))
    .leftJoin(leaveRequests, LEAVE_JOIN)
    .where(and(eq(attendance.userId, userId), eq(trainingSessions.periodId, period.id)))
    .groupBy(attendance.id, trainingSessions.id, trainingSessions.title, trainingSessions.date, attendance.present)
    .orderBy(sql`${trainingSessions.date} desc`);
}

/** One query for the complete period register when freezing an archive. */
export function attendanceRecordsForPeriod(periodId: string, client: AttendanceDatabase = db) {
  return client.select({ userId: attendance.userId, sessionId: trainingSessions.id,
    sessionTitle: trainingSessions.title, sessionDate: trainingSessions.date, present: attendance.present,
    beforeJoining: sql<boolean>`bool_or(${BEFORE_JOINING})`, onLeave: sql<boolean>`bool_or(${ON_LEAVE})`,
  }).from(attendance).innerJoin(users, eq(users.id, attendance.userId))
    .innerJoin(trainingSessions, eq(trainingSessions.id, attendance.sessionId)).leftJoin(leaveRequests, LEAVE_JOIN)
    .where(eq(trainingSessions.periodId, periodId)).groupBy(attendance.id, trainingSessions.id)
    .orderBy(sql`${trainingSessions.date} desc`);
}
